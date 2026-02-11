export interface DocNavItem {
  title: string;
  href: string;
  items?: DocNavItem[];
}

export const docsNavigation: DocNavItem[] = [
  { title: "Introduction", href: "/docs/introduction" },
  {
    title: "Architecture",
    href: "/docs/architecture",
    items: [
      { title: "Storage Zone", href: "/docs/architecture/storage-zone" },
      { title: "Compute Zone", href: "/docs/architecture/compute-zone" },
      { title: "Networking Zone", href: "/docs/architecture/networking-zone" },
      { title: "Proof Zone", href: "/docs/architecture/proof-zone" },
    ],
  },
  { title: "Snapshots & Merkle Model", href: "/docs/snapshots" },
  { title: "Runner Mesh", href: "/docs/runner-mesh" },
  { title: "MCP Integrations", href: "/docs/mcp-integrations" },
  { title: "Agent Mode", href: "/docs/agent-mode" },
  { title: "Build Attestations", href: "/docs/build-attestations" },
  { title: "API Reference", href: "/docs/api-reference" },
  { title: "NBA Policy", href: "/docs/nba-policy" },
  { title: "Ship Mode", href: "/docs/ship-mode" },
  { title: "Security Model", href: "/docs/security-model" },
  { title: "FAQ", href: "/docs/faq" },
];

export function flattenNav(items: DocNavItem[]): DocNavItem[] {
  const result: DocNavItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.items) result.push(...flattenNav(item.items));
  }
  return result;
}
