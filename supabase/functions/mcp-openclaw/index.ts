import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// OpenClaw exposes an HTTP-based API (REST + optional MCP endpoint).
// The user provides their OpenClaw instance URL and API key.

async function openclawFetch(
  baseUrl: string,
  path: string,
  apiKey: string,
  options: RequestInit = {}
) {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(
      data.error?.message || data.message || `OpenClaw API ${resp.status}`
    );
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    const { tool, input, openclaw_url, openclaw_api_key } = await req.json();
    if (!tool || !openclaw_url || !openclaw_api_key) {
      return json(
        { error: "missing 'tool', 'openclaw_url', or 'openclaw_api_key'" },
        400
      );
    }

    const baseUrl = openclaw_url as string;
    const apiKey = openclaw_api_key as string;
    let result: unknown;

    switch (tool) {
      // ─── Status / Info ───
      case "openclaw_status": {
        result = await openclawFetch(baseUrl, "/api/status", apiKey);
        break;
      }
      case "openclaw_get_config": {
        result = await openclawFetch(baseUrl, "/api/config", apiKey);
        break;
      }

      // ─── Skills Management ───
      case "openclaw_list_skills": {
        result = await openclawFetch(baseUrl, "/api/skills", apiKey);
        break;
      }
      case "openclaw_install_skill": {
        const { skill_name } = input || {};
        if (!skill_name) return json({ error: "skill_name required" }, 400);
        result = await openclawFetch(baseUrl, "/api/skills/install", apiKey, {
          method: "POST",
          body: JSON.stringify({ name: skill_name }),
        });
        break;
      }
      case "openclaw_uninstall_skill": {
        const { skill_name } = input || {};
        if (!skill_name) return json({ error: "skill_name required" }, 400);
        result = await openclawFetch(baseUrl, "/api/skills/uninstall", apiKey, {
          method: "POST",
          body: JSON.stringify({ name: skill_name }),
        });
        break;
      }

      // ─── Conversations / Chat ───
      case "openclaw_send_message": {
        const { message, channel, thread_id } = input || {};
        if (!message) return json({ error: "message required" }, 400);
        const body: Record<string, unknown> = { message };
        if (channel) body.channel = channel;
        if (thread_id) body.thread_id = thread_id;
        result = await openclawFetch(baseUrl, "/api/chat/send", apiKey, {
          method: "POST",
          body: JSON.stringify(body),
        });
        break;
      }
      case "openclaw_get_conversations": {
        const limit = input?.limit || 20;
        result = await openclawFetch(
          baseUrl,
          `/api/chat/conversations?limit=${limit}`,
          apiKey
        );
        break;
      }
      case "openclaw_get_conversation": {
        const { conversation_id } = input || {};
        if (!conversation_id)
          return json({ error: "conversation_id required" }, 400);
        result = await openclawFetch(
          baseUrl,
          `/api/chat/conversations/${conversation_id}`,
          apiKey
        );
        break;
      }

      // ─── Tasks / Autonomous Runs ───
      case "openclaw_run_task": {
        const { goal, max_steps } = input || {};
        if (!goal) return json({ error: "goal required" }, 400);
        const body: Record<string, unknown> = { goal };
        if (max_steps) body.max_steps = max_steps;
        result = await openclawFetch(baseUrl, "/api/tasks/run", apiKey, {
          method: "POST",
          body: JSON.stringify(body),
        });
        break;
      }
      case "openclaw_list_tasks": {
        const limit = input?.limit || 20;
        const status = input?.status ? `&status=${input.status}` : "";
        result = await openclawFetch(
          baseUrl,
          `/api/tasks?limit=${limit}${status}`,
          apiKey
        );
        break;
      }
      case "openclaw_get_task": {
        const { task_id } = input || {};
        if (!task_id) return json({ error: "task_id required" }, 400);
        result = await openclawFetch(
          baseUrl,
          `/api/tasks/${task_id}`,
          apiKey
        );
        break;
      }
      case "openclaw_cancel_task": {
        const { task_id } = input || {};
        if (!task_id) return json({ error: "task_id required" }, 400);
        result = await openclawFetch(
          baseUrl,
          `/api/tasks/${task_id}/cancel`,
          apiKey,
          { method: "POST" }
        );
        break;
      }

      // ─── Memory ───
      case "openclaw_search_memory": {
        const { query, limit } = input || {};
        if (!query) return json({ error: "query required" }, 400);
        result = await openclawFetch(baseUrl, "/api/memory/search", apiKey, {
          method: "POST",
          body: JSON.stringify({ query, limit: limit || 10 }),
        });
        break;
      }
      case "openclaw_add_memory": {
        const { content, metadata } = input || {};
        if (!content) return json({ error: "content required" }, 400);
        result = await openclawFetch(baseUrl, "/api/memory/add", apiKey, {
          method: "POST",
          body: JSON.stringify({ content, metadata }),
        });
        break;
      }

      // ─── Channels ───
      case "openclaw_list_channels": {
        result = await openclawFetch(baseUrl, "/api/channels", apiKey);
        break;
      }
      case "openclaw_get_channel": {
        const { channel_id } = input || {};
        if (!channel_id) return json({ error: "channel_id required" }, 400);
        result = await openclawFetch(
          baseUrl,
          `/api/channels/${channel_id}`,
          apiKey
        );
        break;
      }

      // ─── Generic MCP Proxy ───
      // Forward to OpenClaw's built-in MCP endpoint for any skill tool
      case "openclaw_mcp_invoke": {
        const { mcp_tool, mcp_input } = input || {};
        if (!mcp_tool) return json({ error: "mcp_tool required" }, 400);
        result = await openclawFetch(baseUrl, "/mcp", apiKey, {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: mcp_tool, arguments: mcp_input || {} },
          }),
        });
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
