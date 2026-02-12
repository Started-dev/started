import { useState, useEffect, useMemo } from 'react';
import { X, FileCode, GitBranch, Play, Brain, Plug } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIDE } from '@/contexts/IDEContext';

interface ContextChipData {
  key: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  warn?: boolean;
}

export function ContextStrip() {
  const { activeTabId, getFileById, runs, pendingPatches, agentRun, runnerStatus } = useIDE();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(new Set());
  }, [activeTabId]);

  const chips = useMemo(() => {
    const result: ContextChipData[] = [];

    if (runnerStatus === 'disconnected' || runnerStatus === 'misconfigured') {
      result.push({
        key: 'runner',
        icon: <Plug className="h-3 w-3" />,
        label: `Runner: ${runnerStatus === 'disconnected' ? 'Disconnected' : 'Misconfigured'}`,
        tooltip: runnerStatus === 'disconnected' ? 'No runner connected' : 'Runner misconfigured',
        warn: true,
      });
    }

    if (activeTabId) {
      const file = getFileById(activeTabId);
      if (file) {
        result.push({
          key: 'file',
          icon: <FileCode className="h-3 w-3" />,
          label: file.name,
          tooltip: file.path,
        });
      }
    }

    const previewPatches = pendingPatches.filter(p => p.status === 'preview');
    if (previewPatches.length > 0) {
      const total = previewPatches.reduce((acc, p) => {
        const added = (p.raw.match(/^\+[^+]/gm) || []).length;
        const removed = (p.raw.match(/^-[^-]/gm) || []).length;
        return { added: acc.added + added, removed: acc.removed + removed };
      }, { added: 0, removed: 0 });
      result.push({
        key: 'diff',
        icon: <GitBranch className="h-3 w-3" />,
        label: `+${total.added} −${total.removed}`,
        tooltip: `${previewPatches.length} pending patch(es)`,
      });
    }

    if (runs.length > 0 && runnerStatus !== 'disconnected') {
      const last = runs[runs.length - 1];
      const statusLabel = last.status === 'error' ? 'failed' : last.status;
      result.push({
        key: 'run',
        icon: <Play className="h-3 w-3" />,
        label: statusLabel,
        tooltip: last.command,
      });
    }

    if (agentRun && (agentRun.status === 'running' || agentRun.status === 'queued')) {
      const currentStep = agentRun.steps.filter(s => s.status === 'completed').length + 1;
      result.push({
        key: 'agent',
        icon: <Brain className="h-3 w-3" />,
        label: `step ${currentStep}/${agentRun.maxIterations}`,
        tooltip: agentRun.goal,
      });
    }

    return result.filter(c => !dismissed.has(c.key));
  }, [activeTabId, getFileById, runs, pendingPatches, agentRun, dismissed, runnerStatus]);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-1.5">
      {chips.map(chip => (
        <Tooltip key={chip.key}>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md transition-colors duration-150 group cursor-default ${
              chip.warn
                ? 'text-[hsl(var(--ide-warning))]/60 bg-[hsl(var(--ide-warning))]/5 border border-[hsl(var(--ide-warning))]/10'
                : 'text-muted-foreground/50 bg-muted/20 border border-border/20'
            }`}>
              {chip.icon}
              <span className="font-mono">{chip.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(prev => new Set(prev).add(chip.key)); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 -mr-0.5 rounded-full hover:bg-muted/40"
              >
                <X className="h-2 w-2" />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">{chip.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
