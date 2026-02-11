import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsContent } from "@/data/docs-content";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DocsSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.values(docsContent).filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.blocks.some(
          (b) =>
            (b.type === "paragraph" && b.text.toLowerCase().includes(q)) ||
            (b.type === "heading" && b.text.toLowerCase().includes(q))
        )
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 bg-card border-border">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 py-3 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">ESC</kbd>
        </div>
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No results found.</p>
            ) : (
              results.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => {
                    navigate(`/docs/${page.slug}`);
                    onOpenChange(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{page.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{page.description}</div>
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
