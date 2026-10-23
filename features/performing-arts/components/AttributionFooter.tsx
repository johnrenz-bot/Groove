import React from 'react';
import { cn } from '@/components/shared/cn';

export interface AttributionFooterProps {
  /** Accessible name for the page-level attribution landmark. */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Slim page attribution note.
 *
 * The four discipline pages used to end with a bordered, shadowed card that
 * repeated the site footer's trademark paragraph. This keeps the same sentence
 * but renders it as quiet text with no container, so it reads as a footnote
 * rather than a second footer. `text-white/40` matches the dark default; the
 * `.light` fallback keeps the note legible on the warm light palette.
 */
export function AttributionFooter({ label, children, className }: AttributionFooterProps) {
  return (
    <footer
      aria-label={label}
      className={cn('mx-auto w-full max-w-3xl px-1 text-center', className)}
    >
      <p className="text-xs leading-relaxed text-white/40 [.light_&]:text-muted-foreground/80">
        {children}
      </p>
    </footer>
  );
}

export default AttributionFooter;
