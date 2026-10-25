'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showClose?: boolean;
  animated?: boolean;
  descriptionId?: string;
  headerAccent?: React.ReactNode;
  bodyClassName?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
} as const;

const dialogStack: symbol[] = [];

/*
 * Body scroll lock shared by `Modal` and the custom layouts that cannot use it.
 * A counter rather than a boolean so stacked dialogs restore the page exactly
 * once — after the last one closes — regardless of which unmounts first.
 */
let scrollLockCount = 0;
let scrollLockOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) {
    scrollLockOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-modal-open', 'true');
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = scrollLockOverflow;
    document.body.removeAttribute('data-modal-open');
  }
}

/* ============================================================================
   THE WELCOME MODAL DESIGN LANGUAGE.

   The Welcome Modal is the reference implementation for every dialog in the
   product. These constants are that reference's measurements pulled out into
   one place — charcoal `--card` surfaces, an `--accent-border` hairline, the
   soft accent glow instead of a hard drop shadow, cream primary actions and a
   circular muted close control. Components import them rather than copying the
   strings, so a future change to the reference lands everywhere at once.

   Every value is a theme token, not a literal colour: both the dark default and
   the `.light` palette restyle the same classes with no per-theme branching.
   ========================================================================== */

/** Full-screen scrim: dimmed, blurred, and never clicks through to the page. */
export const MODAL_OVERLAY_CLASS =
  'g-modal-overlay fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md select-none sm:items-center sm:p-4 motion-reduce:animate-none';

/** The dialog surface: rounded, hairline border, accent glow, bounded height. */
export const MODAL_PANEL_CLASS =
  'g-modal-panel relative flex max-h-[90dvh] w-full max-w-[95vw] flex-col overflow-hidden rounded-t-3xl border border-accent-border bg-card text-foreground shadow-[0_0_60px_-12px_var(--accent-soft)] sm:rounded-3xl';

/** Header band with the Welcome Modal's quiet diagonal accent wash. */
export const MODAL_HEADER_CLASS =
  'relative flex shrink-0 items-start justify-between gap-4 overflow-hidden border-b border-divider bg-gradient-to-br from-accent-soft/60 via-card to-card px-6 py-4.5 sm:px-7';

/** The single close affordance every dialog uses. */
export const MODAL_CLOSE_BUTTON_CLASS =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50';

/** Scrollable body. `g-scroll` keeps the scrollbar on the product's palette. */
export const MODAL_BODY_CLASS =
  'g-scroll flex-1 min-h-0 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6';

/** Action bar: stacked on phones, one right-aligned row from `sm` up. */
export const MODAL_FOOTER_CLASS =
  'flex shrink-0 flex-col-reverse gap-3 border-t border-divider bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7';

/** Inset content card (the Welcome Modal's Grooveyy AI panel). */
export const MODAL_CARD_CLASS =
  'rounded-2xl border border-accent-border bg-accent-soft/40 p-4';

/** Icon chip used by steps, headers and empty states. */
export const MODAL_ICON_TILE_CLASS =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text';

/** Quiet secondary chip (the Welcome Modal's AI prompt chips). */
export const MODAL_CHIP_CLASS =
  'rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground transition hover:border-accent-border hover:bg-accent-soft';

/**
 * Modal Design System Sub-components
 */

export function ModalCloseButton({
  onClose,
  label = 'Close dialog',
  className,
  disabled,
}: {
  onClose: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      disabled={disabled}
      className={cn(MODAL_CLOSE_BUTTON_CLASS, className)}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function ModalHeader({
  title,
  description,
  onClose,
  showClose = true,
  headerAccent,
  titleId,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  headerAccent?: React.ReactNode;
  /** Ties the heading to `aria-labelledby` on the dialog panel. */
  titleId?: string;
  className?: string;
}) {
  return (
    <header className={cn(MODAL_HEADER_CLASS, className)}>
      {headerAccent ?? (
        <PhilippineSunMark
          size={120}
          className="absolute -right-8 -top-8 h-28 w-28 text-[#C9A24C] opacity-[0.14]"
        />
      )}
      <div className="relative min-w-0 flex-1">
        {title && (
          <h2
            id={titleId}
            className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl"
          >
            {title}
          </h2>
        )}
        {description && (
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </div>
        )}
      </div>
      {showClose && onClose && <ModalCloseButton onClose={onClose} />}
    </header>
  );
}

export function ModalSection({
  children,
  className,
  step,
  icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  icon?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-4 py-3', className)}>
      {(title || step || icon) && (
        <div className="flex items-center gap-2 mb-2 font-semibold text-xs tracking-wide uppercase text-foreground">
          {step && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent-text">
              {step}
            </span>
          )}
          {icon}
          {title && <span>{title}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function ModalCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(MODAL_CARD_CLASS, className)}>{children}</div>;
}

export function ModalIconTile({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ElementType;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(MODAL_ICON_TILE_CLASS, className)}>
      {children || <Icon className="h-4 w-4" aria-hidden="true" />}
    </span>
  );
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <footer className={cn(MODAL_FOOTER_CLASS, className)}>{children}</footer>;
}

export interface UseModalDismissOptions {
  /** Whether the dialog is currently visible. */
  open: boolean;
  onClose: () => void;
  /** Blocks Escape + backdrop dismissal, e.g. while a request is in flight. */
  disabled?: boolean;
  /**
   * Whether clicking the overlay closes the dialog. Form dialogs that would
   * lose typed input set this to `false`; Escape and the close button still work.
   */
  dismissOnBackdrop?: boolean;
}

/**
 * Escape, body-scroll lock and backdrop dismissal for the custom modal layouts
 * that cannot use `<Modal>` (nested lightboxes, signature viewers, inline
 * confirmations). It registers in the same dialog stack as `Modal`, so only the
 * top-most dialog reacts to Escape and the page unlocks after the last close.
 *
 * Call it unconditionally at the top of the component and gate on `open`.
 */
export function useModalDismiss({
  open,
  onClose,
  disabled = false,
  dismissOnBackdrop = true,
}: UseModalDismissOptions) {
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!open) return;

    const token = Symbol('custom-dialog');
    dialogStack.push(token);
    const isTop = () => dialogStack[dialogStack.length - 1] === token;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isTop() || disabledRef.current) return;
      e.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener('keydown', onKey);
    lockBodyScroll();

    return () => {
      const index = dialogStack.lastIndexOf(token);
      if (index !== -1) dialogStack.splice(index, 1);
      document.removeEventListener('keydown', onKey);
      unlockBodyScroll();
    };
  }, [open]);

  return {
    /** Spread onto the overlay; a click outside the panel closes the dialog. */
    backdropProps: {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        if (!dismissOnBackdrop || disabled || event.target !== event.currentTarget) return;
        onClose();
      },
    },
  };
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    lockBodyScroll();

    const timer = window.setTimeout(() => {
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
      unlockBodyScroll();
      triggerRef.current?.focus();
    };
  }, [open]);

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
    MODAL_OVERLAY_CLASS,
    !animated && 'animate-in fade-in'
  );

  const panelClassName = cn(
    MODAL_PANEL_CLASS,
    !animated && 'transition-all duration-200 animate-in fade-in zoom-in-95 motion-reduce:animate-none',
    SIZES[size],
    className
  );

  const resolvedAriaLabel = typeof title === 'string' ? title : (props['aria-label'] as string | undefined);
  const resolvedDescribedBy = descriptionId ?? (props['aria-describedby'] as string | undefined);

  const content = (
    <>
      {(title || showClose) && (
        <ModalHeader
          title={title}
          description={description}
          onClose={onClose}
          showClose={showClose}
          headerAccent={headerAccent}
          titleId={titleId}
        />
      )}

      <div
        data-lenis-prevent
        className={cn(MODAL_BODY_CLASS, bodyClassName)}
      >
        {children}
      </div>

      {footer && (
        <ModalFooter>
          {footer}
        </ModalFooter>
      )}
    </>
  );

  if (!mounted) return null;

  if (!animated) {
    if (!open) return null;

    return createPortal(
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
      </div>,
      document.body
    );
  }

  return createPortal(
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
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
