import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedDiffBlockProps {
  code: string;
  defaultCollapsed?: boolean;
}

function extractFilename(code: string): string | null {
  for (const line of code.split('\n')) {
    const match = line.match(/^(?:\+\+\+|---)\s+[ab]\/(.+)/);
    if (match) return match[1];
  }
  return null;
}

function countChanges(code: string): { added: number; removed: number } {
  let added = 0, removed = 0;
  for (const line of code.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    else if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }
  return { added, removed };
}

export function AnimatedDiffBlock({ code, defaultCollapsed = false }: AnimatedDiffBlockProps) {
  const lines = code.split('\n');
  const isLong = lines.length > 20;
  const [collapsed, setCollapsed] = useState(defaultCollapsed || isLong);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  const filename = extractFilename(code);
  const { added, removed } = countChanges(code);

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
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLines = collapsed ? lines.slice(0, 8) : lines;

  return (
    <div className="rounded-md border border-border/30 bg-[hsl(var(--chat-block-bg))] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          {filename ? (
            <span className="text-[10px] text-foreground/70 font-mono truncate">{filename}</span>
          ) : (
            <span className="text-[10px] text-muted-foreground font-mono">diff</span>
          )}
          {(added > 0 || removed > 0) && (
            <span className="text-[10px] font-mono shrink-0">
              {added > 0 && <span className="text-ide-success">+{added}</span>}
              {added > 0 && removed > 0 && <span className="text-muted-foreground/40 mx-0.5"> </span>}
              {removed > 0 && <span className="text-ide-error">−{removed}</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors duration-150"
            title="Copy diff"
          >
            {copied ? <Check className="h-3 w-3 text-ide-success" /> : <Copy className="h-3 w-3" />}
          </button>
          {isLong && (
            <button
              onClick={() => setCollapsed(prev => !prev)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
      <pre ref={ref} className="px-3 py-2 overflow-x-auto text-[11px] font-mono leading-relaxed">
        <code>
          {displayLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'transition-all duration-150',
                visible ? 'animate-diff-line' : 'opacity-0',
                line.startsWith('+') && !line.startsWith('+++') ? 'text-ide-success' :
                line.startsWith('-') && !line.startsWith('---') ? 'text-ide-error opacity-60 line-through' :
                line.startsWith('@@') ? 'text-ide-info' : 'text-muted-foreground'
              )}
              style={{ animationDelay: visible ? `${i * 30}ms` : '0ms' }}
            >
              {line}
            </div>
          ))}
          {collapsed && isLong && (
            <div className="text-muted-foreground/50 py-1">... {lines.length - 8} more lines</div>
          )}
        </code>
      </pre>
    </div>
  );
}
