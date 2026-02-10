import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Stable Hash (FNV-1a) ───

function stableHash(obj: unknown): string {
  const s = JSON.stringify(obj, Object.keys((obj ?? {}) as Record<string, unknown>).sort());
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
}

// ─── Input Validation ───

interface JsonSchema {
  type: "object";
  required?: string[];
  properties: Record<string, { type: string }>;
}

function assertInput(schema: JsonSchema, input: Record<string, unknown>) {
  if (typeof input !== "object" || input === null) throw new Error("invalid_input:type");
  for (const k of schema.required ?? []) {
    if (!(k in input)) throw new Error(`invalid_input:missing:${k}`);
  }
  for (const [k, v] of Object.entries(schema.properties)) {
    if (!(k in input)) continue;
    const t = typeof input[k];
    if (v.type === "number" && t !== "number") throw new Error(`invalid_input:type:${k}`);
    if (v.type === "string" && t !== "string") throw new Error(`invalid_input:type:${k}`);
    if (v.type === "boolean" && t !== "boolean") throw new Error(`invalid_input:type:${k}`);
  }
}

// ─── Permission Evaluation ───

type Effect = "allow" | "ask" | "deny";
type Risk = "read" | "simulate" | "write";

async function evalPermission(args: {
  supabase: ReturnType<typeof createClient>;
  project_id: string;
  tool_name: string;
  risk: Risk;
}): Promise<{ effect: Effect; reason?: string }> {
  const { supabase, project_id, tool_name, risk } = args;
  const { data: rules } = await supabase
    .from("mcp_permissions")
    .select("rule_type,subject,effect,reason")
    .eq("project_id", project_id);

  const list = (rules ?? []) as Array<{ rule_type: string; subject: string; effect: Effect; reason?: string }>;

  // 1) explicit tool deny/allow
  const toolRules = list.filter(r => r.rule_type === "tool" && r.subject === tool_name);
  const denyTool = toolRules.find(r => r.effect === "deny");
  if (denyTool) return { effect: "deny", reason: denyTool.reason ?? "Denied by tool rule" };
  const allowTool = toolRules.find(r => r.effect === "allow");
  if (allowTool) return { effect: "allow", reason: allowTool.reason ?? "Allowed by tool rule" };

  // 2) risk rule
  const riskRule = list.find(r => r.rule_type === "risk" && r.subject === risk);
  if (riskRule) return { effect: riskRule.effect as Effect, reason: riskRule.reason ?? `Rule matched risk=${risk}` };

  // 3) pattern rules
  const patterns = list.filter(r => r.rule_type === "pattern");
  for (const r of patterns) {
    if (r.subject.startsWith("prefix:")) {
      const pref = r.subject.slice("prefix:".length);
      if (tool_name.startsWith(pref)) return { effect: r.effect as Effect, reason: r.reason ?? `Matched prefix ${pref}` };
    }
    if (r.subject.startsWith("re:")) {
      const re = new RegExp(r.subject.slice("re:".length));
      if (re.test(tool_name)) return { effect: r.effect as Effect, reason: r.reason ?? `Matched regex` };
    }
  }

  // default
  if (risk === "read") return { effect: "allow", reason: "Default allow for read" };
  return { effect: "ask", reason: "Default ask for simulate/write" };
}

// ─── Moralis Adapter ───

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2";

function moralisHeaders() {
  const key = Deno.env.get("MORALIS_API_KEY");
  if (!key) throw new Error("MORALIS_API_KEY not configured");
  return { "content-type": "application/json", "X-API-Key": key };
}

type Cfg = { allowed_chains?: string[]; max_page_size?: number };

function enforceChain(chain: string, cfg: Cfg) {
  const allow = cfg.allowed_chains ?? ["eth", "base", "polygon", "arbitrum", "optimism", "bsc"];
  if (!allow.includes(chain)) throw new Error(`chain_not_allowed:${chain}`);
}

async function moralisGet(url: string) {
  const r = await fetch(url, { headers: moralisHeaders() });
  const t = await r.text();
  if (!r.ok) throw new Error(`moralis_error:${r.status}:${t}`);
  try { return JSON.parse(t); } catch { return t; }
}

const moralisSchemas: Record<string, JsonSchema> = {
  "moralis.getWalletTokenBalances": {
    type: "object", required: ["address", "chain"],
    properties: { address: { type: "string" }, chain: { type: "string" }, cursor: { type: "string" } },
  },
  "moralis.getWalletNFTs": {
    type: "object", required: ["address", "chain"],
    properties: { address: { type: "string" }, chain: { type: "string" }, cursor: { type: "string" }, limit: { type: "number" } },
  },
  "moralis.getWalletTokenTransfers": {
    type: "object", required: ["address", "chain"],
    properties: { address: { type: "string" }, chain: { type: "string" }, cursor: { type: "string" }, limit: { type: "number" } },
  },
  "moralis.getTokenPrice": {
    type: "object", required: ["address", "chain"],
    properties: { address: { type: "string" }, chain: { type: "string" } },
  },
  "moralis.getNFTMetadata": {
    type: "object", required: ["address", "token_id", "chain"],
    properties: { address: { type: "string" }, token_id: { type: "string" }, chain: { type: "string" } },
  },
  "moralis.getContractEvents": {
    type: "object", required: ["address", "chain", "topic"],
    properties: { address: { type: "string" }, chain: { type: "string" }, topic: { type: "string" }, limit: { type: "number" } },
  },
  "moralis.resolveAddress": {
    type: "object", required: ["address"],
    properties: { address: { type: "string" } },
  },
};

async function invokeMoralisTool(args: { tool_name: string; input: Record<string, unknown>; config: Cfg }) {
  const { tool_name, input, config } = args;
  const schema = moralisSchemas[tool_name];
  if (!schema) throw new Error(`unknown_tool:${tool_name}`);
  assertInput(schema, input);

  const cfg = config ?? {};
  const maxPage = cfg.max_page_size ?? 100;

  switch (tool_name) {
    case "moralis.getWalletTokenBalances": {
      enforceChain(input.chain as string, cfg);
      return await moralisGet(`${MORALIS_BASE}/${encodeURIComponent(input.address as string)}/erc20?chain=${encodeURIComponent(input.chain as string)}`);
    }
    case "moralis.getWalletNFTs": {
      enforceChain(input.chain as string, cfg);
      const limit = Math.min(Number(input.limit ?? 50), maxPage);
      const cursor = input.cursor ? `&cursor=${encodeURIComponent(input.cursor as string)}` : "";
      return await moralisGet(`${MORALIS_BASE}/${encodeURIComponent(input.address as string)}/nft?chain=${encodeURIComponent(input.chain as string)}&limit=${limit}${cursor}`);
    }
    case "moralis.getWalletTokenTransfers": {
      enforceChain(input.chain as string, cfg);
      const limit = Math.min(Number(input.limit ?? 50), maxPage);
      const cursor = input.cursor ? `&cursor=${encodeURIComponent(input.cursor as string)}` : "";
      return await moralisGet(`${MORALIS_BASE}/${encodeURIComponent(input.address as string)}/erc20/transfers?chain=${encodeURIComponent(input.chain as string)}&limit=${limit}${cursor}`);
    }
    case "moralis.getTokenPrice": {
      enforceChain(input.chain as string, cfg);
      return await moralisGet(`${MORALIS_BASE}/erc20/${encodeURIComponent(input.address as string)}/price?chain=${encodeURIComponent(input.chain as string)}`);
    }
    case "moralis.getNFTMetadata": {
      enforceChain(input.chain as string, cfg);
      return await moralisGet(`${MORALIS_BASE}/nft/${encodeURIComponent(input.address as string)}/${encodeURIComponent(input.token_id as string)}?chain=${encodeURIComponent(input.chain as string)}`);
    }
    case "moralis.getContractEvents": {
      enforceChain(input.chain as string, cfg);
      const limit = Math.min(Number(input.limit ?? 50), maxPage);
      return await moralisGet(`${MORALIS_BASE}/${encodeURIComponent(input.address as string)}/events?chain=${encodeURIComponent(input.chain as string)}&topic0=${encodeURIComponent(input.topic as string)}&limit=${limit}`);
    }
    case "moralis.resolveAddress": {
      return { address: input.address, resolved: null, note: "ENS resolve depends on Moralis plan" };
    }
    default:
      throw new Error(`unhandled_tool:${tool_name}`);
  }
}

// ─── Main Handler ───

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });

  // Auth
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const { project_id, server_key, tool_name, risk = "read", input = {} } = body as {
    project_id: string; server_key: string; tool_name: string; risk: Risk; input: Record<string, unknown>;
  };
  if (!project_id || !server_key || !tool_name) return json({ ok: false, error: "missing_fields" }, 400);

  // Project ownership
  const { data: proj } = await supabase.from("projects").select("id,owner_id").eq("id", project_id).single();
  if (!proj) return json({ ok: false, error: "project_not_found" }, 404);
  if (proj.owner_id !== userData.user.id) return json({ ok: false, error: "forbidden" }, 403);

  // Server enabled?
  const { data: server } = await supabase.from("mcp_servers").select("id,key").eq("key", server_key).single();
  if (!server) return json({ ok: false, error: "server_not_found" }, 404);

  const { data: pms } = await supabase
    .from("project_mcp_servers")
    .select("is_enabled,config")
    .eq("project_id", project_id)
    .eq("server_id", server.id)
    .single();

  if (!pms || !pms.is_enabled) return json({ ok: false, error: "server_disabled" }, 403);

  // Permission
  const perm = await evalPermission({ supabase, project_id, tool_name, risk: risk as Risk });
  const inputHash = stableHash({ project_id, server_key, tool_name, risk, input });

  const auditBase = {
    project_id,
    user_id: userData.user.id,
    server_key,
    tool_name,
    risk,
    input_hash: inputHash,
  };

  if (perm.effect !== "allow") {
    await supabase.from("mcp_audit_log").insert({ ...auditBase, status: "blocked", error: `needs_${perm.effect}` });
    return json({ ok: false, status: "needs_approval", effect: perm.effect, reason: perm.reason }, 403);
  }

  // Invoke adapter
  const startedAt = Date.now();
  try {
    let data: unknown;

    if (server_key === "moralis") {
      data = await invokeMoralisTool({ tool_name, input: input as Record<string, unknown>, config: (pms.config ?? {}) as Cfg });
    } else {
      return json({ ok: false, error: "adapter_not_implemented" }, 400);
    }

    const latency = Date.now() - startedAt;
    await supabase.from("mcp_audit_log").insert({
      ...auditBase, status: "ok", latency_ms: latency, output_hash: stableHash(data), error: null,
    });

    // Usage ledger bump
    const now = new Date();
    const ps = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const pe = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("api_usage_ledger")
      .select("id,mcp_calls")
      .eq("owner_id", userData.user.id)
      .eq("period_start", ps)
      .eq("period_end", pe)
      .single();

    if (!existing) {
      await supabase.from("api_usage_ledger").insert({
        owner_id: userData.user.id, period_start: ps, period_end: pe, mcp_calls: 1, plan_key: "free",
      });
    } else {
      await supabase.from("api_usage_ledger")
        .update({ mcp_calls: (existing.mcp_calls ?? 0) + 1 })
        .eq("id", existing.id);
    }

    return json({ ok: true, data, meta: { latency_ms: latency } });
  } catch (e) {
    const latency = Date.now() - startedAt;
    await supabase.from("mcp_audit_log").insert({
      ...auditBase, status: "error", latency_ms: latency, error: String(e),
    });
    return json({ ok: false, error: "tool_error", detail: String(e) }, 500);
  }
});
