

# Started.dev Production Readiness Audit + Feature Roadmap

## Critical Issues Found

### 1. Mock Data / Fake Execution Still Present

**`src/lib/tool-executor.ts` (lines 132-227)** -- The `executeToolLocally` function contains hardcoded mock outputs:
- `git_status` returns fake "nothing to commit" (line 177-180)
- `run_command` returns simulated test output with `[mock] Command executed successfully` (lines 187-200)
- Comment on line 132 literally says `"mock executor -- TODO: wire to real backend"`

This function is still called from `IDEContext.tsx` line 452 for tool calls. Must be replaced with real backend calls or removed.

**`src/lib/runner-client.ts`** -- The `RemoteRunnerClient.exec()` method (lines 50-87) returns empty stub results for non-cd commands. `syncWorkspace` and `killProcess` are no-ops. This class exists but does nothing useful -- all real execution goes through `runCommandRemote` in `api-client.ts`, making this an abandoned abstraction.

### 2. Stripe Checkout Has Placeholder Price IDs

**`supabase/functions/stripe-checkout/index.ts` (line 25-28)** -- Price IDs fall back to `"price_builder_placeholder"`, `"price_pro_placeholder"`, `"price_studio_placeholder"`. Without setting the `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO` environment secrets, all checkout attempts will fail.

**`STRIPE_SECRET_KEY`** is also not in the configured secrets list, meaning checkout currently returns a 503 "Stripe is not configured" error.

### 3. Stripe Webhook Has Double JSON Parse Bug

**`supabase/functions/stripe-checkout/index.ts` (lines 159-162)** -- The webhook handler calls `await req.json()` TWICE (once at line 74 for `action`, then again at line 161 for `event`). The second parse will fail since the body stream is already consumed.

### 4. Auth Token Not Forwarded to AI Gateway

**`src/lib/api-client.ts` (line 18)** -- The `streamChat` function sends `Authorization: Bearer ${SUPABASE_KEY}` (the anon key) instead of the user's session token. This means the `started` edge function cannot identify the user for quota tracking. The same issue exists in `streamAgent` (line 221) and `runCommandRemote` (line 131).

### 5. Agent Run Assumes Patches Always Succeed

**`supabase/functions/agent-run/index.ts` (line 341)** -- After emitting a patch event, the agent blindly tells the AI "The patch was applied successfully" without verifying. If the client-side apply fails, the agent continues with a false premise.

### 6. `run-command` Has No Real Command Execution

The edge function only handles builtins (echo, pwd, etc.), inline JS/Python eval, and a few pattern matches. For any real command (`npm test`, `npm install`, `cargo build`), it returns exit code 127 "command requires a runner session." There is no actual runner/container integration -- the terminal is essentially decorative for real workflows.

---

## Non-Critical Issues

### 7. CORS Wildcard on All Edge Functions
All functions use `Access-Control-Allow-Origin: *`. For production with auth tokens, this should be restricted to the Started.dev domain.

### 8. No Rate Limiting on Anonymous Endpoints
`apply-patch`, `run-command`, and `agent-run` all have `verify_jwt = false` in config.toml. While they do auth checks internally, they accept unauthenticated requests which could be abused.

### 9. Conversation History Sends Only Last 10 Messages
`IDEContext.tsx` line 683 slices to `.slice(-10)`, losing context in long sessions. Should be token-budget-aware rather than a fixed count.

### 10. Demo Files Seeded on Every New Project
When a user creates a project, if no files exist, `DEMO_FILES` (main.ts, utils.ts, etc.) are auto-seeded (line 348-349). This is confusing for production users who want a blank project.

### 11. `max_projects` Limit Not Enforced
The `billing_plans` table has `max_projects` (2 for free, 10 for builder, etc.) but `createProject` in `use-project-persistence.ts` never checks this limit. Users can create unlimited projects.

### 12. No Stripe Webhook Signature Verification
Line 160 of `stripe-checkout` has a comment "In production, verify the Stripe signature here" but does not implement it. This allows spoofed webhook events.

---

## Implementation Plan

### Phase 1: Remove Mocks + Fix Bugs (Critical)

**1.1 Remove mock tool executor**
- Delete mock implementations in `executeToolLocally` for `run_command` and `git_status`
- Route `run_command` tool calls through `runCommandRemote` instead
- Route `git_status` through a real endpoint or return an honest "not available" message

**1.2 Clean up runner-client.ts**
- Either remove the `RemoteRunnerClient` class entirely (since `runCommandRemote` handles everything) or wire it to real endpoints
- Remove the dead `exec()` method that returns empty results

**1.3 Forward user auth token to edge functions**
- In `api-client.ts`, get the current session token from Supabase auth and use it instead of the anon key for `Authorization` headers
- This enables proper user identification for quota tracking

**1.4 Fix Stripe webhook double-parse bug**
- Store the initial `req.json()` result and branch on `action` from that same object
- Add Stripe webhook signature verification using `STRIPE_WEBHOOK_SECRET`

**1.5 Add Stripe secrets configuration**
- Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO` as required secrets
- Remove placeholder fallbacks so misconfiguration fails loudly

### Phase 2: Enforce Billing Limits

**2.1 Enforce max_projects quota**
- Before inserting a new project, check the user's plan and current project count
- Return a clear upgrade message if at limit

**2.2 Enforce runner minute quotas**
- Track cumulative command execution time in `api_usage_ledger.runner_minutes`
- Block runs when quota exceeded

**2.3 Enforce MCP call quotas**
- Increment `mcp_calls` in the ledger on each MCP invocation
- Block when exceeded

### Phase 3: Security Hardening

**3.1 Restrict CORS**
- Set `Access-Control-Allow-Origin` to `https://started.dev` (and preview domain) instead of `*`

**3.2 Add JWT verification to sensitive endpoints**
- Change `verify_jwt = true` for `apply-patch`, `run-command`, `agent-run`, and `stripe-checkout` in config.toml
- Remove internal auth fallback logic since JWT will be required

**3.3 Add Stripe webhook signature verification**
- Use the `stripe-signature` header to verify webhook payloads

### Phase 4: Production Polish

**4.1 Smart context windowing**
- Replace the fixed `.slice(-10)` with a token-budget-aware approach that includes more history when messages are short

**4.2 Remove demo file seeding**
- New projects should start empty, or offer a template selector

**4.3 Agent verification loop**
- After patch apply, actually verify the result before telling the AI it succeeded

---

## Revenue-Critical Feature Gaps

### Features to Add for Revenue Growth

1. **Landing Page / Marketing Site** -- Currently the app redirects straight to `/auth`. There is no public-facing page explaining what Started.dev is, showing pricing, or converting visitors. This is the single biggest blocker for revenue.

2. **Onboarding Flow** -- After signup, users land in a blank IDE with demo files. Add a guided first-run experience: pick a template, connect a repo, or describe what to build.

3. **GitHub Integration** -- Import/export from GitHub repos. Users need to work on real projects, not just in-browser sandboxes. The MCP server for GitHub exists but there's no direct repo clone/push UI.

4. **Real Terminal Execution** -- The current terminal only handles builtins and inline eval. Without `npm install`, `npm test`, etc. actually working, the IDE cannot be used for real development. This requires either a container runner service or integration with a cloud execution provider.

5. **Team/Organization Billing** -- The current billing is per-user. Add workspace-level billing so teams can share a plan.

6. **Usage Analytics Dashboard** -- Beyond the basic meters in settings, provide insight into which MCP tools are used most, average agent run success rates, etc. This drives upsell conversations.

---

## Technical Debt Summary

| Item | Severity | Revenue Impact |
|------|----------|---------------|
| Mock tool executor | Critical | Breaks trust -- users see fake output |
| No real terminal execution | Critical | Product unusable for real work |
| Stripe not configured | Critical | Cannot collect payment |
| Auth token not forwarded | High | Quota tracking broken |
| No landing page | High | No conversion funnel |
| Webhook double-parse bug | Medium | Plan upgrades may silently fail |
| CORS wildcard | Medium | Security risk |
| No project limits enforced | Medium | Revenue leakage on free tier |
| Demo file seeding | Low | Confusing UX |

