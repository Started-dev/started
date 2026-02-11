import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusDot {
  color: 'green' | 'yellow' | 'red';
  pulse?: boolean;
}

interface NavIconButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  status?: StatusDot;
  className?: string;
}

export function NavIconButton({ icon, tooltip, onClick, active, status, className = '' }: NavIconButtonProps) {
  const dotColors = {
    green: 'bg-ide-success',
    yellow: 'bg-ide-warning',
    red: 'bg-ide-error',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`relative p-1.5 rounded-md transition-all duration-150 ${
            active
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-accent/40'
          } ${className}`}
        >
          {icon}
          {status && (
            <span
              className={`absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${dotColors[status.color]} ${
                status.pulse ? 'animate-pulse' : ''
              }`}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
