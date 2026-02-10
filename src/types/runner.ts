// ─── Runner Service Types ───

export type RuntimeType = 'node' | 'python' | 'shell' | 'go' | 'rust' | 'c' | 'cpp' | 'php' | 'ruby' | 'java' | 'solidity' | 'dart' | 'swift' | 'kotlin' | 'r';

export interface RunnerSession {
  id: string;
  projectId: string;
  workspacePath: string;
  cwd: string;
  runtimeType: RuntimeType;
  status: 'creating' | 'ready' | 'busy' | 'killed' | 'expired';
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ExecRequest {
  command: string;
  timeoutS?: number;
  resetCwd?: boolean;
  env?: Record<string, string>;
}

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  durationMs: number;
}

export interface SessionCreateRequest {
  projectId: string;
  runtimeType: RuntimeType;
}

export interface SessionCreateResponse {
  sessionId: string;
  workspacePath: string;
}

export interface WorkspaceSyncRequest {
  files: Array<{ path: string; content: string }>;
}

// ─── Resource Limits ───

export interface ResourceLimits {
  cpuCount: number;
  memoryMb: number;
  timeoutS: number;
  diskMb: number;
  maxProcesses: number;
  networkEnabled: boolean;
  allowedDomains: string[];
}

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  cpuCount: 1,
  memoryMb: 2048,
  timeoutS: 600,
  diskMb: 512,
  maxProcesses: 64,
  networkEnabled: false,
  allowedDomains: [
    'registry.npmjs.org',
    'pypi.org',
    'files.pythonhosted.org',
    'github.com',
  ],
};

// ─── Runtime Templates ───

export interface RuntimeTemplate {
  type: RuntimeType;
  label: string;
  defaultCommand: string;
  setupCommands: string[];
}

export const RUNTIME_TEMPLATES: RuntimeTemplate[] = [
  {
    type: 'node',
    label: 'Node.js',
    defaultCommand: 'npm test',
    setupCommands: ['npm install'],
  },
  {
    type: 'python',
    label: 'Python',
    defaultCommand: 'python main.py',
    setupCommands: ['pip install -r requirements.txt'],
  },
  {
    type: 'shell',
    label: 'Shell',
    defaultCommand: 'bash main.sh',
    setupCommands: [],
  },
  {
    type: 'go',
    label: 'Go',
    defaultCommand: 'go run main.go',
    setupCommands: ['go mod tidy'],
  },
  {
    type: 'rust',
    label: 'Rust',
    defaultCommand: 'cargo run',
    setupCommands: ['cargo build'],
  },
  {
    type: 'c',
    label: 'C',
    defaultCommand: 'gcc main.c -o main && ./main',
    setupCommands: [],
  },
  {
    type: 'cpp',
    label: 'C++',
    defaultCommand: 'g++ main.cpp -o main && ./main',
    setupCommands: [],
  },
  {
    type: 'php',
    label: 'PHP',
    defaultCommand: 'php index.php',
    setupCommands: ['composer install'],
  },
  {
    type: 'ruby',
    label: 'Ruby',
    defaultCommand: 'ruby main.rb',
    setupCommands: ['bundle install'],
  },
  {
    type: 'java',
    label: 'Java',
    defaultCommand: 'javac Main.java && java Main',
    setupCommands: [],
  },
  {
    type: 'solidity',
    label: 'Solidity',
    defaultCommand: 'solc --bin contract.sol',
    setupCommands: ['npm install -g solc'],
  },
  {
    type: 'dart',
    label: 'Dart',
    defaultCommand: 'dart run',
    setupCommands: ['dart pub get'],
  },
  {
    type: 'swift',
    label: 'Swift',
    defaultCommand: 'swift main.swift',
    setupCommands: [],
  },
  {
    type: 'kotlin',
    label: 'Kotlin',
    defaultCommand: 'kotlinc main.kt -include-runtime -d main.jar && java -jar main.jar',
    setupCommands: [],
  },
  {
    type: 'r',
    label: 'R',
    defaultCommand: 'Rscript main.R',
    setupCommands: [],
  },
];
