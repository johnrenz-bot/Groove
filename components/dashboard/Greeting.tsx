'use client';

import React, { useSyncExternalStore } from 'react';

export interface GreetingProps {
  eyebrow: string;
  /** Optional word placed before the first name, e.g. "Coach". Pass '' to omit. */
  role: string;
  firstName: string;
  subtitle: string;
  /** "coach" or "client" — determines the eyebrow label */
  tagline?: string;
}

/**
 * Time-of-day salutation.
 *
 * Split into its own module so the dashboard pages do not each carry their own
 * copy — `app/(coach)/coach/home/page.tsx` defined a `getGreeting()` that was
 * never called, which is why the coach dashboard said "Good morning" at nine in
 * the evening.
 */
export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── The clock, read without breaking hydration ──────────────────────────────
   `new Date().getHours()` evaluated during render disagrees between the server
   and the client whenever the two renders straddle an hour boundary, and React
   reports that as a hydration mismatch. Resolving it in an effect produces a
   second problem — a `setState` in an effect, which cascades a render and
   flashes.

   `useSyncExternalStore` with a distinct server snapshot is the supported answer
   to both. React uses `getServerSnapshot` for the server render AND for the
   first client render during hydration, so the two always agree; immediately
   afterwards it re-reads `getSnapshot` and, if the real hour differs from the
   placeholder, re-renders once. No mismatch, no effect, one extra frame. */
const NO_SUBSCRIPTION = () => () => {};
const getClientHour = () => new Date().getHours();
/** -1 is not an hour, so it never renders a salutation on the server. */
const getServerHour = () => -1;

export function Greeting({
  eyebrow,
  role,
  firstName,
  subtitle,
  tagline = 'Art • Discipline • Community',
}: GreetingProps) {
  const hour = useSyncExternalStore(NO_SUBSCRIPTION, getClientHour, getServerHour);
  const greeting = hour < 0 ? '' : greetingForHour(hour);

  /**
   * `[role, firstName].filter(Boolean).join(' ')` rather than `{role} {firstName}`.
   * The client dashboard passes `role=""`, which used to render a leading space
   * inside the coloured span before every member's name.
   */
  const name = [role, firstName].filter(Boolean).join(' ');

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-[0_1px_2px_rgba(20,40,75,0.04)]">
          {eyebrow}
        </span>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          {greeting && <>{greeting}, </>}
          <span className="text-accent-text">{name}</span>
        </h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>

      {/* Tagline — script font with hairlines, hidden under 900px */}
      <div className="hidden items-center gap-3 lg:flex">
        <span className="h-px w-12 bg-[linear-gradient(to_right,transparent,rgb(196,160,90))]" aria-hidden="true" />
        <span
          className="font-[var(--font-script)] text-lg italic tracking-wide text-[rgb(196,160,90)]"
          style={{ fontFamily: "'Mr De Haviland', cursive" }}
        >
          {tagline}
        </span>
        <span className="h-px w-12 bg-[linear-gradient(to_left,transparent,rgb(196,160,90))]" aria-hidden="true" />
      </div>
    </header>
  );
}

export default Greeting;