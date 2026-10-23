'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { PhilippineSunMark } from '@/features/dance/components/PhilippineSunMark';
import { backdropVariants, modalPanel } from './motion';

export interface ModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  // '2xl' was already in SIZES below but missing from the union, so the widest
  // panel the verification review needs could not be requested by type.
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showClose?: boolean;
  /**
   * Opt-in Framer entrance/exit (fade + blur backdrop, 0.96 -> 1 panel rise).
   * Off by default so every existing dialog keeps its exact current behaviour.
   */
  animated?: boolean;
  /** Id for the description paragraph, so the panel can point at it. */
  descriptionId?: string;
  /** Replaces the static header sun. Callers own its motion and `aria-hidden`. */
  headerAccent?: React.ReactNode;
  /** Extra classes for the scrollable body (safe-area padding, full-bleed grids). */
  bodyClassName?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  // Opt-in widest panel (role chooser). The theme's rem is 14px, so
  // `max-w-6xl` lands at 1008px — inside the 960–1040px brief. Existing
  // `2xl` callers keep their previous 896px width.
  '3xl': 'max-w-6xl',
} as const;

/**
 * Open dialogs, oldest first.
 *
 * InfoTip renders a dialog from inside another dialog, so a keystroke reaches
 * both panels. Only the top entry may handle Escape or trap Tab — otherwise
 * one Escape would close the explanation AND the surface it explains, and two
 * traps would fight over where focus lands.
 */
const dialogStack: symbol[] = [];

/** Rounded glass modal with overlay, fixed header, scrollable body, sticky footer, Escape handling, and focus containment. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  animated = false,
  descriptionId,
  headerAccent,
  bodyClassName = '',
  className = '',
  ...props
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const reduceMotion = useReducedMotion();
  const onCloseRef = useRef(onClose);

  // Call sites almost always pass an inline `onClose`. Keeping it in a ref means
  // a parent re-render while the dialog is open cannot tear down/re-run the
  // focus trap and steal focus back to the trigger.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const token = Symbol('groove-dialog');
    dialogStack.push(token);
    triggerRef.current = document.activeElement as HTMLElement | null;

    const isTop = () => dialogStack[dialogStack.length - 1] === token;

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([tabindex="-1"]), input:not([type="hidden"]):not([tabindex="-1"]), select:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    body.setAttribute('data-modal-open', 'true');

    const timer = window.setTimeout(() => {
      // A nested dialog may have opened first; it owns the initial focus.
      if (!isTop()) return;
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, select, button, [href]'
        )
        ?.focus();
    }, 40);

    return () => {
      const index = dialogStack.lastIndexOf(token);
      if (index !== -1) dialogStack.splice(index, 1);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      // An inner dialog closing must not unlock the page behind its parent.
      if (dialogStack.length === 0) {
        body.style.overflow = prev;
        body.removeAttribute('data-modal-open');
      }
      triggerRef.current?.focus();
    };
  }, [open]);

  /** Reduced motion gets the same state changes with no travel. */
  const panelVariants: Variants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } },
      }
    : modalPanel;
  const overlayVariants: Variants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } },
      }
    : backdropVariants;

  const overlayClassName = cn(
    'g-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-3 sm:p-5 select-none sm:select-text',
    animated
      ? // Framer owns opacity + blur when animated.
        ''
      : 'backdrop-blur-sm transition-opacity duration-200 animate-in fade-in'
  );

  const panelClassName = cn(
    /* `g-modal-panel` carries the mobile bottom-sheet treatment, which is why
       this is a named class and not a pile of responsive utilities: the sheet
       shape needs a `::before` handle and a max-height in `dvh`, neither of
       which is expressible as a Tailwind class here. */
    'g-modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lg)] sm:rounded-2xl',
    !animated && 'transition-all duration-200 animate-in fade-in zoom-in-95',
    SIZES[size],
    className
  );

  /**
   * A dialog with no visible title still needs an accessible name. Callers such
   * as the command palette render their own header and pass `aria-label`; the
   * old order spread props first and then wrote `undefined` over that label, so
   * the dialog shipped unnamed. Resolve it once, here.
   */
  const resolvedAriaLabel =
    typeof title === 'string' ? title : (props['aria-label'] as string | undefined);
  const resolvedDescribedBy =
    descriptionId ?? (props['aria-describedby'] as string | undefined);

  const content = (
    <>
      {(title || showClose) && (
        <header className="relative flex shrink-0 items-start justify-between gap-4 overflow-hidden border-b border-divider bg-card px-6 py-4.5 sm:px-7">
          {/* Philippine sun accent — gold, cropped top-right, faint enough
              to never fight the title in either theme. */}
          {headerAccent ?? (
            <PhilippineSunMark
              size={120}
              className="absolute -right-8 -top-8 h-28 w-28 text-[#C9A24C] opacity-[0.14]"
            />
          )}
          <div className="relative min-w-0 flex-1">
            {title && (
              <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                {title}
              </h2>
            )}
            {description && (
              typeof description === 'string' ? (
                <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {description}
                </p>
              ) : (
                <div id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {description}
                </div>
              )
            )}
          </div>
          {showClose && (
            // `p-2.5` not `p-2`: 7px padding either side of a `h-5` glyph
            // lands at 31.5px, half a pixel under the 32px hit target.
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-full p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>
      )}

      <div
        data-lenis-prevent
        className={cn('g-scroll flex-1 min-h-0 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6', bodyClassName)}
      >
        {children}
      </div>

      {footer && (
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-divider bg-muted/40 px-6 py-4 sm:px-7">
          {footer}
        </footer>
      )}
    </>
  );

  if (!animated) {
    if (!open) return null;

    return (
      <div
        data-lenis-prevent
        className={overlayClassName}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          {...props}
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
          aria-label={resolvedAriaLabel}
          aria-labelledby={title ? titleId : undefined}
          className={panelClassName}
          aria-describedby={resolvedDescribedBy}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          data-lenis-prevent
          className={overlayClassName}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            key="modal-panel"
            ref={panelRef}
            {...(props as unknown as React.ComponentProps<typeof motion.div>)}
            role="dialog"
            aria-modal="true"
            data-lenis-prevent
            data-motion="animated"
            aria-label={resolvedAriaLabel}
            aria-labelledby={title ? titleId : undefined}
            className={panelClassName}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-describedby={resolvedDescribedBy}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
