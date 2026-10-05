'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu } from 'lucide-react';
import { Footer } from '@/components/shared/Footer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from './cn';

export interface LegalSection {
  id: string;
  label: string;
}

/**
 * Long-form legal/document shell: comfortable reading width, a sticky table of
 * contents with scroll-spy, a last-updated date, and the shared theme toggle.
 */
export function LegalLayout({
  children,
  title,
  description,
  lastUpdated,
  sections = [],
  backHref = '/',
  backLabel = 'Back to home',
  actions,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Human-readable last-updated date, e.g. "March 12, 2026" */
  lastUpdated?: string;
  sections?: LegalSection[];
  backHref?: string;
  backLabel?: string;
  /** Extra controls shown in the top bar, e.g. a print button. */
  actions?: React.ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const [tocOpen, setTocOpen] = useState(false);

  // Scroll-spy: highlight the section nearest the top of the viewport.
  React.useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const toc = sections.length > 0 && (
    <nav aria-label="Table of contents" className="space-y-1">
      {sections.map((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setTocOpen(false)}
            aria-current={active === s.id ? 'true' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
              active === s.id
                ? 'bg-accent-soft font-semibold text-accent-text'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="text-[10px] font-bold tabular-nums text-subtle-foreground">{num}</span>
            <span className="truncate">{s.label}</span>
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="g-container flex h-16 items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="flex items-center gap-2">
            {actions}
            {sections.length > 0 && (
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                aria-expanded={tocOpen}
                aria-controls="legal-toc-mobile"
              >
                <Menu className="h-3.5 w-3.5" />
                Contents
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {tocOpen && (
          <div id="legal-toc-mobile" className="border-t border-border bg-background lg:hidden">
            <div className="g-container py-4">{toc}</div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="g-container py-12 sm:py-16">
          {/* Document header */}
          <div className="mx-auto max-w-[760px]">
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
            )}
            {lastUpdated && (
              <p className="mt-4 text-xs text-subtle-foreground">Last updated {lastUpdated}</p>
            )}
          </div>

          <div className="mt-10 gap-12 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* Sticky table of contents */}
            {toc && (
              <aside className="mb-10 hidden lg:sticky lg:top-24 lg:block lg:self-start lg:mb-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  On this page
                </p>
                {toc}
              </aside>
            )}

            {/* Body — comfortable measure for long-form reading */}
            <div className="min-w-0 max-w-[760px] lg:mx-0">{children}</div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Consistent block styles for legal body copy. */
export const legalProse = 'space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]';

export default LegalLayout;
