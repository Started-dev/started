import { FileText, Search, List, Pencil, FilePlus, Check } from 'lucide-react';

interface ToolActionBlockProps {
  actions: string[];
}

const ACTION_ICONS: Record<string, typeof FileText> = {
  Reading: FileText,
  Grepped: Search,
  Listed: List,
  Edited: Pencil,
  Created: FilePlus,
  Applied: Check,
};

function getIcon(action: string) {
  for (const [key, Icon] of Object.entries(ACTION_ICONS)) {
    if (action.startsWith(key)) return Icon;
  }
  return FileText;
}

export function ToolActionBlock({ actions }: ToolActionBlockProps) {
  return (
    <div className="space-y-0.5">
      {actions.map((action, i) => {
        const Icon = getIcon(action);
        return (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono">
            <Icon className="h-3 w-3 text-ide-success/60 shrink-0" />
            <span className="truncate">{action}</span>
          </div>
        );
      })}
    </div>
  );
}
