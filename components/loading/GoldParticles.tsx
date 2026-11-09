'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/shared/cn';

/**
 * GoldParticles — deterministic floating gold dust for the splash.
 * Positions are derived from a seeded generator (no Math.random in
 * render) so server and client agree and there is no hydration drift.
 * Motion is CSS translate/opacity only; reduced-motion renders a
 * single static wash instead.
 */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function GoldParticles({
  count = 14,
  className,
}: {
  count?: number;
  className?: string;
}) {
  // Client-only after mount so the first render (server + hydration)
  // is identical: particles, with CSS handling reduced motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = mounted && typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const particles = useMemo(() => {
    const rnd = seeded(20261109);
    return Array.from({ length: count }, (_, i) => {
      const left = rnd() * 100;
      const top = rnd() * 100;
      const size = 2 + rnd() * 3;
      const duration = 9 + rnd() * 10;
      const delay = -rnd() * 12;
      const drift = 24 + rnd() * 48;
      const opacity = 0.25 + rnd() * 0.5;
      return { i, left, top, size, duration, delay, drift, opacity };
    });
  }, [count]);

  if (reduce) {
    return (
      <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
        <div
          className="absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(245,196,81,0.07) 0%, transparent 65%)',
          }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {particles.map((p) => (
        <span
          key={p.i}
          className="g-particle absolute rounded-full"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              background:
                'radial-gradient(circle at 35% 30%, #FFE9A8, #F5C451 70%)',
              boxShadow: '0 0 10px rgba(245,196,81,0.5)',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ['--drift' as string]: `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default GoldParticles;
