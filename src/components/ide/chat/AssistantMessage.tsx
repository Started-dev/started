import React from 'react';
import { ThoughtBlock } from './ThoughtBlock';
import { ToolActionBlock } from './ToolActionBlock';
import { PlanBlock } from './PlanBlock';
import { QuestionCard } from './QuestionCard';
import { AnimatedDiffBlock } from './AnimatedDiffBlock';
import { CommandBlock } from './CommandBlock';
import { ConfidenceFooter } from './ConfidenceFooter';
import { RewindReasoning } from './RewindReasoning';
import type { ChatMessage } from '@/types/ide';

interface AssistantMessageProps {
  msg: ChatMessage;
  onAnswer?: (answer: string) => void;
}

interface ParsedBlock {
  type: 'thought' | 'tool_action' | 'plan' | 'question' | 'diff' | 'command' | 'verification' | 'code' | 'text';
  content: string;
  lang?: string;
  elapsed?: string;
  options?: string[];
  questionText?: string;
}

const TOOL_ACTION_PATTERN = /^(Reading|Grepped|Grepping|Listed|Listing|Edited|Editing|Created|Creating|Applied|Applying)\s.+/;

function parseBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Extract <thought> tags first
  let remaining = content;
  const thoughtRegex = /<thought(?:\s+time="([^"]*)")?>([\s\S]*?)<\/thought>/g;
  const thoughtMatches: Array<{ index: number; length: number; block: ParsedBlock }> = [];

  let match;
  while ((match = thoughtRegex.exec(content)) !== null) {
    thoughtMatches.push({
      index: match.index,
      length: match[0].length,
      block: { type: 'thought', content: match[2].trim(), elapsed: match[1] || undefined },
    });
  }

  // Remove thought tags from content for further parsing
  for (const tm of thoughtMatches.reverse()) {
    remaining = remaining.slice(0, tm.index) + '\n__THOUGHT_PLACEHOLDER__\n' + remaining.slice(tm.index + tm.length);
  }

  // Also detect "Thought Xs" pattern (Cursor-style)
  remaining = remaining.replace(/^Thought\s+(\d+s?)\s*$/gm, (_, time) => {
    thoughtMatches.push({
      index: -1, length: 0,
      block: { type: 'thought', content: '', elapsed: time },
    });
    return '__THOUGHT_PLACEHOLDER__';
  });

  const parts = remaining.split(/(```[\s\S]*?```)/g);
  let thoughtIdx = 0;

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
      // Split text into lines for multi-type detection
      const lines = part.split('\n');
      let currentToolActions: string[] = [];
      let currentTextLines: string[] = [];

      const flushText = () => {
        if (currentTextLines.length === 0) return;
        const text = currentTextLines.join('\n').trim();
        if (!text) { currentTextLines = []; return; }

        if (text === '__THOUGHT_PLACEHOLDER__') {
          // Insert the thought block
          const tb = thoughtMatches.filter(t => t.index !== -2);
          if (thoughtIdx < tb.length) {
            blocks.push(tb[thoughtIdx].block);
            thoughtIdx++;
          }
        } else if (/^(Plan:|##?\s*Plan)/m.test(text)) {
          blocks.push({ type: 'plan', content: text });
        } else if (/^(Verification:|Status:)/m.test(text)) {
          blocks.push({ type: 'verification', content: text });
        } else if (isQuestion(text)) {
          const parsed = parseQuestion(text);
          blocks.push(parsed);
        } else {
          blocks.push({ type: 'text', content: text });
        }
        currentTextLines = [];
      };

      const flushToolActions = () => {
        if (currentToolActions.length === 0) return;
        blocks.push({ type: 'tool_action', content: currentToolActions.join('\n') });
        currentToolActions = [];
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '__THOUGHT_PLACEHOLDER__') {
          flushToolActions();
          flushText();
          if (thoughtIdx < thoughtMatches.length) {
            blocks.push(thoughtMatches[thoughtIdx].block);
            thoughtIdx++;
          }
        } else if (TOOL_ACTION_PATTERN.test(trimmed)) {
          flushText();
          currentToolActions.push(trimmed);
        } else {
          flushToolActions();
          currentTextLines.push(line);
        }
      }
      flushToolActions();
      flushText();
    }
  }
  return blocks;
}

function isQuestion(text: string): boolean {
  // Detect patterns like "A) option" or "A. option" with 2+ options
  const optionLines = text.split('\n').filter(l => /^\s*[A-F][.)]\s/.test(l));
  return optionLines.length >= 2;
}

function parseQuestion(text: string): ParsedBlock {
  const lines = text.split('\n');
  const options: string[] = [];
  const questionLines: string[] = [];

  for (const line of lines) {
    const optMatch = line.match(/^\s*[A-F][.)]\s*(.+)/);
    if (optMatch) {
      options.push(optMatch[1].trim());
    } else if (options.length === 0) {
      questionLines.push(line);
    }
  }

  return {
    type: 'question',
    content: text,
    questionText: questionLines.join('\n').trim(),
    options,
  };
}

function extractConfidence(content: string): 'high' | 'medium' | 'low' | undefined {
  const match = content.match(/Confidence:\s*(high|medium|low)/i);
  return match ? (match[1].toLowerCase() as 'high' | 'medium' | 'low') : undefined;
}

export function AssistantMessage({ msg, onAnswer }: AssistantMessageProps) {
  const blocks = parseBlocks(msg.content);
  const confidence = extractConfidence(msg.content);

  return (
    <div className="animate-fade-in space-y-2 border-l-2 border-primary/30 pl-3">
      {blocks.map((block, i) => (
        <React.Fragment key={i}>
          {block.type === 'thought' && (
            <ThoughtBlock content={block.content} elapsed={block.elapsed} />
          )}

          {block.type === 'tool_action' && (
            <ToolActionBlock actions={block.content.split('\n').filter(l => l.trim())} />
          )}

          {block.type === 'plan' && (
            <PlanBlock content={block.content} />
          )}

          {block.type === 'question' && block.options && (
            <QuestionCard
              question={block.questionText || 'Choose an option:'}
              options={block.options}
              onAnswer={onAnswer}
            />
          )}

          {block.type === 'diff' && (
            <AnimatedDiffBlock code={block.content} />
          )}

          {block.type === 'command' && (
            <CommandBlock commands={block.content.split('\n').filter(l => l.trim())} />
          )}

          {block.type === 'verification' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/30 bg-[hsl(var(--chat-block-bg))] text-[11px]">
              <VerificationBadge content={block.content} />
            </div>
          )}

          {block.type === 'code' && (
            <pre className="px-3 py-2 rounded-md bg-[hsl(var(--chat-block-bg))] border border-border/20 overflow-x-auto text-[11px] font-mono">
              {block.lang && <div className="text-[10px] text-muted-foreground/60 mb-1">{block.lang}</div>}
              <code>{block.content}</code>
            </pre>
          )}

          {block.type === 'text' && (
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {renderInlineFormatting(block.content)}
            </div>
          )}
        </React.Fragment>
      ))}

      {confidence && (
        <div className="text-[10px] text-muted-foreground/60 mt-1">
          Confidence: {confidence}
        </div>
      )}

      <RewindReasoning reasoning={msg.reasoning} />
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle bold, inline code, and links
  return text.split(/(\*\*.*?\*\*|`[^`]+`)/g).map((seg, j) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={j} className="text-foreground font-semibold">{seg.slice(2, -2)}</strong>;
    }
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return <code key={j} className="text-[11px] px-1 py-0.5 bg-muted rounded-sm font-mono text-primary/80">{seg.slice(1, -1)}</code>;
    }
    return <React.Fragment key={j}>{seg}</React.Fragment>;
  });
}

function VerificationBadge({ content }: { content: string }) {
  const passed = /pass/i.test(content);
  const failed = /fail/i.test(content);

  return (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-ide-success' : failed ? 'bg-ide-error' : 'bg-muted-foreground'}`} />
      <span className={`${passed ? 'text-ide-success' : failed ? 'text-ide-error' : 'text-muted-foreground'}`}>
        {passed ? 'Passed' : failed ? 'Failed' : 'Unverified'}
      </span>
    </>
  );
}
