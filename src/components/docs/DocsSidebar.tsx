import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsNavigation, type DocNavItem } from "@/data/docs-navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

function NavItem({ item, depth = 0 }: { item: DocNavItem; depth?: number }) {
  const { pathname } = useLocation();
  const isActive = pathname === item.href;
  const hasChildren = !!item.items?.length;
  const isParentActive = hasChildren && (pathname.startsWith(item.href + "/") || pathname === item.href);

  if (hasChildren) {
    return (
      <Collapsible defaultOpen={isParentActive}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group">
          <Link
            to={item.href}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "text-left",
              (isActive || isParentActive) && "text-foreground font-medium"
            )}
          >
            {item.title}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 mt-0.5 border-l border-border pl-2 space-y-0.5">
            {item.items!.map((child) => (
              <NavItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link
      to={item.href}
      className={cn(
        "block rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "text-primary font-medium bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {item.title}
    </Link>
  );
}

interface DocsSidebarProps {
  onNavigate?: () => void;
}

export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  return (
    <ScrollArea className="h-full" onClick={onNavigate}>
      <div className="px-3 py-4 space-y-1">
        <p className="px-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documentation</p>
        {docsNavigation.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>
    </ScrollArea>
  );
}
