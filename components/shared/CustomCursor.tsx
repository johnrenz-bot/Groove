'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Native-pointer elements. Text fields need the I-beam and native controls
 * draw their own affordances, so the custom layer hides over them instead of
 * producing two cursors at once. `input[type="button"]` / `submit` are
 * deliberately excluded — they are buttons and get the play-cursor treatment.
 */
const NATIVE_SELECTOR = [
  'textarea',
  'select',
  'input:not([type="button"]):not([type="submit"])',
  '[contenteditable="true"]',
  '.native-cursor',
  '[data-cursor-native]',
  '[data-cursor="native"]',
].join(',');

/**
 * Cards / media: hovering one expands the play shape with a soft yellow glow.
 * Covers the shared image card, hoverable panels, landing cards/media and
 * any raw photo/video so the effect works without per-component opt-ins.
 */
const CARD_SELECTOR = [
  '.g-imagecard',
  '.g-card-hover',
  '.ld-card',
  '.ld-media',
  'img',
  'video',
  '[data-cursor="card"]',
].join(',');

const LINK_SELECTOR = ['a[href]', '[data-cursor="link"]'].join(',');

/**
 * Buttons and every other clickable control. Broader than `button` so cards,
 * tabs, summaries and role-based controls (and anything opted in with
 * `[data-cursor-hover]` / `[data-cursor="pointer"]`) share one treatment.
 */
const BUTTON_SELECTOR = [
  'button',
  'summary',
  'label[for]',
  'input[type="button"]',
  'input[type="submit"]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '.cursor-pointer',
  '[data-cursor="pointer"]',
  '[data-cursor-hover]',
].join(',');

type HoverKind = 'idle' | 'button' | 'link' | 'card' | 'native';

/**
 * Organic rounded play-button glyph. The path is a right-pointing triangle
 * with fully rounded corners and a barely-there bulge along both edges, so it
 * reads as a soft play blob rather than a sharp sign-off shape. Fill is driven
 * by CSS per hover state (white by default, GROOVE sunburst yellow on
 * interaction); the dark hairline stroke keeps the white fill visible on the
 * light cream theme, the same trick the native arrow uses.
 */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        className="g-cur__path"
        d="M 11.2 6.8 Q 6.4 5.2 6.4 11 L 6.4 21 Q 6.4 26.8 11.2 25.2 Q 17.5 22.6 23.8 18.4 Q 27.2 16 23.8 13.6 Q 17.5 9.4 11.2 6.8 Z"
      />
    </svg>
  );
}

export function CustomCursor() {
  const [active, setActive] = useState(false);
  const pathname = usePathname();

  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const hoverElRef = useRef<Element | null>(null);
  const hasPointerRef = useRef(false);
  // Hover / press / visibility live in refs and are mirrored onto the layer's
  // `data-*` attributes (the same pattern the old ring cursor used), so moving
  // between surfaces never re-renders React — only the motion springs move.
  const hoverRef = useRef<HoverKind>('idle');
  const isDownRef = useRef(false);
  const visibleRef = useRef(false);

  // --- Pointer position (raw) and the smoothed follow ---------------------
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  // Snappy-but-eased main follow: stiffness/damping tuned so the shape keeps
  // up with fast flicks without jitter on slow moves.
  const springX = useSpring(mouseX, { stiffness: 420, damping: 34, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 420, damping: 34, mass: 0.5 });
  // Softer trailing follow for the ghost layer — the premium "tail".
  const trailX = useSpring(mouseX, { stiffness: 160, damping: 22, mass: 0.6 });
  const trailY = useSpring(mouseY, { stiffness: 160, damping: 22, mass: 0.6 });

  // Magnetic attraction: a small pull toward the centre of the hovered
  // interactive element. Raw offset + its own light spring, summed onto the
  // main follow so the pull itself glides instead of snapping.
  const magRawX = useMotionValue(0);
  const magRawY = useMotionValue(0);
  const magX = useSpring(magRawX, { stiffness: 220, damping: 25, mass: 0.6 });
  const magY = useSpring(magRawY, { stiffness: 220, damping: 25, mass: 0.6 });
  const finalX = useTransform([springX, magX], ([x, m]) => (x as number) + (m as number));
  const finalY = useTransform([springY, magY], ([y, m]) => (y as number) + (m as number));

  // --- Shape state: uniform scale, vertical morph stretch, rotation ------
  const scaleTarget = useMotionValue(1);
  const stretchTarget = useMotionValue(1);
  const rotTarget = useMotionValue(0);
  const scale = useSpring(scaleTarget, { stiffness: 320, damping: 22, mass: 0.6 });
  const stretch = useSpring(stretchTarget, { stiffness: 300, damping: 20, mass: 0.6 });
  const rot = useSpring(rotTarget, { stiffness: 260, damping: 20, mass: 0.6 });
  const shapeScaleY = useTransform([scale, stretch], ([s, st]) => (s as number) * (st as number));

  // Velocity lean: the shape tips a few degrees into fast horizontal travel,
  // which sells the fluid feel without any constant wobble.
  const velocityX = useVelocity(springX);
  const tilt = useTransform(velocityX, [-1600, 1600], [-7, 7]);
  const finalRotate = useTransform([rot, tilt], ([r, t]) => (r as number) + (t as number));

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

    const html = document.documentElement;
    html.classList.add('g-custom-cursor');

    // One place owns the shape targets, so hover and press always agree:
    // fill comes from CSS `data-state`, geometry from these springs. Mouse
    // down is a multiplier on top of the hover scale, so the press shrink
    // works the same over every surface.
    const syncShape = () => {
      const kind = hoverRef.current;
      let base = 1;
      let stretchT = 1;
      let rotT = 0;

      if (kind === 'button') base = 1.16;
      else if (kind === 'link') {
        base = 1.24;
        rotT = -6;
        stretchT = 1.07;
      } else if (kind === 'card') base = 1.38;

      scaleTarget.set(isDownRef.current && kind !== 'native' ? base * 0.82 : base);
      stretchTarget.set(stretchT);
      rotTarget.set(rotT);
    };

    const syncDom = () => {
      const root = rootRef.current;
      if (!root) return;
      root.dataset.state = hoverRef.current;
      root.dataset.down = isDownRef.current ? 'true' : 'false';
      root.dataset.visible =
        visibleRef.current && hoverRef.current !== 'native' ? 'true' : 'false';
    };

    const setHoverKind = (kind: HoverKind) => {
      hoverRef.current = kind;
      syncShape();
      syncDom();
    };

    const setDown = (down: boolean) => {
      isDownRef.current = down;
      syncShape();
      syncDom();
    };

    const setVis = (vis: boolean) => {
      visibleRef.current = vis;
      syncDom();
    };

    const updateHover = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        hoverElRef.current = null;
        setHoverKind('idle');
        return;
      }

      if (target.closest(NATIVE_SELECTOR)) {
        hoverElRef.current = null;
        setHoverKind('native');
        return;
      }

      // Buttons win over links and cards when nested (a Book button inside a
      // coach card), links win over cards, and the card/media treatment is
      // the broad fallback.
      const buttonEl = target.closest(BUTTON_SELECTOR);
      if (buttonEl) {
        hoverElRef.current = buttonEl;
        setHoverKind('button');
        return;
      }
      const linkEl = target.closest(LINK_SELECTOR);
      if (linkEl) {
        hoverElRef.current = linkEl;
        setHoverKind('link');
        return;
      }
      const cardEl = target.closest(CARD_SELECTOR);
      if (cardEl) {
        hoverElRef.current = cardEl;
        setHoverKind('card');
        return;
      }

      hoverElRef.current = null;
      setHoverKind('idle');
    };

    const updateMagnetic = (clientX: number, clientY: number) => {
      const el = hoverElRef.current;
      if (!el || !(el instanceof Element)) {
        magRawX.set(0);
        magRawY.set(0);
        return;
      }
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (!rect.width || !rect.height) {
        magRawX.set(0);
        magRawY.set(0);
        return;
      }
      const dx = rect.left + rect.width / 2 - clientX;
      const dy = rect.top + rect.height / 2 - clientY;
      // ~16% of the distance to the centre, clamped so big cards can never
      // drag the cursor out of place.
      magRawX.set(Math.max(-10, Math.min(10, dx * 0.16)));
      magRawY.set(Math.max(-10, Math.min(10, dy * 0.16)));
    };

    const placePointer = (x: number, y: number, target: EventTarget | null) => {
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      mouseX.set(x);
      mouseY.set(y);
      if (!hasPointerRef.current) {
        // First contact (could be a click before any move): snap every layer
        // to the pointer so nothing slides in from the offscreen start point.
        springX.set(x);
        springY.set(y);
        trailX.set(x);
        trailY.set(y);
        hasPointerRef.current = true;
        updateHover(target);
        updateMagnetic(x, y);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const { clientX: x, clientY: y } = event;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      mouseX.set(x);
      mouseY.set(y);
      if (!hasPointerRef.current) placePointer(x, y, event.target);
      updateMagnetic(x, y);
      setVis(true);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!hasPointerRef.current) placePointer(event.clientX, event.clientY, event.target);
      setDown(true);
      setVis(true);
    };

    const onPointerUp = () => setDown(false);

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      updateHover(event.target);
      updateMagnetic(event.clientX, event.clientY);
    };

    const onPointerLeave = () => {
      setVis(false);
      setDown(false);
      setHoverKind('idle');
      hoverElRef.current = null;
      magRawX.set(0);
      magRawY.set(0);
    };

    const onVisibilityChange = () => {
      if (document.hidden) onPointerLeave();
    };

    // While the page scrolls under a stationary pointer, the element below
    // it changes. Re-checking once per frame keeps hover states honest.
    let scrollFrame = 0;
    const onScroll = () => {
      if (!hasPointerRef.current || scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const { x, y } = pointerRef.current;
        updateHover(document.elementFromPoint(x, y));
        updateMagnetic(x, y);
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

    return () => {
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
      hasPointerRef.current = false;
      hoverElRef.current = null;
      magRawX.set(0);
      magRawY.set(0);
    };
  }, [
    active,
    mouseX,
    mouseY,
    springX,
    springY,
    trailX,
    trailY,
    magRawX,
    magRawY,
    scaleTarget,
    stretchTarget,
    rotTarget,
  ]);

  // A route change replaces the interactive elements underneath the pointer.
  // Reset to a neutral, hidden state; the next pointer movement brings it back.
  // Direct DOM writes here (not setState): this effect runs on navigation,
  // outside any pointer event, so shape targets and the layer attributes are
  // simply re-stated.
  useEffect(() => {
    hoverRef.current = 'idle';
    isDownRef.current = false;
    visibleRef.current = false;
    hoverElRef.current = null;
    magRawX.set(0);
    magRawY.set(0);
    scaleTarget.set(1);
    stretchTarget.set(1);
    rotTarget.set(0);
    const root = rootRef.current;
    if (root) {
      root.dataset.state = 'idle';
      root.dataset.down = 'false';
      root.dataset.visible = 'false';
    }
  }, [pathname, magRawX, magRawY, scaleTarget, stretchTarget, rotTarget]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="g-cur"
      data-visible="false"
      data-state="idle"
      data-down="false"
      aria-hidden="true"
    >
      <motion.div className="g-cur__pos g-cur__pos--trail" style={{ x: trailX, y: trailY }}>
        <div className="g-cur__center">
          <span className="g-cur__trail">
            <PlayGlyph />
          </span>
        </div>
      </motion.div>
      <motion.div className="g-cur__pos" style={{ x: finalX, y: finalY }}>
        <div className="g-cur__center">
          <motion.div
            className="g-cur__shape"
            style={{ scaleX: scale, scaleY: shapeScaleY, rotate: finalRotate }}
          >
            <PlayGlyph />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default CustomCursor;
