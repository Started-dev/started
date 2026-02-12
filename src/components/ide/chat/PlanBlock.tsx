import { useState } from 'react';
import { ChevronDown, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanBlockProps {
  content: string;
}

function parseSteps(content: string): string[] {
  // Remove "Plan:" header variants
  const body = content.replace(/^(Plan:|##?\s*Plan)\s*/im, '').trim();
  // Split on numbered or bulleted lines
  const lines = body.split('\n').filter(l => l.trim());
  const steps: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[\s]*[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (cleaned) steps.push(cleaned);
  }
  return steps;
}

export function PlanBlock({ content }: PlanBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const steps = parseSteps(content);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-md border border-border/30 bg-[hsl(var(--chat-block-bg))] overflow-hidden">
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[11px] font-semibold text-foreground/80 hover:text-foreground transition-colors duration-150"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', collapsed && '-rotate-90')} />
        <span>Plan</span>
        <span className="text-muted-foreground font-normal ml-1">{steps.length} steps</span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-2.5 space-y-1 border-l-2 border-primary/40 ml-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
              <Circle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
