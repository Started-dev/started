import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface QuestionCardProps {
  question: string;
  options: string[];
  onAnswer?: (answer: string) => void;
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionCard({ question, options, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [otherText, setOtherText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selected === null && !otherText.trim()) return;
    const answer = selected !== null ? options[selected] : otherText.trim();
    setSubmitted(true);
    onAnswer?.(answer);
  };

  return (
    <div className="rounded-md border border-border/40 bg-[hsl(var(--chat-block-bg))] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20">
        <HelpCircle className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{question}</span>
      </div>
      <div className="p-3 space-y-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            disabled={submitted}
            onClick={() => { setSelected(i); setOtherText(''); }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs text-left transition-colors duration-150',
              selected === i
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'hover:bg-accent/50 text-foreground/80 border border-transparent',
              submitted && 'opacity-60 cursor-default'
            )}
          >
            <span className="text-[10px] font-semibold text-muted-foreground w-4 shrink-0">{LABELS[i]}</span>
            <span>{opt}</span>
          </button>
        ))}
        {!submitted && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="Other..."
              value={otherText}
              onChange={e => { setOtherText(e.target.value); setSelected(null); }}
              className="flex-1 text-xs px-2.5 py-1.5 bg-input border border-border rounded-sm outline-none focus:border-primary transition-colors"
            />
            <Button
              size="sm"
              variant="default"
              className="h-7 text-[11px] px-3"
              disabled={selected === null && !otherText.trim()}
              onClick={handleSubmit}
            >
              Continue
            </Button>
          </div>
        )}
        {submitted && (
          <div className="text-[10px] text-muted-foreground mt-1">
            ✓ Answered: {selected !== null ? options[selected] : otherText}
          </div>
        )}
      </div>
    </div>
  );
}
