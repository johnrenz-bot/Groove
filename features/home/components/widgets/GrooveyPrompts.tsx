'use client';

/**
 * Ask Groovey AI — one tap to a prefilled Groovey panel.
 *
 * Uses the assistant's own wake-up event (`groovey:open`), which opens the
 * floating panel with the prompt in the draft field. The user presses send
 * themselves — nothing is sent on their behalf.
 */

import React from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';

const PROMPTS = [
  'Help me build a warm-up routine for today’s session',
  'How do I prepare for a one-on-one coaching session?',
  'Give feedback on my showcase performance',
];

export function GrooveyPrompts() {
  const ask = (prompt: string) => {
    window.dispatchEvent(new CustomEvent('groovey:open', { detail: { prompt } }));
  };

  return (
    <PanelCard
      icon={<Sparkles className="h-4 w-4" />}
      title="Ask Groovey AI"
      viewAllHref="/client/groovey"
      viewAllLabel="Full chat"
    >
      <p className="text-[11px] leading-snug text-muted-foreground">
        One tap opens Groovey with this question ready to send.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left transition hover:border-border-strong hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wand2 className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-foreground">
              {prompt}
            </span>
          </button>
        ))}
      </div>
    </PanelCard>
  );
}

export default GrooveyPrompts;

