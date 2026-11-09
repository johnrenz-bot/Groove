'use client';

import React from 'react';

interface FilipinoPatternBackgroundProps {
  className?: string;
  variant?: 'full' | 'subtle' | 'section';
}

/**
 * Filipino-inspired background pattern combining:
 * 1. Traditional *banig* geometric diagonal woven patterns
 * 2. Philippine-inspired 8-ray sunburst motifs and central solar nodes
 * 3. Architectural stage lines evoking theater proscenium geometry
 * Rendered at ultra-low opacity (#E8B84B gold & subtle dark-gray)
 * to maintain pristine content legibility and dark aesthetic.
 */
export function FilipinoPatternBackground({
  className = '',
  variant = 'section',
}: FilipinoPatternBackgroundProps) {
  const isSubtle = variant === 'subtle';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none -z-10 ${className}`}
    >
      <svg
        className="w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Repeated Pattern Unit: 160x160 px */}
          <pattern
            id="filipino-banig-pattern"
            width="160"
            height="160"
            patternUnits="userSpaceOnUse"
          >
            {/* 1. Banig Diagonal Weave (Gold & Dark Gray) */}
            <g stroke="#E8B84B" strokeOpacity={isSubtle ? '0.02' : '0.035'} strokeWidth="0.75" fill="none">
              {/* Primary 45-degree diagonal lines */}
              <line x1="0" y1="0" x2="160" y2="160" />
              <line x1="40" y1="0" x2="160" y2="120" />
              <line x1="80" y1="0" x2="160" y2="80" />
              <line x1="120" y1="0" x2="160" y2="40" />
              <line x1="0" y1="40" x2="120" y2="160" />
              <line x1="0" y1="80" x2="80" y2="160" />
              <line x1="0" y1="120" x2="40" y2="160" />
            </g>

            <g stroke="#555555" strokeOpacity={isSubtle ? '0.025' : '0.045'} strokeWidth="0.75" fill="none">
              {/* Counter -45 degree diagonal weave lines */}
              <line x1="160" y1="0" x2="0" y2="160" />
              <line x1="120" y1="0" x2="0" y2="120" />
              <line x1="80" y1="0" x2="0" y2="80" />
              <line x1="40" y1="0" x2="0" y2="40" />
              <line x1="160" y1="40" x2="40" y2="160" />
              <line x1="160" y1="80" x2="80" y2="160" />
              <line x1="160" y1="120" x2="120" y2="160" />
            </g>

            {/* 2. Philippine Sun Rays (Subtle 8-ray burst at center) */}
            <g transform="translate(80, 80)">
              {/* Central golden core */}
              <circle cx="0" cy="0" r="3.5" fill="#E8B84B" fillOpacity={isSubtle ? '0.03' : '0.05'} />
              <circle cx="0" cy="0" r="1.5" fill="#E8B84B" fillOpacity={isSubtle ? '0.05' : '0.08'} />

              {/* 8 Cardinal and Intercardinal Sun Rays */}
              <g stroke="#E8B84B" strokeOpacity={isSubtle ? '0.025' : '0.04'} strokeWidth="0.75">
                <line x1="0" y1="-6" x2="0" y2="-22" />
                <line x1="0" y1="6" x2="0" y2="22" />
                <line x1="-6" y1="0" x2="-22" y2="0" />
                <line x1="6" y1="0" x2="22" y2="0" />

                <line x1="-4.5" y1="-4.5" x2="-16" y2="-16" />
                <line x1="4.5" y1="-4.5" x2="16" y2="-16" />
                <line x1="-4.5" y1="4.5" x2="-16" y2="16" />
                <line x1="4.5" y1="4.5" x2="16" y2="16" />
              </g>
            </g>

            {/* Corner nodes for continuous seamless tiling */}
            <g stroke="#E8B84B" strokeOpacity={isSubtle ? '0.02' : '0.035'} strokeWidth="0.6">
              <circle cx="0" cy="0" r="2" fill="#E8B84B" fillOpacity="0.04" />
              <circle cx="160" cy="0" r="2" fill="#E8B84B" fillOpacity="0.04" />
              <circle cx="0" cy="160" r="2" fill="#E8B84B" fillOpacity="0.04" />
              <circle cx="160" cy="160" r="2" fill="#E8B84B" fillOpacity="0.04" />
            </g>

            {/* 3. Stage & Architectural Lines (Vertical rhythm) */}
            <line
              x1="80"
              y1="0"
              x2="80"
              y2="160"
              stroke="#E8B84B"
              strokeOpacity={isSubtle ? '0.015' : '0.025'}
              strokeWidth="0.5"
              strokeDasharray="2 6"
            />
            <line
              x1="0"
              y1="80"
              x2="160"
              y2="80"
              stroke="#E8B84B"
              strokeOpacity={isSubtle ? '0.015' : '0.025'}
              strokeWidth="0.5"
              strokeDasharray="2 6"
            />
          </pattern>

          {/* Radial mask to smoothly fade edges */}
          <radialGradient id="pattern-radial-fade" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#filipino-banig-pattern)" />
      </svg>

      {/* Ambient gradient overlay to blend seamlessly into #0a0a0a */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] opacity-80" />
    </div>
  );
}

export default FilipinoPatternBackground;

