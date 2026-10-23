import type { Transition, Variants } from 'framer-motion';

/**
 * One motion vocabulary for the whole product.
 *
 * Every animated surface imports from here instead of inventing its own
 * duration/easing, so a card, a panel and a modal all move at the same speed.
 * Durations stay deliberate and nothing loops except the decorative sun, which
 * the caller is expected to disable under `prefers-reduced-motion`.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.18,
  slow: 0.24,
  card: 0.3,
  modal: 0.22,
  image: 0.6,
} as const;

export const baseTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const fadeRiseSmall: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

/**
 * Backdrop for a modal that opts into Framer motion. The blur is animated
 * alongside the fade, so the page settles into focus rather than snapping.
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(6px)',
    transition: { duration: DURATION.modal, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  },
};

/** Panel: fade + a slight rise and scale, 220ms in, quicker out. */
export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.modal, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  },
};

/**
 * Role-selection cards: 80ms apart so the pair reads as a sequence rather than
 * a single block, without making the user wait to use either one.
 */
export const roleCardStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const roleCardItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_OUT },
  },
};

/** Hover/focus/selected geometry for a role card, shared by both roles. */
export const roleCardTransition: Transition = {
  duration: DURATION.card,
  ease: EASE_OUT,
};

/** Delay helper for CSS-staggered grids (`g-stagger`). */
export function staggerDelay(index: number, step = 0.05) {
  return { animationDelay: `${Math.min(index * step, 0.3)}s` };
}
