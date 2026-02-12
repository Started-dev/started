import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThoughtBlockProps {
  content: string;
  elapsed?: string;
}

export function ThoughtBlock({ content, elapsed }: ThoughtBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 text-[11px] text-primary/80 hover:text-primary transition-colors duration-150"
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-90')} />
        <span className="font-medium">Thought</span>
        {elapsed && <span className="text-muted-foreground font-normal">{elapsed}</span>}
      </button>
      {open && (
        <div className="mt-1.5 ml-4.5 pl-3 border-l-2 border-primary/20 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed animate-fade-in">
          {content}
        </div>
      )}
    </div>
  );
}
