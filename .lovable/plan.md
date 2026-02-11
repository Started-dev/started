

## Fix: AI Chat Flow -- Plans Without Execution

Three root causes identified from network traffic and code analysis. The AI is working (200 responses, streaming correctly), but it outputs plans with `Cmd: ls -F` instead of actually creating/modifying files.

---

### Root Cause 1: AI Has No File Context

The `sendMessage` function (IDEContext.tsx, line 860) sends `STARTED.md` as context but never sends the project file tree or file contents. The AI literally doesn't know what files exist, so it keeps asking to run `ls -F` to find out.

**Fix in `src/contexts/IDEContext.tsx`:**

In the `sendMessage` callback, after the STARTED.md context injection (line 866-869), add a file tree listing and active file contents to the context string:

```
[Project Files]
/src/main.ts
/src/utils.ts
/package.json
/tsconfig.json
/README.md
/STARTED.md

[Active File: /src/main.ts]
<contents>
```

This gives the AI enough information to produce diffs and file blocks directly without needing to run shell commands.

---

### Root Cause 2: System Prompt Forbids Full File Output

The StartedAI system prompt (`src/lib/started-prompt.ts`, line 39) says:
> "Patches only -- never dump full files."

This prevents the AI from creating new files. When a user says "Create a React app scaffold," the AI cannot use the `typescript src/App.tsx` file-block format because the prompt forbids it.

**Fix in `src/lib/started-prompt.ts`:**

Update BOTH system prompts (standard and StartedAI) to:
- Inform the AI that project files are provided in context (no need to run `ls`)
- Allow full file blocks for NEW file creation using the format: ````lang path/to/file.ext`
- Keep "patches only" rule for MODIFYING existing files
- Tell the AI that commands in `Cmd:` blocks are NOT auto-executed (no runner)
- Instruct the AI to produce actionable output (diffs and file blocks) directly

**Fix in `supabase/functions/started/index.ts`:**

Mirror the same prompt changes in the edge function's server-side copy of the prompts (the edge function has its own duplicated prompts at lines 11-62).

---

### Root Cause 3: Duplicate Prompt Issue

The `started` edge function (lines 11-62) has its own hardcoded copies of STARTED_SYSTEM_PROMPT and STARTED_AI_SYSTEM_PROMPT that are completely separate from `src/lib/started-prompt.ts`. The client-side file `started-prompt.ts` is only imported by `IDEContext.tsx` but never sent to the edge function. The edge function uses its own local copies.

This means prompt changes must be made in the edge function file, not the client-side file. The client-side `started-prompt.ts` is effectively dead code for chat (only used by the local `STARTED_SYSTEM_PROMPT` import in IDEContext, which is never actually sent to the API).

**Fix:** Update the prompts in `supabase/functions/started/index.ts` (the actual prompts used by the AI) and keep `src/lib/started-prompt.ts` in sync.

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/started/index.ts` | Update system prompts: add file-context awareness, allow file blocks for new files, remove "inspect first" instructions, note that commands are not auto-executed |
| `src/lib/started-prompt.ts` | Mirror the same prompt changes for consistency |
| `src/contexts/IDEContext.tsx` | In `sendMessage`, inject project file tree + active file contents into the context string sent to the AI |

---

### Technical Detail: Updated System Prompts

**Key additions to both prompts:**

1. "Project files and their contents are provided in context. Do NOT run shell commands to inspect the file system."
2. "For NEW files, use fenced code blocks with the file path: ````lang path/to/file.ext`"
3. "For MODIFYING existing files, use unified diff patches."
4. "Commands in Cmd blocks are suggestions only -- they are not auto-executed. Focus on producing diffs and file blocks."

**Key additions to context injection (IDEContext.tsx):**

1. Build a file tree string from `filesRef.current` listing all file paths
2. Include the contents of the currently active file
3. Include contents of any files referenced in the conversation

This ensures the AI always has enough context to act directly instead of asking to run commands first.

