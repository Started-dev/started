import { useState, useEffect, useRef } from 'react';
import {
  FilePlus, FolderPlus, Play, Search, MessageSquare,
  PanelRightClose, Command, Brain, Eye, EyeOff,
  Rocket, Plug, Clock, GitBranch, TestTube, Shield,
} from 'lucide-react';
import { useIDE } from '@/contexts/IDEContext';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  focusMode?: boolean;
  setFocusMode?: (val: boolean) => void;
}

export function CommandPalette({ focusMode, setFocusMode }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { createFile, runCommand, toggleChat, toggleOutput, files, openFile } = useIDE();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands: CommandItem[] = [
    // Actions
    { id: 'run', label: 'Run Project', shortcut: '⌘⏎', icon: <Play className="h-4 w-4" />, action: () => { runCommand('npm start'); setOpen(false); }, group: 'Actions' },
    { id: 'test', label: 'Run Tests', icon: <TestTube className="h-4 w-4" />, action: () => { runCommand('npm test'); setOpen(false); }, group: 'Actions' },
    { id: 'agent', label: 'Start Agent', icon: <Brain className="h-4 w-4" />, action: () => { toggleChat(); setOpen(false); }, group: 'Actions' },
    { id: 'deploy', label: 'Deploy', icon: <Rocket className="h-4 w-4" />, action: () => { runCommand('npm run build'); setOpen(false); }, group: 'Actions' },
    // Navigation
    { id: 'toggle-chat', label: 'Toggle Chat', shortcut: '⌘B', icon: <MessageSquare className="h-4 w-4" />, action: () => { toggleChat(); setOpen(false); }, group: 'Navigation' },
    { id: 'toggle-output', label: 'Toggle Terminal', shortcut: '⌘J', icon: <PanelRightClose className="h-4 w-4" />, action: () => { toggleOutput(); setOpen(false); }, group: 'Navigation' },
    { id: 'snapshots', label: 'Open Snapshots', icon: <GitBranch className="h-4 w-4" />, action: () => { setOpen(false); }, group: 'Navigation' },
    { id: 'integrations', label: 'Open Integrations', icon: <Plug className="h-4 w-4" />, action: () => { setOpen(false); }, group: 'Navigation' },
    { id: 'timeline', label: 'Open Timeline', icon: <Clock className="h-4 w-4" />, action: () => { setOpen(false); }, group: 'Navigation' },
    // Files
    { id: 'new-file', label: 'New File', shortcut: '⌘N', icon: <FilePlus className="h-4 w-4" />, action: () => { createFile('untitled.ts', null, false); setOpen(false); }, group: 'Files' },
    { id: 'new-folder', label: 'New Folder', icon: <FolderPlus className="h-4 w-4" />, action: () => { createFile('new-folder', null, true); setOpen(false); }, group: 'Files' },
  ];

  // Focus mode command
  if (setFocusMode) {
    commands.push({
      id: 'focus-mode', label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
      icon: focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
      action: () => { setFocusMode(!focusMode); setOpen(false); },
      group: 'Navigation',
    });
  }

  // File search results
  const fileCommands: CommandItem[] = files
    .filter(f => !f.isFolder)
    .map(f => ({
      id: `file-${f.id}`,
      label: f.path,
      icon: <Search className="h-4 w-4" />,
      action: () => { openFile(f.id); setOpen(false); },
      group: 'Files',
    }));

  const allCommands = [...commands, ...fileCommands];
  const filtered = query
    ? allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  // Group filtered commands
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatFiltered[selectedIndex]?.action();
    }
  };

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-background/50 backdrop-blur-[6px]" />
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Command className="h-4 w-4 text-muted-foreground/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search files…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-mono">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[340px] overflow-auto py-1">
          {flatFiltered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground/60">No results found</p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold">
                  {group}
                </div>
                {items.map((cmd) => {
                  globalIdx++;
                  const idx = globalIdx;
                  return (
                    <div
                      key={cmd.id}
                      data-idx={idx}
                      className={`flex items-center gap-3 px-4 py-2 text-sm cursor-pointer transition-colors duration-100 ${
                        idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/30'
                      }`}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="text-muted-foreground/60">{cmd.icon}</span>
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-mono">{cmd.shortcut}</kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
