

## Fix: Integrations Install, Panel Resizing, and Console Errors

### Issues Diagnosed

1. **Install button closes modal without opening InstallModal**: In `IntegrationsPanel.tsx` (line 116-118), clicking "Services" calls `onClose()` and then returns early -- it never sets `subPanel` to `'install'`. The `InstallModal` is rendered conditionally on `subPanel === 'install'` (line 159), but by calling `onClose()` the entire `IntegrationsPanel` unmounts before the modal can appear.

2. **Terminal/Output panel not vertically resizable**: The `TerminalPanel` uses a fixed CSS height (`h-[280px]` / `h-8`) instead of participating in a `PanelGroup` with a drag handle. This means the user cannot resize it by dragging.

3. **Console warnings (refs on function components)**: `HooksConfig` and `ProtocolZone` are function components being passed refs without `forwardRef`. These are non-critical warnings but noisy.

4. **`activeRightPanel` type mismatch**: The context types it as `'chat' | 'agent'` but the IDE casts `'timeline'` and `'protocol'` via `as any`. This is fragile and should be expanded.

---

### Plan

#### 1. Fix Install button in IntegrationsPanel

- Remove the early `onClose(); return;` for the `'install'` key
- Instead, set `subPanel('install')` so the `InstallModal` renders while the panel stays mounted
- Same pattern already works for `'mcp'`, `'permissions'`, and `'hooks'`

**File**: `src/components/ide/IntegrationsPanel.tsx`
- Line 116-118: Change from `onClose(); return;` to `setSubPanel('install');`
- Also fix the Web3 handler (line 110-115) which has the same issue -- it closes the panel and tries `onOpenTxBuilder` via setTimeout. Instead, set `subPanel('web3')` to show the Web3Modal inline (it's already rendered at line 151).

#### 2. Make Terminal/Output vertically resizable

- In `IDELayout.tsx`, wrap the editor area and terminal in a vertical `PanelGroup direction="vertical"` with a `PanelResizeHandle`
- Remove the fixed `h-[280px]` from `TerminalPanel` and let it be a `Panel` child
- The terminal panel will get a `defaultSize` (e.g., 30%) and be resizable via drag handle

**Files**: `src/components/ide/IDELayout.tsx`, `src/components/ide/TerminalPanel.tsx`
- IDELayout: Wrap lines 294-299 in a vertical PanelGroup with two Panels (editor + terminal) and a resize handle between them
- TerminalPanel: Remove the outer `h-[280px]` / `h-8` fixed heights; use `h-full` so it fills its Panel container. Keep the collapse toggle but use a min-height approach instead of fixed pixel height.

#### 3. Expand `activeRightPanel` type

- In `IDEContext.tsx`, change the type from `'chat' | 'agent'` to `'chat' | 'agent' | 'timeline' | 'protocol'`
- Remove all `as any` / `as string` casts in `IDELayout.tsx`

**Files**: `src/contexts/IDEContext.tsx`, `src/components/ide/IDELayout.tsx`

#### 4. Fix forwardRef warnings (minor)

- Wrap `HooksConfig` and `ProtocolZone` exports in `React.forwardRef` or ensure they aren't being passed refs inadvertently (likely the latter -- check if they're used inside components that pass refs).

**Files**: `src/components/ide/HooksConfig.tsx`, `src/components/ide/ProtocolZone.tsx`

---

### Summary of Changes

| File | Change |
|------|--------|
| `IntegrationsPanel.tsx` | Fix Install and Web3 click handlers to use `setSubPanel` instead of closing |
| `IDELayout.tsx` | Wrap editor+terminal in vertical `PanelGroup`; remove `as any` casts |
| `TerminalPanel.tsx` | Replace fixed heights with flexible `h-full` layout |
| `IDEContext.tsx` | Expand `activeRightPanel` union type |
| `HooksConfig.tsx` | Add `forwardRef` or fix ref passing |
| `ProtocolZone.tsx` | Add `forwardRef` or fix ref passing |

