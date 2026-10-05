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
export function AuthLayout({
  children,
  title,
  subtext,
  eyebrow,
  image = '/image/login/bright.jpeg',
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
        src="/image/wc/logo.png"
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
      <h1 className="text-2xl font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtext && <p className="text-sm leading-relaxed text-muted-foreground">{subtext}</p>}
    </div>
  );

  const backHome = (
    <Link
      href="/"
      className="group inline-flex w-fit items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span>Back to home</span>
    </Link>
  );

  if (centered) {
    return (
      <div className="dark-only-page relative flex min-h-screen flex-col bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[380px] w-[600px] rounded-full bg-accent/8 blur-[100px]"
        />
        <div className="px-5 pt-6 sm:px-8">{topBar}</div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className={cn('w-full', maxWidth)}>
            <div className="glass relative rounded-[24px] border border-glass-border p-7 sm:p-9 shadow-[var(--glass-shadow)] backdrop-blur-xl">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
              <div className="mb-7 text-center">{heading}</div>
              {children}
            </div>
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
      <div className="dark-only-page relative flex min-h-screen flex-col bg-background">
        {/* Ambient atmospheric backdrop glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[800px] max-w-full rounded-full bg-accent/8 blur-[120px]"
        />
        <div className="px-5 pt-6 sm:px-8">{topBar}</div>
        <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-8">{heading}</div>
            <div className="glass relative rounded-[24px] border border-glass-border p-6 sm:p-10 shadow-[var(--glass-shadow)] backdrop-blur-xl">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
              {children}
            </div>
            {footer && <div className="mt-7 text-center">{footer}</div>}
          </div>
        </main>
        <div className="mx-auto mb-10 w-full max-w-4xl px-4 sm:px-8">{backHome}</div>
      </div>
    );
  }

  return (
    <div className="dark-only-page relative flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      {/* Form column */}
      <div className="relative flex flex-col justify-between px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* Subtle ambient radial gold glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/8 blur-[100px]"
        />

        {topBar}

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[440px]">
            <div className="glass relative rounded-[24px] border border-glass-border p-7 sm:p-9 shadow-[var(--glass-shadow)] backdrop-blur-xl">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
              <div className="mb-6">{heading}</div>
              {children}
              {footer && <div className="mt-6 border-t border-divider pt-5">{footer}</div>}
            </div>
          </div>
        </div>

        <div className="mt-4">{backHome}</div>
      </div>

      {/* Photo column — always dark so it reads the same in both themes */}
      <div className="relative hidden p-6 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-glass-border shadow-[var(--shadow-lg)]">
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

export default AuthLayout;
