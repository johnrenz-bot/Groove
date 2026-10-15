'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { cn } from './cn';

/**
 * Auth page shell. Two modes:
 *  - `split`    (default): 2-column, form left, rounded photo right
 *  - `centered`: single centered card, max 440px
 */
/**
 * The one card every auth mode wraps its form in.
 *
 * It used to be written out three times — once per mode — as a `.glass` panel
 * with a 24px radius and a gradient hairline. Three copies of a surface is how a
 * shell drifts, and glass on a form is the wrong register anyway: this is a calm,
 * editorial sign-in, so it is a solid `--card` plane with a 16px radius, a
 * one-pixel border and a single soft shadow.
 */
function AuthCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-md)] sm:p-9',
        className
      )}
    >
      {/* A single hairline in Unity Blue at the top edge. It is the only
          decoration on the card and it marks where the form begins. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      {children}
    </div>
  );
}

export function AuthLayout({
  children,
  title,
  subtext,
  eyebrow,
  image = '/image/bg/hero-theater.jpg',
  imageAlt = 'Groove performing arts community',
  quote,
  maxWidth = 'sm:max-w-[460px]',
  footer,
  centered = false,
  wide = false,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  subtext?: React.ReactNode;
  eyebrow?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  quote?: string;
  maxWidth?: string;
  footer?: React.ReactNode;
  centered?: boolean;
  /** Full-width card that scrolls from the top — for long forms. */
  wide?: boolean;
}) {
  const logo = (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
      aria-label="Groove home"
    >
      <Image
        src="/image/Logo/GroovePH-Logo.png"
        alt="Groove"
        width={104}
        height={32}
        className="h-7 w-auto object-contain"
        priority
      />
    </Link>
  );

  const topBar = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {logo}
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-0.5 text-[11px] font-medium text-subtle-foreground backdrop-blur-sm">
          SJDM Hub
        </span>
      </div>
    </div>
  );

  const heading = (
    <div className="space-y-2">
      {eyebrow && <div className="mb-2">{eyebrow}</div>}
      <h1 className="g-title">{title}</h1>
      {subtext && <p className="text-sm leading-relaxed text-muted-foreground">{subtext}</p>}
    </div>
  );

  const backHome = (
    <Link
      href="/"
      className="group inline-flex w-fit items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span>Back to home</span>
    </Link>
  );

  if (centered) {
    return (
      /* Transparent shell: the (auth) layout forces `.dark` and this AuthBackdrop
         paints the dimmed theater behind the form. */
      <div className="relative flex min-h-screen flex-col">
        <AuthBackdrop />
        <div className="px-5 pt-6 sm:px-8">{topBar}</div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className={cn('w-full', maxWidth)}>
            <AuthCard>
              <div className="mb-7 text-center">{heading}</div>
              {children}
            </AuthCard>
            {footer && <div className="mt-6 text-center">{footer}</div>}
          </div>
        </div>
        <div className="mx-auto mb-8">{backHome}</div>
      </div>
    );
  }

  /* Wide: long multi-section forms (registration). Scrolls from the top rather
     than centring, so a tall form never gets pushed off-screen, and the inner
     card is capped so line lengths stay readable. */
  if (wide) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <AuthBackdrop />
        <div className="px-5 pt-6 sm:px-8">{topBar}</div>
        <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-8">{heading}</div>
            <AuthCard className="sm:p-10">{children}</AuthCard>
            {footer && <div className="mt-7 text-center">{footer}</div>}
          </div>
        </main>
        <div className="mx-auto mb-10 w-full max-w-4xl px-4 sm:px-8">{backHome}</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <AuthBackdrop />
      {/* Form column */}
      <div className="relative flex flex-col justify-between px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* Subtle ambient radial glow in Unity Blue */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/8 blur-[100px]"
        />

        {topBar}

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[440px]">
            <AuthCard>
              <div className="mb-6">{heading}</div>
              {children}
              {footer && <div className="mt-6 border-t border-divider pt-5">{footer}</div>}
            </AuthCard>
          </div>
        </div>

        <div className="mt-4">{backHome}</div>
      </div>

      {/* Photo column — the only surface that stays dark in both themes. The
          image is unpredictable, so the scrim beneath the text is a fixed
          near-black wash rather than a token, exactly like `.g-imagecard-scrim`. */}
      <div className="relative hidden p-6 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-lg)]">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 0px"
            className="object-cover"
          />
          {/* Subtle multi-layer gradient */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

          {/* Top floating badge */}
          <div className="absolute top-7 left-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 backdrop-blur-md text-xs font-semibold text-white/90 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Groove Performing Arts Platform
            </span>
          </div>

          {quote && (
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <div className="rounded-2xl border border-white/10 bg-black/45 p-6 backdrop-blur-md shadow-lg">
                <p className="max-w-md text-xl font-bold leading-snug tracking-[-0.02em] text-white">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1 w-12 rounded-full bg-accent" />
                  <span className="text-xs font-medium text-white/70">San Jose del Monte, Bulacan</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dimmed theater backdrop shared by every auth mode.
 *
 * `absolute inset-0 -z-10` inside AuthLayout's `relative` shell: it paints
 * above the transparent shell but below all form content (cards keep their
 * own opaque `bg-card` surface). The whole auth subtree sits in the `.dark`
 * scope from app/(auth)/layout.tsx, so the near-black overlay gradient only
 * deepens an already-dark canvas and every token-built control (g-input,
 * Button, links, FormError, focus rings) renders its dark, AA-safe values.
 */
function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/image/bg/hero-theater.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
    </div>
  );
}

export default AuthLayout;
