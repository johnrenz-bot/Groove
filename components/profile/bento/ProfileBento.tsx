'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

/* ==========================================================================
   PROFILE BENTO PRIMITIVES
   --------------------------------------------------------------------------
   Layout only. No data fetching, no auth logic — every component here renders
   what it is given; the pages own query/state.
   ========================================================================== */

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('bento-grid', className)}>{children}</div>;
}

export function BentoTile({
  as: Tag = 'section',
  className,
  children,
  label,
  icon,
  action,
  ariaLabel,
}: {
  as?: 'section' | 'div' | 'article' | 'aside';
  className?: string;
  children: React.ReactNode;
  /** Optional small uppercase label row at the top of the tile. */
  label?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Tag className={cn('tile', className)} aria-label={ariaLabel}>
      {(label || action) && (
        <div className="tile-head">
          {label ? (
            <p className="tile-label">
              {icon}
              {label}
            </p>
          ) : (
            <span />
          )}
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function TileStat({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('tile-stat', className)}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function TileMetaChip({ children }: { children: React.ReactNode }) {
  return <span className="g-pill g-pill-accent">{children}</span>;
}

/** Animated count-up on first mount. */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const reduced = React.useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  React.useEffect(() => {
    if (reduced.current) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -3 * progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = window.requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}
