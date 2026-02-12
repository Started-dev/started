import { useState } from 'react';
import { ChevronRight, RotateCcw, Send, Copy, Check, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ChatMessage } from '@/types/ide';

interface ResultCardProps {
  msg: ChatMessage;
  onRetry?: () => void;
  onSendToChat?: () => void;
}

export function ResultCard({ msg, onRetry, onSendToChat }: ResultCardProps) {
  const data = msg.resultData;
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const isSuccess = data.exitCode === 0;
  const isRunnerUnavailable = data.runnerUnavailable;

  const handleCopy = () => {
    if (data.logs) navigator.clipboard.writeText(data.logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Determine the single primary action
  const primaryAction = isRunnerUnavailable
    ? null
    : !isSuccess && onSendToChat
      ? { label: 'Explain error', onClick: onSendToChat, icon: <Send className="h-3 w-3" /> }
      : !isSuccess && onRetry
        ? { label: 'Retry', onClick: onRetry, icon: <RotateCcw className="h-3 w-3" /> }
        : null;

  return (
    <div className="animate-fade-in space-y-1">
      {/* Status line */}
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${
          isRunnerUnavailable ? 'bg-muted-foreground/30' :
          isSuccess ? 'bg-[hsl(var(--ide-success))]' :
          'bg-[hsl(var(--ide-error))]'
        }`} />
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          {isRunnerUnavailable ? 'Runner unavailable' :
           isSuccess ? 'Success' : `Failed (exit ${data.exitCode})`}
          {data.durationMs !== undefined && (
            <span className="ml-1.5 text-muted-foreground/30">
              {data.durationMs < 1000 ? `${data.durationMs}ms` : `${(data.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </span>
      </div>

      {/* Error summary */}
      {data.errorSummary && (
        <div className="text-[11px] text-[hsl(var(--ide-error))]/70 font-mono pl-3">
          {data.errorSummary}
        </div>
      )}

      {/* Logs — collapsed by default */}
      {data.logs && (
        <Collapsible>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150">
              <ChevronRight className="h-2.5 w-2.5 transition-transform duration-150 data-[state=open]:rotate-90" />
              Logs
            </CollapsibleTrigger>
            <button
              onClick={handleCopy}
              className="text-muted-foreground/20 hover:text-muted-foreground transition-colors duration-150 p-0.5 ml-auto"
            >
              {copied ? <Check className="h-2.5 w-2.5 text-[hsl(var(--ide-success))]" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </div>
          <CollapsibleContent>
            <pre className="mt-1 px-3 py-2 text-[10px] font-mono text-muted-foreground/60 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap rounded-md bg-[hsl(var(--chat-block-bg))]">
              {data.logs}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Single primary action */}
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted/40 transition-colors duration-150"
        >
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      )}
    </div>
  );
}
