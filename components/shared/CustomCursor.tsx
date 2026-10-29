'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Interactive targets the cursor responds to. This is intentionally broader
 * than `a, button` so cards, tabs, summaries and role-based controls all get the
 * same hover treatment without every component opting in individually.
 */
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  'label[for]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '.cursor-pointer',
  '.ld-card',
  '.ld-media',
  '[data-cursor="pointer"]',
  '[data-cursor-hover]',
].join(',');

/**
 * Elements that keep the native pointer. Text fields need the I-beam, and
 * native selects/date inputs draw their own affordances, so the custom layer is
 * hidden over them instead of producing two cursors.
 */
const NATIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.native-cursor',
  '[data-cursor-native]',
].join(',');

type CursorState = 'idle' | 'pointer' | 'native';

export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringPosRef = useRef<HTMLDivElement>(null);
  const dotPosRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const pathname = usePathname();

  // Only enable on a mouse/trackpad with a fine pointer, and never when the
  // visitor has asked for reduced motion. Touch devices keep the native cursor.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => setActive(finePointer.matches && !reducedMotion.matches);
    sync();

    finePointer.addEventListener?.('change', sync);
    reducedMotion.addEventListener?.('change', sync);
    return () => {
      finePointer.removeEventListener?.('change', sync);
      reducedMotion.removeEventListener?.('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    const root = rootRef.current;
    const ringPos = ringPosRef.current;
    const dotPos = dotPosRef.current;
    const html = document.documentElement;
    if (!root || !ringPos || !dotPos) return;

    html.classList.add('g-custom-cursor');

    const pointer = { x: 0, y: 0 };
    const ring = { x: 0, y: 0 };
    let hasPointer = false;
    let isDown = false;
    let hoverState: CursorState = 'idle';
    let raf = 0;
    let running = true;
    let moved = false;
    let scrollFrame = 0;

    const applyState = () => {
      const next = isDown && hoverState !== 'native' ? 'down' : hoverState;
      if (root.dataset.state !== next) root.dataset.state = next;
    };

    const show = () => {
      if (root.dataset.visible !== 'true') root.dataset.visible = 'true';
    };

    const hide = () => {
      if (root.dataset.visible !== 'false') root.dataset.visible = 'false';
    };

    const updateHover = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        hoverState = 'idle';
        applyState();
        return;
      }

      if (target.closest(NATIVE_SELECTOR)) {
        hoverState = 'native';
      } else if (target.closest(INTERACTIVE_SELECTOR)) {
        hoverState = 'pointer';
      } else {
        hoverState = 'idle';
      }
      applyState();
    };

    const moveDot = () => {
      dotPos.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    };

    // Seed the ring and dot from the first pointer event. A click can arrive
    // before any pointermove (programmatic click, assistive tech), and without
    // this the cursor would flash at the top-left corner.
    const placePointer = (target: EventTarget | null) => {
      hasPointer = true;
      ring.x = pointer.x;
      ring.y = pointer.y;
      ringPos.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      moveDot();
      updateHover(target);
    };

    const tick = () => {
      if (!running) return;

      if (hasPointer) {
        if (moved) {
          moveDot();
          moved = false;
        }

        const dx = pointer.x - ring.x;
        const dy = pointer.y - ring.y;

        // Only write the ring transform while it is still catching up. Writing
        // it every frame forces needless style/layout work when the pointer is
        // stationary.
        if (Math.abs(dx) > 0.06 || Math.abs(dy) > 0.06) {
          ring.x += dx * 0.2;
          ring.y += dy * 0.2;
          if (Math.abs(pointer.x - ring.x) < 0.06) ring.x = pointer.x;
          if (Math.abs(pointer.y - ring.y) < 0.06) ring.y = pointer.y;
          ringPos.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      pointer.x = event.clientX;
      pointer.y = event.clientY;
      moved = true;

      if (!hasPointer) {
        placePointer(event.target);
      }

      show();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!hasPointer) placePointer(event.target);
      isDown = true;
      applyState();
      show();
    };

    const onPointerUp = () => {
      isDown = false;
      applyState();
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      updateHover(event.target);
    };

    const onPointerLeave = () => {
      hide();
      isDown = false;
      hoverState = 'idle';
      applyState();
    };

    const onVisibilityChange = () => {
      if (document.hidden) onPointerLeave();
    };

    // While the page scrolls under a stationary pointer, the element below it
    // changes. Re-checking once per frame keeps hover states honest.
    const onScroll = () => {
      if (!hasPointer || scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateHover(document.elementFromPoint(pointer.x, pointer.y));
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    raf = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);

      html.classList.remove('g-custom-cursor');
      for (const node of [root, ringPos, dotPos]) {
        node.style.transform = '';
      }
      root.dataset.visible = 'false';
      root.dataset.state = 'idle';
    };
  }, [active]);

  // A route change replaces the interactive elements underneath the pointer.
  // Reset to a neutral, hidden state; the next pointer movement brings it back.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.visible = 'false';
    root.dataset.state = 'idle';
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="g-cur"
      data-visible="false"
      data-state="idle"
      aria-hidden="true"
    >
      <div ref={ringPosRef} className="g-cur__pos">
        <span className="g-cur__ring" />
      </div>
      <div ref={dotPosRef} className="g-cur__pos">
        <span className="g-cur__dot" />
      </div>
    </div>
  );
}

export default CustomCursor;
