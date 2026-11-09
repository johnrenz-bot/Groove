'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/shared/cn';
import { EqualizerBars, GrooveSpinner } from './GrooveSpinner';

/**
 * LoadingModal — the floating glass loading surface for auth, uploads,
 * processing and booking confirmations.
 *
 * Entrance: backdrop fades in with blur, the panel scales from 0.96 and
 * rises 12px. Exit reverses without a snap. The panel is deliberately
 * NOT hoverable — non-interactive loading states must not read as
 * clickable — so the only hover feedback is the soft gold halo on the
 * (optional) dismiss control when the modal is dismissable.
 */

export interface LoadingModalProps {
  open: boolean;
  title?: string;
  description?: string;
  message?: string;
  /** Determinate 0–100. Omit for indeterminate. */
  progress?: number | null;
  /** When false (default) the modal cannot be dismissed while working. */
  dismissable?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LoadingModal({
  open,
  title = 'Please hold…',
  description,
  message = 'Just a moment while we get things ready.',
  progress = null,
  dismissable = false,
  onDismiss,
  className,
}: LoadingModalProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Scroll lock while open (counter-safe with <Modal>).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-modal-open', 'true');
    return () => {
      document.body.style.overflow = prev;
      if (!document.body.hasAttribute('data-modal-open')) return;
      // Only clear if no <Modal> still needs the lock.
      if (document.querySelector('[role="dialog"]') == null) {
        document.body.removeAttribute('data-modal-open');
      }
    };
  }, [open]);

  // Escape only when dismissable.
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissable, onDismiss]);

  if (!mounted) return null;

  const fill = progress !== null ? Math.min(100, Math.max(0, progress)) : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (dismissable && e.target === e.currentTarget) onDismiss?.();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-busy="true"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
            className={cn(
              'g-loading-modal relative w-full max-w-[420px] cursor-default overflow-hidden rounded-[24px] border border-[rgba(245,196,81,0.18)] bg-card/95 text-foreground backdrop-blur-[20px]',
              className
            )}
          >
            {/* gold top hairline */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(245,196,81,0.7), transparent)',
              }}
            />
            {/* ambient wash */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(245,196,81,0.10) 0%, transparent 65%)',
                filter: 'blur(30px)',
              }}
            />

            <div className="relative flex flex-col items-center px-7 pb-7 pt-8 text-center">
              <div className="relative mb-5">
                <div
                  aria-hidden="true"
                  className="g-orbit-slow absolute -inset-2.5 rounded-full motion-reduce:animate-none"
                  style={{ border: '1px dashed rgba(245,196,81,0.3)' }}
                />
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(245,196,81,0.22)] bg-muted">
                  <GrooveSpinner variant="orbit" size="xl" label="Loading" />
                </div>
              </div>

              <h2 className="font-display text-xl leading-snug text-foreground">{title}</h2>
              {description ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
              ) : null}

              <EqualizerBars bars={16} height={20} className="mt-4 opacity-80" />

              <p
                role="status"
                aria-live="polite"
                className="mt-3 min-h-[20px] text-[13px] font-medium text-foreground/75"
              >
                {message}
              </p>

              <div className="mt-4 w-full max-w-[260px]">
                <div
                  className="relative h-[6px] w-full overflow-hidden rounded-full border border-border bg-muted"
                  role={fill !== null ? 'progressbar' : undefined}
                  aria-valuemin={fill !== null ? 0 : undefined}
                  aria-valuemax={fill !== null ? 100 : undefined}
                  aria-valuenow={fill ?? undefined}
                  aria-label={fill !== null ? 'Loading progress' : undefined}
                >
                  {fill !== null ? (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${fill}%`,
                        background:
                          'linear-gradient(90deg, #C9A24C, #F5C451 60%, #FFD36B)',
                        boxShadow: '0 0 14px rgba(245,196,81,0.5)',
                        transition: 'width 280ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="g-progress-sheen absolute inset-y-0 w-1/2 rounded-full motion-reduce:animate-none"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(245,196,81,0.55), transparent)',
                      }}
                    />
                  )}
                </div>
                {fill !== null ? (
                  <p className="mt-2 text-[11px] font-medium tabular-nums tracking-[0.08em] text-[#F5C451]">
                    {fill}%
                  </p>
                ) : null}
              </div>

              {dismissable && onDismiss ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="mt-5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-[rgba(245,196,81,0.45)] hover:text-accent-text hover:shadow-[0_6px_18px_-8px_rgba(245,196,81,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default LoadingModal;
