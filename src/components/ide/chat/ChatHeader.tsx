import { Plus, ChevronDown, MessageSquare } from 'lucide-react';
import { SystemPulse } from './SystemPulse';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import startedLogo from '@/assets/started-logo.png';
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

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 ${isAgentActive ? 'border-t-2 border-t-primary' : ''}`}>
      <img src={startedLogo} alt="Started" className="h-3.5 w-3.5 rounded-full opacity-60" />

      {/* Conversation switcher — dropdown instead of tabs */}
      <Popover open={convOpen} onOpenChange={setConvOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors duration-150 font-medium truncate max-w-[160px]">
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
                  ? 'bg-muted/60 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
          <div className="border-t border-border/30 mt-1 pt-1">
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
        <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground/60 animate-pulse font-mono">
          {pendingToolCount}
        </span>
      )}
      <SystemPulse state={pulseState} />
    </div>
  );
}
