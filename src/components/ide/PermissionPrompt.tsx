import { Shield, ShieldAlert, ShieldCheck, ShieldX, Terminal, FileCode, Search, Globe } from 'lucide-react';
import { ToolCall } from '@/types/tools';
import { describeToolCall, getToolRiskLevel } from '@/lib/tool-executor';

interface PermissionPromptProps {
  toolCall: ToolCall;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysAllow?: () => void;
}

const toolIcons: Record<string, React.ReactNode> = {
  read_file: <FileCode className="h-4 w-4" />,
  list_files: <Search className="h-4 w-4" />,
  grep: <Search className="h-4 w-4" />,
  apply_patch: <FileCode className="h-4 w-4" />,
  run_command: <Terminal className="h-4 w-4" />,
  git_status: <Terminal className="h-4 w-4" />,
  web_fetch: <Globe className="h-4 w-4" />,
  web_search: <Globe className="h-4 w-4" />,
};

export function PermissionPrompt({ toolCall, onApprove, onDeny, onAlwaysAllow }: PermissionPromptProps) {
  const risk = getToolRiskLevel(toolCall.tool);
  const description = describeToolCall(toolCall);

  const riskConfig = {
    safe: {
      icon: <ShieldCheck className="h-5 w-5 text-ide-success" />,
      border: 'border-ide-success/30',
      bg: 'bg-ide-success/5',
      label: 'Low Risk',
      labelColor: 'text-ide-success',
    },
    moderate: {
      icon: <ShieldAlert className="h-5 w-5 text-ide-warning" />,
      border: 'border-ide-warning/30',
      bg: 'bg-ide-warning/5',
      label: 'Moderate Risk',
      labelColor: 'text-ide-warning',
    },
    dangerous: {
      icon: <ShieldX className="h-5 w-5 text-ide-error" />,
      border: 'border-ide-error/30',
      bg: 'bg-ide-error/5',
      label: 'High Risk',
      labelColor: 'text-ide-error',
    },
  }[risk];

  const input = toolCall.input as Record<string, unknown>;

  return (
    <div className={`rounded-md border ${riskConfig.border} ${riskConfig.bg} p-3 animate-fade-in`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Permission Required
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${riskConfig.labelColor} bg-background/50`}>
          {riskConfig.label}
        </span>
      </div>

      {/* Tool info */}
      <div className="flex items-start gap-2 mb-3">
        <div className="p-1.5 rounded-sm bg-muted shrink-0 mt-0.5">
          {toolIcons[toolCall.tool] || <Shield className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-foreground">{description}</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {toolCall.tool}({JSON.stringify(input).slice(0, 80)}{JSON.stringify(input).length > 80 ? '…' : ''})
          </div>
        </div>
      </div>

      {/* Show full command for run_command */}
      {toolCall.tool === 'run_command' && input.command && (
        <div className="mb-3 p-2 rounded-sm bg-muted font-mono text-[11px] text-foreground overflow-x-auto">
          <span className="text-muted-foreground">$ </span>
          {input.command as string}
        </div>
      )}

      {/* Show diff preview for apply_patch */}
      {toolCall.tool === 'apply_patch' && input.unified_diff && (
        <div className="mb-3 p-2 rounded-sm bg-muted font-mono text-[10px] max-h-[120px] overflow-auto">
          {(input.unified_diff as string).split('\n').slice(0, 15).map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('+') ? 'text-ide-success' :
                line.startsWith('-') ? 'text-ide-error' :
                line.startsWith('@@') ? 'text-ide-info' :
                'text-muted-foreground'
              }
            >
              {line}
            </div>
          ))}
          {(input.unified_diff as string).split('\n').length > 15 && (
            <div className="text-muted-foreground mt-1">… {(input.unified_diff as string).split('\n').length - 15} more lines</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ide-success/15 text-ide-success rounded-sm hover:bg-ide-success/25 transition-colors font-medium"
        >
          <ShieldCheck className="h-3 w-3" />
          Allow
        </button>
        <button
          onClick={onDeny}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ide-error/15 text-ide-error rounded-sm hover:bg-ide-error/25 transition-colors font-medium"
        >
          <ShieldX className="h-3 w-3" />
          Deny
        </button>
        {onAlwaysAllow && (
          <button
            onClick={onAlwaysAllow}
            className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Always allow this
          </button>
        )}
      </div>
    </div>
  );
}
