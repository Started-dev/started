
# Cursor-Style Agent Output UI + Functional Skills

This plan focuses on two areas: redesigning the assistant message rendering to match Cursor's polished agent output, and making the Skills system functional with real indicators.

---

## Part 1: Cursor-Style Assistant Message Redesign

The current `AssistantMessage` parses raw markdown into basic blocks (plan, diff, command, text). Cursor's UI shows distinct visual elements: collapsible "Thought Xs" with timing, inline muted tool actions ("Grepped...", "Listed...", "Reading..."), and interactive Question cards with A/B/C/D options.

### New Components to Create

**ThoughtBlock.tsx** -- Collapsible thinking section
- Amber/orange "Thought" label with elapsed time (e.g., "Thought 9s")
- Collapsed by default, click to expand full reasoning
- Uses the `#F5A623` accent color for the label
- Content rendered as muted monospace text inside

**ToolActionBlock.tsx** -- Inline tool action indicators
- Compact single-line indicators: "Grepped codebase", "Listed src/", "Reading README.md"
- Muted green/gray text, no borders or backgrounds
- Stacked vertically with tight spacing (like Cursor shows)
- Detects patterns: `Grepped ...`, `Listed ...`, `Reading ...`, `Edited ...`, `Created ...`

**PlanBlock.tsx** -- Clean numbered plan with visual steps
- Numbered steps with small circles or bullet markers
- Clean sans-serif text (not raw monospace)
- Optional checkmarks for completed steps
- Left border accent in orange

**QuestionCard.tsx** -- Structured question card with selectable options
- Bordered card with question icon header
- Labeled options (A, B, C, D) with descriptions
- "Other..." free-text option
- "Skip" and "Continue" buttons at the bottom
- When user selects an option and clicks Continue, it sends that choice as a message

### Changes to AssistantMessage.tsx

Overhaul the `parseBlocks` function to detect new block types:
- `thought` -- detected by "Thought Xs" pattern or `<thought>` tags
- `tool_action` -- detected by "Grepped", "Listed", "Reading", "Edited" at line start
- `question` -- detected by numbered options with A/B/C/D labels
- Existing `plan`, `diff`, `command`, `code`, `text` types remain

Improve rendering:
- Remove the divider lines between blocks (cleaner look)
- Add the orange left-border accent on the current/latest assistant message
- Tighter spacing between tool action lines
- Better typography hierarchy (sans-serif for prose, mono only for code)

### Changes to AnimatedDiffBlock.tsx

- Add a filename tab at the top (extract from `--- a/path` or `+++ b/path` lines)
- Show `+N -M` line count badge next to filename
- Add a copy button in the top-right corner
- Keep the existing line-by-line animation

---

## Part 2: Functional Skills System

### Changes to SkillsBrowser.tsx

- Remove fake source labels ("ClawHub", "SkillsMP", "Awesome") -- replace with "Built-in" for all current skills
- Add a "Test Skill" button: sends a small test prompt with the skill active and shows the AI's response inline in a toast or expandable section
- Add a "Preview Prompt" toggle to see the raw `systemPrompt` that gets injected

### Active Skills Indicator in Chat

- In `ChatHeader.tsx`, add a small skills indicator showing count of active skills (e.g., sparkle icon + "3 skills")
- Clicking it opens the SkillsBrowser

### Changes to skills-catalog.ts

- Change all `source` values to a new `'built-in'` source type
- Update `sourceLabels` map accordingly
- Keep all existing `systemPrompt` values (they are real and functional)

---

## Files to Create
- `src/components/ide/chat/ThoughtBlock.tsx`
- `src/components/ide/chat/ToolActionBlock.tsx`
- `src/components/ide/chat/PlanBlock.tsx`
- `src/components/ide/chat/QuestionCard.tsx`

## Files to Modify
- `src/components/ide/chat/AssistantMessage.tsx` -- new block types and rendering
- `src/components/ide/chat/AnimatedDiffBlock.tsx` -- filename header, copy button
- `src/components/ide/chat/ChatHeader.tsx` -- active skills indicator
- `src/components/ide/SkillsBrowser.tsx` -- remove fake labels, add test button
- `src/data/skills-catalog.ts` -- source cleanup
- `src/types/ide.ts` -- add `thought` and `tool_action` block-related types if needed

## No Database Changes Required

All changes are purely frontend UI. Skills already work via `systemPrompt` injection into the chat context -- this plan makes that visible and testable.
