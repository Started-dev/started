import { Plus, ChevronDown, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Conversation } from '@/types/ide';
import { useState } from 'react';

type PulseState = 'idle' | 'processing' | 'agent' | 'error';

interface ChatHeaderProps {
  pulseState: PulseState;
  pendingToolCount: number;
  isAgentActive: boolean;
  conversations: Conversation[];
  activeConversationId: string;
  onSwitchConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatHeader({
  pulseState,
  pendingToolCount,
  isAgentActive,
  conversations,
  activeConversationId,
  onSwitchConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatHeaderProps) {
  const [convOpen, setConvOpen] = useState(false);
  const activeConv = conversations.find(c => c.id === activeConversationId);
  const title = activeConv?.title || 'New Chat';

  const dotColor = pulseState === 'error'
    ? 'bg-[hsl(var(--ide-error))]'
    : pulseState === 'agent' || pulseState === 'processing'
      ? 'bg-primary'
      : 'bg-muted-foreground/30';

  const isAnimating = pulseState === 'processing' || pulseState === 'agent';

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/30">
      {/* Signal dot */}
      <div className="relative flex items-center justify-center">
        <span className={`h-2 w-2 rounded-full ${dotColor} transition-colors duration-300`} />
        {isAnimating && (
          <span className={`absolute inset-0 h-2 w-2 rounded-full ${dotColor} animate-ping opacity-40`} />
        )}
      </div>

      {/* Conversation switcher */}
      <Popover open={convOpen} onOpenChange={setConvOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-[12px] text-foreground/70 hover:text-foreground transition-colors duration-150 font-medium truncate max-w-[180px]">
            <span className="truncate">{title}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-52 p-1" sideOffset={4}>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { onSwitchConversation(conv.id); setConvOpen(false); }}
              className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] rounded-sm transition-colors duration-150 ${
                conv.id === activeConversationId
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
          <div className="border-t border-border/20 mt-1 pt-1">
            <button
              onClick={() => { onNewConversation(); setConvOpen(false); }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40 hover:text-foreground rounded-sm transition-colors duration-150"
            >
              <Plus className="h-3 w-3 shrink-0" />
              New objective
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      {pendingToolCount > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono tabular-nums">
          {pendingToolCount}
        </span>
      )}

      {isAgentActive && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium uppercase tracking-wider">
          Agent
        </span>
      )}
    </div>
  );
}
