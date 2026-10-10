'use client';

import React from 'react';
import { Volume2 } from 'lucide-react';
import { useSoundPreference, prefersReducedMotion } from '../useGlobalClickSound';

/**
 * The sound on/off switch.
 *
 * Reads and writes the same preference the global listener enforces, so there is
 * one source of truth: toggling here immediately silences (or restores) every
 * click in the app, including the click that toggled it — which is why the state
 * is read from the hook rather than held locally.
 *
 * It uses `useSoundPreference`, NOT `useGlobalClickSound`. The latter installs
 * the document listener, and a second copy of it would make every click play
 * twice. Reading the flag costs nothing; listening does.
 *
 * A switch rather than a two-button toggle because it is a single boolean and
 * `role="switch"` announces "on"/"off" directly. It is 44px tall, matching the
 * minimum touch target used by the rest of the header controls.
 */
export function SoundToggle({ className = '' }: { className?: string }) {
  const { enabled, setEnabled } = useSoundPreference();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      title={
        enabled
          ? 'Click sounds are on. Turn them off.'
          : 'Click sounds are off. Turn them on.'
      }
      className={`group inline-flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-left transition ${
        enabled
          ? 'text-foreground hover:bg-muted'
          : 'text-muted-foreground hover:bg-muted'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
          enabled
            ? 'border-accent-border bg-accent-soft text-accent-text'
            : 'border-border bg-muted/50 text-muted-foreground'
        }`}
      >
        <Volume2 className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">Click sounds</span>
        <span className="block text-[11px] text-muted-foreground">
          {enabled ? 'On' : 'Off'}
          {prefersReducedMotion() && enabled ? ' · reduced motion is on' : ''}
        </span>
      </span>

      {/* The visible state, mirroring aria-checked for sighted users. */}
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-accent' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-all ${
            enabled ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default SoundToggle;
