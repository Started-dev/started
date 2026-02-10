

# Advanced AI System + MCP-Augmented Chat + OpenClaw Deploy Interface

## Important Clarification: Ollama + Claude Code

Ollama is a tool for running AI models locally on physical hardware. It cannot be integrated into this project because:
- Started runs on Lovable Cloud (edge functions in the cloud), which cannot host local GPU processes
- "Free tokens" via Ollama still costs GPU hardware/electricity -- it shifts cost, doesn't eliminate it
- Claude Code is a CLI tool, not an API you can embed

**What we CAN do**: The project already has Lovable AI Gateway access (Gemini 3 Flash, Gemini 2.5 Pro, GPT-5, etc.) at no API key cost to users. We'll add **model selection** so users can pick the best model for their task, and enhance the AI pipeline to be significantly more powerful.

---

## What We'll Build

### 1. Model Selector in Chat

Add a dropdown in the chat input area letting users pick from available models:
- google/gemini-3-flash-preview (default, fast)
- google/gemini-2.5-pro (heavy reasoning)
- google/gemini-3-pro-preview (next-gen)
- openai/gpt-5 (powerful all-rounder)
- openai/gpt-5-mini (balanced)

The selected model is sent to the `started` edge function and forwarded to the gateway.

### 2. MCP-Augmented AI Chat and Agent

**The big gap today**: MCP connections exist (GitHub, Slack, Notion, etc.) but the AI chat and agent never use them. We'll wire enabled MCP servers into the AI context pipeline.

Changes:
- **`sendMessage` in IDEContext**: Before calling `streamChat`, gather enabled MCP servers and their available tools, inject a tools manifest into the system prompt context so the AI knows what tools are available
- **`started` edge function**: Accept an optional `mcp_tools` field; append a "Available MCP Tools" section to the system prompt listing tool names and descriptions
- **`agent-run` edge function**: Same treatment -- inject MCP tool availability into the agent's system prompt so it can request MCP tool calls as actions
- **New action type in agent**: `mcp_call` -- when the agent wants to use an MCP tool, the client intercepts it, calls `callMCPTool`, and feeds the result back

### 3. Richer Chat Input (Attachments, Web Search, URL Fetch)

Expand the chat input area with new context chip types:
- **@url** -- paste a URL, fetch its content via Firecrawl/Perplexity MCP, inject as context
- **@web** -- trigger a web search query via Perplexity, inject results as context
- **@image** -- attach an image (base64 encode for multimodal models like Gemini)

New chips in ChatPanel:
- `@url` button (enabled when Firecrawl is connected)
- `@web` button (enabled when Perplexity is connected)
- `@image` button (file picker, converts to base64)

### 4. Verify File Explorer Integration

The current code ALREADY pushes AI-generated files to the Explorer via:
- `autoApplyParsedPatches()` -- applies unified diffs, creates folders, persists to DB
- `autoCreateFileBlocks()` -- creates files from ```lang filepath blocks

However, there's a gap: the **agent's `onPatch`** callback applies patches but doesn't always open created files in the explorer visibly. We'll ensure:
- New files from agent patches are opened in tabs and highlighted in the file tree
- A toast notification shows "Created: /path/to/file.ts" for each new file
- The agent's `onRunCommand` results are also checked for file creation patterns

### 5. OpenClaw Deployable Interface

Create a new panel `OpenClawPanel.tsx` accessible from the toolbar that provides:
- **Connection Setup**: Configure OpenClaw instance URL + API key
- **Status Dashboard**: Show OpenClaw status, installed skills, active tasks
- **Deploy from Started**: One-click deployment of project files to an OpenClaw instance
  - Package project files and push via OpenClaw API
  - Show deployment progress and logs
- **Task Management**: View/cancel/create OpenClaw autonomous tasks from within Started
- **Skill Management**: Install/uninstall OpenClaw skills

---

## Technical Details

### Files Changed

**Edge Functions:**
- `supabase/functions/started/index.ts` -- Accept `model` and `mcp_tools` params; use selected model; inject MCP context into system prompt
- `supabase/functions/agent-run/index.ts` -- Accept `mcp_tools` param; add `mcp_call` action type; inject MCP tool manifest into agent system prompt

**Frontend - AI Pipeline:**
- `src/lib/api-client.ts` -- Add `model` param to `streamChat` and `streamAgent` options; add `mcpTools` param
- `src/contexts/IDEContext.tsx`:
  - `sendMessage`: Gather enabled MCP servers' tools, pass to API; add model selection state
  - `startAgent`: Same MCP tool injection; handle new `mcp_call` action type from agent stream
  - Add `selectedModel` / `setSelectedModel` to context
  - Add toast notifications when agent creates new files
  - Add `fetchUrlContent` and `webSearch` helpers that use MCP tools

**Frontend - Chat UI:**
- `src/components/ide/ChatPanel.tsx`:
  - Add model selector dropdown above input
  - Add @url, @web, @image chip buttons
  - Add image file picker dialog
  - Show MCP tool usage inline in chat

**Frontend - New Components:**
- `src/components/ide/OpenClawPanel.tsx` -- Full OpenClaw management panel with tabs for Status, Deploy, Tasks, Skills
- `src/components/ide/ModelSelector.tsx` -- Reusable model picker dropdown

**Types:**
- `src/types/ide.ts` -- Add 'url', 'web', 'image' to ContextChip type union
- `src/types/agent.ts` -- Add 'mcp_call' to AgentStepType

**IDE Layout:**
- `src/components/ide/IDELayout.tsx` -- Add OpenClaw button to toolbar (Claw/Terminal icon)

### MCP Integration Flow

```text
User sends message
      |
      v
Gather enabled MCP servers + their tool lists
      |
      v
Inject "Available Tools" manifest into context
      |
      v
AI sees available tools, can reference them in response
      |
      v
(Agent mode) AI returns { action: "mcp_call", tool: "github_create_issue", input: {...} }
      |
      v
Client calls callMCPTool() with stored tokens
      |
      v
Result fed back to agent conversation history
      |
      v
Agent continues loop with MCP result context
```

### Model Selection Flow

- Default: `google/gemini-3-flash-preview`
- State stored in IDEContext as `selectedModel`
- Passed through `streamChat({ model })` to edge function
- Edge function forwards to gateway with selected model

### OpenClaw Deploy Flow

1. User opens OpenClaw panel, configures instance URL + API key (stored in sessionStorage)
2. Clicks "Deploy Project"
3. Frontend packages all project files as JSON
4. Calls `mcp-openclaw` edge function with a new `openclaw_deploy` tool
5. OpenClaw receives files and deploys them
6. Progress/status shown in the panel

### No Breaking Changes

- Model defaults to current `gemini-3-flash-preview` if not specified
- MCP tools are only injected if servers are enabled and have tokens configured
- All new chat chips are optional additions
- OpenClaw panel is a new opt-in feature

