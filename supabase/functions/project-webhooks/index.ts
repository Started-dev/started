import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("project_id");
  const token = url.searchParams.get("token");

  if (!projectId || !token) {
    return new Response(
      JSON.stringify({ error: "Missing project_id or token" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Validate token
  const { data: secret, error: secretErr } = await supabase
    .from("project_webhook_secrets")
    .select("id")
    .eq("project_id", projectId)
    .eq("token", token)
    .maybeSingle();

  if (secretErr || !secret) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse payload
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    // empty payload is fine
  }

  // Find matching hooks
  const { data: hooks } = await supabase
    .from("project_hooks")
    .select("*")
    .eq("project_id", projectId)
    .eq("event", "Webhook")
    .eq("enabled", true);

  if (!hooks || hooks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, hooks_triggered: 0, message: "No matching hooks" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let triggered = 0;

  for (const hook of hooks) {
    const startTime = Date.now();
    let status = "success";
    let outputPayload: Record<string, unknown> = {};

    try {
      if (hook.action === "webhook" && hook.webhook_url) {
        const resp = await fetch(hook.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hook_id: hook.id, event: "Webhook", payload,
            timestamp: new Date().toISOString(),
          }),
        });
        outputPayload = { status: resp.status, statusText: resp.statusText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "slack" && hook.webhook_url) {
        const slackBody = {
          attachments: [{
            color: "#3498db",
            blocks: [
              { type: "header", text: { type: "plain_text", text: `🔔 Webhook — ${hook.label}`, emoji: true } },
              { type: "section", fields: [
                { type: "mrkdwn", text: `*Project*\n\`${projectId.slice(0, 8)}…\`` },
                { type: "mrkdwn", text: `*Payload*\n\`\`\`${JSON.stringify(payload).slice(0, 300)}\`\`\`` },
              ]},
            ],
          }],
        };
        const resp = await fetch(hook.webhook_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackBody),
        });
        const respText = await resp.text();
        outputPayload = { status: resp.status, response: respText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "discord" && hook.webhook_url) {
        const discordBody = {
          embeds: [{
            title: `🔔 Webhook — ${hook.label}`,
            color: 0x3498db,
            fields: [
              { name: "Project", value: `\`${projectId.slice(0, 8)}…\``, inline: true },
              { name: "Payload", value: `\`\`\`json\n${JSON.stringify(payload, null, 2).slice(0, 300)}\n\`\`\``, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "Started Webhooks" },
          }],
        };
        const resp = await fetch(hook.webhook_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordBody),
        });
        const respText = await resp.text();
        outputPayload = { status: resp.status, response: respText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "log") {
        outputPayload = { logged: true };
      } else if (hook.action === "notify") {
        outputPayload = { notified: true, label: hook.label };
      }

      triggered++;
    } catch (err) {
      status = "failed";
      outputPayload = { error: err instanceof Error ? err.message : "Unknown error" };
    }

    const durationMs = Date.now() - startTime;

    // Log execution
    await supabase.from("hook_execution_log").insert({
      hook_id: hook.id,
      project_id: projectId,
      event: "Webhook",
      input_payload: payload,
      output_payload: outputPayload,
      status,
      duration_ms: durationMs,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, hooks_triggered: triggered }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
