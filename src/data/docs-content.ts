export interface DocHeading {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface DocCodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export type DocBlockType =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; id: string; text: string }
  | { type: "code"; blocks: DocCodeBlock[] }
  | { type: "callout"; variant: "note" | "warning" | "tip" | "danger"; title: string; text: string }
  | { type: "list"; ordered?: boolean; items: string[] };

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  headings: DocHeading[];
  blocks: DocBlockType[];
}

export const docsContent: Record<string, DocPage> = {
  introduction: {
    slug: "introduction",
    title: "Introduction",
    description: "Welcome to Started.dev — the autonomous cloud IDE for shipping real software.",
    headings: [
      { id: "what-is-started", title: "What is Started?", level: 2 },
      { id: "core-principles", title: "Core Principles", level: 2 },
      { id: "getting-started", title: "Getting Started", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Started.dev is an infrastructure-grade cloud IDE built for autonomous software engineering. It combines a content-addressed storage layer, distributed runner mesh, and Model Context Protocol (MCP) integrations into a single, seamless development environment." },
      { type: "heading", level: 2, id: "what-is-started", text: "What is Started?" },
      { type: "paragraph", text: "Started is designed for developers who want to ship production software with AI-powered agents. It provides a complete workspace with file management, terminal access, browser preview, and intelligent code generation — all running in the cloud." },
      { type: "callout", variant: "tip", title: "Quick Start", text: "Create a new project and start coding in under 30 seconds. No local setup required." },
      { type: "heading", level: 2, id: "core-principles", text: "Core Principles" },
      { type: "list", items: [
        "**Content-Addressed Storage** — Every file version is immutable and hash-indexed, enabling instant snapshots and rollbacks.",
        "**Distributed Compute** — Build and test commands run on a mesh of trusted runner nodes with attestation.",
        "**Agent-First Design** — The IDE is built around autonomous agents that can plan, execute, and verify multi-step tasks.",
        "**Verifiable Builds** — Every build produces a cryptographic attestation linking inputs, outputs, and execution environment.",
      ]},
      { type: "heading", level: 2, id: "getting-started", text: "Getting Started" },
      { type: "paragraph", text: "Sign up at started.dev, create a project, and start building. The AI agent is ready to assist with code generation, debugging, and deployment from the first prompt." },
      { type: "code", blocks: [{ language: "bash", code: "# Clone your project locally\ngit clone https://github.com/your-org/your-project.git\ncd your-project\nnpm install && npm run dev" }] },
    ],
  },
  architecture: {
    slug: "architecture",
    title: "Architecture",
    description: "Overview of Started's four-zone architecture: Storage, Compute, Networking, and Proof.",
    headings: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "four-zones", title: "The Four Zones", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Started's architecture is organized into four distinct zones, each responsible for a critical aspect of the development lifecycle. This separation of concerns enables independent scaling, clear security boundaries, and modular upgrades." },
      { type: "heading", level: 2, id: "overview", text: "Overview" },
      { type: "code", blocks: [{ language: "text", code: "┌─────────────┐  ┌──────────────┐  ┌───────────────┐  ┌────────────┐\n│  Storage    │  │  Compute     │  │  Networking   │  │  Proof     │\n│  Zone       │──│  Zone        │──│  Zone         │──│  Zone      │\n│             │  │              │  │               │  │            │\n│  Blobs      │  │  Runners     │  │  MCP Servers  │  │  Attestors │\n│  Trees      │  │  Agents      │  │  Webhooks     │  │  Hashes    │\n│  Snapshots  │  │  Terminals   │  │  Events       │  │  Proofs    │\n└─────────────┘  └──────────────┘  └───────────────┘  └────────────┘" }] },
      { type: "heading", level: 2, id: "four-zones", text: "The Four Zones" },
      { type: "list", items: [
        "**Storage Zone** — Content-addressed blob store, Merkle trees, and snapshot management.",
        "**Compute Zone** — Runner mesh for executing builds, tests, and agent steps.",
        "**Networking Zone** — MCP server integrations, webhooks, and event routing.",
        "**Proof Zone** — Build attestations, hash verification, and audit trails.",
      ]},
      { type: "callout", variant: "note", title: "Deep Dive", text: "Each zone has its own dedicated documentation page. Use the sidebar to explore Storage Zone, Compute Zone, Networking Zone, and Proof Zone in detail." },
    ],
  },
  "architecture/storage-zone": {
    slug: "architecture/storage-zone",
    title: "Storage Zone",
    description: "Content-addressed blob storage, Merkle trees, and immutable snapshots.",
    headings: [
      { id: "blob-store", title: "Blob Store", level: 2 },
      { id: "tree-nodes", title: "Tree Nodes", level: 2 },
      { id: "snapshots", title: "Snapshots", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Storage Zone implements a Git-inspired content-addressed filesystem. Files are stored as immutable blobs keyed by their SHA-256 hash, directories are tree nodes referencing children, and snapshots capture the root hash at a point in time." },
      { type: "heading", level: 2, id: "blob-store", text: "Blob Store" },
      { type: "paragraph", text: "Every file is hashed and stored as an immutable blob. Duplicate content is automatically deduplicated — if two files have identical content, they share the same blob." },
      { type: "code", blocks: [{ language: "typescript", code: "interface Blob {\n  hash: string;       // SHA-256\n  content: string;    // File content\n  byte_size: number;  // Size in bytes\n  created_at: string; // Timestamp\n}" }] },
      { type: "heading", level: 2, id: "tree-nodes", text: "Tree Nodes" },
      { type: "paragraph", text: "Directories are represented as tree objects containing an array of entries. Each entry points to either a blob (file) or another tree (subdirectory)." },
      { type: "heading", level: 2, id: "snapshots", text: "Snapshots" },
      { type: "paragraph", text: "A snapshot is a named pointer to a root tree hash, plus metadata like the creator and parent snapshot. This forms a linked chain of project states, similar to Git commits." },
      { type: "callout", variant: "tip", title: "Instant Rollback", text: "Because every state is immutable and hash-linked, rolling back to any previous snapshot is instantaneous — just update the ref pointer." },
    ],
  },
  "architecture/compute-zone": {
    slug: "architecture/compute-zone",
    title: "Compute Zone",
    description: "Runner mesh, agent execution, and distributed build infrastructure.",
    headings: [
      { id: "runner-nodes", title: "Runner Nodes", level: 2 },
      { id: "agent-execution", title: "Agent Execution", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Compute Zone manages all code execution — from simple terminal commands to multi-step agent runs. Work is distributed across a mesh of runner nodes, each reporting capabilities, trust tier, and pricing." },
      { type: "heading", level: 2, id: "runner-nodes", text: "Runner Nodes" },
      { type: "paragraph", text: "Runner nodes are containerized execution environments that accept build commands. Each node advertises its capabilities (languages, tools, hardware) and trust tier for attestation purposes." },
      { type: "code", blocks: [{ language: "typescript", code: "interface RunnerNode {\n  id: string;\n  name: string;\n  base_url: string;\n  region: string;\n  status: 'online' | 'offline' | 'busy';\n  trust_tier: 'community' | 'verified' | 'official';\n  capabilities: Record<string, boolean>;\n}" }] },
      { type: "heading", level: 2, id: "agent-execution", text: "Agent Execution" },
      { type: "paragraph", text: "Agents execute multi-step plans by submitting individual steps to runner nodes. Each step is tracked with status, input/output, and duration metrics." },
    ],
  },
  "architecture/networking-zone": {
    slug: "architecture/networking-zone",
    title: "Networking Zone",
    description: "MCP server mesh, webhooks, and event-driven integrations.",
    headings: [
      { id: "mcp-mesh", title: "MCP Server Mesh", level: 2 },
      { id: "webhooks", title: "Webhooks & Events", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Networking Zone connects Started to the outside world through Model Context Protocol (MCP) servers, project webhooks, and event hooks. It handles all external API communication with built-in audit logging." },
      { type: "heading", level: 2, id: "mcp-mesh", text: "MCP Server Mesh" },
      { type: "paragraph", text: "Over 40 MCP servers are available out of the box, connecting to services like GitHub, Slack, Stripe, AWS, and more. Each server exposes typed tools that agents can invoke with permission checks." },
      { type: "heading", level: 2, id: "webhooks", text: "Webhooks & Events" },
      { type: "paragraph", text: "Projects can configure inbound webhooks to trigger agent runs or event hooks. Every webhook is authenticated with a per-project secret token." },
      { type: "callout", variant: "warning", title: "Security", text: "Always validate webhook signatures before processing payloads. Started automatically generates and manages webhook secrets per project." },
    ],
  },
  "architecture/proof-zone": {
    slug: "architecture/proof-zone",
    title: "Proof Zone",
    description: "Build attestations, hash verification, and cryptographic audit trails.",
    headings: [
      { id: "attestations", title: "Build Attestations", level: 2 },
      { id: "verification", title: "Verification", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Proof Zone ensures that every build is verifiable. When a runner executes a command, it produces a cryptographic attestation linking the input snapshot, output artifacts, command hash, and runner fingerprint." },
      { type: "heading", level: 2, id: "attestations", text: "Build Attestations" },
      { type: "code", blocks: [{ language: "typescript", code: "interface BuildAttestation {\n  attestation_hash: string;\n  build_run_id: string;\n  snapshot_hash: string;\n  command_hash: string;\n  artifacts_hashes: string[];\n  runner_fingerprint: {\n    node_id: string;\n    trust_tier: string;\n    region: string;\n  };\n}" }] },
      { type: "heading", level: 2, id: "verification", text: "Verification" },
      { type: "paragraph", text: "Any party can verify a build by recomputing the attestation hash from its components. This enables trustless verification of build outputs without re-executing the build." },
    ],
  },
  snapshots: {
    slug: "snapshots",
    title: "Snapshots & Merkle Model",
    description: "How Started uses content-addressed storage and Merkle DAGs for project state.",
    headings: [
      { id: "merkle-dag", title: "Merkle DAG Structure", level: 2 },
      { id: "refs", title: "Named References", level: 2 },
      { id: "operations", title: "Common Operations", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Started's storage model is inspired by Git's content-addressed design but optimized for cloud-native workflows. Every file, directory, and project state is represented as a node in a Merkle Directed Acyclic Graph (DAG)." },
      { type: "heading", level: 2, id: "merkle-dag", text: "Merkle DAG Structure" },
      { type: "code", blocks: [{ language: "text", code: "Snapshot (root)\n  └── Tree (root_tree_hash)\n       ├── Blob: src/main.ts  (hash: abc123...)\n       ├── Blob: package.json (hash: def456...)\n       └── Tree: src/components/\n            ├── Blob: App.tsx   (hash: 789ghi...)\n            └── Blob: Hero.tsx  (hash: jkl012...)" }] },
      { type: "heading", level: 2, id: "refs", text: "Named References" },
      { type: "paragraph", text: "Refs are mutable pointers to snapshot IDs. The `main` ref tracks the current project head, while `agent/<run_id>` refs track agent branches. Updating a ref is an atomic operation." },
      { type: "heading", level: 2, id: "operations", text: "Common Operations" },
      { type: "list", items: [
        "**Checkout** — Resolve a ref to its snapshot, then materialize the tree into the editor.",
        "**Commit** — Hash changed files into new blobs, build a new tree, create a snapshot, and advance the ref.",
        "**Diff** — Compare two snapshots by walking their trees and comparing blob hashes.",
        "**Merge** — Three-way merge using the common ancestor snapshot.",
      ]},
    ],
  },
  "runner-mesh": {
    slug: "runner-mesh",
    title: "Runner Mesh",
    description: "Distributed compute infrastructure for builds, tests, and agent execution.",
    headings: [
      { id: "how-it-works", title: "How It Works", level: 2 },
      { id: "session-management", title: "Session Management", level: 2 },
      { id: "trust-tiers", title: "Trust Tiers", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Runner Mesh is a distributed network of execution nodes that process build commands, run tests, and execute agent steps. It provides elastic compute with geographic distribution and trust-based routing." },
      { type: "heading", level: 2, id: "how-it-works", text: "How It Works" },
      { type: "list", ordered: true, items: [
        "A build request is submitted with the command and input snapshot.",
        "The mesh router selects an appropriate runner based on capabilities and trust tier.",
        "The runner checks out the snapshot, executes the command, and captures output.",
        "Results are stored as a new snapshot with a build attestation.",
      ]},
      { type: "heading", level: 2, id: "session-management", text: "Session Management" },
      { type: "paragraph", text: "Long-running sessions maintain state between commands. Each project can have an active runner session that persists the working directory and environment." },
      { type: "heading", level: 2, id: "trust-tiers", text: "Trust Tiers" },
      { type: "list", items: [
        "**Community** — Open runners with basic verification. Suitable for non-sensitive builds.",
        "**Verified** — Runners operated by vetted providers with enhanced security.",
        "**Official** — Started-operated runners with the highest trust and attestation guarantees.",
      ]},
    ],
  },
  "mcp-integrations": {
    slug: "mcp-integrations",
    title: "MCP Integrations",
    description: "Model Context Protocol servers for connecting to external services.",
    headings: [
      { id: "what-is-mcp", title: "What is MCP?", level: 2 },
      { id: "available-servers", title: "Available Servers", level: 2 },
      { id: "permissions", title: "Permission Model", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The Model Context Protocol (MCP) provides a standardized way for AI agents to interact with external services. Started ships with 40+ pre-built MCP servers covering developer tools, communication platforms, cloud providers, and Web3 services." },
      { type: "heading", level: 2, id: "what-is-mcp", text: "What is MCP?" },
      { type: "paragraph", text: "MCP defines a typed interface for tools that agents can invoke. Each tool has an input schema, output schema, and a risk level. The agent selects and calls tools based on the current task, with permission checks enforced at every invocation." },
      { type: "heading", level: 2, id: "available-servers", text: "Available Servers" },
      { type: "code", blocks: [{ language: "typescript", code: "// Example MCP server categories\nconst categories = {\n  'Developer Tools': ['github', 'vercel', 'docker', 'aws', 'digitalocean'],\n  'Communication':   ['slack', 'discord', 'telegram', 'twilio', 'sendgrid'],\n  'Data & Analytics': ['airtable', 'google-sheets', 'postgres', 'notion'],\n  'Web3':            ['evm-rpc', 'solana', 'helius', 'moralis', 'coingecko'],\n  'AI & ML':         ['huggingface', 'perplexity', 'firecrawl'],\n};" }] },
      { type: "heading", level: 2, id: "permissions", text: "Permission Model" },
      { type: "paragraph", text: "Every MCP tool call is gated by a permission system. Rules can allow or deny specific tools, servers, or risk levels. Permissions are configured per-project and audited in the MCP audit log." },
      { type: "callout", variant: "danger", title: "High-Risk Tools", text: "Tools marked as 'high' risk (e.g., deleting resources, sending money) require explicit user approval before execution." },
    ],
  },
  "agent-mode": {
    slug: "agent-mode",
    title: "Agent Mode",
    description: "Autonomous multi-step task execution with planning, verification, and rollback.",
    headings: [
      { id: "how-agents-work", title: "How Agents Work", level: 2 },
      { id: "agent-lifecycle", title: "Agent Lifecycle", level: 2 },
      { id: "presets", title: "Agent Presets", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Agent Mode enables autonomous execution of complex, multi-step development tasks. The agent plans a sequence of steps, executes them with verification, and can roll back on failure — all without manual intervention." },
      { type: "heading", level: 2, id: "how-agents-work", text: "How Agents Work" },
      { type: "list", ordered: true, items: [
        "The user provides a goal (e.g., \"Add user authentication\").",
        "The agent creates a plan with discrete steps.",
        "Each step is executed against the runner mesh.",
        "Results are verified and the agent proceeds or rolls back.",
        "A final snapshot captures the completed work.",
      ]},
      { type: "heading", level: 2, id: "agent-lifecycle", text: "Agent Lifecycle" },
      { type: "code", blocks: [{ language: "text", code: "pending → running → [step_1 → step_2 → ... → step_n] → completed\n                                                        → failed\n                                                        → cancelled" }] },
      { type: "heading", level: 2, id: "presets", text: "Agent Presets" },
      { type: "paragraph", text: "Presets define the default system prompt, tools, and permissions for an agent run. Started ships with built-in presets for common workflows, and users can create custom presets." },
    ],
  },
  "build-attestations": {
    slug: "build-attestations",
    title: "Build Attestations",
    description: "Cryptographic proof of build integrity — inputs, outputs, and execution environment.",
    headings: [
      { id: "what-are-attestations", title: "What Are Attestations?", level: 2 },
      { id: "schema", title: "Attestation Schema", level: 2 },
      { id: "verification-flow", title: "Verification Flow", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Build attestations provide cryptographic proof that a specific build was executed correctly. They link the input snapshot, executed command, output artifacts, and runner environment into a single verifiable hash." },
      { type: "heading", level: 2, id: "what-are-attestations", text: "What Are Attestations?" },
      { type: "paragraph", text: "When a runner executes a build, it captures a fingerprint of the execution environment, hashes all inputs and outputs, and produces a signed attestation. This attestation can be independently verified without re-running the build." },
      { type: "heading", level: 2, id: "schema", text: "Attestation Schema" },
      { type: "code", blocks: [{ language: "json", code: "{\n  \"attestation_hash\": \"sha256:abc123...\",\n  \"build_run_id\": \"uuid\",\n  \"snapshot_hash\": \"sha256:def456...\",\n  \"command_hash\": \"sha256:ghi789...\",\n  \"artifacts_hashes\": [\"sha256:jkl012...\"],\n  \"runner_fingerprint\": {\n    \"node_id\": \"runner-us-east-1\",\n    \"trust_tier\": \"official\",\n    \"region\": \"us-east-1\"\n  }\n}" }] },
      { type: "heading", level: 2, id: "verification-flow", text: "Verification Flow" },
      { type: "list", ordered: true, items: [
        "Retrieve the attestation record by build run ID.",
        "Recompute the attestation hash from its components.",
        "Compare the recomputed hash with the stored attestation hash.",
        "If they match, the build is verified as authentic.",
      ]},
    ],
  },
  "api-reference": {
    slug: "api-reference",
    title: "API Reference",
    description: "Edge function endpoints for snapshots, builds, agents, and MCP.",
    headings: [
      { id: "authentication", title: "Authentication", level: 2 },
      { id: "snapshot-api", title: "Snapshot API", level: 2 },
      { id: "agent-api", title: "Agent API", level: 2 },
      { id: "mcp-invoke", title: "MCP Invoke", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Started exposes a set of edge function APIs for programmatic access. All endpoints require authentication via a Bearer token (JWT from Supabase Auth)." },
      { type: "heading", level: 2, id: "authentication", text: "Authentication" },
      { type: "code", blocks: [{ language: "bash", code: "curl -X GET https://api.started.dev/functions/v1/snapshot-api \\\n  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\\n  -H \"Content-Type: application/json\"" }] },
      { type: "heading", level: 2, id: "snapshot-api", text: "Snapshot API" },
      { type: "code", blocks: [{ language: "typescript", code: "// GET /snapshot-api?projectId=xxx&snapshotId=yyy\n// Returns the snapshot with its tree and blobs\n\n// POST /snapshot-api\n// Creates a new snapshot\n{\n  projectId: string;\n  parentSnapshotId?: string;\n  files: Record<string, string>;\n  label?: string;\n}" }] },
      { type: "heading", level: 2, id: "agent-api", text: "Agent API" },
      { type: "paragraph", text: "The agent-run endpoint creates and manages autonomous agent executions." },
      { type: "code", blocks: [{ language: "typescript", code: "// POST /agent-run\n{\n  projectId: string;\n  goal: string;\n  presetKey?: string;\n  maxSteps?: number;  // default: 10\n}" }] },
      { type: "heading", level: 2, id: "mcp-invoke", text: "MCP Invoke" },
      { type: "paragraph", text: "Invoke any enabled MCP tool programmatically." },
      { type: "code", blocks: [{ language: "typescript", code: "// POST /mcp-invoke\n{\n  projectId: string;\n  serverKey: string;  // e.g. 'github'\n  toolName: string;   // e.g. 'create_issue'\n  input: Record<string, unknown>;\n}" }] },
    ],
  },
  "nba-policy": {
    slug: "nba-policy",
    title: "NBA Policy",
    description: "The Never-Build-Alone policy engine that governs agent behavior and safety.",
    headings: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "policy-schema", title: "Policy Schema", level: 2 },
      { id: "fsm", title: "Finite State Machine", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "The NBA (Never-Build-Alone) policy engine is Started's safety layer. It defines rules for what agents can and cannot do, enforced through a finite state machine that tracks agent behavior in real time." },
      { type: "heading", level: 2, id: "overview", text: "Overview" },
      { type: "paragraph", text: "Every agent run is governed by an NBA policy. The policy defines maximum steps, allowed tools, risk thresholds, and escalation rules. If an agent violates its policy, it is paused or terminated." },
      { type: "heading", level: 2, id: "policy-schema", text: "Policy Schema" },
      { type: "code", blocks: [{ language: "json", code: "{\n  \"version\": \"1.0\",\n  \"max_steps\": 20,\n  \"max_duration_ms\": 300000,\n  \"allowed_tools\": [\"*\"],\n  \"blocked_tools\": [\"rm_rf\", \"sudo\"],\n  \"risk_threshold\": \"medium\",\n  \"escalation\": {\n    \"on_high_risk\": \"pause_and_ask\",\n    \"on_failure\": \"rollback\"\n  }\n}" }] },
      { type: "heading", level: 2, id: "fsm", text: "Finite State Machine" },
      { type: "paragraph", text: "The policy engine uses an FSM to track agent states: idle, planning, executing, verifying, paused, completed, and failed. Transitions are triggered by agent actions and policy rule evaluations." },
      { type: "callout", variant: "warning", title: "Override Policies", text: "Project owners can override the default NBA policy with a custom nba.policy.override.json file. Be careful — overly permissive policies can reduce safety guarantees." },
    ],
  },
  "ship-mode": {
    slug: "ship-mode",
    title: "Ship Mode",
    description: "Streamlined deployment workflow from snapshot to production.",
    headings: [
      { id: "what-is-ship-mode", title: "What is Ship Mode?", level: 2 },
      { id: "deployment-pipeline", title: "Deployment Pipeline", level: 2 },
      { id: "rollbacks", title: "Rollbacks", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Ship Mode is Started's opinionated deployment workflow. It takes the current snapshot, runs a verified build, and deploys the output to production — all with a single command or agent action." },
      { type: "heading", level: 2, id: "what-is-ship-mode", text: "What is Ship Mode?" },
      { type: "paragraph", text: "When Ship Mode is activated, the system freezes the current snapshot, runs the build pipeline on an official runner, verifies the attestation, and deploys. The entire process is auditable and reversible." },
      { type: "heading", level: 2, id: "deployment-pipeline", text: "Deployment Pipeline" },
      { type: "list", ordered: true, items: [
        "Freeze the current snapshot as the deployment candidate.",
        "Submit the build command to an official-tier runner.",
        "Wait for build completion and attestation.",
        "Verify the attestation hash.",
        "Deploy the build artifacts to the hosting edge.",
        "Update the production ref to the new snapshot.",
      ]},
      { type: "heading", level: 2, id: "rollbacks", text: "Rollbacks" },
      { type: "paragraph", text: "Because every deployment is a snapshot, rolling back is as simple as pointing the production ref back to a previous snapshot ID. No rebuild required." },
      { type: "callout", variant: "tip", title: "Instant Rollbacks", text: "Rollbacks take effect in under 1 second because they only update a pointer — no rebuild or redeployment is needed." },
    ],
  },
  "security-model": {
    slug: "security-model",
    title: "Security Model",
    description: "Permissions, trust boundaries, and safety guarantees in Started.",
    headings: [
      { id: "permission-layers", title: "Permission Layers", level: 2 },
      { id: "mcp-permissions", title: "MCP Permissions", level: 2 },
      { id: "agent-safety", title: "Agent Safety", level: 2 },
    ],
    blocks: [
      { type: "paragraph", text: "Started implements defense-in-depth security with multiple permission layers: project-level access control, MCP tool permissions, agent policy enforcement, and build attestation verification." },
      { type: "heading", level: 2, id: "permission-layers", text: "Permission Layers" },
      { type: "list", items: [
        "**Project Access** — Owner and collaborator roles with row-level security on all tables.",
        "**MCP Permissions** — Per-project rules allowing or denying specific tools and risk levels.",
        "**Agent Policy** — NBA policy engine governing agent behavior with FSM enforcement.",
        "**Build Verification** — Cryptographic attestations ensuring build integrity.",
      ]},
      { type: "heading", level: 2, id: "mcp-permissions", text: "MCP Permissions" },
      { type: "code", blocks: [{ language: "typescript", code: "interface McpPermission {\n  rule_type: 'tool' | 'server' | 'risk_level';\n  subject: string;     // e.g. 'github:create_issue' or 'high'\n  effect: 'allow' | 'deny';\n  reason?: string;\n}" }] },
      { type: "heading", level: 2, id: "agent-safety", text: "Agent Safety" },
      { type: "paragraph", text: "Agents operate within strict safety boundaries. Destructive commands are blocked by default, high-risk MCP tools require user approval, and every action is logged to an immutable audit trail." },
      { type: "callout", variant: "danger", title: "Never Bypass", text: "Never disable the NBA policy engine or set risk_threshold to 'critical' in production. These safeguards exist to prevent data loss and unauthorized actions." },
    ],
  },
  faq: {
    slug: "faq",
    title: "FAQ",
    description: "Frequently asked questions about Started.dev.",
    headings: [
      { id: "general", title: "General", level: 2 },
      { id: "technical", title: "Technical", level: 2 },
      { id: "billing", title: "Billing & Plans", level: 2 },
    ],
    blocks: [
      { type: "heading", level: 2, id: "general", text: "General" },
      { type: "paragraph", text: "**What is Started.dev?**\nStarted is an autonomous cloud IDE for shipping production software. It combines AI agents, content-addressed storage, distributed compute, and 40+ integrations into a single platform." },
      { type: "paragraph", text: "**Do I need to install anything locally?**\nNo. Started runs entirely in the browser. You can optionally clone projects via Git for local development." },
      { type: "paragraph", text: "**Is my code private?**\nYes. All projects are private by default. Code is stored in a content-addressed store with row-level security enforced at the database level." },
      { type: "heading", level: 2, id: "technical", text: "Technical" },
      { type: "paragraph", text: "**What languages are supported?**\nThe runner mesh supports any language that runs in a container. The IDE and agent are optimized for TypeScript, JavaScript, Python, Rust, Go, and Solidity." },
      { type: "paragraph", text: "**Can I self-host Started?**\nNot currently. Started is a managed cloud service. Self-hosting documentation is planned for a future release." },
      { type: "paragraph", text: "**How do snapshots differ from Git commits?**\nSnapshots are conceptually similar to Git commits but optimized for cloud-native workflows. They use the same content-addressed model (SHA-256 hashes, Merkle trees) but with a simpler API and built-in branching via named refs." },
      { type: "heading", level: 2, id: "billing", text: "Billing & Plans" },
      { type: "paragraph", text: "**What plans are available?**\nStarted offers Free, Pro, Business, and Enterprise tiers. Each includes different limits for tokens, MCP calls, runner minutes, and concurrent agent runs." },
      { type: "paragraph", text: "**What counts as usage?**\nUsage is metered across four dimensions: model tokens, MCP calls, runner minutes, and storage. Each plan includes a monthly allowance with pay-as-you-go overage." },
    ],
  },
};
