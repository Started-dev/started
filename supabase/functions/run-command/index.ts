import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Denylist for dangerous commands ───
const DENIED_PATTERNS = [
  /^rm\s+-rf\s+[\/~]/,
  /^sudo\s/,
  /^dd\s/,
  /^mkfs/,
  /^chmod\s+777/,
  /^ssh\s/,
  /^scp\s/,
  /^cat\s+\/etc\/(passwd|shadow)/,
  /^cat\s+~\/\.ssh/,
  /base64\s*\|\s*bash/,
  /curl\s.*\|\s*(bash|sh)/,
  /wget\s.*\|\s*(bash|sh)/,
];

// ─── Shell builtins (safe to run in edge) ───
function executeBuiltin(cmd: string, cwd: string): { handled: boolean; stdout?: string; stderr?: string; exitCode?: number; newCwd?: string } {
  const parts = cmd.split(/\s+/);
  const bin = parts[0];
  switch (bin) {
    case "echo": return { handled: true, stdout: parts.slice(1).join(" ") + "\n", exitCode: 0 };
    case "pwd": return { handled: true, stdout: cwd + "\n", exitCode: 0 };
    case "date": return { handled: true, stdout: new Date().toISOString() + "\n", exitCode: 0 };
    case "whoami": return { handled: true, stdout: "runner\n", exitCode: 0 };
    case "hostname": return { handled: true, stdout: "started-runner\n", exitCode: 0 };
    case "true": return { handled: true, stdout: "", exitCode: 0 };
    case "false": return { handled: true, stdout: "", exitCode: 1 };
    case "env": {
      const safeVars = { HOME: "/home/runner", USER: "runner", SHELL: "/bin/sh", PWD: cwd };
      return { handled: true, stdout: Object.entries(safeVars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", exitCode: 0 };
    }
    default: return { handled: false };
  }
}

// ─── Auth helper ───
async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Permission check ───
async function checkPermission(
  projectId: string | undefined,
  command: string,
  db: ReturnType<typeof createClient>
): Promise<{ effect: "allow" | "ask" | "deny"; reason?: string }> {
  if (!projectId) return { effect: "allow" };

  const { data: rules } = await db
    .from("project_permissions")
    .select("rule_type, subject, effect, reason")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (!rules?.length) return { effect: "allow" };

  for (const rule of rules) {
    let matches = false;
    if (rule.rule_type === "command_prefix" && command.startsWith(rule.subject)) {
      matches = true;
    } else if (rule.rule_type === "regex") {
      try { matches = new RegExp(rule.subject).test(command); } catch { /* ignore */ }
    }
    if (matches) {
      return { effect: rule.effect as "allow" | "ask" | "deny", reason: rule.reason || undefined };
    }
  }
  return { effect: "allow" };
}

// ─── Select a runner node for the project ───
async function selectRunnerNode(
  projectId: string,
  db: ReturnType<typeof createClient>
): Promise<{ base_url: string; id: string } | null> {
  // Check if project has an active runner session
  const { data: session } = await db
    .from("runner_sessions")
    .select("id, runner_node_id, remote_session_id")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (session) {
    const { data: node } = await db
      .from("runner_nodes")
      .select("id, base_url, status")
      .eq("id", session.runner_node_id)
      .eq("status", "online")
      .maybeSingle();
    if (node) return { base_url: node.base_url, id: node.id };
  }

  // Fallback: find any available online runner node
  const { data: nodes } = await db
    .from("runner_nodes")
    .select("id, base_url")
    .eq("status", "online")
    .order("last_heartbeat", { ascending: false })
    .limit(1);

  if (nodes && nodes.length > 0) {
    return { base_url: nodes[0].base_url, id: nodes[0].id };
  }

  return null;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { command, cwd, timeout_s, project_id, files } = await req.json() as {
      command: string;
      cwd?: string;
      timeout_s?: number;
      project_id?: string;
      files?: Array<{ path: string; content: string }>;
    };

    if (!command) {
      return new Response(
        JSON.stringify({ error: "Missing 'command'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentCwd = cwd || "/workspace";
    const timeoutS = timeout_s || 60;
    const user = await getUser(req);
    const db = getServiceClient();
    const encoder = new TextEncoder();

    // ─── Denylist check ───
    for (const pattern of DENIED_PATTERNS) {
      if (pattern.test(command)) {
        if (project_id && user?.id) {
          db.from("mcp_audit_log").insert({
            project_id, user_id: user.id, server_key: "runner",
            tool_name: "run_command", risk: "write", status: "denied",
            input_hash: command.slice(0, 100), error: "Denied by security policy",
          }).then(() => {}).catch(() => {});
        }
        return new Response(
          JSON.stringify({ ok: false, stdout: "", stderr: `⛔ Command denied by security policy: ${command}`, exitCode: 1, cwd: currentCwd, durationMs: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Project permission check ───
    if (project_id) {
      const perm = await checkPermission(project_id, command, db);
      if (perm.effect === "deny") {
        return new Response(
          JSON.stringify({ ok: false, stdout: "", stderr: `⛔ Command blocked by project permission rule: ${perm.reason || command}`, exitCode: 1, cwd: currentCwd, durationMs: 0, permission: "deny" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (perm.effect === "ask") {
        return new Response(
          JSON.stringify({ ok: false, requiresApproval: true, command, reason: perm.reason || "This command requires approval", cwd: currentCwd }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const startTime = Date.now();

    // ─── cd ───
    if (command.startsWith("cd ")) {
      const target = command.slice(3).trim();
      let newCwd = currentCwd;
      if (target.startsWith("/")) newCwd = target;
      else if (target === "..") { const parts = currentCwd.split("/").filter(Boolean); parts.pop(); newCwd = "/" + parts.join("/"); }
      else if (target === "~") newCwd = "/home/runner";
      else newCwd = currentCwd === "/" ? `/${target}` : `${currentCwd}/${target}`;
      return new Response(
        JSON.stringify({ ok: true, stdout: "", stderr: "", exitCode: 0, cwd: newCwd, durationMs: 5 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Safe builtins (echo, pwd, date, etc.) ───
    const builtin = executeBuiltin(command, currentCwd);
    if (builtin.handled) {
      const durationMs = Date.now() - startTime;
      if (project_id && user?.id) {
        db.from("runs").insert({
          project_id, user_id: user.id, command,
          stdout: (builtin.stdout || "").slice(0, 10000),
          stderr: (builtin.stderr || "").slice(0, 10000),
          exit_code: builtin.exitCode ?? 0,
          status: (builtin.exitCode ?? 0) === 0 ? "success" : "failed",
        }).then(() => {}).catch(() => {});
      }
      const stream = new ReadableStream({
        start(controller) {
          if (builtin.stderr) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stderr", data: builtin.stderr })}\n\n`));
          if (builtin.stdout) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stdout", data: builtin.stdout })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: builtin.exitCode ?? 0, cwd: builtin.newCwd || currentCwd, durationMs })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // ─── All other commands: forward to Runner Node ───
    if (!project_id) {
      return new Response(
        JSON.stringify({
          ok: false, exitCode: 1, cwd: currentCwd, durationMs: 0,
          stdout: "", stderr: "Runner execution unavailable: no project context.",
          runner_unavailable: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runnerNode = await selectRunnerNode(project_id, db);
    if (!runnerNode) {
      const durationMs = Date.now() - startTime;
      // Persist the failed run
      if (user?.id) {
        db.from("runs").insert({
          project_id, user_id: user.id, command,
          stderr: "No runner node available. Connect a runner to execute commands.",
          exit_code: 1, status: "failed",
        }).then(() => {}).catch(() => {});
      }
      return new Response(
        JSON.stringify({
          ok: false, exitCode: 1, cwd: currentCwd, durationMs,
          stdout: "",
          stderr: "No runner node available. Connect a runner to execute commands.",
          runner_unavailable: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward command to runner node
    try {
      const runnerResp = await fetch(`${runnerNode.base_url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwd: currentCwd, timeout_s: timeoutS, project_id, files }),
        signal: AbortSignal.timeout(timeoutS * 1000 + 5000),
      });

      const contentType = runnerResp.headers.get("content-type") || "";

      // If runner returns SSE, proxy the stream
      if (contentType.includes("text/event-stream")) {
        const body = runnerResp.body;
        if (!body) {
          return new Response(
            JSON.stringify({ ok: false, exitCode: 1, cwd: currentCwd, stderr: "Empty runner response", durationMs: Date.now() - startTime }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Proxy SSE stream from runner -> client, and persist run on completion
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        let stdout = "";
        let stderr = "";
        let exitCode = 1;
        let resultCwd = currentCwd;
        let resultDurationMs = 0;

        (async () => {
          const reader = body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              await writer.write(encoder.encode(chunk));

              // Parse SSE events for persistence
              let idx: number;
              while ((idx = buffer.indexOf("\n\n")) !== -1) {
                const segment = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                for (const line of segment.split("\n")) {
                  if (!line.startsWith("data: ")) continue;
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.type === "stdout") stdout += parsed.data;
                    else if (parsed.type === "stderr") stderr += parsed.data;
                    else if (parsed.type === "done") {
                      exitCode = parsed.exitCode ?? 1;
                      resultCwd = parsed.cwd || currentCwd;
                      resultDurationMs = parsed.durationMs || (Date.now() - startTime);
                    }
                  } catch { /* partial JSON */ }
                }
              }
            }
          } catch { /* stream error */ }

          // Persist run
          if (user?.id) {
            db.from("runs").insert({
              project_id, user_id: user.id, command,
              stdout: stdout.slice(0, 10000), stderr: stderr.slice(0, 10000),
              exit_code: exitCode, status: exitCode === 0 ? "success" : "failed",
            }).then(() => {}).catch(() => {});
          }

          await writer.close();
        })();

        return new Response(readable, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }

      // JSON response from runner
      const data = await runnerResp.json();
      const durationMs = data.durationMs || (Date.now() - startTime);

      if (user?.id) {
        db.from("runs").insert({
          project_id, user_id: user.id, command,
          stdout: (data.stdout || "").slice(0, 10000),
          stderr: (data.stderr || "").slice(0, 10000),
          exit_code: data.exitCode ?? 1,
          status: (data.exitCode ?? 1) === 0 ? "success" : "failed",
        }).then(() => {}).catch(() => {});
      }

      return new Response(
        JSON.stringify({ ...data, durationMs }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;

      if (user?.id) {
        db.from("runs").insert({
          project_id, user_id: user.id, command,
          stderr: `Runner error: ${errMsg}`.slice(0, 10000),
          exit_code: 1, status: "failed",
        }).then(() => {}).catch(() => {});
      }

      return new Response(
        JSON.stringify({
          ok: false, exitCode: 1, cwd: currentCwd, durationMs,
          stdout: "", stderr: `Runner error: ${errMsg}`,
          runner_unavailable: errMsg.includes("connection") || errMsg.includes("timeout"),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("run-command error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
