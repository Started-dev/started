import React, { useState } from 'react';
import { ChevronRight, MoreHorizontal, Copy, FileText, Flag, Eye, ChevronDown } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);

  const contextChips = msg.contextChips?.filter(c => !c.label.startsWith('Skill:')) ?? [];
  const skillChips = msg.contextChips?.filter(c => c.label.startsWith('Skill:')) ?? [];
  const hasContext = contextChips.length > 0 || skillChips.length > 0;

  const hasCollapsibleContent = blocks.some(b => b.type === 'diff' || b.type === 'code');

  return (
    <div className="animate-fade-in group/msg relative pl-3">
      {/* Orange accent bar on the left */}
      <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-primary/30 group-hover/msg:bg-primary/50 transition-colors duration-200" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-foreground/60">Started</span>
          {hasContext && (
            <span className="text-[10px] text-muted-foreground/40">{contextChips.length + skillChips.length} context</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
          {hasCollapsibleContent && (
            <button
              onClick={() => setShowDetails(prev => !prev)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors duration-150"
            >
              {showDetails ? 'Less' : 'Details'}
              <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          )}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button className="p-1 rounded hover:bg-muted/40 text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-40 p-1" sideOffset={4}>
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

      {/* Content blocks */}
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <React.Fragment key={i}>
            {block.type === 'plan' && (
              <div className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-[1.7]">
                {renderInlineFormatting(block.content)}
              </div>
            )}

            {block.type === 'diff' && (
              <AnimatedDiffBlock code={block.content} defaultCollapsed={!showDetails && block.content.split('\n').length > 80} />
            )}

            {block.type === 'command' && (
              <CommandBlock commands={block.content.split('\n').filter(l => l.trim())} />
            )}

            {block.type === 'verification' && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                <VerificationDot content={block.content} />
                <span>{/pass/i.test(block.content) ? 'Verified' : /fail/i.test(block.content) ? 'Failed' : 'Unverified'}</span>
              </div>
            )}

            {block.type === 'code' && (
              <div className={!showDetails && block.content.split('\n').length > 20 ? 'hidden' : ''}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">{block.lang || 'Code'}</span>
                </div>
                <pre className="px-3 py-2.5 rounded-md bg-[hsl(var(--chat-block-bg))] overflow-x-auto text-[11px] font-mono leading-relaxed">
                  <code>{block.content}</code>
                </pre>
              </div>
            )}

            {block.type === 'text' && (
              <div className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-[1.7]">
                {renderInlineFormatting(block.content)}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Footer — confidence + attestation */}
      {(confidence || attestation) && (
        <div className="text-[10px] text-muted-foreground/30 mt-2 pt-1">
          {confidence && <span>Confidence: {confidence}</span>}
          {confidence && attestation && <span> · </span>}
          {attestation && (
            <span>Verified · <span className="font-mono text-primary/50">{attestation.slice(0, 10)}…</span></span>
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
    <button onClick={onClick} className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-foreground/70 hover:bg-muted/50 rounded-sm transition-colors duration-150">
      {icon}
      {label}
    </button>
  );
}
