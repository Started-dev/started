import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CF_API = "https://api.cloudflare.com/client/v4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function cfFetch(path: string, token: string, options: RequestInit = {}) {
  const resp = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    const msg = data.errors?.[0]?.message || `Cloudflare API ${resp.status}`;
    throw new Error(msg);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    const { tool, input, cloudflare_token } = await req.json();
    if (!tool || !cloudflare_token) {
      return json({ error: "missing 'tool' or 'cloudflare_token'" }, 400);
    }

    let result: unknown;

    switch (tool) {
      // ─── Account ───
      case "cf_list_accounts": {
        const data = await cfFetch("/accounts?per_page=20", cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_verify_token": {
        const data = await cfFetch("/user/tokens/verify", cloudflare_token);
        result = data.result;
        break;
      }

      // ─── Workers ───
      case "cf_list_workers": {
        const { account_id } = input || {};
        if (!account_id) return json({ error: "account_id required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/workers/scripts`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_get_worker": {
        const { account_id, script_name } = input || {};
        if (!account_id || !script_name) return json({ error: "account_id, script_name required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/workers/scripts/${script_name}/settings`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_delete_worker": {
        const { account_id, script_name } = input || {};
        if (!account_id || !script_name) return json({ error: "account_id, script_name required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/workers/scripts/${script_name}`, cloudflare_token, {
          method: "DELETE",
        });
        result = data.result;
        break;
      }

      // ─── KV Namespaces ───
      case "cf_list_kv_namespaces": {
        const { account_id } = input || {};
        if (!account_id) return json({ error: "account_id required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/storage/kv/namespaces`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_create_kv_namespace": {
        const { account_id, title } = input || {};
        if (!account_id || !title) return json({ error: "account_id, title required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/storage/kv/namespaces`, cloudflare_token, {
          method: "POST",
          body: JSON.stringify({ title }),
        });
        result = data.result;
        break;
      }

      case "cf_list_kv_keys": {
        const { account_id, namespace_id, limit } = input || {};
        if (!account_id || !namespace_id) return json({ error: "account_id, namespace_id required" }, 400);
        const data = await cfFetch(`/accounts/${account_id}/storage/kv/namespaces/${namespace_id}/keys?limit=${limit || 100}`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_get_kv_value": {
        const { account_id, namespace_id, key_name } = input || {};
        if (!account_id || !namespace_id || !key_name) return json({ error: "account_id, namespace_id, key_name required" }, 400);
        const resp = await fetch(`${CF_API}/accounts/${account_id}/storage/kv/namespaces/${namespace_id}/values/${encodeURIComponent(key_name)}`, {
          headers: { Authorization: `Bearer ${cloudflare_token}` },
        });
        if (!resp.ok) throw new Error(`KV read failed ${resp.status}`);
        const text = await resp.text();
        result = { key: key_name, value: text };
        break;
      }

      case "cf_put_kv_value": {
        const { account_id, namespace_id, key_name, value } = input || {};
        if (!account_id || !namespace_id || !key_name || value === undefined) return json({ error: "account_id, namespace_id, key_name, value required" }, 400);
        const resp = await fetch(`${CF_API}/accounts/${account_id}/storage/kv/namespaces/${namespace_id}/values/${encodeURIComponent(key_name)}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${cloudflare_token}`, "Content-Type": "text/plain" },
          body: String(value),
        });
        if (!resp.ok) throw new Error(`KV write failed ${resp.status}`);
        result = { success: true, key: key_name };
        break;
      }

      // ─── DNS ───
      case "cf_list_zones": {
        const { per_page } = input || {};
        const data = await cfFetch(`/zones?per_page=${per_page || 20}`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_list_dns_records": {
        const { zone_id } = input || {};
        if (!zone_id) return json({ error: "zone_id required" }, 400);
        const data = await cfFetch(`/zones/${zone_id}/dns_records`, cloudflare_token);
        result = data.result;
        break;
      }

      case "cf_create_dns_record": {
        const { zone_id, type, name, content, ttl, proxied } = input || {};
        if (!zone_id || !type || !name || !content) return json({ error: "zone_id, type, name, content required" }, 400);
        const data = await cfFetch(`/zones/${zone_id}/dns_records`, cloudflare_token, {
          method: "POST",
          body: JSON.stringify({ type, name, content, ttl: ttl || 1, proxied: proxied ?? true }),
        });
        result = data.result;
        break;
      }

      default:
        return json({ error: `Unknown tool: ${tool}` }, 400);
    }

    return json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return json({ ok: false, error: message }, 500);
  }
});
