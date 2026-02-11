

## Plan: forwardRef Fixes, Terminal Collapse Polish, and AI Chat Titling

### 1. Fix forwardRef Warnings (HooksConfig + ProtocolZone)

Neither `HooksConfig` nor `ProtocolZone` actually receive refs from the layout -- they are rendered as plain JSX elements. The warnings likely come from Radix or other wrapper components. Since no refs are passed, the simplest fix is to wrap both in `React.forwardRef` as a defensive measure to silence any warnings.

**Files:**
- `src/components/ide/HooksConfig.tsx` -- Wrap export in `forwardRef`, forward ref to outer div
- `src/components/ide/ProtocolZone.tsx` -- Same treatment

### 2. Terminal Panel Collapse Polish

**Problem:** When `showOutput` is false, the terminal sets `h-8` (header only), but it lives inside a `Panel` with `minSize={10}` which prevents it from truly collapsing to just the header bar. The panel keeps 10% height even when collapsed.

**Fix:**
- In `IDELayout.tsx`, use the `collapsible` and `collapsedSize` props on the terminal `Panel` so it can shrink to just the header height
- Wire the terminal's `showOutput` toggle to the Panel's `onCollapse`/`onExpand` callbacks
- When collapsed, the terminal shows only its header bar flush against the bottom status bar
- Remove `minSize={10}` and replace with `collapsible collapsedSize={0}` pattern, using a ref to the panel API

**Files:**
- `src/components/ide/IDELayout.tsx` -- Add `collapsible`, `collapsedSize`, and panel ref to terminal Panel; sync with `showOutput` state
- `src/components/ide/TerminalPanel.tsx` -- Remove `h-8` collapsed height logic; always render `h-full` and let the Panel handle collapse

### 3. AI-Generated Chat Titles

**Current state:** `deriveTitle()` truncates the first user message to 40 characters. This produces unhelpful titles like "Can you help me with the thing where I n..."

**New approach:** After the first assistant reply arrives, call the AI to generate a concise 3-5 word title for the conversation. This title is persisted to the database for training data.

**Implementation:**
- Create a new utility function `generateChatTitle(messages: ChatMessage[]): Promise<string>` in a new file `src/lib/chat-title.ts`
- This function calls the existing `streamChat` or a lightweight edge function with a small prompt: "Summarize this conversation in 3-5 words as a title. Return only the title."
- In `IDEContext.tsx`, after the first assistant response is added to `chatMessages`, if the current title is still "New Chat", trigger `generateChatTitle` and update the conversation title
- The derived title is saved to the `conversations` table via `saveConversation`, making it available for training data
- Fallback: if the AI call fails, fall back to the current truncation approach

**Files:**
- New: `src/lib/chat-title.ts` -- Title generation utility
- `src/contexts/IDEContext.tsx` -- Trigger title generation after first assistant reply; update conversation title in state and DB

### Technical Details

**Terminal collapsible panel pattern:**
```text
<Panel
  ref={terminalPanelRef}
  defaultSize={30}
  minSize={10}
  collapsible
  collapsedSize={0}
  onCollapse={() => setShowOutput(false)}
  onExpand={() => setShowOutput(true)}
>
```

The toggle button in TerminalPanel will call `terminalPanelRef.current?.collapse()` or `expand()` instead of just toggling a boolean.

**Chat title generation prompt:**
The title generator will send the first user message and first assistant reply to the AI with a system prompt requesting a concise title. It uses the cheapest available model (e.g., `google/gemini-2.5-flash-lite`) to minimize cost.

**Data storage:** Titles are already persisted in the `conversations` table's `title` column -- no schema changes needed.

### Summary

| File | Change |
|------|--------|
| `HooksConfig.tsx` | Wrap in `forwardRef` |
| `ProtocolZone.tsx` | Wrap in `forwardRef` |
| `IDELayout.tsx` | Add collapsible panel props for terminal |
| `TerminalPanel.tsx` | Remove h-8 logic, accept collapse/expand callbacks |
| `src/lib/chat-title.ts` | New: AI title generation utility |
| `IDEContext.tsx` | Trigger AI title after first assistant reply |

