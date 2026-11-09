'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

/**
 * GrooveSpinner — the single loading glyph for every Groove surface.
 *
 * Variants are chosen by context, never by page:
 *   orbit  — global / modal / button. A gold ring with an orbiting light dot.
 *   play   — branded hero moments. The Groove play blob breathing inside a
 *            gold orbit arc (the same mark as the custom cursor).
 *   bars   — inline / data states. A compact equalizer.
 *   pulse  — auth & processing. A breathing core with an expanding ring.
 *   morph  — empty placeholders. A squircle that morphs while it turns.
 *   dots   — tiny inline (chips, table cells). Three dots in sequence.
 *
 * All motion is CSS (transform/opacity only) so there is no JS loop to
 * leak, and `prefers-reduced-motion` freezes every variant to a static
 * legible mark. Sizes are pixel-based so a button and a modal share the
 * same optical size. Ring tracks are theme tokens (`--border`), so every
 * variant is legible on the dark page and the light cream surfaces alike.
 */

export type GrooveSpinnerVariant = 'orbit' | 'play' | 'bars' | 'pulse' | 'morph' | 'dots';
export type GrooveSpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<GrooveSpinnerSize, number> = {
  xs: 14,
  sm: 16,
  md: 24,
  lg: 36,
  xl: 56,
};

export interface GrooveSpinnerProps {
  variant?: GrooveSpinnerVariant;
  size?: GrooveSpinnerSize;
  className?: string;
  label?: string;
}

export function GrooveSpinner({
  variant = 'orbit',
  size = 'md',
  className,
  label = 'Loading',
}: GrooveSpinnerProps) {
  const px = SIZES[size];

  const common = cn('inline-flex shrink-0 items-center justify-center', className);

  if (variant === 'bars') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(common, 'items-end gap-[3px]')}
        style={{ width: px * 1.8, height: px }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="g-eq-bar motion-reduce:animate-none"
            style={{
              width: 3,
              height: '100%',
              borderRadius: 999,
              background:
                'linear-gradient(180deg, #FFD36B 0%, #F5C451 55%, #C9A24C 100%)',
              boxShadow: '0 0 10px rgba(245,196,81,0.45)',
              animationDelay: `${i * 120}ms`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </span>
    );
  }

  if (variant === 'dots') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(common, 'gap-[5px]')}
        style={{ width: px, height: px }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="g-dot-bounce motion-reduce:animate-none"
            style={{
              width: Math.max(4, px / 4),
              height: Math.max(4, px / 4),
              borderRadius: 999,
              background: 'var(--accent)',
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </span>
    );
  }

  if (variant === 'pulse') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(common, 'relative')}
        style={{ width: px, height: px }}
      >
        <span
          aria-hidden="true"
          className="g-pulse-ring motion-reduce:animate-none absolute inset-0 rounded-full"
          style={{ border: '1.5px solid var(--accent)', borderColor: 'rgba(245,196,81,0.55)' }}
        />
        <span
          aria-hidden="true"
          className="g-pulse-core motion-reduce:animate-none absolute rounded-full"
          style={{
            inset: px * 0.28,
            background: 'radial-gradient(circle at 35% 30%, #FFD36B, #F5C451 60%, #C9A24C)',
            boxShadow: '0 0 18px rgba(245,196,81,0.55)',
          }}
        />
      </span>
    );
  }

  if (variant === 'morph') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(common)}
        style={{ width: px, height: px }}
      >
        <span
          aria-hidden="true"
          className="g-morph motion-reduce:animate-none block"
          style={{
            width: '100%',
            height: '100%',
            background:
              'linear-gradient(135deg, rgba(245,196,81,0.28), rgba(245,196,81,0.06) 55%, var(--muted))',
            border: '1px solid rgba(245,196,81,0.5)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 22px rgba(245,196,81,0.18)',
            animationDuration: '3.2s',
          }}
        />
      </span>
    );
  }

  if (variant === 'play') {
    const glyph = Math.max(10, px * 0.52);
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(common, 'relative')}
        style={{ width: px, height: px }}
      >
        <span
          aria-hidden="true"
          className="motion-reduce:animate-none absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid var(--border)',
          }}
        />
        <span
          aria-hidden="true"
          className="g-orbit motion-reduce:animate-none absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderTopColor: '#F5C451',
            borderRightColor: 'rgba(245,196,81,0.35)',
            filter: 'drop-shadow(0 0 6px rgba(245,196,81,0.45))',
          }}
        />
        <span
          aria-hidden="true"
          className="g-pulse-core motion-reduce:animate-none absolute rounded-full"
          style={{
            inset: px * 0.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <svg
            viewBox="0 0 32 32"
            width={glyph}
            height={glyph}
            focusable="false"
            style={{ overflow: 'visible', filter: 'drop-shadow(0 0 8px rgba(245,196,81,0.55))' }}
          >
            <path
              d="M 11.2 6.8 Q 6.4 5.2 6.4 11 L 6.4 21 Q 6.4 26.8 11.2 25.2 Q 17.5 22.6 23.8 18.4 Q 27.2 16 23.8 13.6 Q 17.5 9.4 11.2 6.8 Z"
              fill="#F5C451"
              stroke="rgba(26,24,20,0.4)"
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>
    );
  }

  // orbit (default)
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(common, 'relative')}
      style={{ width: px, height: px }}
    >
      <span
        aria-hidden="true"
        className="motion-reduce:animate-none absolute inset-0 rounded-full"
        style={{
          border: `1.5px solid var(--border)`,
        }}
      />
      <span
        aria-hidden="true"
        className="g-orbit motion-reduce:animate-none absolute inset-0 rounded-full"
        style={{
          border: '1.5px solid transparent',
          borderTopColor: '#F5C451',
          borderRightColor: 'rgba(245,196,81,0.35)',
          filter: 'drop-shadow(0 0 6px rgba(245,196,81,0.45))',
        }}
      />
      <span
        aria-hidden="true"
        className="g-orbit-dot motion-reduce:animate-none absolute rounded-full"
        style={{
          width: Math.max(5, px * 0.22),
          height: Math.max(5, px * 0.22),
          top: '50%',
          left: '50%',
          marginTop: -(Math.max(5, px * 0.22) / 2),
          marginLeft: -(Math.max(5, px * 0.22) / 2),
          background: '#FFD36B',
          boxShadow: '0 0 12px rgba(245,196,81,0.8)',
          transformOrigin: 'center',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          inset: px * 0.34,
          background: 'radial-gradient(circle at 40% 35%, rgba(255,211,107,0.9), rgba(245,196,81,0.25) 70%)',
          opacity: 0.85,
        }}
      />
    </span>
  );
}

/**
 * EqualizerBars — the musical visualizer used under the splash logo,
 * inside loading modals and on data states. Pure CSS scaleY bounce so
 * it stays on the compositor.
 */
export function EqualizerBars({
  bars = 24,
  height = 28,
  className,
  mirrored = false,
}: {
  bars?: number;
  height?: number;
  className?: string;
  mirrored?: boolean;
}) {
  const items = Array.from({ length: bars }, (_, i) => {
    const distance = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2 || 1);
    const peak = 1 - distance * 0.55;
    const phase = Math.sin(i * 0.9) * 0.5 + 0.5;
    return { i, peak, phase };
  });

  return (
    <div
      aria-hidden="true"
      className={cn('flex items-end justify-center', className)}
      style={{ height, gap: 3 }}
    >
      {items.map(({ i, peak, phase }) => (
        <span
          key={i}
          className="g-eq-bar motion-reduce:animate-none"
          style={{
            width: 3,
            height: '100%',
            borderRadius: 999,
            background:
              i % 6 === 0
                ? 'linear-gradient(180deg,#FFE9A8,#F5C451)'
                : 'linear-gradient(180deg,#F5C451,#B8933A)',
            opacity: 0.35 + peak * 0.65,
            boxShadow: '0 0 8px rgba(245,196,81,0.35)',
            animationDuration: `${0.85 + phase * 0.7}s`,
            animationDelay: `${i * 55}ms`,
            transformOrigin: mirrored ? 'center' : 'bottom',
          }}
        />
      ))}
    </div>
  );
}

export default GrooveSpinner;
