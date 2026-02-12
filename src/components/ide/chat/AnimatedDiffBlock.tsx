import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AnimatedDiffBlockProps {
  code: string;
  defaultCollapsed?: boolean;
}

export function AnimatedDiffBlock({ code, defaultCollapsed = true }: AnimatedDiffBlockProps) {
  const lines = code.split('\n');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Count stats
  const adds = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removes = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

  // Extract filenames from diff headers
  const fileNames = lines
    .filter(l => l.startsWith('+++ ') || l.startsWith('--- '))
    .map(l => l.replace(/^[+-]{3}\s+[ab]\//, '').replace(/^[+-]{3}\s+/, ''))
    .filter(f => f !== '/dev/null');
  const uniqueFiles = [...new Set(fileNames)];

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const summaryLabel = `${uniqueFiles.length || '?'} file${uniqueFiles.length !== 1 ? 's' : ''} · +${adds} −${removes}`;

  return (
    <div ref={ref}>
      <Collapsible defaultOpen={!defaultCollapsed}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
            <ChevronRight className="h-3 w-3 transition-transform duration-150 data-[state=open]:rotate-90" />
            <span>Diff</span>
            <span className="text-muted-foreground/40 font-normal ml-1">{summaryLabel}</span>
          </CollapsibleTrigger>
          <button
            onClick={handleCopy}
            className="text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150 p-0.5"
          >
            {copied ? <Check className="h-3 w-3 text-[hsl(var(--ide-success))]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        <CollapsibleContent className="mt-1">
          <div className="rounded-md bg-[hsl(var(--chat-block-bg))] overflow-hidden">
            {/* File list */}
            {uniqueFiles.length > 1 && (
              <div className="px-3 py-1 border-b border-border/20 flex flex-wrap gap-x-3 gap-y-0.5">
                {uniqueFiles.map((f, i) => (
                  <span key={i} className="text-[10px] font-mono text-muted-foreground/50">{f}</span>
                ))}
              </div>
            )}

            <pre className="px-3 py-2 overflow-x-auto text-[11px] font-mono leading-relaxed max-h-[300px] overflow-y-auto">
              <code>
                {lines.map((line, i) => {
                  // Skip raw diff headers
                  if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ')) return null;

                  return (
                    <div
                      key={i}
                      className={cn(
                        'transition-all duration-150 flex',
                        visible ? 'animate-diff-line' : 'opacity-0',
                        line.startsWith('+') ? 'text-[hsl(var(--ide-success))]' :
                        line.startsWith('-') ? 'text-[hsl(var(--ide-error))] opacity-60' :
                        line.startsWith('@@') ? 'text-[hsl(var(--ide-info))] text-[10px]' : 'text-muted-foreground/60'
                      )}
                      style={{ animationDelay: visible ? `${Math.min(i * 20, 600)}ms` : '0ms' }}
                    >
                      <span className="w-4 shrink-0 text-right select-none text-muted-foreground/20 mr-2 text-[10px]">{i + 1}</span>
                      <span className="flex-1">{line}</span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
