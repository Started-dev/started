import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Search, Menu } from "lucide-react";
import { flattenNav, docsNavigation } from "@/data/docs-navigation";
import { Button } from "@/components/ui/button";

interface DocsNavProps {
  onSearchOpen: () => void;
  onMenuOpen: () => void;
}

export function DocsNav({ onSearchOpen, onMenuOpen }: DocsNavProps) {
  const { pathname } = useLocation();
  const flat = flattenNav(docsNavigation);
  const current = flat.find((n) => n.href === pathname);

  // Build breadcrumb
  const crumbs: { label: string; href?: string }[] = [{ label: "Docs", href: "/docs/introduction" }];
  if (current) {
    // check if it's a child
    const parent = docsNavigation.find((n) => n.items?.some((c) => c.href === pathname));
    if (parent) {
      crumbs.push({ label: parent.title, href: parent.href });
    }
    crumbs.push({ label: current.title });
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center h-12 px-4 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onMenuOpen}>
          <Menu className="h-4 w-4" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm min-w-0 flex-1">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              {c.href ? (
                <Link to={c.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Search trigger */}
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] px-1 py-0.5 rounded bg-background font-mono">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
