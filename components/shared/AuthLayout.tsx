'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AmbientBackground } from './AmbientBackground';
import { PixelBackground } from './PixelBackground';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';

/**
 * THE AUTH SHELL — one component behind /login, /register/*,
 * /forgot-password and /reset-password.
 *
 * Layout is unchanged in spirit: the existing textured dark backdrop, the
 * right-side illustration panel on split routes, and the GroovePH lockup in
 * the top-left. The form column is now a single flat card (16px radius,
 * hairline border, 24px padding) with the logo tile, title and subtitle at
 * its top, matching the reference design language.
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
  registration = false,
  wizard = false,
  backLink,
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
  /** Wide wizard surface. The children own the card header and progress. */
  wizard?: boolean;
  /** Optional quiet link rendered above the card header (e.g. "Back to login"). */
  backLink?: React.ReactNode;
  /** Optional: title for the image panel (split mode) */
  imagePanelTitle?: string;
  /** Optional: description for the image panel (split mode) */
  imagePanelDescription?: string;
  /** Optional: custom image for the image panel (split mode) */
  imagePanelImage?: string;
}) {
  const logoNode = logo ?? (
    <Image
      src="/image/Logo/GroovePH-Logo.png"
      alt=""
      width={34}
      height={34}
      priority
      className="av-brand-mark"
    />
  );

  const stack = (
    <div
      className={cn(
        'au-stack',
        'av-stack',
        split
          ? 'av-stack--split'
          : wizard
            ? 'av-stack--wizard'
            : registration
              ? 'av-stack--registration'
              : wide
                ? 'av-stack--wide'
                : 'av-stack--narrow'
      )}
    >
      {/* Wizard pages own their "Back to login" action in the footer — rendering
          a second quiet link above the card would duplicate it. */}
      {backLink ?? (registration && !wizard ? (
        <Link href="/login" className="av-back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to login</span>
        </Link>
      ) : null)}

      <section className={cn('av-card', wizard && 'av-card--wizard')}>
        {wizard ? null : (
          <header className="av-head">
            {eyebrow ? <div className="av-eyebrow">{eyebrow}</div> : null}
            <span className="av-icon-tile">{logoNode}</span>
            <h1 className="av-title">{title}</h1>
            {subtext ? <p className="av-subtitle">{subtext}</p> : null}
          </header>
        )}

        <div className={cn('av-card-body', wizard && 'av-card-body--wizard')}>{children}</div>
      </section>

      {footer ? <footer className="av-footer">{footer}</footer> : null}

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
    <div className="au-topbar" data-cursor="native">
      <AnimatedLogo
        href="/"
        variant="lockup"
        subtitle="Performing Arts"
        className="au-brand-lockup"
      />

      {/* Split mode (login) carries no "Back to home" — the visitor is
          already at the front door. The bare brand remains. */}
      {!split && !registration && (
        <Link href="/" className="av-topbar-link">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to home</span>
        </Link>
      )}
    </div>
  );

  // Split mode: form on left, cinematic image panel on right
  if (split) {
    const panelImage = imagePanelImage || image || '/image/login/LoginPage.jpeg';
    const panelTitle = imagePanelTitle || 'Move to your own rhythm.';
    const panelDescription =
      imagePanelDescription ||
      "Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan's premier performing arts hub.";

    return (
      <div className={cn('au-shell au-shell--split', registration && 'au-shell--registration')}>
        <AmbientBackground variant="auth" className="au-ambient" />
        <PixelBackground intensity="medium" className="opacity-60" />

        {brandBar}

        <main className="au-split">
          <div className={cn('au-split-form', registration && 'au-split-form--registration')}>
            {stack}
          </div>

          {/* Editorial image panel (right side). Decorative only. */}
          <aside className="au-split-visual" aria-hidden="true" data-cursor="native">
            <div className="au-split-visual-inner" data-cursor="native">
              <div className="au-split-image-wrap" data-cursor="native">
                <Image
                  src={panelImage}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 0px"
                  className="au-split-image"
                  data-cursor="native"
                />
              </div>
              <div className="au-split-scrim" />
              <div className="au-split-copy">
                <p className="au-split-eyebrow">GroovePH · Performing Arts</p>
                <h2 className="au-split-title">{panelTitle}</h2>
                <p className="au-split-desc">{panelDescription}</p>
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
      <AmbientBackground variant="auth" className="au-ambient" />
      <PixelBackground intensity="medium" className="opacity-60" />

      {brandBar}

      <main
        className={cn(
          'relative z-10 flex w-full flex-1 flex-col items-center px-[16px] sm:px-6',
          // A long form must not be vertically centred — centring pushes its
          // first fields below the fold on a short viewport.
          wide || registration || wizard ? 'justify-start pb-12 pt-4 sm:pt-8' : 'justify-center pb-16 pt-2 sm:pt-6',
          registration && 'au-registration-main',
          wizard && 'au-wizard-main'
        )}
      >
        {stack}
      </main>
    </div>
  );
}

export default AuthLayout;

