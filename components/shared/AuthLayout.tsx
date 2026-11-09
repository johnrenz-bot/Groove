'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { cn } from './cn';
import { AmbientBackground } from './AmbientBackground';
import { PixelBackground } from './PixelBackground';
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
  logo,
  image = '/image/login/LoginPage.jpeg',
  quote,
  footer,
  wide = false,
  split = false,
  /**
   * Registration-only presentation. It opts the shared card into the wider,
   * quieter registration surface, skips the brand bar, and renders the
   * "Back to login" button at the top of the form column instead.
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
  logo?: React.ReactNode;
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
      {/* Registration routes: the one way back, pinned to the top of the
          form column so it is always the first thing seen. */}
      {registration && (
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 self-start rounded-[8px] bg-card/70 px-3.5 py-2 text-[13px] font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
          <span>Back to login</span>
        </Link>
      )}

      <header className={cn('flex flex-col gap-3', registration && 'au-registration-header')}>
        {logo && <div className="flex justify-center">{logo}</div>}
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
       route, so login and password recovery carry the complete brand rather
       than a different subset of it. Registration routes skip it entirely
       (see the `!registration` guards at both render sites). */
    <div className="au-topbar">
      <AnimatedLogo
        href="/"
        variant="lockup"
        subtitle="Performing Arts"
        className="au-brand-lockup"
      />

      {/* Split mode (login) carries no "Back to home" — the visitor is
          already at the front door. The bare brand remains. */}
      {!split && (
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-[8px] bg-card/70 px-3.5 py-2 text-[13px] font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
          <span>Back to home</span>
        </Link>
      )}
    </div>
  );

  // Split mode: form on left, cinematic image panel on right
  if (split) {
    const panelImage = imagePanelImage || image || '/image/login/LoginPage.jpeg';
    const panelTitle = imagePanelTitle || 'Move to your own rhythm.';
    const panelDescription = imagePanelDescription || 'Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan\'s premier performing arts hub.';

    return (
      <div className={cn('au-shell au-shell--split', registration && 'au-shell--registration')}>
        {/* Ambient background - auth variant (calmer, no particles) */}
        <AmbientBackground variant="auth" className="au-ambient" />
        <PixelBackground intensity="medium" className="opacity-60" />

        {/* Registration routes render no brand bar — the form thinks alone. */}
        {!registration && brandBar}

        <main className="au-split">
          <div className={cn('au-split-form', registration && 'au-split-form--registration')}>
            {stack}
          </div>

          {/* Editorial image panel (right side, ~26%) */}
          <aside className="au-split-visual" aria-hidden="true">
            <div className="au-split-visual-inner">
              <p className="au-split-eyebrow">GroovePH · Performing Arts</p>
              <h2 className="au-split-title">{panelTitle}</h2>
              <p className="au-split-desc">{panelDescription}</p>
              <div className="au-split-image-wrap">
                <Image
                  src={panelImage}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 26vw, 0px"
                  className="au-split-image"
                />
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
      <PixelBackground intensity="medium" className="opacity-60" />

      {/* Registration routes render no brand bar — the form thinks alone. */}
      {!registration && brandBar}

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