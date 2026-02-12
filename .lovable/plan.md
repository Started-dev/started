

# Fix: Auto-save AI/Agent file changes to snapshot system

## Problem
When the AI or Agent creates or modifies files (via patches or code blocks), the changes are saved to the database (`project_files` table) but NOT synced to the content-addressed snapshot system. On page reload, the IDE loads from the CA snapshot (which is stale), so all AI-generated changes disappear.

## Root Cause
- Manual editor edits use `updateFileContent`, which correctly calls both `saveFile()` (database) and `caSnapshots.syncToSnapshot()` (snapshot system).
- AI-generated changes use `autoApplyParsedPatches` and `autoCreateFileBlocks`, which only call `saveFile()` -- they never call `syncToSnapshot()`.
- On reload, the IDE tries the CA snapshot first. Since it was never updated with AI changes, it restores an old version.

## Solution

### 1. Sync to CA snapshots after AI patch application
In `IDEContext.tsx`, after `autoApplyParsedPatches` is called (around line 934), add a call to `caSnapshots.syncToSnapshot(filesRef.current)` to persist the updated file state.

### 2. Sync to CA snapshots after AI file block creation
After `autoCreateFileBlocks` is called (around line 943), add the same `caSnapshots.syncToSnapshot(filesRef.current)` call.

### 3. Sync after agent step file changes
Check the agent loop (where agent steps apply patches) and ensure `syncToSnapshot` is also called there.

### 4. Add a beforeunload flush for file persistence
Currently only conversation persistence has a `beforeunload` handler. Add one for file saves to ensure pending debounced saves are flushed when the tab closes.

## Technical Details

Changes are limited to `src/contexts/IDEContext.tsx`:

- In the `onDone` callback of `streamChat` (around lines 923-943): after applying patches and creating file blocks, schedule a `syncToSnapshot` call with a small delay to ensure `setFiles` state updates have been processed.
- In the agent orchestrator's step completion handler: add the same sync call.
- Add a `beforeunload` listener that calls `caSnapshots.createCASnapshot(filesRef.current, 'Tab close flush')` to ensure the latest state is persisted.

This is a targeted fix -- no new files, no new dependencies, just adding sync calls where they're missing.

