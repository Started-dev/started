import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, Plus, AtSign, FileCode, AlertCircle, Globe, Image, Link, Paperclip, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIDE } from '@/contexts/IDEContext';
import { ContextChip } from '@/types/ide';
import { PermissionPrompt } from './PermissionPrompt';
import { PatchPreviewPanel } from './PatchPreview';
import { ToolCallDisplay } from './ToolCallDisplay';
import { ModelSelector } from './ModelSelector';
import { extractCommandsFromMessage } from '@/lib/patch-utils';
import { ChatHeader } from './chat/ChatHeader';
import { AssistantMessage } from './chat/AssistantMessage';
import { ActionCard } from './chat/ActionCard';
import { ResultCard } from './chat/ResultCard';
import { SuggestionCard } from './chat/SuggestionCardMessage';
import { ContextStrip } from './chat/ContextStrip';
import { SuggestionCards } from './chat/SuggestionCards';
import { HesitationPrompt } from './chat/HesitationPrompt';
import { useHesitationDetection } from '@/hooks/use-hesitation-detection';
import { SKILLS_CATALOG } from '@/data/skills-catalog';

export function ChatPanel() {
  const {
    chatMessages, sendMessage, selectedText, activeTabId, getFileById, runs,
    toolCalls, pendingPatches, approveToolCall, denyToolCall, alwaysAllowTool, alwaysAllowCommand,
    applyPatch, applyPatchAndRun, cancelPatch,
    startAgent, setActiveRightPanel, agentRun, runCommand,
    conversations, activeConversationId, switchConversation, newConversation, deleteConversation,
    selectedModel, setSelectedModel,
    activeSkills,
  } = useIDE();
  const [input, setInput] = useState('');
  const [chips, setChips] = useState<ContextChip[]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [chipDialog, setChipDialog] = useState<{ type: 'url' | 'web'; value: string } | null>(null);

  const isStreaming = chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant';
  const isAgentActive = agentRun?.status === 'running' || agentRun?.status === 'queued';
  const lastRunFailed = runs.length > 0 && runs[runs.length - 1].status === 'error';
  const pulseState = lastRunFailed ? 'error' as const
    : isAgentActive ? 'agent' as const
    : isStreaming ? 'processing' as const
    : 'idle' as const;

  const hesitation = useHesitationDetection(
    lastRunFailed,
    pendingPatches.length > 0,
    pendingPatches.length,
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, toolCalls, pendingPatches]);

  const addChip = (type: ContextChip['type']) => {
    hesitation.recordActivity();
    setAttachMenuOpen(false);
    if (type === 'selection' && selectedText) {
      setChips(prev => [...prev.filter(c => c.type !== 'selection'), { type: 'selection', label: 'Selection', content: selectedText }]);
    } else if (type === 'file' && activeTabId) {
      const file = getFileById(activeTabId);
      if (file) setChips(prev => [...prev.filter(c => !(c.type === 'file' && c.label === file.name)), { type: 'file', label: file.name, content: file.content }]);
    } else if (type === 'errors') {
      const lastRun = runs[runs.length - 1];
      if (lastRun) setChips(prev => [...prev.filter(c => c.type !== 'errors'), { type: 'errors', label: 'Last Run Errors', content: lastRun.logs }]);
    } else if (type === 'url') {
      setChipDialog({ type: 'url', value: '' });
    } else if (type === 'web') {
      setChipDialog({ type: 'web', value: '' });
    } else if (type === 'image') {
      imageInputRef.current?.click();
    } else if (type === 'attachment') {
      attachInputRef.current?.click();
    }
  };

  const confirmChipDialog = () => {
    if (!chipDialog || !chipDialog.value.trim()) return;
    if (chipDialog.type === 'url') {
      setChips(prev => [...prev, { type: 'url', label: chipDialog.value.slice(0, 30), content: `[Fetch URL: ${chipDialog.value}]` }]);
    } else {
      setChips(prev => [...prev, { type: 'web', label: chipDialog.value.slice(0, 30), content: `[Web Search: ${chipDialog.value}]` }]);
    }
    setChipDialog(null);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setChips(prev => [...prev, { type: 'image', label: file.name.slice(0, 20), content: reader.result as string }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleAttachmentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const TEXT_EXTENSIONS = new Set([
      'txt','md','markdown','json','js','jsx','ts','tsx','py','rb','go',
      'rs','java','c','cpp','h','hpp','cs','swift','kt','scala','sh',
      'bash','zsh','fish','ps1','bat','cmd','html','htm','css','scss',
      'sass','less','xml','svg','yaml','yml','toml','ini','cfg','conf',
      'env','log','sql','graphql','gql','proto','csv','tsv','rst',
      'tex','r','lua','php','pl','pm','ex','exs','erl','hs','ml',
      'vim','dockerfile','makefile','gitignore',
    ]);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isText = TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/');
    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        let text = reader.result as string;
        if (text.length > 50_000) text = text.slice(0, 50_000) + '\n\n[...truncated at 50 000 chars]';
        setChips(prev => [...prev, { type: 'attachment', label: file.name.slice(0, 24), content: text }]);
      };
      reader.readAsText(file);
    } else {
      const sizeKB = Math.round(file.size / 1024);
      setChips(prev => [...prev, { type: 'attachment', label: file.name.slice(0, 24), content: `[Binary file: ${file.name} (${sizeKB} KB)]` }]);
    }
    e.target.value = '';
  }, []);

  const removeChip = (index: number) => setChips(prev => prev.filter((_, i) => i !== index));

  const handleSend = (content?: string) => {
    const msg = content || input;
    if (!msg.trim() && chips.length === 0) return;
    hesitation.recordActivity();

    const skillChips: ContextChip[] = activeSkills
      .map(id => SKILLS_CATALOG.find(s => s.id === id))
      .filter(Boolean)
      .map(skill => ({
        type: 'attachment' as const,
        label: `Skill: ${skill!.name}`,
        content: `[Agent Skill: ${skill!.name}]\nSource: ${skill!.source}\nCategory: ${skill!.category}\n\n${skill!.description}\n\nReference: ${skill!.url}`,
      }));

    const allChips = [...chips, ...skillChips];

    if (agentMode) {
      startAgent(msg.trim());
      setActiveRightPanel('agent');
    } else {
      sendMessage(msg, allChips.length > 0 ? allChips : undefined);
    }
    setInput('');
    setChips([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    hesitation.recordActivity();
  };

  const chipIcon = (type: string) => {
    switch (type) {
      case 'selection': return <AtSign className="h-3 w-3" />;
      case 'file': return <FileCode className="h-3 w-3" />;
      case 'errors': return <AlertCircle className="h-3 w-3" />;
      case 'url': return <Link className="h-3 w-3" />;
      case 'web': return <Globe className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      case 'attachment': return <Paperclip className="h-3 w-3" />;
      default: return null;
    }
  };

  const pendingTools = toolCalls.filter(tc => tc.status === 'pending');
  const recentTools = toolCalls.filter(tc => tc.status !== 'pending').slice(-6);

  const MAX_VISIBLE_CHIPS = 3;
  const visibleChips = chips.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenChipCount = Math.max(0, chips.length - MAX_VISIBLE_CHIPS);
  const [showAllChips, setShowAllChips] = useState(false);
  const displayChips = showAllChips ? chips : visibleChips;

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--chat-surface))]">
      <ChatHeader
        pulseState={pulseState}
        pendingToolCount={pendingTools.length}
        isAgentActive={isAgentActive}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSwitchConversation={switchConversation}
        onNewConversation={newConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-5">
        {chatMessages.map(msg => {
          if (msg.cardType === 'action') return <ActionCard key={msg.id} msg={msg} />;
          if (msg.cardType === 'result') {
            return (
              <ResultCard
                key={msg.id} msg={msg}
                onRetry={msg.resultData?.runnerUnavailable ? undefined : () => {
                  const actionMsg = chatMessages.find(m => m.cardType === 'action' && m.actionData);
                  if (actionMsg?.actionData) runCommand(actionMsg.actionData.command);
                }}
                onSendToChat={() => {
                  if (msg.resultData?.logs) {
                    sendMessage(`The last command failed with exit code ${msg.resultData.exitCode}. Here's the output:\n\`\`\`\n${msg.resultData.logs.slice(0, 2000)}\n\`\`\`\nPlease help me fix this.`);
                  }
                }}
              />
            );
          }
          if (msg.cardType === 'suggestion') {
            return (
              <SuggestionCard
                key={msg.id} msg={msg}
                onAction={(action) => {
                  if (action === 'connect_runner') setActiveRightPanel('protocol');
                  else if (action === 'view_docs') window.open('https://docs.started.dev/runners', '_blank');
                  else sendMessage(action);
                }}
              />
            );
          }
          return msg.role === 'assistant' ? (
            <AssistantMessage key={msg.id} msg={msg} />
          ) : (
            <UserMessage key={msg.id} msg={msg} chipIcon={chipIcon} />
          );
        })}

        {recentTools.length > 0 && (
          <div className="space-y-1.5">
            {recentTools.map(tc => <ToolCallDisplay key={tc.id} toolCall={tc} />)}
          </div>
        )}

        {pendingTools.map(tc => (
          <PermissionPrompt
            key={tc.id} toolCall={tc}
            onApprove={() => approveToolCall(tc.id)}
            onDeny={() => denyToolCall(tc.id)}
            onAlwaysAllow={() => {
              if (tc.tool === 'run_command') alwaysAllowCommand((tc.input as { command: string }).command);
              else alwaysAllowTool(tc.tool);
              approveToolCall(tc.id);
            }}
          />
        ))}

        {pendingPatches.filter(p => p.status === 'preview').map(patch => {
          const lastAssistantMsg = [...chatMessages].reverse().find(m => m.role === 'assistant');
          const commands = lastAssistantMsg ? extractCommandsFromMessage(lastAssistantMsg.content) : [];
          return (
            <PatchPreviewPanel
              key={patch.id} patch={patch}
              onApply={() => applyPatch(patch.id)}
              onApplyAndRun={(cmd) => applyPatchAndRun(patch.id, cmd)}
              onCancel={() => cancelPatch(patch.id)}
              onCopyPatch={() => navigator.clipboard.writeText(patch.raw)}
              suggestedCommand={commands[0]}
            />
          );
        })}

        {pendingPatches.filter(p => p.status !== 'preview').slice(-3).map(patch => (
          <PatchPreviewPanel
            key={patch.id} patch={patch}
            onApply={() => {}} onApplyAndRun={() => {}} onCancel={() => {}}
            onCopyPatch={() => navigator.clipboard.writeText(patch.raw)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Hesitation prompt */}
      {hesitation.show && (
        <HesitationPrompt
          message={hesitation.message}
          onAccept={() => { hesitation.dismiss(); handleSend(hesitation.message); }}
          onDismiss={hesitation.dismiss}
        />
      )}

      {/* Suggestion cards */}
      <SuggestionCards inputLength={input.length} onSendMessage={(msg) => handleSend(msg)} />

      {/* Context strip */}
      <ContextStrip />

      {/* Context chips */}
      {chips.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-1.5 items-center">
          {displayChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md cursor-pointer bg-muted/30 text-muted-foreground border border-border/20 hover:border-primary/30 hover:text-foreground transition-colors duration-150"
              onClick={() => removeChip(i)}
            >
              {chipIcon(chip.type)}
              <span className="truncate max-w-[80px]">{chip.label}</span>
              <X className="h-2.5 w-2.5 opacity-40" />
            </span>
          ))}
          {hiddenChipCount > 0 && !showAllChips && (
            <button
              onClick={() => setShowAllChips(true)}
              className="text-[10px] px-2 py-0.5 rounded-md bg-muted/20 text-muted-foreground/50 hover:text-foreground border border-border/20 transition-colors duration-150"
            >
              +{hiddenChipCount}
            </button>
          )}
          {showAllChips && chips.length > MAX_VISIBLE_CHIPS && (
            <button
              onClick={() => setShowAllChips(false)}
              className="text-[10px] px-2 py-0.5 rounded-md text-muted-foreground/40 hover:text-foreground transition-colors duration-150"
            >
              less
            </button>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />

      {/* Input area — premium command bar */}
      <div className="border-t border-border/30 p-3">
        <div className="flex gap-2 items-end rounded-lg border border-border/30 bg-muted/10 px-2 py-1.5 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200">
          {/* + attach menu */}
          <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
            <PopoverTrigger asChild>
              <button className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-colors duration-150 shrink-0 self-end mb-0.5">
                <Plus className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-44 p-1" sideOffset={8}>
              <div className="flex flex-col">
                <AttachMenuItem icon={<AtSign className="h-3.5 w-3.5" />} label="Selection" disabled={!selectedText} onClick={() => addChip('selection')} />
                <AttachMenuItem icon={<FileCode className="h-3.5 w-3.5" />} label="Active file" disabled={!activeTabId} onClick={() => addChip('file')} />
                <AttachMenuItem icon={<AlertCircle className="h-3.5 w-3.5" />} label="Errors" disabled={runs.length === 0} onClick={() => addChip('errors')} />
                <AttachMenuItem icon={<Link className="h-3.5 w-3.5" />} label="URL" onClick={() => addChip('url')} />
                <AttachMenuItem icon={<Globe className="h-3.5 w-3.5" />} label="Web search" onClick={() => addChip('web')} />
                <AttachMenuItem icon={<Image className="h-3.5 w-3.5" />} label="Image" onClick={() => addChip('image')} />
                <AttachMenuItem icon={<Paperclip className="h-3.5 w-3.5" />} label="File" onClick={() => addChip('attachment')} />
              </div>
            </PopoverContent>
          </Popover>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); hesitation.recordActivity(); }}
            onKeyDown={handleKeyDown}
            placeholder={agentMode ? 'Describe a goal...' : 'Ask Started...'}
            className="flex-1 bg-transparent text-foreground text-[13px] px-1 py-1 rounded-md border-none resize-none outline-none min-h-[28px] max-h-[120px] font-sans placeholder:text-muted-foreground/35 leading-relaxed"
            rows={1}
          />

          <div className="flex items-center gap-0.5 shrink-0 self-end mb-0.5">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            <button
              onClick={() => setAgentMode(prev => !prev)}
              className={`p-1.5 rounded-md transition-colors duration-150 ${
                agentMode ? 'text-primary bg-primary/10' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/30'
              }`}
              title={agentMode ? 'Agent mode on' : 'Agent mode'}
            >
              <Brain className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() && chips.length === 0}
              className="p-1.5 rounded-md transition-all duration-150 shrink-0 disabled:opacity-15 text-primary hover:bg-primary/10 disabled:hover:bg-transparent disabled:text-muted-foreground/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Hint row */}
        <div className="flex items-center justify-between px-1 pt-1.5">
          <span className="text-[9px] text-muted-foreground/30">⏎ send · ⌘K commands</span>
          {activeSkills.length > 0 && (
            <span className="text-[9px] text-primary/40">{activeSkills.length} skill{activeSkills.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* @url / @web dialog */}
      <Dialog open={!!chipDialog} onOpenChange={(v) => !v && setChipDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {chipDialog?.type === 'url' ? 'Fetch URL' : 'Web Search'}
            </DialogTitle>
            <DialogDescription>
              {chipDialog?.type === 'url'
                ? 'Enter a URL to fetch and include as context.'
                : 'Enter a search query to find relevant information.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              autoFocus
              placeholder={chipDialog?.type === 'url' ? 'https://example.com' : 'Search query...'}
              value={chipDialog?.value ?? ''}
              onChange={(e) => setChipDialog(prev => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmChipDialog(); }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setChipDialog(null)}>Cancel</Button>
              <Button size="sm" onClick={confirmChipDialog} disabled={!chipDialog?.value.trim()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───

function AttachMenuItem({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 px-2.5 py-2 text-[11px] text-foreground/70 hover:bg-muted/40 rounded-sm transition-colors duration-150 disabled:opacity-25 disabled:pointer-events-none w-full text-left"
    >
      {icon}
      {label}
    </button>
  );
}

function UserMessage({ msg, chipIcon }: { msg: import('@/types/ide').ChatMessage; chipIcon: (type: string) => React.ReactNode }) {
  return (
    <div className="animate-fade-in flex flex-col items-end gap-1.5">
      {msg.contextChips && msg.contextChips.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
          {msg.contextChips.filter(c => !c.label.startsWith('Skill:')).map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/20 text-muted-foreground/50 text-[10px] rounded-md border border-border/15">
              {chipIcon(chip.type)}
              {chip.label}
            </span>
          ))}
        </div>
      )}
      <div className="bg-primary/8 text-foreground rounded-lg px-3.5 py-2.5 max-w-[85%] border border-primary/10">
        <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</div>
      </div>
    </div>
  );
}
