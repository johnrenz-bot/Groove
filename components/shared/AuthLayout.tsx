'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { cn } from './cn';
import { AmbientBackground } from './AmbientBackground';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';

/**
 * THE AUTH SHELL — one component behind /login, /register/*,
 * /forgot-password and /reset-password.
 *
 * Enhanced with AmbientBackground for cinematic depth.
 * Split layout on desktop: form panel + cinematic image panel.
 * Glass form card with animated focus rings.
 * Respects theme (light/dark) via CSS tokens.
 */
export function AuthLayout({
  children,
  title,
  subtext,
  eyebrow,
  image = '/image/bg/hero-theater.jpg',
  quote,
  footer,
  wide = false,
  split = false,
  /**
   * Registration-only presentation. It opts the shared card into the wider,
   * quieter registration surface. The brand bar itself is identical on every
   * auth route.
   */
  registration = false,
  // Role-specific image panel content for registration pages
  imagePanelTitle,
  imagePanelDescription,
  imagePanelImage,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  subtext?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Decorative backdrop texture. Always decorative — never the only content. */
  image?: string;
  quote?: string;
  footer?: React.ReactNode;
  /** Wider column that scrolls from the top — for long multi-section forms. */
  wide?: boolean;
  /** Two-column composition on large screens: photo panel beside the form. */
  split?: boolean;
  /** Use the registration-sized form surface. */
  registration?: boolean;
  /** Optional: title for the image panel (split mode) */
  imagePanelTitle?: string;
  /** Optional: description for the image panel (split mode) */
  imagePanelDescription?: string;
  /** Optional: custom image for the image panel (split mode) */
  imagePanelImage?: string;
}) {
  const stack = (
    <div
      className={cn(
        'au-stack',
        split
          ? 'au-stack--split'
          : registration
            ? 'au-stack--registration'
            : wide
              ? 'au-stack--wide'
              : 'au-stack--narrow'
      )}
    >
      <header className={cn('flex flex-col gap-3', registration && 'au-registration-header')}>
        {eyebrow}
        <h1 className="au-title">{title}</h1>
        {subtext && <p className="au-lead">{subtext}</p>}
      </header>

      <section className={cn('au-card', registration && 'au-card--registration')}>
        {children}
      </section>

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
    /* Brand bar. The same mascot mark + GroovePH wordmark lockup on every auth
       route, so login, registration and password recovery all carry the complete
       brand rather than a different subset of it. */
    <div className="au-topbar">
      <AnimatedLogo
        href="/"
        variant="lockup"
        subtitle="Performing Arts"
        className="au-brand-lockup"
      />

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

  // Split mode: form on left, cinematic image panel on right
  if (split) {
    const panelImage = imagePanelImage || image || '/image/bg/hero-theater.jpg';
    const panelTitle = imagePanelTitle || 'Move to your own rhythm.';
    const panelDescription = imagePanelDescription || 'Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan\'s premier performing arts hub.';

    return (
      <div className={cn('au-shell au-shell--split', registration && 'au-shell--registration')}>
        {/* Ambient background - auth variant (calmer, no particles) */}
        <AmbientBackground variant="auth" className="au-ambient" />

        {brandBar}

        <main className="au-split">
          <div className={cn('au-split-form', registration && 'au-split-form--registration')}>
            {stack}
          </div>

          {/* Cinematic image panel */}
          <aside className="au-split-visual" aria-hidden="true">
            <Image
              src={panelImage}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 0px"
              className="au-split-image"
            />
            {/* Gradient overlay for text legibility */}
            <div className="au-split-scrim" />
            {/* Gold accent border on the inner edge */}
            <div className="au-split-gold-edge" aria-hidden="true" />
            {/* Subtle pattern */}
            <div className="au-split-pattern" />
            {/* Content overlay */}
            <div className="au-split-content">
              {quote && (
                <p className="au-split-quote">
                  <span className="au-split-quote-text">&ldquo;{quote}&rdquo;</span>
                  <span className="au-split-quote-place">San Jose del Monte, Bulacan</span>
                </p>
              )}
              <div className="au-split-tagline">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[-0.02em] text-white">
                  {panelTitle}
                </h2>
                <p className="mt-3 text-base sm:text-lg text-white/80 max-w-xs leading-relaxed">
                  {panelDescription}
                </p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  // Non-split mode: centered column with ambient background
  return (
    <div className={cn('au-shell', registration && 'au-shell--registration')}>
      {/* Ambient background - auth variant */}
      <AmbientBackground variant="auth" className="au-ambient" />

      {brandBar}

      <main
        className={cn(
          'relative z-10 flex w-full flex-1 flex-col items-center px-5 sm:px-6',
          // A long form must not be vertically centred — centring pushes its
          // first fields below the fold on a short viewport.
          wide || registration
            ? 'justify-start pb-12 pt-6 sm:pt-9'
            : 'justify-center pb-16 pt-4 sm:pt-8',
          registration && 'au-registration-main'
        )}
      >
        {stack}
      </main>
    </div>
  );
}

export default AuthLayout;