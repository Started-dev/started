import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, MoreHorizontal, Copy, FileText, Flag, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnimatedDiffBlock } from './AnimatedDiffBlock';
import { CommandBlock } from './CommandBlock';
import { RewindReasoning } from './RewindReasoning';
import type { ChatMessage } from '@/types/ide';

interface AssistantMessageProps {
  msg: ChatMessage;
}

interface ParsedBlock {
  type: 'plan' | 'diff' | 'command' | 'verification' | 'code' | 'text';
  content: string;
  lang?: string;
}

function parseBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const parts = content.split(/(```[\s\S]*?```)/g);

  for (const part of parts) {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n');

      if (lang === 'diff') {
        blocks.push({ type: 'diff', content: code });
      } else if (['bash', 'sh', 'shell'].includes(lang)) {
        blocks.push({ type: 'command', content: code });
      } else {
        blocks.push({ type: 'code', content: code, lang });
      }
    } else if (part.trim()) {
      const planMatch = part.match(/^(Plan:|##?\s*Plan)/m);
      const verificationMatch = part.match(/^(Verification:|Status:)/m);

      if (planMatch) {
        blocks.push({ type: 'plan', content: part.trim() });
      } else if (verificationMatch) {
        blocks.push({ type: 'verification', content: part.trim() });
      } else {
        blocks.push({ type: 'text', content: part.trim() });
      }
    }
  }
  return blocks;
}

function extractConfidence(content: string): 'high' | 'medium' | 'low' | undefined {
  const match = content.match(/Confidence:\s*(high|medium|low)/i);
  return match ? (match[1].toLowerCase() as 'high' | 'medium' | 'low') : undefined;
}

function extractAttestation(content: string): string | undefined {
  const match = content.match(/Attestation:\s*(0x[a-f0-9]+)/i);
  return match ? match[1] : undefined;
}

export function AssistantMessage({ msg }: AssistantMessageProps) {
  const blocks = parseBlocks(msg.content);
  const confidence = extractConfidence(msg.content);
  const attestation = extractAttestation(msg.content);
  const [menuOpen, setMenuOpen] = useState(false);

  // Extract context info for collapsible drawer
  const contextChips = msg.contextChips?.filter(c => !c.label.startsWith('Skill:')) ?? [];
  const skillChips = msg.contextChips?.filter(c => c.label.startsWith('Skill:')) ?? [];
  const hasContext = contextChips.length > 0 || skillChips.length > 0;

  return (
    <div className="animate-fade-in space-y-2 group/msg">
      {/* Minimal header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50 font-medium">Started</span>
        <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
          {/* Overflow menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button className="p-0.5 rounded-sm hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-36 p-1" sideOffset={4}>
              <OverflowItem icon={<Copy className="h-3 w-3" />} label="Copy message" onClick={() => { navigator.clipboard.writeText(msg.content); setMenuOpen(false); }} />
              {blocks.some(b => b.type === 'diff') && (
                <OverflowItem icon={<FileText className="h-3 w-3" />} label="Copy patch" onClick={() => {
                  const diff = blocks.find(b => b.type === 'diff');
                  if (diff) navigator.clipboard.writeText(diff.content);
                  setMenuOpen(false);
                }} />
              )}
              {hasContext && (
                <OverflowItem icon={<Eye className="h-3 w-3" />} label="View context" onClick={() => setMenuOpen(false)} />
              )}
              <OverflowItem icon={<Flag className="h-3 w-3" />} label="Report" onClick={() => setMenuOpen(false)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Context drawer — collapsed by default */}
      {hasContext && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150">
            <ChevronRight className="h-2.5 w-2.5 transition-transform duration-150 data-[state=open]:rotate-90" />
            <span>Context · {contextChips.length + skillChips.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 pl-3.5 space-y-0.5">
            {contextChips.map((chip, i) => (
              <div key={i} className="text-[10px] text-muted-foreground/60 font-mono">{chip.label}</div>
            ))}
            {skillChips.map((chip, i) => (
              <div key={`s-${i}`} className="text-[10px] text-muted-foreground/40 font-mono">{chip.label.replace('Skill: ', '↳ ')}</div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Content blocks */}
      {blocks.map((block, i) => (
        <React.Fragment key={i}>
          {block.type === 'plan' && (
            <Collapsible defaultOpen={block.content.split('\n').length < 12}>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 w-full">
                <ChevronRight className="h-3 w-3 transition-transform duration-150 data-[state=open]:rotate-90" />
                Plan
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed font-mono pl-3.5 border-l border-border/30">
                  {renderInlineFormatting(block.content)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {block.type === 'diff' && (
            <AnimatedDiffBlock code={block.content} defaultCollapsed />
          )}

          {block.type === 'command' && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 w-full">
                <ChevronRight className="h-3 w-3 transition-transform duration-150 data-[state=open]:rotate-90" />
                Commands
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <CommandBlock commands={block.content.split('\n').filter(l => l.trim())} />
              </CollapsibleContent>
            </Collapsible>
          )}

          {block.type === 'verification' && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 pl-0.5">
              <VerificationDot content={block.content} />
              <span>{/pass/i.test(block.content) ? 'Verified' : /fail/i.test(block.content) ? 'Failed' : 'Unverified'}</span>
            </div>
          )}

          {block.type === 'code' && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 w-full">
                <ChevronRight className="h-3 w-3 transition-transform duration-150 data-[state=open]:rotate-90" />
                {block.lang || 'Code'}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <pre className="px-3 py-2 rounded-md bg-[hsl(var(--chat-block-bg))] overflow-x-auto text-[11px] font-mono">
                  <code>{block.content}</code>
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          {block.type === 'text' && (
            <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
              {renderInlineFormatting(block.content)}
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Footer — confidence + attestation (muted, tiny) */}
      {(confidence || attestation) && (
        <div className="text-[9px] text-muted-foreground/35 pt-0.5">
          {confidence && <span>Confidence: {confidence}</span>}
          {confidence && attestation && <span> · </span>}
          {attestation && (
            <span>Verified · <span className="font-mono">{attestation.slice(0, 10)}…</span></span>
          )}
        </div>
      )}

      <RewindReasoning reasoning={msg.reasoning} />
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  return text.split(/(\*\*.*?\*\*)/g).map((seg, j) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={j} className="text-foreground font-semibold">{seg.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={j}>{seg}</React.Fragment>;
  });
}

function VerificationDot({ content }: { content: string }) {
  const passed = /pass/i.test(content);
  const failed = /fail/i.test(content);
  return <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-[hsl(var(--ide-success))]' : failed ? 'bg-[hsl(var(--ide-error))]' : 'bg-muted-foreground/30'}`} />;
}

function OverflowItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] text-foreground/70 hover:bg-muted/50 rounded-sm transition-colors duration-150">
      {icon}
      {label}
    </button>
  );
}
