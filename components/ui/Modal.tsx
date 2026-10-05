'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface ModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  // '2xl' was already in SIZES below but missing from the union, so the widest
  // panel the verification review needs could not be requested by type.
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showClose?: boolean;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-5xl' } as const;

/** Rounded 24px glass modal with overlay, Escape handling, focus containment, and restore focus. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  className = '',
  ...props
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Must be called unconditionally: the early return below would otherwise skip it.
  const titleId = React.useId();

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        // Keep Tab inside the dialog.
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog on open.
    const timer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, select, button, [href]'
        )
        ?.focus();
    }, 40);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-md transition-opacity duration-200 sm:items-center sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'g-scroll max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] glass text-foreground shadow-[var(--glass-shadow)] transition-all duration-200 sm:rounded-[24px] animate-in fade-in zoom-in-95 slide-in-from-bottom-4',
          SIZES[size],
          className
        )}
        {...props}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-full p-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 rounded-b-[24px] border-t border-divider bg-muted/60 px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
