'use client';

import React, { useEffect, useId, useState } from 'react';
import { ArrowRight, Award, BadgeCheck, CalendarCheck, Check, Download, Share2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Modal, ModalCloseButton } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  badgeType: 'Groove Coach' | 'Groove Active';
  badgeDescription: string | null;
  tasks: Array<{ title: string; description: string }>;
  unlockedAt: string;
  badgeImageUrl: string;
  onShare?: () => void;
  onDownload?: () => void;
}

type SparkleSpec = {
  /** Spawn offset from the badge centre, in px. */
  ox: number;
  oy: number;
  /** Travel distance over the life of the spark, in px. */
  tx: number;
  ty: number;
  size: number;
  delay: number;
  duration: number;
  cream?: boolean;
};

/**
 * Twelve points of light, not thirty pieces of paper. Confetti was the single
 * loudest thing in this modal and it was fighting the badge for attention;
 * these read as a sparkle of light and are gone inside a second.
 *
 * Fixed rather than randomised: the array is rendered on every state change of
 * the modal, and `Math.random()` would make the same sparkle land in a
 * different place each time React re-rendered.
 */
const SPARKLES: readonly SparkleSpec[] = [
  { ox: -112, oy: -46, tx: -30, ty: -18, size: 5, delay: 40, duration: 1100 },
  { ox: -88, oy: -78, tx: -20, ty: -26, size: 3, delay: 95, duration: 1250, cream: true },
  { ox: -52, oy: -86, tx: -8, ty: -30, size: 4, delay: 30, duration: 1050 },
  { ox: 46, oy: -88, tx: 10, ty: -30, size: 3, delay: 130, duration: 1200, cream: true },
  { ox: 86, oy: -78, tx: 22, ty: -26, size: 4, delay: 70, duration: 1150 },
  { ox: 116, oy: -42, tx: 32, ty: -16, size: 5, delay: 160, duration: 1000 },
  { ox: -126, oy: 6, tx: -38, ty: -4, size: 3, delay: 200, duration: 1150, cream: true },
  { ox: 128, oy: 10, tx: 40, ty: -2, size: 3, delay: 110, duration: 1100 },
  { ox: -100, oy: 48, tx: -26, ty: 20, size: 4, delay: 250, duration: 1050 },
  { ox: 104, oy: 52, tx: 28, ty: 22, size: 4, delay: 180, duration: 1150 },
];

/**
 * Celebration modal shown when a badge is unlocked.
 *
 * The badge is the subject; everything else is quiet furniture around it. Green
 * is an accent and nothing more — a check, a hairline, a seal — never a wash
 * across the whole panel. Every colour that carries the accent resolves through
 * `--am-accent` (set on the panel below), so the Groove Coach celebration reads
 * sunburst rather than emerald.
 *
 * Custom styling lives in this file only: Tailwind for layout, a scoped
 * `<style jsx>` block for the keyframes and the `color-mix()` values.
 */
export function AchievementModal({
  open,
  onClose,
  badgeType,
  badgeDescription,
  tasks,
  unlockedAt,
  badgeImageUrl,
  onShare,
  onDownload,
}: AchievementModalProps) {
  const [animate, setAnimate] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const titleId = useId();
  const isCoach = badgeType === 'Groove Coach';

  // Trigger the entrance sequence on open. setTimeout keeps the state changes
  // out of the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        setAnimate(false);
        setShowSparkles(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setShowSparkles(false);
      requestAnimationFrame(() => {
        setAnimate(true);
        window.setTimeout(() => setShowSparkles(true), 320);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Auto-close after 15 seconds
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, 15000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  const unlockedTime = new Date(unlockedAt).getTime();
  const formattedDate = Number.isNaN(unlockedTime)
    ? null
    : new Date(unlockedTime).toLocaleDateString('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const description =
    badgeDescription ||
    `Congratulations! You've earned the ${badgeType} badge by completing all required tasks.`;

  // The panel carries the surface: neutral charcoal top to bottom, with a 7%
  // accent wash no larger than the badge's own footprint. `--am-accent` is
  // declared here so every descendant inherits it without repeating itself.
  const panelStyle = {
    '--am-accent': isCoach ? 'var(--brand-sunburst)' : 'var(--success)',
    // globals.css sets a universal border-color outside @layer, which outranks
    // every Tailwind border-colour utility — so the panel hairline is set here.
    borderColor: 'var(--accent-border)',
    background: [
      'radial-gradient(56% 32% at 50% 9%, color-mix(in srgb, var(--am-accent) 7%, transparent) 0%, transparent 72%)',
      'linear-gradient(180deg, color-mix(in srgb, var(--card) 77%, #000) 0%, var(--card) 42%, color-mix(in srgb, var(--card) 99%, #fff) 100%)',
    ].join(', '),
  } as React.CSSProperties;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      showClose={false}
      aria-labelledby={titleId}
      className="max-w-[440px] rounded-t-3xl sm:rounded-3xl"
      style={panelStyle}
    >
      {/* The negative margins cancel the scroll container's padding so the
          close bar can sit hard against the panel's top edge and its hairline
          can bleed corner to corner. They have to live here, on a non-sticky
          box: a sticky box is clamped inside its containing block, so a
          negative margin on the bar itself is silently discarded. */}
      <div className="am-root relative -mx-6 -mt-5 flex flex-col items-center px-6 sm:-mx-7 sm:-mt-6 sm:px-7">
        {/* Close — pinned to the panel's top-right corner. The negative `top`
            cancels the scroll container's padding: a sticky box is measured
            against that container's content box, so without it the bar would
            settle 24px lower than its own slot and land on the badge. */}
        <div className="pointer-events-none sticky top-[-20px] z-30 -mx-6 flex h-10 self-stretch items-center justify-end px-6 sm:top-[-24px] sm:-mx-7 sm:px-7">
          <span aria-hidden="true" className="am-top-rule absolute inset-x-0 top-0 h-px" />
          <ModalCloseButton
            onClose={onClose}
            label="Close achievement dialog"
            className="pointer-events-auto"
          />
        </div>

        {/* Badge — the focal point. */}
        <div className={cn('relative shrink-0', animate && 'am-badge-pop', !animate && 'am-pre')}>
          {/* Sparkle layer — anchored to the badge's own box so the burst always
              originates from its centre, whatever the copy above it measures. */}
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {showSparkles
              ? SPARKLES.map((sparkle, index) => (
                  <span
                    key={index}
                    className={cn('am-spark', sparkle.cream && 'am-spark-cream')}
                    style={
                      {
                        '--am-ox': `${sparkle.ox}px`,
                        '--am-oy': `${sparkle.oy}px`,
                        '--am-tx': `${sparkle.tx}px`,
                        '--am-ty': `${sparkle.ty}px`,
                        '--am-size': `${sparkle.size}px`,
                        '--am-delay': `${sparkle.delay}ms`,
                        '--am-dur': `${sparkle.duration}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))
              : null}
          </div>

          <div className="am-badge relative flex h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-3xl bg-muted">
            {/* Fallback mark, visible only if the badge artwork fails to load. */}
            <Award className="h-14 w-14 text-muted-foreground/70" aria-hidden="true" />
            <img
              src={badgeImageUrl}
              alt={`${badgeType} badge`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Thin soft ring, then a single shimmer sweep across the face. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-foreground/10"
            />
            <span
              aria-hidden="true"
              className="am-sheen-host pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
            >
              <span className={cn('am-sheen block', animate && 'am-sheen-run')} />
            </span>
          </div>

          {/* Verified seal, bottom-right of the frame. */}
          <span
            className={cn(
              'am-seal absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border',
              animate && 'am-seal-pop'
            )}
            aria-hidden="true"
          >
            <BadgeCheck className="h-[18px] w-[18px]" />
          </span>
        </div>

        {/* Label + title, below the badge and never over it. */}
        <p
          className={cn(
            'am-label mt-5 text-[11px] font-semibold uppercase leading-none tracking-[0.18em]',
            animate && 'am-rise am-delay-1'
          )}
        >
          Achievement Unlocked
        </p>
        <h2
          id={titleId}
          className={cn(
            'mt-2.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground',
            animate && 'am-rise am-delay-2'
          )}
        >
          {badgeType}
        </h2>
        <p
          className={cn(
            'mt-3 line-clamp-2 max-w-[360px] text-[13px] leading-relaxed text-muted-foreground',
            animate && 'am-rise am-delay-3'
          )}
          title={description}
        >
          {description}
        </p>

        {formattedDate && (
          <p
            className={cn('mt-3.5', animate && 'am-rise am-delay-4')}
          >
            <span className="am-hair inline-flex items-center gap-1.5 rounded-full border bg-foreground/[0.03] px-2.5 py-1 text-[11px] text-subtle-foreground">
              <CalendarCheck className="h-3 w-3" aria-hidden="true" />
              <time dateTime={new Date(unlockedTime).toISOString()}>Unlocked {formattedDate}</time>
            </span>
          </p>
        )}

        {/* Completed tasks — neutral rows, green only on the tick. */}
        {tasks.length > 0 && (
          <section
            className={cn('mt-6 w-full', animate && 'am-rise am-delay-5')}
            aria-label="Completed tasks"
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                Completed Tasks
              </h3>
              <p className="shrink-0 text-[11px] text-subtle-foreground">
                {tasks.length}/{tasks.length} completed
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {tasks.map((task, index) => (
                <li
                  key={`${task.title}-${index}`}
                  className="am-faint-hair flex min-h-[52px] items-center gap-3 rounded-2xl border bg-foreground/[0.02] px-3 py-2.5"
                >
                  <span className="am-tick flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-tight text-foreground">
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="mt-0.5 block text-[11.5px] leading-tight text-muted-foreground">
                        {task.description}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className={cn('mt-6 flex w-full flex-col gap-3', animate && 'am-rise am-delay-6')}>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              icon={<Share2 className="h-4 w-4" />}
              onClick={onShare}
              className="w-full sm:flex-1"
            >
              Share Achievement
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<Download className="h-4 w-4" />}
              onClick={onDownload}
              className="w-full sm:flex-1"
            >
              Save Badge
            </Button>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={onClose}
            trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="mx-auto text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            Continue
          </Button>
        </div>
      </div>

      {/* Component-scoped styles. Every selector is rewritten to this file's
          scope class; the @keyframes names are global, which is why they all
          carry the am- prefix. All of it is removed with the modal. */}
      <style jsx>{`
        /* --- Entrance ---------------------------------------------------------
           .am-pre holds an element invisible until its turn. The media query
           below makes it visible for reduced-motion users, which is why the
           hidden state lives in CSS and not in React. */
        .am-pre {
          opacity: 0;
        }

        @keyframes am-badge-in {
          0% {
            opacity: 0;
            transform: scale(0.86);
          }
          55% {
            opacity: 1;
            transform: scale(1.035);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .am-badge-pop {
          animation: am-badge-in 760ms cubic-bezier(0.22, 1.2, 0.36, 1) 120ms both;
        }

        @keyframes am-seal-in {
          0% {
            opacity: 0;
            transform: scale(0.4);
          }
          60% {
            opacity: 1;
            transform: scale(1.12);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .am-seal-pop {
          animation: am-seal-in 520ms cubic-bezier(0.22, 1.2, 0.36, 1) 640ms both;
        }

        /* One pass of light across the badge face, never a loop. */
        @keyframes am-sheen {
          0% {
            opacity: 0;
            transform: translateX(-150%) skewX(-20deg);
          }
          25% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
            transform: translateX(280%) skewX(-20deg);
          }
        }
        .am-sheen {
          position: absolute;
          inset-block: 0;
          left: 0;
          width: 34%;
          background-image: linear-gradient(
            100deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          opacity: 0;
        }
        .am-sheen-run {
          animation: am-sheen 1.1s cubic-bezier(0.4, 0, 0.2, 1) 380ms 1 both;
        }

        /* Content rises into place, staggered by the am-delay-* classes. */
        @keyframes am-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .am-rise {
          animation: am-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .am-delay-1 {
          animation-delay: 420ms;
        }
        .am-delay-2 {
          animation-delay: 470ms;
        }
        .am-delay-3 {
          animation-delay: 520ms;
        }
        .am-delay-4 {
          animation-delay: 570ms;
        }
        .am-delay-5 {
          animation-delay: 630ms;
        }
        .am-delay-6 {
          animation-delay: 700ms;
        }

        @keyframes am-spark {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.3);
          }
          22% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate(var(--am-tx), var(--am-ty)) scale(1);
          }
        }
        .am-spark {
          position: absolute;
          left: calc(50% + var(--am-ox));
          top: calc(75px + var(--am-oy));
          width: var(--am-size);
          height: var(--am-size);
          border-radius: 9999px;
          background-color: var(--am-accent);
          animation: am-spark var(--am-dur) cubic-bezier(0.22, 0.61, 0.36, 1) var(--am-delay) 1 both;
        }
        .am-spark-cream {
          background-color: var(--foreground);
        }

        /* --- Accent ------------------------------------------------------------
           The only colour in the modal that is allowed to be green: one
           hairline, one label, one seal, one tick.

           The two .am-hair rules exist because globals.css declares a
           universal border-color outside @layer, which outranks every Tailwind
           border-colour utility. Anything that wants its own border has to say
           so here, where the scoped selector wins. */
        .am-top-rule {
          background-image: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, var(--am-accent) 26%, transparent) 50%,
            transparent 100%
          );
        }
        .am-hair {
          border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
        }
        .am-faint-hair {
          border-color: color-mix(in srgb, var(--foreground) 6%, transparent);
        }
        .am-label {
          color: color-mix(in srgb, var(--am-accent) 88%, var(--foreground));
        }
        .am-seal {
          color: var(--am-accent);
          border-color: color-mix(in srgb, var(--am-accent) 30%, transparent);
          background-color: color-mix(in srgb, var(--card) 88%, #000);
        }
        .am-tick {
          color: var(--am-accent);
          border-color: color-mix(in srgb, var(--am-accent) 26%, transparent);
          background-color: color-mix(in srgb, var(--am-accent) 10%, transparent);
        }
        .am-badge {
          /* 48px of blur at 24% — small enough that it stays behind the badge
             and never washes over the title or the task rows below it. */
          box-shadow: var(--shadow-lg),
            0 0 48px -6px color-mix(in srgb, var(--am-accent) 24%, transparent);
        }

        /* --- Reduced motion ----------------------------------------------------
           Not a slower animation: no animation. Everything renders in its
           final state and the modal simply appears.

           No *::before / *::after here. styled-jsx rewrites a descendant
           universal selector to its own scope class but leaves pseudo-element
           selectors alone, so those two would compile to a bare :before /
           :after rule and strip animations from pseudo-elements across the
           whole app. Nothing in this modal animates one. */
        @media (prefers-reduced-motion: reduce) {
          .am-pre {
            opacity: 1;
          }
          .am-root,
          .am-root * {
            animation: none !important;
          }
          .am-sheen {
            display: none;
          }
        }
      `}</style>
    </Modal>
  );
}

export default AchievementModal;
