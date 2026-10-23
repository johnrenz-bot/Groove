'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const MAX_SHORT = 120;
const TIP_WIDTH = 272;

export interface InfoTipProps {
  /** Used as the modal heading and the accessible name of the trigger. */
  title: string;
  /** One short line shown in the hover/focus tooltip (clamped to ~120 chars). */
  short?: string;
  /** Longer explanation shown in the modal (string, string[] or rich nodes). */
  details?: React.ReactNode;
  /** Optional override for the trigger's accessible label. */
  label?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

function shorten(value: string | undefined): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_SHORT ? `${clean.slice(0, MAX_SHORT - 1).trimEnd()}…` : clean;
}

function DetailBody({ details }: { details: React.ReactNode }) {
  if (!details) return null;

  if (typeof details === 'string') {
    return (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {details
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
      </div>
    );
  }

  if (Array.isArray(details)) {
    return (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {details.map((item, index) => (
          <p key={index}>{item}</p>
        ))}
      </div>
    );
  }

  return <div className="text-sm leading-relaxed text-muted-foreground">{details}</div>;
}

/**
 * The single "i" disclosure used by every card, panel and page header.
 *
 * - Hover/focus on desktop: a 4px fade-up tooltip with the short line.
 * - Click/Enter/Space: the full explanation in the shared modal (a bottom sheet
 *   below `sm`), which already traps focus, closes on Escape and restores the
 *   trigger.
 * - The tooltip is portalled and fixed so it is never clipped by a card's
 *   `overflow-hidden`, and never pushes the layout around.
 */
export function InfoTip({
  title,
  short,
  details,
  label,
  className = '',
  align = 'center',
}: InfoTipProps) {
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, placement: 'top' as 'top' | 'bottom' });
  const tooltipId = useId();

  const shortText = shorten(short);
  const hasDetails = Boolean(details);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const place = useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const half = TIP_WIDTH / 2;
    const anchor = align === 'start' ? rect.left : align === 'end' ? rect.right : rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(8, anchor - (align === 'start' ? 0 : align === 'end' ? TIP_WIDTH : half)),
      Math.max(8, window.innerWidth - TIP_WIDTH - 8)
    );
    const placement = rect.top < 116 ? 'bottom' : 'top';
    setPosition({
      left,
      top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  }, [align]);

  const showTip = useCallback(() => {
    if (!canHover || modalOpen) return;
    place();
    setTipOpen(true);
  }, [canHover, modalOpen, place]);

  const hideTip = useCallback(() => setTipOpen(false), []);

  useEffect(() => {
    if (!tipOpen) return;
    const onScroll = () => hideTip();
    const onResize = () => place();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideTip();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
    };
  }, [hideTip, place, tipOpen]);

  const openModal = () => {
    hideTip();
    setModalOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label ?? `More information about ${title}`}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        aria-describedby={tipOpen ? tooltipId : undefined}
        onClick={openModal}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={cn(
          'relative inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground',
          'transition-colors duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent-text',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'after:absolute after:-inset-1.5 after:content-[""]',
          className
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {tipOpen && canHover && (
              <motion.span
                id={tooltipId}
                role="tooltip"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                transition={{ duration: 0.17, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  left: position.left,
                  top: position.top,
                  width: TIP_WIDTH,
                  transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
                }}
                className="pointer-events-none z-[95] rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-[var(--shadow-lg)]"
              >
                {shortText || title}
              </motion.span>
            )}
          </AnimatePresence>,
          document.body
        )}

      {hasDetails && typeof document !== 'undefined'
        ? createPortal(
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              size="md"
              title={
                <span className="flex items-center gap-2.5">
                  <Info className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                  <span>{title}</span>
                </span>
              }
              footer={
                <Button size="sm" onClick={() => setModalOpen(false)}>
                  Got it
                </Button>
              }
            >
              {shortText && typeof details !== 'string' && (
                <p className="mb-3 text-sm font-medium text-foreground">{shortText}</p>
              )}
              <DetailBody details={details} />
            </Modal>,
            document.body
          )
        : null}
    </>
  );
}

export default InfoTip;
