'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/components/shared/cn';

/**
 * The brand lockup: mascot mark + wordmark.
 *
 * ON THE ASSET
 *   There is no SVG of this logo. `public/image/Logo/GroovePH-Logo.png` is the
 *   only master, it is 1240x1240 and 1.9 MB, and it contains the mascot mark
 *   ONLY — there is no wordmark baked into the pixels. The wordmark is therefore
 *   set as live text beside it, which is what the previous header did and is
 *   still the right call: vector text stays crisp at any zoom, re-colours with
 *   the theme for free, and costs ~0 KB instead of ~1.9 MB. (next/image serves
 *   an optimised derivative, so the 1.9 MB never actually reaches a browser.)
 *
 *   A hand-traced SVG of the mascot was considered and rejected: the artwork is
 *   a multi-layer cartoon with feather gradients and a soft drop shadow, and an
 *   auto-trace of it looks worse at every size than the PNG does. If a true SVG
 *   lockup is wanted later, the source is an original design file, not this PNG
 *   — tracing it here would produce a worse logo, not a faster one.
 */
export function AnimatedLogo({
  href,
  subtitle,
  /**
   * `full`  = mark + live "Groove" text (+ optional subtitle)
   * `mark`  = icon only
   * `lockup` = icon + the actual GroovePH wordmark asset + subtitle
   */
  variant = 'full',
  className,
  onNavigate,
}: {
  href: string;
  subtitle?: string;
  variant?: 'full' | 'mark' | 'lockup';
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      /* The full lockup names itself from its visible wordmark. The mark-only
         variant has no visible text — both the image and its wrapper are
         decorative — so it needs an explicit accessible name or the logo link
         is announced as an unlabelled link. */
      aria-label={variant === 'mark' ? 'GroovePH home' : undefined}
      className={cn('hx-logo', className)}
    >
      <span className="hx-logo-mark" aria-hidden="true">
        <Image
          src="/image/Logo/GroovePH-Logo.png"
          alt=""
          width={40}
          height={40}
          preload
          className="hx-logo-img"
        />
        {/* The shimmer sweep lives on the mark, not the wordmark: at 40px the
            mark is the only part with enough surface for a highlight to read
            as light rather than as a rendering artefact. */}
        <span className="hx-logo-sheen" />
      </span>

      {variant === 'full' && (
        <span className="hx-logo-word">
          <span className="hx-logo-name">Groove</span>
          {subtitle && <span className="hx-logo-sub">{subtitle}</span>}
          {/* Second sweep, across the wordmark. Fires on a different phase from
              the mark's so the two never look like one synchronised animation. */}
          <span className="hx-logo-sheen hx-logo-sheen--word" aria-hidden="true" />
        </span>
      )}

      {variant === 'lockup' && (
        <span className="hx-logo-word hx-logo-word--image">
          {/* The supplied GroovePH wordmark, kept as an asset rather than
              re-typed: it carries the Philippine-flag PH that live text cannot. */}
          <Image
            src="/image/modal/grooveph-logo.png"
            alt="GroovePH"
            width={1024}
            height={293}
            className="hx-logo-wordmark"
          />
          {subtitle && <span className="hx-logo-sub">{subtitle}</span>}
        </span>
      )}
    </Link>
  );
}

export default AnimatedLogo;
