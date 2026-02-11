

## Plan: Add NBA Policy JSON Schema + Fix Model Selector Overflow

### 1. Fix Model Selector Dropdown (UI Bug)

**Problem**: The dropdown opens upward via `bottom-full` positioning, but with 12 models the list exceeds the viewport height and gets cut off at the top of the screen.

**Fix in `src/components/ide/ModelSelector.tsx`**:
- Use a Popover from Radix (`@radix-ui/react-popover`, already installed) instead of the manual absolute-positioned div. Radix Popover handles collision detection and auto-flips when there's not enough space.
- Remove the manual `useEffect` click-outside handler (Popover handles this natively).
- Keep the same visual styling (compact trigger, provider color badges, etc.).
- Set `side="top"` with `avoidCollisions={true}` so it prefers opening upward but flips down when clipped.

### 2. Add NBA Policy JSON Schema

**New file: `src/lib/policies/nba.policy.schema.json`**
- Store the full JSON Schema (draft 2020-12) exactly as provided by the user.
- This enables server-side and client-side validation of policy configs.

### 3. Add Policy Validation Utility

**New file: `src/lib/policies/validate-policy.ts`**
- Create a `validateNBAPolicy(input: unknown)` function that validates a policy object against the schema.
- Use a lightweight approach: since we already have `zod` installed, build a Zod schema that mirrors the JSON Schema constraints (required fields, types, ranges, enum values for action keys).
- Export both the raw JSON Schema (for edge functions / server-side use) and the Zod validator (for client-side use).
- Return `{ valid: boolean; errors: string[] }`.

### 4. Update Policy Index

**Edit: `src/lib/policies/index.ts`**
- Re-export the schema and validation function.

### Technical Details

**ModelSelector rewrite** (using Radix Popover):
```
Popover (open state controlled)
  PopoverTrigger -> existing compact button
  PopoverContent (side="top", avoidCollisions, sideOffset=4)
    -> scrollable model list (max-h-[280px])
```

**Zod validation schema** covers:
- `version`: integer >= 1
- `max_actions.primary`: 1-3, `secondary`: 0-5
- `confidence_thresholds`: numbers 0-1
- `weights.*`: record of string->number (0-1000)
- `gates.hard_deny_command_patterns`: string array
- `action_overrides`: typed with action key enums
- Hard-coded `ACTION_KEY_ENUM` array matching the JSON Schema's `actionKey` enum (16 canonical keys)

### Files Changed
| File | Action |
|------|--------|
| `src/components/ide/ModelSelector.tsx` | Rewrite to use Radix Popover |
| `src/lib/policies/nba.policy.schema.json` | New -- JSON Schema |
| `src/lib/policies/validate-policy.ts` | New -- Zod validator |
| `src/lib/policies/index.ts` | Add schema + validator exports |
