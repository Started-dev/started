import { useState } from 'react';
import { Plug, Check, X, Shield, ChevronRight, ChevronDown, Wrench } from 'lucide-react';
import { MCPServer } from '@/types/agent';

interface MCPConfigProps {
  servers: MCPServer[];
  onToggleServer: (serverId: string) => void;
  onClose: () => void;
}

export function MCPConfig({ servers, onToggleServer, onClose }: MCPConfigProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">MCP Servers</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-sm">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Server list */}
        <div className="max-h-[400px] overflow-auto p-2 space-y-1">
          {servers.map(server => {
            const isExpanded = expandedId === server.id;
            return (
              <div key={server.id} className="border border-border rounded-md overflow-hidden">
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : server.id)}
                >
                  <span className="text-lg">{server.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{server.name}</span>
                      {server.requiresAuth && !server.authConfigured && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-ide-warning/10 text-ide-warning rounded-sm flex items-center gap-0.5">
                          <Shield className="h-2.5 w-2.5" />
                          Auth needed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{server.description}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onToggleServer(server.id); }}
                    className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                      server.enabled
                        ? 'bg-ide-success/10 text-ide-success hover:bg-ide-success/20'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {server.enabled ? (
                      <span className="flex items-center gap-1"><Check className="h-3 w-3" /> On</span>
                    ) : 'Off'}
                  </button>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-2.5 pt-0 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-2 mb-1">
                      Available Tools ({server.tools.length})
                    </div>
                    <div className="space-y-1">
                      {server.tools.map(tool => (
                        <div key={tool.name} className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-sm">
                          <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-mono text-foreground">{tool.name}</span>
                            <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            MCP servers extend Claude's capabilities. Tokens are stored server-side.
          </p>
        </div>
      </div>
    </div>
  );
}
