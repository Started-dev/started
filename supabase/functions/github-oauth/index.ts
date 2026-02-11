import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID") || "";
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, code, redirect_uri } = await req.json();

    if (action === "get_client_id") {
      return json({ client_id: GITHUB_CLIENT_ID });
    }

    if (action === "exchange_code") {
      if (!code) return json({ error: "missing code" }, 400);

      const resp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri,
        }),
      });

      const data = await resp.json();
      if (data.error) {
        return json({ error: data.error_description || data.error }, 400);
      }

      return json({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
