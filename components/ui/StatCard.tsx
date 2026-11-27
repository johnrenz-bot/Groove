'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'yellow' | 'blue' | 'red' | 'green' | 'neutral';

/* Each tone keeps one quiet accent well. The number itself stays foreground
   white/ink so the metric reads first and the colour never carries the value. */
const TONE: Record<StatTone, { icon: string }> = {
  yellow: { icon: 'text-accent-text border-accent-border bg-accent-soft' },
  blue: { icon: 'text-info border-info/30 bg-info-soft' },
  red: { icon: 'text-danger border-danger/30 bg-danger-soft' },
  green: { icon: 'text-success border-success/30 bg-success-soft' },
  neutral: { icon: 'text-accent-text border-accent-border bg-accent-soft' },
};

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
 * The premium KPI tile: a layered, gold-tinted surface with a large tabular
 * number, a quiet status well and supporting metadata. Used by every role's
 * dashboard so the metric hierarchy is identical across the platform.
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
        <span
          className={cn('g-widget-icon', tone.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
        {href && (
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-accent-text"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="g-widget-value break-words">
          {isNumber ? <CountUp value={value} /> : value}
        </p>
        <p className="g-widget-label">{label}</p>
        {sub && <p className="g-widget-meta line-clamp-2">{sub}</p>}
      </div>
    </>
  );

  const classes = cn(
    'g-widget g-widget--stat group',
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