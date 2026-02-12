
# Started.dev — Implementation Plan

## ✅ Completed

### 1. Blank Project Creation
- New projects open with only `STARTED.md` — no demo files (main.ts, utils.ts, etc.)
- Default tab opens STARTED.md
- CA snapshot seeds from blank state

### 2. Ultimate Agent System Prompt (ClawdBot-level)
- Agent system prompt rewritten for full autonomy: never refuses, never asks questions, always acts
- Enhanced capabilities: multi-file patches, MCP tool calls, project scaffolding, dependency installation
- Failure handling: retries with different approaches, max iteration bumped to 15 (cap 50)
- Agency override: agent has FULL authority to do anything the user asks
- Retrospective + Ship Mode prompts retained for post-run analysis

### 3. Backend Prompt Wiring
- `supabase/functions/started/index.ts` — Chat prompt enhanced with full-stack intent + agency
- `supabase/functions/agent-run/index.ts` — Agent prompt rewritten as autonomous engineer
- `src/lib/started-prompt.ts` — Client-side prompt kept in sync with edge function
- Both edge functions deployed and live

## Architecture

### Chat Flow
User message → `started` edge function → system prompt + context + skills → AI gateway → SSE stream → client

### Agent Flow  
User goal → `agent-run` edge function → autonomous loop (think → act → verify) → SSE events → client applies patches/runs commands

### Key Files
- `src/contexts/IDEContext.tsx` — IDE state, file management, agent orchestration
- `src/lib/api-client.ts` — Client-side API for chat streaming + agent streaming
- `supabase/functions/started/index.ts` — Chat AI endpoint
- `supabase/functions/agent-run/index.ts` — Autonomous agent endpoint
- `src/lib/started-prompt.ts` — Shared prompt definitions
