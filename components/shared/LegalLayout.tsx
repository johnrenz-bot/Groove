'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { Footer } from '@/components/shared/Footer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from './cn';

export interface LegalSection {
  id: string;
  label: string;
}

/**
 * Long-form legal/document shell: comfortable reading width, a sticky table of
 * contents with scroll-spy, a reading-progress bar, a last-updated date, and
 * the shared theme toggle.
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

  // Reading progress. Driven by scroll position rather than the observer so
  // the bar advances smoothly between sections instead of jumping.
  const [progress, setProgress] = useState(0);
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollable > 0 ? Math.min(100, (doc.scrollTop / scrollable) * 100) : 0);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // A hash in the URL must win over the scroll-spy default, otherwise linking
  // straight to a section loads the page with the first entry still marked active.
  React.useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace('#', '');
      if (id && document.getElementById(id)) setActive(id);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Escape closes the mobile contents drawer.
  React.useEffect(() => {
    if (!tocOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTocOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tocOpen]);

  const jumpTo = (id: string) => {
    setActive(id);
    setTocOpen(false);
  };

  const toc = sections.length > 0 && (
    <nav aria-label="Table of contents" className="space-y-0.5">
      {sections.map((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => jumpTo(s.id)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-accent-soft font-semibold text-accent-text'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'text-[10px] font-bold tabular-nums transition-colors',
                isActive ? 'text-accent-text' : 'text-subtle-foreground group-hover:text-foreground'
              )}
            >
              {num}
            </span>
            <span className="min-w-0 flex-1">{s.label}</span>
            {isActive && (
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            )}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* THE APP NAVIGATION. `/terms` and `/privacy` used to render no app
          header at all — just a 64px document bar with a back link — so these
          were the only two pages in the app a visitor could not navigate from.
          They get the same `<SiteHeader>` as every other route.

          The bar below it is NOT a second navigation bar and is not a duplicate
          of this one: it carries document furniture only (back link, table of
          contents, reading progress), which belongs to the document rather than
          to the app.

          `ThemeProvider` is here for the same reason it is in `PublicLayout`:
          this layout mounts `SiteHeader` directly rather than through
          `PublicLayout`, so without it the guest theme toggle would be inert on
          the two legal pages. Same provider, same `groove-theme-mode` key. */}
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>

      {/* Document bar — back link + TOC + reading progress. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="g-container flex h-16 items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{backLabel}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {sections.length > 0 && (
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
                aria-expanded={tocOpen}
                aria-controls="legal-toc-mobile"
              >
                {tocOpen ? (
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Menu className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Contents
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Reading progress — decorative, so it is hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-transparent"
        >
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {tocOpen && (
          <div id="legal-toc-mobile" className="border-t border-border bg-background lg:hidden">
            <div className="g-container max-h-[70vh] overflow-y-auto py-4">{toc}</div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="g-container py-10 sm:py-14 lg:py-16">
          {/* Document header */}
          <div className="mx-auto max-w-[760px]">
            <h1 className="text-balance text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-[62ch] text-pretty text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-4 text-xs text-subtle-foreground">
                <span className="sr-only">Document </span>Last updated {lastUpdated}
              </p>
            )}
          </div>

          <div className="mt-8 gap-12 sm:mt-10 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
            {/* Sticky table of contents */}
            {toc && (
              <aside className="mb-8 hidden lg:sticky lg:top-24 lg:block lg:self-start lg:mb-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  On this page
                </p>
                {/* The list is long; give it its own scroll rather than letting
                    it run past the viewport on short displays. */}
                <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                  {toc}
                </div>
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
