import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Build a Slack Block Kit message for an event */
function buildSlackPayload(event: string, projectId: string, payload: Record<string, unknown>, label: string) {
  const emoji = event === "OnDeploy" ? "🚀" : event === "OnError" ? "🔴" : event === "OnFileChange" ? "📝" : "🔔";
  const color = event === "OnError" ? "#e74c3c" : event === "OnDeploy" ? "#2ecc71" : "#3498db";
  return {
    attachments: [{
      color,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ${event} — ${label}`, emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Project*\n\`${projectId.slice(0, 8)}…\`` },
            { type: "mrkdwn", text: `*Event*\n${event}` },
            { type: "mrkdwn", text: `*Triggered by*\n${payload.triggered_by || "system"}` },
            { type: "mrkdwn", text: `*Time*\n${payload.triggered_at || new Date().toISOString()}` },
          ],
        },
        ...(payload.command ? [{
          type: "section",
          text: { type: "mrkdwn", text: `*Command*\n\`\`\`${payload.command}\`\`\`` },
        }] : []),
        ...(payload.error ? [{
          type: "section",
          text: { type: "mrkdwn", text: `*Error*\n\`\`\`${String(payload.error).slice(0, 500)}\`\`\`` },
        }] : []),
      ],
    }],
  };
}

/** Build a Discord embed message for an event */
function buildDiscordPayload(event: string, projectId: string, payload: Record<string, unknown>, label: string) {
  const color = event === "OnError" ? 0xe74c3c : event === "OnDeploy" ? 0x2ecc71 : 0x3498db;
  const emoji = event === "OnDeploy" ? "🚀" : event === "OnError" ? "🔴" : event === "OnFileChange" ? "📝" : "🔔";
  return {
    embeds: [{
      title: `${emoji} ${event} — ${label}`,
      color,
      fields: [
        { name: "Project", value: `\`${projectId.slice(0, 8)}…\``, inline: true },
        { name: "Event", value: event, inline: true },
        { name: "Triggered by", value: String(payload.triggered_by || "system"), inline: true },
        ...(payload.command ? [{ name: "Command", value: `\`\`\`${payload.command}\`\`\``, inline: false }] : []),
        ...(payload.error ? [{ name: "Error", value: `\`\`\`${String(payload.error).slice(0, 500)}\`\`\``, inline: false }] : []),
      ],
      timestamp: payload.triggered_at || new Date().toISOString(),
      footer: { text: "Started CI/CD" },
    }],
  };
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    project_id: string;
    event: string;
    payload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { project_id, event, payload = {} } = body;

  if (!project_id || !event) {
    return new Response(
      JSON.stringify({ error: "Missing project_id or event" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supportedEvents = ["OnDeploy", "OnFileChange", "OnError"];
  if (!supportedEvents.includes(event)) {
    return new Response(
      JSON.stringify({ error: `Unsupported event: ${event}. Supported: ${supportedEvents.join(", ")}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find matching hooks
  const { data: hooks } = await supabase
    .from("project_hooks")
    .select("*")
    .eq("project_id", project_id)
    .eq("event", event)
    .eq("enabled", true);

  if (!hooks || hooks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, hooks_triggered: 0, message: "No matching hooks" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let triggered = 0;
  const results: Array<{ hook_id: string; status: string; duration_ms: number }> = [];

  const enrichedPayload = {
    ...payload,
    triggered_by: user.email || user.id,
    triggered_at: new Date().toISOString(),
  };

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
            hook_id: hook.id, event, project_id, payload: enrichedPayload,
          }),
        });
        outputPayload = { status: resp.status, statusText: resp.statusText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "slack" && hook.webhook_url) {
        // Slack incoming webhook with Block Kit formatting
        const slackBody = buildSlackPayload(event, project_id, enrichedPayload, hook.label);
        const resp = await fetch(hook.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackBody),
        });
        const respText = await resp.text();
        outputPayload = { status: resp.status, response: respText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "discord" && hook.webhook_url) {
        // Discord webhook with embed formatting
        const discordBody = buildDiscordPayload(event, project_id, enrichedPayload, hook.label);
        const resp = await fetch(hook.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordBody),
        });
        const respText = await resp.text();
        outputPayload = { status: resp.status, response: respText };
        if (!resp.ok) status = "failed";
      } else if (hook.action === "log") {
        outputPayload = { logged: true, event, label: hook.label };
      } else if (hook.action === "notify") {
        outputPayload = { notified: true, label: hook.label, event };
      }

      triggered++;
    } catch (err) {
      status = "failed";
      outputPayload = {
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    const durationMs = Date.now() - startTime;

    await supabase.from("hook_execution_log").insert({
      hook_id: hook.id,
      project_id,
      event,
      input_payload: payload,
      output_payload: outputPayload,
      status,
      duration_ms: durationMs,
    });

    results.push({ hook_id: hook.id, status, duration_ms: durationMs });
  }

  return new Response(
    JSON.stringify({ ok: true, hooks_triggered: triggered, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
