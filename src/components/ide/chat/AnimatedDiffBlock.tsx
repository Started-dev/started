import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedDiffBlockProps {
  code: string;
  defaultCollapsed?: boolean;
}

export function AnimatedDiffBlock({ code, defaultCollapsed = false }: AnimatedDiffBlockProps) {
  const lines = code.split('\n');
  const [open, setOpen] = useState(!defaultCollapsed);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const adds = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removes = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

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

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const summaryLabel = `${uniqueFiles.length || '?'} file${uniqueFiles.length !== 1 ? 's' : ''} · +${adds} −${removes}`;

  return (
    <div ref={ref}>
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 w-full text-left group/diff"
      >
        <ChevronRight className={cn(
          "h-3 w-3 text-muted-foreground/40 transition-transform duration-200",
          open && "rotate-90"
        )} />
        <span className="text-[11px] font-mono text-muted-foreground/60">
          {uniqueFiles.length === 1 ? uniqueFiles[0] : summaryLabel}
        </span>
        <span className="text-[10px] text-muted-foreground/30 ml-1">
          <span className="text-[hsl(var(--ide-success))]/60">+{adds}</span>
          {' '}
          <span className="text-[hsl(var(--ide-error))]/50">−{removes}</span>
        </span>
        <span className="ml-auto opacity-0 group-hover/diff:opacity-100 transition-opacity duration-150" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-[hsl(var(--ide-success))]" /> : <Copy className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground" />}
        </span>
      </button>

      {/* Diff body */}
      {open && (
        <div className="mt-1.5 rounded-md overflow-hidden border-l-2 border-primary/20">
          <div className="bg-[hsl(var(--chat-block-bg))]">
            {/* File tabs when multiple files */}
            {uniqueFiles.length > 1 && (
              <div className="px-3 py-1.5 border-b border-border/15 flex flex-wrap gap-x-3 gap-y-0.5">
                {uniqueFiles.map((f, i) => (
                  <span key={i} className="text-[10px] font-mono text-muted-foreground/40">{f}</span>
                ))}
              </div>
            )}

            <pre className="px-3 py-2.5 overflow-x-auto text-[11px] font-mono leading-[1.6] max-h-[350px] overflow-y-auto">
              <code>
                {lines.map((line, i) => {
                  if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ')) return null;

                  const isAdd = line.startsWith('+');
                  const isRemove = line.startsWith('-');
                  const isHunk = line.startsWith('@@');

                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex transition-all duration-150 rounded-sm -mx-1 px-1',
                        visible ? 'animate-diff-line' : 'opacity-0',
                        isAdd && 'bg-[hsl(var(--ide-success))]/8 text-[hsl(var(--ide-success))]',
                        isRemove && 'bg-[hsl(var(--ide-error))]/6 text-[hsl(var(--ide-error))]/60',
                        isHunk && 'text-[hsl(var(--ide-info))]/50 text-[10px] mt-1',
                        !isAdd && !isRemove && !isHunk && 'text-muted-foreground/50'
                      )}
                      style={{ animationDelay: visible ? `${Math.min(i * 15, 500)}ms` : '0ms' }}
                    >
                      <span className="w-6 shrink-0 text-right select-none text-muted-foreground/15 mr-2 text-[10px] tabular-nums">{i + 1}</span>
                      <span className="flex-1 whitespace-pre">{line}</span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
