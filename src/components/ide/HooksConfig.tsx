import { useState } from 'react';
import { Anchor, X, Plus, Check, Trash2 } from 'lucide-react';
import { Hook, HookEvent, HookAction } from '@/types/agent';

interface HooksConfigProps {
  hooks: Hook[];
  onToggleHook: (hookId: string) => void;
  onAddHook: (hook: Omit<Hook, 'id'>) => void;
  onRemoveHook: (hookId: string) => void;
  onClose: () => void;
}

export function HooksConfig({ hooks, onToggleHook, onAddHook, onRemoveHook, onClose }: HooksConfigProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState<HookEvent>('PreToolUse');
  const [newTool, setNewTool] = useState('*');
  const [newCmd, setNewCmd] = useState('');
  const [newAction, setNewAction] = useState<HookAction>('deny');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAddHook({
      event: newEvent,
      toolPattern: newTool || '*',
      commandPattern: newCmd || undefined,
      action: newAction,
      label: newLabel.trim(),
      enabled: true,
    });
    setShowAdd(false);
    setNewLabel('');
    setNewCmd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Hooks</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-sm">
              PreToolUse / PostToolUse
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-sm">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-[350px] overflow-auto p-2 space-y-1">
          {hooks.map(hook => (
            <div key={hook.id} className="flex items-center gap-2 px-3 py-2 border border-border rounded-md">
              <button
                onClick={() => onToggleHook(hook.id)}
                className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-colors ${
                  hook.enabled ? 'bg-ide-success/20 border-ide-success text-ide-success' : 'border-border text-muted-foreground'
                }`}
              >
                {hook.enabled && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{hook.label}</span>
                  <span className={`text-[10px] px-1 py-0.5 rounded-sm ${
                    hook.action === 'deny' ? 'bg-ide-error/10 text-ide-error' :
                    hook.action === 'allow' ? 'bg-ide-success/10 text-ide-success' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {hook.action}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {hook.event} → {hook.toolPattern}{hook.commandPattern ? ` / ${hook.commandPattern}` : ''}
                </p>
              </div>
              <button
                onClick={() => onRemoveHook(hook.id)}
                className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-ide-error transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {hooks.length === 0 && !showAdd && (
            <p className="text-sm text-muted-foreground text-center py-4">No hooks configured</p>
          )}
        </div>

        {showAdd && (
          <div className="px-4 py-3 border-t border-border space-y-2">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Hook label..."
              className="w-full bg-input text-foreground text-xs px-2 py-1.5 rounded-sm border border-border outline-none focus:border-primary"
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={newEvent}
                onChange={e => setNewEvent(e.target.value as HookEvent)}
                className="bg-input text-foreground text-xs px-2 py-1.5 rounded-sm border border-border outline-none"
              >
                <option value="PreToolUse">PreToolUse</option>
                <option value="PostToolUse">PostToolUse</option>
              </select>
              <select
                value={newAction}
                onChange={e => setNewAction(e.target.value as HookAction)}
                className="bg-input text-foreground text-xs px-2 py-1.5 rounded-sm border border-border outline-none"
              >
                <option value="deny">deny</option>
                <option value="allow">allow</option>
                <option value="log">log</option>
                <option value="transform">transform</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                value={newTool}
                onChange={e => setNewTool(e.target.value)}
                placeholder="Tool pattern..."
                className="flex-1 bg-input text-foreground text-xs px-2 py-1.5 rounded-sm border border-border outline-none"
              />
              <input
                value={newCmd}
                onChange={e => setNewCmd(e.target.value)}
                placeholder="Command regex..."
                className="flex-1 bg-input text-foreground text-xs px-2 py-1.5 rounded-sm border border-border outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
              >
                Add Hook
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            Hooks run before/after each tool invocation.
          </p>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/10 text-primary rounded-sm hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
