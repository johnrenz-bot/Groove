'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

/**
 * Philippine sun mark — 8 long rays + 8 short rays + center ring, in
 * `currentColor` so callers tint it with a token (usually gold) and hold it
 * at low opacity. Decorative only: always `aria-hidden`.
 *
 * Shared by the dance hero watermark and the modal header accent so the
 * "same Philippine pattern" reads as one motif, not two coincidental suns.
 */
export function PhilippineSunMark({
  size = 160,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const c = size / 2;
  const longRay = size * 0.42;
  const shortRay = size * 0.32;
  const rayW = size * 0.016;
  const innerR = size * 0.13;

  const rays = (count: number, offset: number, len: number, w: number) =>
    Array.from({ length: count }).map((_, i) => {
      const a = ((i * (360 / count) + offset) * Math.PI) / 180;
      return (
        <line
          key={`${offset}-${i}`}
          x1={c + Math.cos(a) * innerR}
          y1={c + Math.sin(a) * innerR}
          x2={c + Math.cos(a) * len}
          y2={c + Math.sin(a) * len}
          stroke="currentColor"
          strokeWidth={w}
          strokeLinecap="round"
        />
      );
    });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none select-none', className)}
    >
      {rays(8, 0, longRay, rayW)}
      {rays(8, 22.5, shortRay, rayW * 0.6)}
      <circle cx={c} cy={c} r={innerR} stroke="currentColor" strokeWidth={rayW * 0.8} />
      <circle cx={c} cy={c} r={innerR * 0.45} fill="currentColor" opacity={0.9} />
    </svg>
  );
}

export default PhilippineSunMark;
