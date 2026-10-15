'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * The sliding active pill — the one piece of this header that the brief asked
 * for as "Framer Motion layoutId".
 *
 * framer-motion is not a dependency of this app, and adding a ~34 KB runtime for
 * a single shared-element transition is a bad trade, so this is the same idea
 * built out of CSS: one absolutely-positioned element that is translated and
 * resized to sit under whichever nav entry is current, with a spring-ish
 * cubic-bezier doing the interpolating.
 *
 * This is the FLIP technique reduced to its simplest case. The target never
 * changes shape or moves between renders — it only changes WHICH element is the
 * target — so there is nothing to measure before and after a layout change. One
 * measurement per change is enough: measure, write `transform` + `width`, let
 * the CSS transition carry it there.
 *
 * THE PILL IS WRITTEN TO DIRECTLY, NOT THROUGH STATE.
 *
 *   The position is a function of the DOM, not of anything React knows. Pushing
 *   it through `useState` would mean: render → effect → setState → render →
 *   effect, i.e. two extra renders and a frame of the pill in the wrong place on
 *   every navigation. Writing the style in a layout effect puts it in the right
 *   place before the browser paints, which is also what avoids the flash of an
 *   un-positioned pill on route change.
 *
 *   This is the same reason `useScrolled` in the old header throttled to
 *   `requestAnimationFrame`: measure off the render path, write once, and only
 *   when the value actually changed.
 */
export function useSlidingIndicator(activeId: string | null) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    if (!activeId) {
      pill.removeAttribute('data-active');
      return;
    }

    const target = container.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(activeId)}"]`);
    if (!target) {
      pill.removeAttribute('data-active');
      return;
    }

    const { offsetLeft, offsetWidth } = target;
    const nextTransform = `translateX(${offsetLeft}px)`;
    const nextWidth = `${offsetWidth}px`;

    // Write only on a real change. A resize observer fires on every reflow of
    // the row, most of which do not move it.
    if (pill.style.transform === nextTransform && pill.style.width === nextWidth) return;

    pill.style.transform = nextTransform;
    pill.style.width = nextWidth;
    pill.setAttribute('data-active', '');
  }, [activeId]);

  /**
   * Position before paint.
   *
   * `useLayoutEffect`, not `useEffect`: with a passive effect the browser gets
   * one frame with the pill at x=0, which reads as the active state jumping.
   *
   * `data-settled` is removed first and restored on the next frame, so the very
   * first placement is instant and every later one animates. Without it the pill
   * flies in from the left edge on every page load, which looks like a bug.
   */
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;

    pill.removeAttribute('data-settled');
    measure();

    const frame = window.requestAnimationFrame(() => {
      pill.setAttribute('data-settled', '');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [measure]);

  /**
   * Re-measure when the row's own box changes.
   *
   * A ResizeObserver on the container rather than a `resize` listener: the row is
   * fluid, and its width also changes for reasons that have nothing to do with
   * the window — the account pill truncating a long name, or the nav wrapping.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  /**
   * Fonts land after first paint and change the width of every label, which
   * would leave the pill pointing at the wrong offset until the next route
   * change. `document.fonts.ready` is the one event that marks that boundary.
   */
  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  return { containerRef, pillRef, measure };
}
