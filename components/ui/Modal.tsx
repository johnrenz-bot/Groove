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

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
} as const;

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
  className = '',
  ...props
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md transition-opacity duration-200 sm:p-5 animate-in fade-in select-none sm:select-text"
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
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl transition-all duration-200 sm:rounded-3xl animate-in fade-in zoom-in-95',
          SIZES[size],
          className
        )}
        {...props}
      >
        {(title || showClose) && (
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-divider bg-card px-6 py-4.5 sm:px-7">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-full p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </header>
        )}

        <div className="g-scroll flex-1 min-h-0 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-divider bg-muted/40 px-6 py-4 sm:px-7">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export default Modal;
