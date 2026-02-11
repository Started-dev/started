import { useState } from 'react';
import { X, Plug, Zap, Shield, Anchor, Download, ChevronRight } from 'lucide-react';
import { MCPConfig } from './MCPConfig';
import { PermissionRulesManager } from './PermissionRulesManager';
import { Web3Modal } from './Web3Modal';
import { InstallModal } from './InstallModal';
import { HooksConfig } from './HooksConfig';
import { OpenClawPanel } from './OpenClawPanel';
import type { MCPServer, Hook, WebhookSecret, HookExecution } from '@/types/agent';

type SubPanel = 'mcp' | 'web3' | 'permissions' | 'hooks' | 'install' | 'openclaw' | null;

interface IntegrationsPanelProps {
  onClose: () => void;
  // MCP
  mcpServers: MCPServer[];
  onToggleMCPServer: (id: string) => void;
  // Hooks
  hooks: Hook[];
  onToggleHook: (id: string) => void;
  onAddHook: (hook: Omit<Hook, 'id'>) => void;
  onRemoveHook: (id: string) => void;
  webhookSecrets: WebhookSecret[];
  hookExecutions: HookExecution[];
  onGenerateSecret: (label: string) => Promise<WebhookSecret | null>;
  onDeleteSecret: (id: string) => void;
  onRefreshExecutions: () => void;
  webhookBaseUrl: string;
  projectId: string;
  // Web3
  onOpenTxBuilder: () => void;
}

const SECTIONS = [
  { key: 'mcp' as const, icon: Plug, label: 'MCP Servers', desc: 'Model Context Protocol integrations' },
  { key: 'web3' as const, icon: Zap, label: 'Web3', desc: 'Blockchain & DeFi tools' },
  { key: 'permissions' as const, icon: Shield, label: 'Permissions', desc: 'Access control rules' },
  { key: 'hooks' as const, icon: Anchor, label: 'Hooks', desc: 'Event hooks & webhooks' },
  { key: 'install' as const, icon: Download, label: 'Services', desc: 'Install external services' },
];

export function IntegrationsPanel({
  onClose,
  mcpServers, onToggleMCPServer,
  hooks, onToggleHook, onAddHook, onRemoveHook,
  webhookSecrets, hookExecutions, onGenerateSecret, onDeleteSecret, onRefreshExecutions,
  webhookBaseUrl, projectId,
  onOpenTxBuilder,
}: IntegrationsPanelProps) {
  const [subPanel, setSubPanel] = useState<SubPanel>(null);

  // Count active integrations
  const activeMCP = mcpServers.filter(s => s.enabled).length;
  const activeHooks = hooks.filter(h => h.enabled).length;

  if (subPanel === 'mcp') {
    return <MCPConfig servers={mcpServers} onToggleServer={onToggleMCPServer} onClose={() => setSubPanel(null)} />;
  }
  if (subPanel === 'permissions') {
    return <PermissionRulesManager onClose={() => setSubPanel(null)} />;
  }
  if (subPanel === 'openclaw') {
    return <OpenClawPanel onClose={() => setSubPanel(null)} />;
  }
  if (subPanel === 'hooks') {
    return (
      <HooksConfig
        hooks={hooks}
        onToggleHook={onToggleHook}
        onAddHook={onAddHook}
        onRemoveHook={onRemoveHook}
        onClose={() => setSubPanel(null)}
        webhookSecrets={webhookSecrets}
        executions={hookExecutions}
        onGenerateSecret={onGenerateSecret}
        onDeleteSecret={onDeleteSecret}
        onRefreshExecutions={onRefreshExecutions}
        webhookBaseUrl={webhookBaseUrl}
        projectId={projectId}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-md bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Integrations</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-sm transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {SECTIONS.map(({ key, icon: Icon, label, desc }) => {
              const badge = key === 'mcp' && activeMCP > 0
                ? `${activeMCP} active`
                : key === 'hooks' && activeHooks > 0
                ? `${activeHooks} active`
                : null;

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'web3' || key === 'install') {
                      setSubPanel(key);
                      return;
                    }
                    setSubPanel(key);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors duration-150 group text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      {label}
                      {badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Manage all external integrations, permissions, and event hooks.
            </p>
          </div>
        </div>
      </div>

      {/* Web3 modal renders outside */}
      {subPanel === 'web3' && (
        <Web3Modal
          open={true}
          onClose={() => setSubPanel(null)}
          onOpenTxBuilder={() => { setSubPanel(null); onOpenTxBuilder(); }}
          onOpenMCP={() => setSubPanel('mcp')}
        />
      )}
      {subPanel === 'install' && (
        <InstallModal
          open={true}
          onClose={() => setSubPanel(null)}
          onOpenOpenClaw={() => setSubPanel('openclaw')}
        />
      )}
    </>
  );
}
