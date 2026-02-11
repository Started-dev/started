import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { flattenNav, docsNavigation } from "@/data/docs-navigation";

interface DocsPrevNextProps {
  currentSlug: string;
}

export function DocsPrevNext({ currentSlug }: DocsPrevNextProps) {
  const flat = flattenNav(docsNavigation);
  const currentPath = `/docs/${currentSlug}`;
  const idx = flat.findIndex((n) => n.href === currentPath);

  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <div className="flex items-center justify-between mt-16 pt-6 border-t border-border">
      {prev ? (
        <Link to={prev.href} className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <div>
            <div className="text-xs text-muted-foreground">Previous</div>
            <div className="font-medium text-foreground">{prev.title}</div>
          </div>
        </Link>
      ) : <div />}
      {next ? (
        <Link to={next.href} className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right">
          <div>
            <div className="text-xs text-muted-foreground">Next</div>
            <div className="font-medium text-foreground">{next.title}</div>
          </div>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : <div />}
    </div>
  );
}
