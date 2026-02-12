import { useState } from 'react';
import { ChevronRight, RotateCcw, Send, Copy, Check } from 'lucide-react';
import type { ChatMessage } from '@/types/ide';

interface ResultCardProps {
  msg: ChatMessage;
  onRetry?: () => void;
  onSendToChat?: () => void;
}

export function ResultCard({ msg, onRetry, onSendToChat }: ResultCardProps) {
  const data = msg.resultData;
  const [copied, setCopied] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  if (!data) return null;

  const isSuccess = data.exitCode === 0;
  const isRunnerUnavailable = data.runnerUnavailable;

  const handleCopy = () => {
    if (data.logs) navigator.clipboard.writeText(data.logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Single primary action
  const primaryAction = isRunnerUnavailable
    ? null
    : !isSuccess && onSendToChat
      ? { label: 'Explain error', onClick: onSendToChat, icon: <Send className="h-3 w-3" /> }
      : !isSuccess && onRetry
        ? { label: 'Retry', onClick: onRetry, icon: <RotateCcw className="h-3 w-3" /> }
        : null;

  return (
    <div className="animate-fade-in space-y-2 pl-3 relative">
      {/* Left accent for failed results */}
      {!isSuccess && !isRunnerUnavailable && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-[hsl(var(--ide-error))]/40" />
      )}

      {/* Status line */}
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isRunnerUnavailable ? 'bg-muted-foreground/30' :
          isSuccess ? 'bg-[hsl(var(--ide-success))]' :
          'bg-[hsl(var(--ide-error))]'
        }`} />
        <span className="text-[11px] text-muted-foreground/70 font-mono">
          {isRunnerUnavailable ? 'Runner unavailable' :
           isSuccess ? 'Success' : `Failed (exit ${data.exitCode})`}
        </span>
        {data.durationMs !== undefined && (
          <span className="text-[10px] text-muted-foreground/25 font-mono">
            {data.durationMs < 1000 ? `${data.durationMs}ms` : `${(data.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Error summary */}
      {data.errorSummary && (
        <div className="text-[11px] text-[hsl(var(--ide-error))]/70 font-mono leading-relaxed">
          {data.errorSummary}
        </div>
      )}

      {/* Logs toggle */}
      {data.logs && (
        <div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogsOpen(prev => !prev)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150"
            >
              <ChevronRight className={`h-2.5 w-2.5 transition-transform duration-200 ${logsOpen ? 'rotate-90' : ''}`} />
              <span>Logs</span>
            </button>
            <button
              onClick={handleCopy}
              className="text-muted-foreground/20 hover:text-muted-foreground transition-colors duration-150 p-0.5 ml-auto"
            >
              {copied ? <Check className="h-2.5 w-2.5 text-[hsl(var(--ide-success))]" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </div>
          {logsOpen && (
            <pre className="mt-1.5 px-3 py-2.5 text-[10px] font-mono text-muted-foreground/50 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap rounded-md bg-[hsl(var(--chat-block-bg))] leading-relaxed">
              {data.logs}
            </pre>
          )}
        </div>
      )}

      {/* Primary action — orange CTA */}
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-150"
        >
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      )}
    </div>
  );
}
