'use client';

import React from 'react';
import { Music, Lightbulb, Drama, Sparkles } from 'lucide-react';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  // Parse paragraphs and special inline blocks cleanly
  const renderFormattedText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Process bold **text**, inline `code`, and italic *text*
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const italicMatch = remaining.match(/\*(.*?)\*/);

      let firstMatch: { match: RegExpMatchArray; type: 'bold' | 'code' | 'italic' } | null = null;

      if (boldMatch) {
        firstMatch = { match: boldMatch, type: 'bold' };
      }
      if (codeMatch && (!firstMatch || codeMatch.index! < firstMatch.match.index!)) {
        firstMatch = { match: codeMatch, type: 'code' };
      }
      if (italicMatch && (!firstMatch || italicMatch.index! < firstMatch.match.index!)) {
        firstMatch = { match: italicMatch, type: 'italic' };
      }

      if (firstMatch && firstMatch.match.index !== undefined) {
        const index = firstMatch.match.index;
        if (index > 0) {
          parts.push(remaining.substring(0, index));
        }
        if (firstMatch.type === 'bold') {
          parts.push(
            <strong key={keyIdx++} className="font-semibold text-foreground">
              {firstMatch.match[1]}
            </strong>
          );
        } else if (firstMatch.type === 'code') {
          parts.push(
            <code
              key={keyIdx++}
              className="px-1.5 py-0.5 rounded bg-muted text-accent-text font-mono text-xs border border-border"
            >
              {firstMatch.match[1]}
            </code>
          );
        } else {
          parts.push(
            <em key={keyIdx++} className="italic text-muted-foreground">
              {firstMatch.match[1]}
            </em>
          );
        }
        remaining = remaining.substring(index + firstMatch.match[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let index = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    // Heading 1 or 2
    if (line.startsWith('# ') || line.startsWith('## ')) {
      const text = line.replace(/^#{1,2}\s+/, '');
      elements.push(
        <h2 key={index++} className="text-lg font-bold text-foreground tracking-tight mt-4 mb-2">
          {renderFormattedText(text)}
        </h2>
      );
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      const text = line.replace(/^###\s+/, '');
      elements.push(
        <div key={index++} className="flex items-center gap-2 text-accent-text mt-4 mb-1.5">
          <Music className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold text-accent-text tracking-tight">
            {renderFormattedText(text)}
          </h3>
        </div>
      );
      continue;
    }

    // Blockquote ("Tactile Cue" / Tip box)
    if (line.startsWith('> ')) {
      const quoteText = line.replace(/^>\s+/, '');
      const isTactileCue = quoteText.toLowerCase().includes('tactile cue');
      const isActionVerb = quoteText.toLowerCase().includes('action verb');

      elements.push(
        <div
          key={index++}
          className="rounded-r-xl p-3.5 my-3 flex items-start gap-2.5 text-xs sm:text-[13px] bg-accent-soft border-l-[3px] border-accent border-y-0 border-r-0 text-foreground"
        >
          {isTactileCue ? (
            <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          ) : isActionVerb ? (
            <Drama className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed flex-1">
            {renderFormattedText(quoteText)}
          </div>
        </div>
      );
      continue;
    }

    // Bullet list item
    if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={index++} className="flex items-start gap-2.5 my-2 pl-1 text-[15px] sm:text-base text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
          <div className="leading-relaxed flex-1">{renderFormattedText(text)}</div>
        </div>
      );
      continue;
    }

    // Numbered list item: small rounded-square accent-tinted badges
    if (line.match(/^\d+\.\s+/)) {
      const match = line.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        const num = match[1];
        const text = match[2];
        elements.push(
          <div key={index++} className="flex items-start gap-3 my-2.5 pl-0.5 text-[15px] sm:text-base text-foreground">
            <span className="w-5 h-5 rounded-md bg-accent-soft text-accent-text text-xs font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 border border-accent-border/50">
              {num}
            </span>
            <div className="leading-relaxed flex-1">{renderFormattedText(text)}</div>
          </div>
        );
        continue;
      }
    }

    // Normal paragraph
    elements.push(
      <p key={index++} className="text-[15px] sm:text-base text-foreground my-2 leading-relaxed">
        {renderFormattedText(line)}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};
