'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/**
 * Scroll-triggered reveal.
 *
 * Smooth, natural entrance reveals inspired by course.marwieang.com.
 * Supports direction variants, stagger delays, and automatically respects
 * prefers-reduced-motion.
 */
const REVEAL_FAILSAFE_MS = 1200;

export interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Direction or variant of the reveal animation */
  variant?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  /** Delay in milliseconds */
  delay?: number;
}

export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(true), delay);
    };

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || node.getBoundingClientRect().top < window.innerHeight * 0.92) {
      settle();
      return () => window.clearTimeout(timer);
    }

    if (typeof IntersectionObserver === 'undefined') {
      settle();
      return () => window.clearTimeout(timer);
    }

    const failsafe = window.setTimeout(settle, REVEAL_FAILSAFE_MS + delay);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
      window.clearTimeout(timer);
    };
  }, [delay]);

  const variantClass = variant !== 'up' ? `g-reveal--${variant}` : '';

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? 'shown' : 'hidden'}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
      className={`g-reveal ${variantClass} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
