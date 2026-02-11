

# Fix: MoltBot Install — Component Disappears

## Root Cause

In `IntegrationsPanel.tsx` (line 157), the `onOpenOpenClaw` callback passed to `InstallModal` is an empty no-op:

```typescript
onOpenOpenClaw={() => { /* handled by install modal */ }}
```

When you click "OpenClaw / MoltBot" in the Install Services modal:
1. `onClose()` fires -- closes the InstallModal
2. `onOpenOpenClaw()` fires -- does nothing

Result: both dialogs close, nothing opens. The component "disappears."

## Fix

Add a new sub-panel state value `'openclaw'` and wire it up:

### `src/components/ide/IntegrationsPanel.tsx`

1. Add `'openclaw'` to the `SubPanel` type union
2. Import `OpenClawPanel`
3. Add a render branch: when `subPanel === 'openclaw'`, render `<OpenClawPanel onClose={() => setSubPanel(null)} />`
4. Change the `onOpenOpenClaw` prop from `() => {}` to `() => setSubPanel('openclaw')`

### Technical Detail

```text
Before:
  User clicks MoltBot -> onClose() + onOpenOpenClaw() (no-op) -> nothing

After:
  User clicks MoltBot -> onClose() + onOpenOpenClaw() -> setSubPanel('openclaw') -> OpenClawPanel renders
```

This is a 4-line fix in a single file.
