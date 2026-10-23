'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export type StatTone = 'yellow' | 'blue' | 'red' | 'green' | 'neutral';

const TONE = {
  yellow: {
    bar: 'bg-brand-sunburst',
    icon: 'border-accent-border bg-accent-soft text-accent-text',
  },
  blue: { bar: 'bg-info', icon: 'border-info/30 bg-info-soft text-info' },
  red: { bar: 'bg-danger', icon: 'border-danger/30 bg-danger-soft text-danger' },
  green: { bar: 'bg-success', icon: 'border-success/30 bg-success-soft text-success' },
  neutral: { bar: 'bg-border-strong', icon: 'border-border bg-muted text-muted-foreground' },
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
    // `display` is intentionally read once as the animation's starting point.
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
 * The one metric tile: icon, counted-up number, label, optional single line.
 * Arrow nudges right on hover; the whole card lifts 2px.
 */
export function StatCard({
  icon,
  value,
  label,
  sub,
  accentColor = 'yellow',
  href,
  className = '',
}: StatCardProps) {
  const tone = TONE[accentColor];
  const isNumber = typeof value === 'number';

  const content = (
    <>
      <span className={cn('absolute inset-y-0 left-0 w-[4px] rounded-r-full', tone.bar)} aria-hidden="true" />
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
          tone.icon
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-bold tabular-nums tracking-[-0.02em] text-foreground">
          {isNumber ? <CountUp value={value} /> : value}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      {href && (
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text motion-reduce:transform-none"
          aria-hidden="true"
        />
      )}
    </>
  );

  const classes = cn(
    'group relative flex items-center gap-3.5 overflow-hidden rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-sm)] transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-accent-border hover:shadow-[var(--shadow-md)] motion-reduce:transform-none',
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
