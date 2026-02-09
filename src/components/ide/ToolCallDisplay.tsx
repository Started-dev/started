import { CheckCircle, XCircle, Loader2, Terminal, FileCode, Search, Globe, Clock, Shield } from 'lucide-react';
import { ToolCall } from '@/types/tools';
import { describeToolCall } from '@/lib/tool-executor';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

const statusConfig = {
  pending: { icon: <Clock className="h-3 w-3 text-ide-warning" />, label: 'Pending', color: 'text-ide-warning' },
  approved: { icon: <Shield className="h-3 w-3 text-ide-success" />, label: 'Approved', color: 'text-ide-success' },
  denied: { icon: <Shield className="h-3 w-3 text-ide-error" />, label: 'Denied', color: 'text-ide-error' },
  running: { icon: <Loader2 className="h-3 w-3 text-ide-info animate-spin" />, label: 'Running', color: 'text-ide-info' },
  completed: { icon: <CheckCircle className="h-3 w-3 text-ide-success" />, label: 'Done', color: 'text-ide-success' },
  failed: { icon: <XCircle className="h-3 w-3 text-ide-error" />, label: 'Failed', color: 'text-ide-error' },
};

const toolIcons: Record<string, React.ReactNode> = {
  read_file: <FileCode className="h-3 w-3" />,
  list_files: <Search className="h-3 w-3" />,
  grep: <Search className="h-3 w-3" />,
  apply_patch: <FileCode className="h-3 w-3" />,
  run_command: <Terminal className="h-3 w-3" />,
  git_status: <Terminal className="h-3 w-3" />,
  web_fetch: <Globe className="h-3 w-3" />,
  web_search: <Globe className="h-3 w-3" />,
};

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const status = statusConfig[toolCall.status];
  const description = describeToolCall(toolCall);

  return (
    <div className="rounded-sm border border-border bg-muted/30 p-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {toolIcons[toolCall.tool] || <Terminal className="h-3 w-3" />}
        </span>
        <span className="flex-1 text-[11px] font-mono text-foreground truncate">
          {description}
        </span>
        <span className={`flex items-center gap-1 text-[10px] ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Result output */}
      {toolCall.result && (
        <div className="mt-1.5 pl-5">
          {toolCall.result.ok ? (
            <div className="text-[10px] font-mono text-muted-foreground max-h-[80px] overflow-auto">
              {toolCall.result.stdout && <pre className="whitespace-pre-wrap">{toolCall.result.stdout.slice(0, 500)}</pre>}
              {toolCall.result.content && <pre className="whitespace-pre-wrap">{toolCall.result.content.slice(0, 300)}</pre>}
              {toolCall.result.files && (
                <div>{toolCall.result.files.slice(0, 10).join('\n')}{toolCall.result.files.length > 10 ? `\n… +${toolCall.result.files.length - 10} more` : ''}</div>
              )}
              {toolCall.result.matches && (
                <div>
                  {toolCall.result.matches.slice(0, 5).map((m, i) => (
                    <div key={i} className="text-muted-foreground">
                      <span className="text-ide-info">{m.file}</span>:<span className="text-foreground">{m.line}</span> {m.text}
                    </div>
                  ))}
                  {toolCall.result.matches.length > 5 && (
                    <div>… +{toolCall.result.matches.length - 5} more matches</div>
                  )}
                </div>
              )}
              {toolCall.result.duration_ms !== undefined && (
                <div className="text-muted-foreground/60 mt-0.5">{toolCall.result.duration_ms}ms</div>
              )}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-ide-error">
              {toolCall.result.error || toolCall.result.stderr}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
