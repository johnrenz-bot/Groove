'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'yellow' | 'blue' | 'red' | 'green' | 'neutral';

const TONE = {
  yellow: { icon: 'text-muted-foreground' },
  blue: { icon: 'text-muted-foreground' },
  red: { icon: 'text-muted-foreground' },
  green: { icon: 'text-muted-foreground' },
  neutral: { icon: 'text-muted-foreground' },
} as const;

function FormattedNumber({ value }: { value: number }) {
  return <>{value.toLocaleString()}</>;
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    let frame = 0;
    const from = display;
    const delta = value - from;
    const duration = 650;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + delta * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduceMotion, value]);

  const shown = reduceMotion ? value : display;

  return (
    <span ref={ref}>
      <span aria-hidden="true">{shown.toLocaleString()}</span>
      <span className="sr-only">
        <FormattedNumber value={value} />
      </span>
    </span>
  );
}

export interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  /** One line of secondary context, max. Longer explanations belong in `info`. */
  sub?: string;
  accentColor?: StatTone;
  href?: string;
  className?: string;
}

/**
 * Neutral metric tile: no colored left bar, no colored icon tile. Plain muted
 * line icon, big number, label, meta in muted text. 1px border only.
 */
export function StatCard({
  icon,
  value,
  label,
  sub,
  accentColor = 'neutral',
  href,
  className = '',
}: StatCardProps) {
  const tone = TONE[accentColor];
  const isNumber = typeof value === 'number';

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
        {href && (
          <ArrowUpRight
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-4 min-w-0">
        <p className="break-words text-[24px] font-bold leading-none tracking-[-0.02em] tabular-nums text-foreground sm:text-[28px]">
          {isNumber ? <CountUp value={value} /> : value}
        </p>
        <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">{label}</p>
        {sub && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sub}</p>
        )}
      </div>
    </>
  );

  const classes = cn(
    'group flex min-h-[9.25rem] flex-col justify-between rounded-[16px] border border-border bg-surface p-5',
    'transition-colors hover:border-border-strong',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${label}${isNumber ? `: ${value}` : ''}`}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

export default StatCard;