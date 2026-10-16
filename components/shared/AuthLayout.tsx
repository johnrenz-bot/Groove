'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { cn } from './cn';

/**
 * THE AUTH SHELL — one component behind /login, /register/*,
 * /forgot-password and /reset-password.
 *
 * WHAT CHANGED, AND WHY
 *
 *   It used to be a two-column split: the form on the left, a full-height photo
 *   panel on the right with a quote card floating over it, and a dimmed theater
 *   photograph behind everything. That is three competing surfaces, and it made
 *   every route look like a different page — the long coach registration got the
 *   same fixed-height photo column as a two-field sign-in. It also pinned the
 *   whole subtree to a dark canvas, so the auth screens ignored the visitor's
 *   saved Light/Dark choice while every other route honoured it.
 *
 *   It is now ONE centred column, 460px, matching the rhythm of the landing
 *   page: brand mark, eyebrow, heading, one card, one quiet line underneath.
 *   Everything is drawn from tokens, so the auth routes now follow the theme
 *   like the rest of the app.
 *
 *   NOTHING WAS REMOVED. `image`, `imageAlt` and `quote` still arrive from every
 *   call site and still render: the image becomes the quiet backdrop texture and
 *   the quote becomes the single line below the card. A long form (`wide`)
 *   scrolls from the top rather than being centred, so a tall registration can
 *   never be pushed off-screen.
 *
 * THE `split` VARIANT
 *   `/login` opts in with `split`, and it is the only route that does. The
 *   centred column is the right answer for a form that is mostly fields — coach
 *   registration is nine of them — because a photo column beside it would just
 *   make the reader work. A sign-in is two fields and one button, which leaves
 *   a 460px column sitting alone in a wide viewport, so on large screens that
 *   one route gets the photograph back as a real, full-height panel rather than
 *   a 16% wash.
 *
 *   It collapses to the SAME single column below `lg`, so mobile, tablet and
 *   every other auth route are untouched. `image`, `quote` and `footer` keep
 *   working in both modes — in `split` the quote moves onto the photo panel.
 */
export function AuthLayout({
  children,
  title,
  subtext,
  eyebrow,
  image = '/image/bg/hero-theater.jpg',
  imageAlt = '',
  quote,
  footer,
  centered = false,
  wide = false,
  split = false,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  subtext?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Decorative backdrop texture. Always decorative — never the only content. */
  image?: string;
  imageAlt?: string;
  quote?: string;
  footer?: React.ReactNode;
  /** Kept for call-site compatibility. Every mode is the centred column now. */
  centered?: boolean;
  /** Wider column that scrolls from the top — for long multi-section forms. */
  wide?: boolean;
  /** Two-column composition on large screens: photo panel beside the form. */
  split?: boolean;
}) {
  const stack = (
    <div className={cn('au-stack', split ? 'au-stack--split' : wide ? 'au-stack--wide' : 'au-stack--narrow')}>
      {/* Brand mark. Skipped on the wide registration forms, where it would
          just push the first field further down the page. */}
      {!wide && (
        <span className="au-mark" aria-hidden="true">
          <Image
            src="/image/Logo/GroovePH-Logo.png"
            alt=""
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </span>
      )}

      <header className="flex flex-col gap-3">
        {eyebrow}
        <h1 className="au-title">{title}</h1>
        {subtext && <p className="au-lead">{subtext}</p>}
      </header>

      <section className="au-card">{children}</section>

      {footer}

      {/* In split mode the quote lives on the photo panel instead. */}
      {quote && !split && (
        <p className="au-quote">
          &ldquo;{quote}&rdquo;
          <span className="mt-1 block text-[13px] text-[var(--subtle-foreground)]">
            San Jose del Monte, Bulacan
          </span>
        </p>
      )}
    </div>
  );

  const brandBar = (
    /* Brand bar. Compact, quiet, and the same on every auth route. */
    <div className="au-topbar">
      <Link
        href="/"
        className="inline-flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
      >
        {/* The wordmark is live text, not the logo PNG: that asset is the
            1240x1240 mascot only, so rendering it at header size produced a
            28px dot that read as a broken image next to the mascot slot below.
            Type stays crisp, re-colours with the theme and costs no request. */}
        <span className="text-[17px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          Groove
        </span>
        <span className="hidden text-[11px] font-medium uppercase leading-none tracking-[0.12em] text-subtle-foreground sm:inline">
          Performing Arts
        </span>
      </Link>

      <Link
        href="/"
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-[13px] font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
      >
        <ArrowLeft
          className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
        <span>Back to home</span>
      </Link>
    </div>
  );

  if (split) {
    return (
      <div className="au-shell au-shell--split">
        {/* Decorative only: `aria-hidden` on the wrapper and an empty alt, so the
            texture is never announced and never lands in the accessibility tree. */}
        <div className="au-backdrop" aria-hidden="true">
          {image ? <Image src={image} alt={imageAlt} fill priority sizes="100vw" /> : null}
        </div>

        {brandBar}

        <main className="au-split">
          <div className="au-split-form">{stack}</div>

          {/* The photograph, at full height and finally at a readable size. */}
          <aside className="au-split-visual" aria-hidden="true">
            <Image
              src={image || '/image/bg/hero-theater.jpg'}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 0px"
              className="au-split-image"
            />
            <div className="au-split-scrim" />
            {/* The movement motif. Purely decorative CSS — three nested arcs
                that read as a body mid-turn, at a weight that never competes
                with the form. */}
            <div className="au-split-pattern" />
            {quote && (
              <p className="au-split-quote">
                <span className="au-split-quote-text">&ldquo;{quote}&rdquo;</span>
                <span className="au-split-quote-place">San Jose del Monte, Bulacan</span>
              </p>
            )}
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="au-shell">
      {/* Decorative only: `aria-hidden` on the wrapper and an empty alt, so the
          texture is never announced and never lands in the accessibility tree. */}
      <div className="au-backdrop" aria-hidden="true">
        {image ? <Image src={image} alt={imageAlt} fill priority sizes="100vw" /> : null}
      </div>

      {brandBar}

      <main
        className={cn(
          'relative z-10 flex w-full flex-1 flex-col items-center px-5 sm:px-6',
          // A long form must not be vertically centred — centring pushes its
          // first fields below the fold on a short viewport.
          wide ? 'justify-start pb-12 pt-6 sm:pt-10' : 'justify-center pb-16 pt-4 sm:pt-8'
        )}
      >
        {stack}
      </main>
    </div>
  );
}

export default AuthLayout;