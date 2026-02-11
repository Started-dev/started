import { Play, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { ChatMessage } from '@/types/ide';

interface ActionCardProps {
  msg: ChatMessage;
}

export function ActionCard({ msg }: ActionCardProps) {
  const data = msg.actionData;
  if (!data) return null;

  const statusIcon = {
    queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    running: <Loader2 className="h-3.5 w-3.5 text-ide-warning animate-spin" />,
    success: <CheckCircle className="h-3.5 w-3.5 text-ide-success" />,
    failed: <XCircle className="h-3.5 w-3.5 text-ide-error" />,
  }[data.status];

  const statusColor = {
    queued: 'border-border/40',
    running: 'border-ide-warning/40',
    success: 'border-ide-success/40',
    failed: 'border-ide-error/40',
  }[data.status];

  return (
    <div className={`animate-fade-in rounded-md border ${statusColor} bg-card/80 shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
            {data.actionType}
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate mt-0.5">
            $ {data.command}
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
          data.status === 'success' ? 'bg-ide-success/10 text-ide-success' :
          data.status === 'failed' ? 'bg-ide-error/10 text-ide-error' :
          data.status === 'running' ? 'bg-ide-warning/10 text-ide-warning' :
          'bg-muted text-muted-foreground'
        }`}>
          {data.status}
        </span>
      </div>
    </div>
  );
}
