import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Send, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { ChatMessage } from '@/types/ide';

interface ResultCardProps {
  msg: ChatMessage;
  onRetry?: () => void;
  onSendToChat?: () => void;
}

export function ResultCard({ msg, onRetry, onSendToChat }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const data = msg.resultData;
  if (!data) return null;

  const isSuccess = data.exitCode === 0;
  const isRunnerUnavailable = data.runnerUnavailable;

  const truncatedLogs = data.logs.length > 500 && !expanded
    ? data.logs.slice(0, 500) + '\n...'
    : data.logs;

  return (
    <div className={`animate-fade-in rounded-md border overflow-hidden ${
      isRunnerUnavailable ? 'border-ide-warning/40 bg-ide-warning/5' :
      isSuccess ? 'border-ide-success/30 bg-card/80' :
      'border-ide-error/30 bg-card/80'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
        {isRunnerUnavailable ? (
          <AlertTriangle className="h-3.5 w-3.5 text-ide-warning" />
        ) : isSuccess ? (
          <CheckCircle className="h-3.5 w-3.5 text-ide-success" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-ide-error" />
        )}
        <span className="text-[11px] font-semibold text-foreground/80">
          {isRunnerUnavailable ? 'Runner Unavailable' :
           isSuccess ? 'Execution Complete' : 'Execution Failed'}
        </span>
        {data.exitCode !== undefined && !isRunnerUnavailable && (
          <span className={`text-[10px] ml-auto px-1.5 py-0.5 rounded-sm font-mono ${
            isSuccess ? 'bg-ide-success/10 text-ide-success' : 'bg-ide-error/10 text-ide-error'
          }`}>
            exit {data.exitCode}
          </span>
        )}
        {data.durationMs !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {data.durationMs < 1000 ? `${data.durationMs}ms` : `${(data.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Error summary */}
      {data.errorSummary && (
        <div className="px-3 py-1.5 text-xs text-ide-error bg-ide-error/5 border-b border-border/20">
          {data.errorSummary}
        </div>
      )}

      {/* Logs */}
      {data.logs && (
        <div className="relative">
          <pre className="px-3 py-2 text-[11px] font-mono text-foreground/80 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap bg-background/30">
            {truncatedLogs}
          </pre>
          {data.logs.length > 500 && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1 text-[10px] text-primary hover:text-primary/80 transition-colors w-full border-t border-border/20"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Collapse' : 'View Full Logs'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/20 bg-muted/20">
        {onRetry && !isRunnerUnavailable && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/30 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
        {onSendToChat && (
          <button
            onClick={onSendToChat}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/30 transition-colors"
          >
            <Send className="h-3 w-3" />
            Send to Started
          </button>
        )}
        <button
          onClick={() => {
            if (data.logs) navigator.clipboard.writeText(data.logs);
          }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/30 transition-colors ml-auto"
        >
          <FileText className="h-3 w-3" />
          Copy Logs
        </button>
      </div>
    </div>
  );
}
