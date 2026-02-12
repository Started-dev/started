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

    // Runner status — only when disconnected/misconfigured
    if (runnerStatus === 'disconnected' || runnerStatus === 'misconfigured') {
      result.push({
        key: 'runner',
        icon: <Plug className="h-3 w-3" />,
        label: `@runner: ${runnerStatus}`,
        tooltip: runnerStatus === 'disconnected'
          ? 'No runner connected'
          : 'Runner misconfigured',
        warn: true,
      });
    }

    // Active file
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

    // Pending diffs
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

    // Last run — only if runner connected
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

    // Agent
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
    <div className="flex flex-wrap gap-1 px-3 py-1">
      {chips.map(chip => (
        <Tooltip key={chip.key}>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm transition-colors duration-150 group cursor-default ${
              chip.warn
                ? 'text-muted-foreground/60 bg-muted/30'
                : 'text-muted-foreground/50 bg-transparent'
            }`}>
              {chip.icon}
              <span className="font-mono">{chip.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(prev => new Set(prev).add(chip.key)); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 -mr-0.5 rounded-full hover:bg-muted"
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
