import React from 'react';

export interface GreetingProps {
  eyebrow: string;
  role: string;
  firstName: string;
  subtitle: string;
  /** "coach" or "client" — determines the eyebrow label */
  tagline?: string;
}

export function Greeting({ eyebrow, role, firstName, subtitle, tagline = 'Art • Discipline • Community' }: GreetingProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-[0_1px_2px_rgba(20,40,75,0.04)]">
          {eyebrow}
        </span>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          Good morning, <span className="text-accent-text">{role} {firstName}</span>
        </h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {/* Tagline — script font with hairlines, hidden under 900px */}
      <div className="hidden items-center gap-3 lg:flex">
        <span className="h-px w-12 bg-[linear-gradient(to_right,transparent,rgb(196,160,90))]" aria-hidden="true" />
        <span className="font-[var(--font-script)] text-lg italic tracking-wide text-[rgb(196,160,90)]" style={{ fontFamily: "'Mr De Haviland', cursive" }}>
          {tagline}
        </span>
        <span className="h-px w-12 bg-[linear-gradient(to_left,transparent,rgb(196,160,90))]" aria-hidden="true" />
      </div>
    </header>
  );
}

export default Greeting;
