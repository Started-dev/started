import { Plug, BookOpen, Play, Wrench, HelpCircle } from 'lucide-react';
import type { ChatMessage } from '@/types/ide';

interface SuggestionCardProps {
  msg: ChatMessage;
  onAction: (action: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'connect_runner': <Plug className="h-3.5 w-3.5" />,
  'view_docs': <BookOpen className="h-3.5 w-3.5" />,
  'run_command': <Play className="h-3.5 w-3.5" />,
  'fix_error': <Wrench className="h-3.5 w-3.5" />,
};

export function SuggestionCard({ msg, onAction }: SuggestionCardProps) {
  const data = msg.suggestionData;
  if (!data) return null;

  return (
    <div className="animate-fade-in rounded-md border border-primary/30 bg-primary/5 overflow-hidden">
      {/* Primary action */}
      <button
        onClick={() => onAction(data.primary.action)}
        className="flex items-center gap-2 px-3 py-2.5 w-full text-left hover:bg-primary/10 transition-colors"
      >
        {ICON_MAP[data.primary.action] || <HelpCircle className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium text-foreground">{data.primary.label}</span>
      </button>

      {/* Secondary actions */}
      {data.secondary && data.secondary.length > 0 && (
        <div className="border-t border-primary/20 flex">
          {data.secondary.map((s, i) => (
            <button
              key={i}
              onClick={() => onAction(s.action)}
              className="flex-1 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors border-r border-primary/20 last:border-r-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
