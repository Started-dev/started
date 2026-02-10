

# Language Auto-Detection for Runtime Selection

## Overview
Add a utility that scans project files and automatically determines the correct runtime type, replacing the hardcoded `'node'` default. The IDE will re-detect whenever files change (create/delete/rename) and update the project runtime accordingly.

## Changes

### 1. Update Project type (`src/types/ide.ts`)
- Expand `runtimeType` from `'node' | 'python' | 'shell'` to use the full `RuntimeType` union from `src/types/runner.ts` so all 15 runtimes are valid project types.

### 2. Create detection utility (`src/lib/detect-runtime.ts`)
A new pure function `detectRuntime(files: IDEFile[]): RuntimeType` that checks file extensions and config files to determine the best runtime:

Detection priority (first match wins):
- `Cargo.toml` or `.rs` files --> `rust`
- `go.mod` or `.go` files --> `go`
- `pubspec.yaml` or `.dart` files --> `dart`
- `Package.swift` or `.swift` files --> `swift`
- `.kt` or `.kts` files --> `kotlin`
- `composer.json` or `.php` files --> `php`
- `Gemfile` or `.rb` files --> `ruby`
- `.sol` files --> `solidity`
- `.c` files (without `.cpp`/`.h` ambiguity) --> `c`
- `.cpp` or `.cc` or `.cxx` files --> `cpp`
- `.java` files --> `java`
- `.R` or `.r` or `.Rmd` files --> `r`
- `requirements.txt`, `setup.py`, `pyproject.toml`, or `.py` files --> `python`
- `.sh` or `.bash` files (and no other language files) --> `shell`
- Default fallback --> `node`

### 3. Integrate into IDEContext (`src/contexts/IDEContext.tsx`)
- Import and call `detectRuntime(files)` whenever files change (after initial load, file creation, file deletion, file rename)
- Update `project.runtimeType` with the detected value
- Show a toast notification when the runtime changes (e.g., "Runtime detected: Python")

### 4. Extend language map in `createFile`
- Expand the `langMap` in `IDEContext.createFile` to cover new extensions: `.go`, `.rs`, `.c`, `.cpp`, `.php`, `.rb`, `.java`, `.sol`, `.dart`, `.swift`, `.kt`, `.r`, `.sh`

## Technical Details

### Detection Function Signature
```typescript
import { RuntimeType } from '@/types/runner';
import { IDEFile } from '@/types/ide';

export function detectRuntime(files: IDEFile[]): RuntimeType;
```

### Files Modified
1. `src/types/ide.ts` -- Use `RuntimeType` import for `Project.runtimeType`
2. `src/lib/detect-runtime.ts` -- New file with detection logic
3. `src/contexts/IDEContext.tsx` -- Call detector on file changes, update project state

### No Backend Changes Required
This is purely frontend logic operating on the in-memory file tree.

