

# Fix Skills Browser: Scrolling and Functionality

## Problems

1. **Not scrollable**: The `ScrollArea` has `flex-1` but lacks `min-h-0` on its flex parent, so it never constrains height and Radix cannot calculate scroll bounds.
2. **Skills do nothing**: The `activeSkills` state lives in `IDELayout` but is never passed down to `ChatPanel` or the agent system. Toggling a skill on/off has zero effect on AI behavior.

## Changes

### 1. Fix scroll in SkillsBrowser (`src/components/ide/SkillsBrowser.tsx`)

- Add `min-h-0` to the outer flex container (`max-h-[85vh]` div) so the `ScrollArea` with `flex-1` can properly shrink and scroll
- Add `overflow-hidden` to the `ScrollArea` wrapper for safety

### 2. Pass activeSkills through to ChatPanel

**`src/contexts/IDEContext.tsx`**:
- Add `activeSkills` and `setActiveSkills` to the IDE context value and provider interface
- Move `activeSkills` state from `IDELayout` into `IDEContext` so it's accessible everywhere

**`src/components/ide/IDELayout.tsx`**:
- Remove local `activeSkills` state, consume from `useIDE()` instead
- Pass through to `SkillsBrowser` unchanged

### 3. Inject active skills into agent runs

**`src/components/ide/ChatPanel.tsx`**:
- Read `activeSkills` from `useIDE()`
- When sending a message or starting an agent, look up active skill entries from `SKILLS_CATALOG` and append their descriptions as context chips (type `'attachment'`, label like "Skill: React Best Practices")
- This means active skills automatically get injected into the AI's context window as part of the conversation

### 4. Show active skills in chat context strip

**`src/components/ide/ChatPanel.tsx`**:
- Display a small indicator showing how many skills are active (e.g., a Sparkles chip in the context strip area)
- Users can see at a glance that skills are influencing the AI

## Technical Details

### Scroll fix (one-line change):
```
// Before:
<div className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-lg shadow-xl flex flex-col">

// After:
<div className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-lg shadow-xl flex flex-col min-h-0 overflow-hidden">
```

### Context injection pattern:
When sending a message, active skills get appended as context chips:
```typescript
const activeSkillChips = activeSkills
  .map(id => SKILLS_CATALOG.find(s => s.id === id))
  .filter(Boolean)
  .map(skill => ({
    type: 'attachment' as const,
    label: `Skill: ${skill.name}`,
    content: `[Agent Skill: ${skill.name}]\nSource: ${skill.source}\nCategory: ${skill.category}\n\n${skill.description}\n\nReference: ${skill.url}`,
  }));
```

### Files Modified
1. `src/components/ide/SkillsBrowser.tsx` -- Fix scroll with `min-h-0 overflow-hidden`
2. `src/contexts/IDEContext.tsx` -- Move `activeSkills` state into context
3. `src/components/ide/IDELayout.tsx` -- Consume `activeSkills` from context instead of local state
4. `src/components/ide/ChatPanel.tsx` -- Inject active skills as context chips on send

