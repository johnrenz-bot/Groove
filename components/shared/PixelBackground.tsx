'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface PixelBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'medium';
}

/**
 * Pixelated / dithered cloud background for hero sections.
 * Pure CSS: layered radial gradients + SVG fractal noise with pixelation.
 */
export function PixelBackground({ className = '', intensity = 'subtle' }: PixelBackgroundProps) {
  const opacity = intensity === 'medium' ? 0.55 : 0.35;
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(120,140,180,0.18), transparent 60%), radial-gradient(ellipse 70% 60% at 80% 20%, rgba(244,190,77,0.14), transparent 55%), radial-gradient(ellipse 60% 50% at 20% 30%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(244,190,77,0.06), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '256px 256px',
          imageRendering: 'pixelated',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 70%, #000000 100%)',
        }}
      />
    </div>
  );
}

export default PixelBackground;
