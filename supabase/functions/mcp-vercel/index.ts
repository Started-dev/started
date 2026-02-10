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

async function vercelFetch(path: string, token: string, options: RequestInit = {}) {
  const resp = await fetch(`https://api.vercel.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Vercel API ${resp.status}`);
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

    const { tool, input, vercel_token } = await req.json();
    if (!tool || !vercel_token) {
      return json({ error: "missing 'tool' or 'vercel_token'" }, 400);
    }

    let result: unknown;

    switch (tool) {
      case "vercel_list_projects": {
        const limit = input?.limit || 20;
        result = await vercelFetch(`/v9/projects?limit=${limit}`, vercel_token);
        break;
      }

      case "vercel_get_project": {
        const { projectId } = input || {};
        if (!projectId) return json({ error: "projectId required" }, 400);
        result = await vercelFetch(`/v9/projects/${projectId}`, vercel_token);
        break;
      }

      case "vercel_list_deployments": {
        const { projectId, limit } = input || {};
        const params = new URLSearchParams();
        if (projectId) params.set("projectId", projectId);
        params.set("limit", String(limit || 10));
        result = await vercelFetch(`/v6/deployments?${params}`, vercel_token);
        break;
      }

      case "vercel_get_deployment": {
        const { deploymentId } = input || {};
        if (!deploymentId) return json({ error: "deploymentId required" }, 400);
        result = await vercelFetch(`/v13/deployments/${deploymentId}`, vercel_token);
        break;
      }

      case "vercel_create_deployment": {
        const { name, gitSource, target } = input || {};
        if (!name) return json({ error: "name required" }, 400);
        const body: Record<string, unknown> = { name };
        if (gitSource) body.gitSource = gitSource;
        if (target) body.target = target;
        result = await vercelFetch(`/v13/deployments`, vercel_token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        break;
      }

      case "vercel_list_domains": {
        const { projectId } = input || {};
        if (!projectId) return json({ error: "projectId required" }, 400);
        result = await vercelFetch(`/v9/projects/${projectId}/domains`, vercel_token);
        break;
      }

      case "vercel_add_domain": {
        const { projectId, domain } = input || {};
        if (!projectId || !domain) return json({ error: "projectId, domain required" }, 400);
        result = await vercelFetch(`/v10/projects/${projectId}/domains`, vercel_token, {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        });
        break;
      }

      case "vercel_list_env_vars": {
        const { projectId } = input || {};
        if (!projectId) return json({ error: "projectId required" }, 400);
        result = await vercelFetch(`/v9/projects/${projectId}/env`, vercel_token);
        break;
      }

      case "vercel_create_env_var": {
        const { projectId, key, value, target: envTarget, type } = input || {};
        if (!projectId || !key || !value) return json({ error: "projectId, key, value required" }, 400);
        result = await vercelFetch(`/v10/projects/${projectId}/env`, vercel_token, {
          method: "POST",
          body: JSON.stringify({
            key,
            value,
            target: envTarget || ["production", "preview", "development"],
            type: type || "encrypted",
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
