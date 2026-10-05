'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/**
 * Scroll-triggered reveal.
 *
 * WHY THIS EXISTS
 * The `g-fade-up` classes in globals.css are a one-shot entrance animation: they
 * run as soon as the element mounts. On a long marketing page that means content
 * below the fold has already finished animating by the time it is seen, so the
 * page feels static. This component waits for the element to actually enter the
 * viewport before adding the visible class.
 *
 * ACCESSIBILITY
 * `prefers-reduced-motion` is honoured, and the reveal is opt-in per element.
 * The hidden state is opacity/translate ONLY -- never `display:none` or
 * `visibility:hidden` -- so the content stays in the accessibility tree and
 * remains findable by a screen reader even if the observer never fires (for
 * example when JavaScript is slow or the IntersectionObserver callback is
 * dropped). A page whose content can become permanently invisible because an
 * observer misfired is a far worse failure than a missing animation.
 */

/**
 * Upper bound on how long content may stay at opacity 0 waiting for the
 * observer. Long enough that a normal scroll reveal still feels like a reveal,
 * short enough that a starved observer is invisible to the user.
 */
const REVEAL_FAILSAFE_MS = 1200;

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function Reveal({ children, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Every state change below is deferred through a timer, never applied
    // synchronously in the effect body (that is what
    // react-hooks/set-state-in-effect flags) and never through
    // requestAnimationFrame.
    //
    // A timer rather than rAF is deliberate. rAF is frame-driven, so in a
    // renderer that has stopped producing frames -- a backgrounded tab, a
    // throttled window, a headless browser -- the callback never runs and the
    // element stays at opacity 0 forever. A timer keeps running regardless, so
    // the state change is guaranteed and only the visual transition is lost.
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(true), 0);
    };

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, already on screen at mount (above the fold), or no
    // observer support: settle without waiting for a scroll event.
    if (prefersReduced || node.getBoundingClientRect().top < window.innerHeight * 0.9) {
      settle();
      return () => window.clearTimeout(timer);
    }

    if (typeof IntersectionObserver === 'undefined') {
      settle();
      return () => window.clearTimeout(timer);
    }

    // SAFETY NET, and the reason this component is trustworthy.
    // IntersectionObserver is reliable in normal browsers but its callback is
    // driven by frame production, so it can be starved in a backgrounded tab, a
    // throttled renderer, or a headless browser. Because the hidden state is
    // opacity:0, a starved observer does not merely skip an animation -- it
    // leaves real marketing content permanently invisible. A missed animation is
    // a cosmetic defect; invisible content is a broken page. So if the observer
    // has not fired by the time this fires, reveal anyway.
    const failsafe = window.setTimeout(settle, REVEAL_FAILSAFE_MS);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            // One-shot: unobserve so scrolling back up does not re-hide it,
            // which would read as a glitch rather than an animation.
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? 'shown' : 'hidden'}
      className={`g-reveal ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
