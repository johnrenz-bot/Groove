'use client';

import { cn } from '@/components/shared/cn';

export type AmbientVariant = 'landing' | 'auth';

interface AmbientBackgroundProps {
  variant: AmbientVariant;
  className?: string;
}

/**
 * Shared cinematic background for landing and auth pages.
 *
 * The Philippine sun (PhilippineSunMark) has been removed from the landing
 * variant — the hero's full-image photograph is now the visual centrepiece.
 * What remains is:
 *
 *   a) Base: near-black with soft radial gradient (warm gold top-right,
 *      maroon/indigo bottom-left) — present on all sub-sections below the hero.
 *   b) Pattern: subtle Filipino-inspired geometric (inabel/banig weave) at
 *      3-5% opacity, masked so it fades toward the centre. Landing has a richer
 *      pattern; auth is quieter.
 *   c) Grain overlay: 3% film grain for cinematic texture.
 *   d) Auth-only sunburst: a very faint, static sunburst keeps visual identity
 *      on the auth pages where there is no hero photograph.
 *
 * This component is `position: fixed` so it stays behind every scroll position.
 * The hero section has its own image layer (z-0 inside the section) that sits
 * above this fixed layer for the initial viewport.
 */
export function AmbientBackground({ variant, className }: AmbientBackgroundProps) {
  return (
    <div
      className={cn('fixed inset-0 z-0 pointer-events-none overflow-hidden', className)}
      aria-hidden="true"
    >
      {/* Base radial gradient — warm gold top-right, maroon bottom-left */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === 'landing'
              ? 'radial-gradient(ellipse 70% 55% at 88% -5%, rgba(201,162,74,0.10) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at -8% 108%, rgba(174,49,58,0.07) 0%, transparent 50%), var(--background)'
              : 'radial-gradient(ellipse 70% 55% at 88% -5%, rgba(201,162,74,0.05) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at -8% 108%, rgba(174,49,58,0.04) 0%, transparent 50%), var(--background)',
        }}
      />

      {/* Filipino geometric pattern — inabel/banig weave + parol diamond motif */}
      <div
        className="absolute inset-0"
        style={{
          opacity: variant === 'landing' ? 0.038 : 0.022,
          maskImage:
            variant === 'landing'
              ? 'radial-gradient(ellipse 90% 80% at 20% 80%, black 20%, transparent 75%)'
              : 'radial-gradient(ellipse 70% 70% at 30% 30%, black 40%, transparent 100%)',
          WebkitMaskImage:
            variant === 'landing'
              ? 'radial-gradient(ellipse 90% 80% at 20% 80%, black 20%, transparent 75%)'
              : 'radial-gradient(ellipse 70% 70% at 30% 30%, black 40%, transparent 100%)',
        }}
      >
        <svg
          viewBox="0 0 96 96"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ color: 'var(--foreground)' }}
        >
          <defs>
            <pattern id="grove-banig" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              {/* Warp threads */}
              <line x1="0" y1="0" x2="24" y2="0" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.7" />
              <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.5" />
              <line x1="0" y1="16" x2="24" y2="16" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.7" />
              {/* Weft threads */}
              <line x1="0" y1="0" x2="0" y2="24" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.5" />
              <line x1="8" y1="0" x2="8" y2="24" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.4" />
              <line x1="16" y1="0" x2="16" y2="24" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.5" />
              {/* Diagonal banig diagonals */}
              <line x1="0" y1="24" x2="24" y2="0" stroke="currentColor" strokeWidth="0.25" strokeOpacity="0.3" />
              <line x1="0" y1="0" x2="24" y2="24" stroke="currentColor" strokeWidth="0.25" strokeOpacity="0.2" />
              {/* Parol diamond accent at intersection */}
              <rect x="10" y="10" width="4" height="4" stroke="currentColor" strokeWidth="0.3" fill="none" strokeOpacity="0.5"
                transform="rotate(45 12 12)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grove-banig)" />
        </svg>
      </div>

      {/* Grain / film noise overlay */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.028,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* Auth-only: faint static cultural mark (not the rotating sun) */}
      {variant === 'auth' && (
        <div
          className="absolute bottom-[-8%] right-[-6%] pointer-events-none"
          style={{
            width: '480px',
            height: '480px',
            opacity: 0.04,
            background:
              'conic-gradient(from 0deg, rgba(201,162,74,0) 0deg, rgba(201,162,74,0.8) 22.5deg, rgba(201,162,74,0) 45deg, rgba(201,162,74,0.8) 67.5deg, rgba(201,162,74,0) 90deg, rgba(201,162,74,0.8) 112.5deg, rgba(201,162,74,0) 135deg, rgba(201,162,74,0.8) 157.5deg, rgba(201,162,74,0) 180deg, rgba(201,162,74,0.8) 202.5deg, rgba(201,162,74,0) 225deg, rgba(201,162,74,0.8) 247.5deg, rgba(201,162,74,0) 270deg, rgba(201,162,74,0.8) 292.5deg, rgba(201,162,74,0) 315deg, rgba(201,162,74,0.8) 337.5deg, rgba(201,162,74,0) 360deg)',
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  );
}

export default AmbientBackground;