'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * The sliding active pill.
 *
 * One absolutely-positioned element is translated and resized to sit under the
 * nav entry the pointer is on, and returns to the current route when the pointer
 * leaves the row. That is the whole interaction: one measurement per change,
 * written straight to the element before paint, so React never re-renders to
 * move a highlight.
 *
 * The pill is written to directly rather than through state for the same reason
 * the previous version did: state would mean render -> effect -> setState ->
 * render -> effect, i.e. two extra renders and a frame with the pill in the
 * wrong place on every navigation.
 */
export function useSlidingIndicator(activeId: string | null) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);

  const place = useCallback((id: string | null) => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    if (!id) {
      pill.removeAttribute('data-active');
      return;
    }

    const target = container.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(id)}"]`);
    if (!target) {
      pill.removeAttribute('data-active');
      return;
    }

    // Measured from bounding rects rather than `offsetLeft`: dropdown triggers
    // live inside a positioned `.hx-dropdown` wrapper, so their own `offsetLeft`
    // is 0 relative to that wrapper. Reading the rect against the nav makes the
    // pill land under every item — link or trigger — and keeps it correct when
    // the wrapper's own position changes.
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = Math.round((targetRect.left - containerRect.left) * 100) / 100;
    const nextTransform = `translateX(${x}px)`;
    const nextWidth = `${Math.round(targetRect.width * 100) / 100}px`;

    if (pill.style.transform === nextTransform && pill.style.width === nextWidth) {
      pill.setAttribute('data-active', '');
      return;
    }

    pill.style.transform = nextTransform;
    pill.style.width = nextWidth;
    pill.setAttribute('data-active', '');
  }, []);

  /** Return to the current route — called when the pointer leaves the nav row. */
  const measure = useCallback(() => place(activeId), [activeId, place]);

  /** Move to a hovered entry without changing which route is current. */
  const hover = useCallback((id: string) => place(id), [place]);

  /** Position before paint so the first placement is not seen jumping in. */
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
   * Re-measure when the row's own box changes. A ResizeObserver catches font
   * loading and label-width changes that a window resize listener cannot.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

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

  return { containerRef, pillRef, measure, hover };
}

export default useSlidingIndicator;
