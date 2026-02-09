// ─── Tool Definitions ───

export type ToolName =
  | 'read_file'
  | 'list_files'
  | 'grep'
  | 'apply_patch'
  | 'run_command'
  | 'git_status'
  | 'web_fetch'
  | 'web_search';

export interface ToolInput {
  read_file: { path: string };
  list_files: { glob: string };
  grep: { pattern: string; paths_glob?: string };
  apply_patch: { unified_diff: string };
  run_command: { command: string; cwd?: string; timeout_s?: number };
  git_status: Record<string, never>;
  web_fetch: { url: string };
  web_search: { query: string };
}

export interface ToolResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  cwd?: string;
  duration_ms?: number;
  content?: string;
  files?: string[];
  matches?: Array<{ file: string; line: number; text: string }>;
  error?: string;
}

export interface ToolCall {
  id: string;
  tool: ToolName;
  input: ToolInput[ToolName];
  status: 'pending' | 'approved' | 'denied' | 'running' | 'completed' | 'failed';
  result?: ToolResult;
  timestamp: Date;
}

// ─── Permission Policy ───

export type PermissionDecision = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  pattern: string;   // prefix match for commands, or tool name
  decision: PermissionDecision;
}

export interface PermissionPolicy {
  // Tools that never need approval
  allowedTools: ToolName[];
  // Tools that are always blocked
  deniedTools: ToolName[];
  // Command prefix allowlist
  allowedCommands: string[];
  // Command prefix denylist (high-risk)
  deniedCommands: string[];
}

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  // Read-only tools are auto-approved
  allowedTools: ['read_file', 'list_files', 'grep', 'git_status'],
  // No tools permanently blocked by default
  deniedTools: [],
  // Safe command prefixes
  allowedCommands: [
    'npm test',
    'npm run lint',
    'npm run build',
    'npx tsc',
    'pnpm test',
    'pnpm lint',
    'pytest',
    'python -m pytest',
    'cargo test',
    'go test',
    'git status',
    'git diff',
    'git log',
  ],
  // Dangerous command prefixes
  deniedCommands: [
    'rm -rf /',
    'rm -rf ~',
    'dd ',
    'mkfs',
    'curl ',
    'wget ',
    'ssh ',
    'scp ',
    'rsync ',
    'chmod 777',
    'sudo ',
    'env ',
    'export ',
    'cat /etc/',
    'cat ~/.ssh',
  ],
};

// ─── Patch Types ───

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
}

export interface ParsedPatch {
  oldFile: string;
  newFile: string;
  hunks: DiffHunk[];
}

export interface PatchPreview {
  id: string;
  patches: ParsedPatch[];
  raw: string;
  status: 'preview' | 'applied' | 'failed' | 'cancelled';
  error?: string;
}
