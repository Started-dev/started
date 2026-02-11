import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocCodeBlock } from "@/data/docs-content";

interface DocsCodeBlockProps {
  blocks: DocCodeBlock[];
}

export function DocsCodeBlock({ blocks }: DocsCodeBlockProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const active = blocks[activeTab];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden">
      {/* Tab bar */}
      {(blocks.length > 1 || active.filename) && (
        <div className="flex items-center gap-0 bg-secondary/50 border-b border-border px-1 text-xs">
          {blocks.map((b, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-3 py-1.5 transition-colors",
                i === activeTab
                  ? "text-foreground bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {b.filename || b.language}
            </button>
          ))}
        </div>
      )}
      {/* Code area */}
      <div className="relative group">
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed bg-sidebar font-mono">
          <code className="text-foreground/90">{active.code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-ide-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
