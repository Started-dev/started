

# Add File Attachment Upload for AI/Agent Context

## What This Does
Adds a new `@attach` button in the chat input area that lets you upload **any file type** (not just images) as context for the AI or Agent. Text-based files (code, JSON, markdown, CSV, etc.) will be read as plain text. Binary files will be labeled with their metadata so the AI knows they exist.

## Changes

### 1. Update `ContextChip` type (`src/types/ide.ts`)
- Add `'attachment'` to the `ContextChip.type` union: `'selection' | 'file' | 'errors' | 'url' | 'web' | 'image' | 'attachment'`

### 2. Update `ChatPanel.tsx` -- Add attachment upload logic
- Add a new `attachInputRef` for a hidden file input that accepts all file types (no `accept` filter)
- Add `'attachment'` case in `addChip()` that triggers the file input click
- Add `handleAttachmentUpload` callback:
  - For text-based files (detected by extension/MIME: `.ts`, `.js`, `.py`, `.json`, `.md`, `.csv`, `.txt`, `.html`, `.css`, `.xml`, `.yaml`, `.yml`, `.toml`, `.sql`, `.sh`, `.env`, `.log`, `.rst`, `.ini`, `.cfg`, etc.) -- read as `readAsText` and store the text content directly in the chip
  - For binary files (PDF, DOCX, ZIP, etc.) -- store a metadata string like `[Binary file: report.pdf (245 KB)]` so the AI knows the file exists but can't read it inline
  - Cap text file reads at 50,000 characters to prevent massive context overflow; truncate with a note if exceeded
- Add the `@attach` button in the chip button row (between `@image` and the spacer), with a `Paperclip` icon
- Add the `'attachment'` case in `chipIcon()` to show `Paperclip`
- Add hidden `<input ref={attachInputRef} type="file" accept="*/*" />` element

### 3. Update `UserMessage` sub-component
- No changes needed -- it already renders all chip types generically via `chipIcon()`

## Technical Details

### Text file detection helper
```typescript
const TEXT_EXTENSIONS = new Set([
  'txt','md','markdown','json','js','jsx','ts','tsx','py','rb','go',
  'rs','java','c','cpp','h','hpp','cs','swift','kt','scala','sh',
  'bash','zsh','fish','ps1','bat','cmd','html','htm','css','scss',
  'sass','less','xml','svg','yaml','yml','toml','ini','cfg','conf',
  'env','log','sql','graphql','gql','proto','csv','tsv','rst',
  'tex','r','lua','php','pl','pm','ex','exs','erl','hs','ml',
  'vim','dockerfile','makefile','gitignore'
]);

function isTextFile(fileName: string, mimeType: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/');
}
```

### Files Modified
1. `src/types/ide.ts` -- Add `'attachment'` to ContextChip type union
2. `src/components/ide/ChatPanel.tsx` -- Add attachment input, handler, button, and icon case
