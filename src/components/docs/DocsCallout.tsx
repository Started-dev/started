import { AlertTriangle, Info, Lightbulb, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  note: {
    icon: Info,
    border: "border-l-ide-info",
    bg: "bg-ide-info/5",
    iconColor: "text-ide-info",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-l-primary",
    bg: "bg-primary/5",
    iconColor: "text-primary",
  },
  tip: {
    icon: Lightbulb,
    border: "border-l-ide-success",
    bg: "bg-ide-success/5",
    iconColor: "text-ide-success",
  },
  danger: {
    icon: ShieldAlert,
    border: "border-l-ide-error",
    bg: "bg-ide-error/5",
    iconColor: "text-ide-error",
  },
};

interface DocsCalloutProps {
  variant: keyof typeof variants;
  title: string;
  children: React.ReactNode;
}

export function DocsCallout({ variant, title, children }: DocsCalloutProps) {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div className={cn("my-4 rounded-md border-l-4 p-4", v.border, v.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4 shrink-0", v.iconColor)} />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed pl-6">{children}</div>
    </div>
  );
}
