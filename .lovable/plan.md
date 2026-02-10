

# Fix Project Creation Bugs, Eliminate Backend Errors, Polish UX, and Build the Runner

## Problem Summary

1. **Project creation fails silently** when the user hits the plan quota -- no user feedback
2. **Console warnings** about refs in `ProjectSwitcher` (AlertDialog wrapping issue)
3. **Runner is not real** -- terminal commands go to an edge function that can only handle builtins and inline eval, not actual `npm install`, `npm test`, etc.
4. Several minor UX polish issues across the IDE

---

## Phase 1: Fix Project Creation and Backend Bugs

### 1.1 Fix silent project creation failure in ProjectSwitcher

**Problem**: `createProject` in `use-project-persistence.ts` returns `null` silently when quota is exceeded. The `IDEContext.createProject` calls `createProjectRaw(name)` and if it returns `null`, nothing happens -- no toast, no error message.

**Fix**:
- In `use-project-persistence.ts` `createProject`: return an error object instead of just `null`, with a reason string (e.g., "Project limit reached")
- In `IDEContext.tsx` `createProject`: show a `toast.error()` when creation fails, with the specific reason
- In `ProjectSwitcher.tsx`: keep the input populated and show inline feedback when creation fails

### 1.2 Fix forwardRef console warnings

**Problem**: `ProjectSwitcher` is wrapped in an `AlertDialog` but the component itself isn't forwarding refs correctly, causing React warnings.

**Fix**: The `AlertDialog` is used correctly at the JSX level, but the component function lacks `forwardRef`. Since `ProjectSwitcher` doesn't actually need a ref, the real fix is to ensure the `AlertDialog` isn't wrapping the component itself -- it's already rendered as a sibling. The warnings come from Radix internals; we can suppress by ensuring `AlertDialogContent` receives its ref properly. This is a known Radix/React 18 issue -- no code change needed, but we can add `React.forwardRef` to `ProjectSwitcher` to silence it.

### 1.3 Add user-facing error toasts for all backend failures

**Problem**: Multiple `console.error` calls in `use-project-persistence.ts` (switchProject, renameProject, deleteProject) silently fail.

**Fix**: Add `toast.error()` calls alongside every `console.error` in the persistence hook so users always see feedback.

---

## Phase 2: UX Polish

### 2.1 ProjectSwitcher creation feedback
- Show a loading spinner on the "Create" button while creation is in-flight
- Show toast on success: "Project created: {name}"
- Show toast on failure: "Cannot create project: {reason}"

### 2.2 Terminal "command not found" messaging
- When the runner returns exit code 127, show a cleaner message: "This command requires a connected runner. Built-in support: echo, pwd, node -e, python -c"
- Add a visual indicator in the terminal header showing runner status (Connected / Sandbox Only)

### 2.3 Model selector default highlight
- Ensure StartedAI shows a "(default)" badge in the selector dropdown

---

## Phase 3: Build a Real Runner for Terminals

### Current State
The terminal currently routes all commands to the `run-command` edge function, which can only:
- Handle shell builtins (echo, pwd, date, etc.)
- Execute inline JS via `node -e` / `deno eval`
- Execute simplified Python via `python -c`
- Everything else returns "command requires a runner session" (exit 127)

### Architecture: Proxy Runner via Edge Function

Since we cannot run containers directly from the frontend, the approach is to make the `run-command` edge function a real execution engine using Deno's subprocess API (`Deno.Command`).

**What changes**:

1. **`supabase/functions/run-command/index.ts`** -- Major rewrite:
   - For commands that match known patterns (node, npm, npx, deno, python, pip, etc.), execute them using `Deno.Command` (Deno's subprocess API) inside the edge function
   - Stream stdout/stderr back to the client via SSE in real-time
   - Enforce timeout (kill after `timeout_s` seconds)
   - Track CWD changes across commands in the same session
   - Keep the denylist and permission checks intact
   - Handle `npm install`, `npm test`, `npm start`, `npx`, `tsc`, etc. natively since Deno edge functions have access to `node`, `npm`, `npx` in their runtime

2. **Workspace file sync**:
   - Before executing a command that needs project files (npm test, node src/main.ts, etc.), the edge function writes project files to a temp directory
   - The frontend sends the current project files as part of the request body (only when needed, gated by command type)
   - After execution, any modified/created files are read back and returned to the frontend

3. **`src/lib/api-client.ts`** -- Update `runCommandRemote`:
   - Add optional `files` parameter to the request body for workspace sync
   - Handle new response fields for file changes after execution

4. **`src/contexts/IDEContext.tsx`** -- Update `runCommand`:
   - For commands that need project files (npm, node, python with file args, etc.), include `files` in the request
   - After execution completes, if the response includes updated files, merge them into the IDE state

5. **`src/components/ide/TerminalPanel.tsx`** -- Polish:
   - Show runner status indicator (edge runner / sandbox)
   - Show "Syncing files..." indicator when files are being uploaded
   - Better streaming output rendering

### Supported Command Patterns (Real Execution)

| Pattern | Execution Method |
|---------|-----------------|
| `node file.js` | `Deno.Command("node", [...])` |
| `npm install/test/start/run` | `Deno.Command("npm", [...])` |
| `npx ...` | `Deno.Command("npx", [...])` |
| `deno run file.ts` | `Deno.Command("deno", [...])` |
| `python file.py` | `Deno.Command("python3", [...])` |
| `pip install ...` | `Deno.Command("pip3", [...])` |
| `tsc` | `Deno.Command("npx", ["tsc", ...])` |
| Shell builtins | Handled inline (existing) |
| Inline eval | Handled inline (existing) |

### Edge Function Runtime Capabilities

Deno edge functions (Supabase) run on Deno Deploy which has limitations:
- `Deno.Command` may not be available on all edge runtimes
- If `Deno.Command` is unavailable, fall back to the current sandbox behavior but with a clear message

The implementation will feature-detect `Deno.Command` availability and gracefully degrade.

### Security (Maintained)

- Denylist patterns still enforced before any execution
- Project permission rules still checked
- Timeout enforcement via `AbortSignal` on subprocess
- No access to host secrets (env vars are scoped)
- Run audit logging to `runs` table preserved

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/use-project-persistence.ts` | Modify | Add error reasons to createProject, add toast calls |
| `src/contexts/IDEContext.tsx` | Modify | Add toast on project creation failure |
| `src/components/ide/ProjectSwitcher.tsx` | Modify | Add loading state, error feedback |
| `src/components/ide/TerminalPanel.tsx` | Modify | Add runner status indicator, polish output |
| `src/components/ide/ModelSelector.tsx` | Modify | Add "(default)" badge to StartedAI |
| `src/lib/api-client.ts` | Modify | Add files param to runCommandRemote |
| `supabase/functions/run-command/index.ts` | Major rewrite | Real subprocess execution with Deno.Command |

---

## Implementation Order

1. Fix project creation bugs and add toasts (Phase 1) -- immediate impact
2. UX polish (Phase 2) -- quick wins
3. Build real runner (Phase 3) -- core feature, deploy and test incrementally
