'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface WelcomeModalProps {
  role?: 'client' | 'coach' | 'admin';
  username?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onStart?: () => void;
  subtext?: string;
  quote?: string;
}

export function WelcomeModal({
  role = 'client',
  username: propUsername,
  isOpen: controlledIsOpen,
  onClose,
  onStart,
  subtext: propSubtext,
  quote: propQuote,
}: WelcomeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [displayName, setDisplayName] = useState(propUsername || '');

  const fetchUserName = useCallback(async () => {
    if (displayName) return;
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data } = await supabase
          .from('profiles')
          .select('firstname, role')
          .eq('id', authUser.id)
          .single();
        if (data?.firstname) setDisplayName(data.firstname);
      }
    } catch {
      // Fallback gracefully
    }
  }, [displayName]);

  useEffect(() => {
    fetchUserName();
  }, [fetchUserName]);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalOpen(controlledIsOpen);
      return;
    }

    if (typeof window !== 'undefined') {
      const isLoginPending = sessionStorage.getItem('groove_welcome_pending') === 'true';
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('groove_welcome_dismissed_date');

      if (isLoginPending || savedDate !== today) {
        const timer = setTimeout(() => setInternalOpen(true), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [controlledIsOpen]);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('groove_welcome_pending');
      if (dontShowToday) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('groove_welcome_dismissed_date', today);
      }
    }
    setInternalOpen(false);
    if (onClose) onClose();
  };

  const handleStart = () => {
    handleClose();
    if (onStart) onStart();
  };

  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  // ── Accessibility: Escape key + focus trap ──────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Focus the card on open
    cardRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const card = cardRef.current;
      if (!card) return;

      const focusable = Array.from(
        card.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  if (!isVisible) return null;

  const resolvedName = displayName || propUsername || (role === 'coach' ? 'Coach' : 'Artist');

  const defaultSubtext =
    'Your stage is ready. Find your next coach, book a rehearsal and keep your Groove going.';

  const defaultQuote =
    role === 'coach'
      ? 'To teach is to touch a life forever. Inspire greatness today.'
      : 'Every great performance begins with the courage to take the first step.';

  const subtext = propSubtext || defaultSubtext;
  const quote = propQuote || defaultQuote;

  // 40 equalizer bars with varied heights (12–36 px), cycling through a pattern
  const BAR_COUNT = 40;
  const barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
    // Spread heights across a sine-ish pattern so bars look organic
    const t = i / (BAR_COUNT - 1);
    const base = 12 + Math.round(Math.sin(t * Math.PI * 3 + 0.5) * 12 + 12);
    return Math.max(12, Math.min(36, base));
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md select-none animate-in fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wm-title"
    >
      {/* Card — stopPropagation prevents backdrop click from firing */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative w-full max-w-[402px] min-h-[397px] rounded-3xl border border-accent-border bg-card p-8 text-center shadow-[0_0_40px_-8px_var(--accent-soft)] focus:outline-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber spotlight radial gradient */}
        <div
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(ellipse, var(--accent-soft) 0%, transparent 70%)',
            animation: 'wm-spotlight-pulse 3s ease-in-out infinite',
          }}
          aria-hidden="true"
        />

        {/* Gold circular × close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close welcome modal"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Logo section */}
        <div className="relative mx-auto mb-6 flex flex-col items-center">
          <Image
            src="/image/Logo/welcome-Logo.png"
            alt="Groove"
            width={200}
            height={124}
            className="h-[124px] w-auto object-contain"
            style={{ animation: 'wm-logo-pop 0.5s ease-out both' }}
            priority
          />
          {/* Soft light pool beneath the logo */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-4 w-32 rounded-full blur-xl"
            style={{ background: 'var(--accent-soft)' }}
            aria-hidden="true"
          />
        </div>

        {/* Text content */}
        <div
          className="space-y-3"
          style={{ animation: 'wm-text-up 0.4s 0.2s ease-out both' }}
        >
          <h2
            id="wm-title"
            className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl"
          >
            Welcome back,{' '}
            <span className="text-accent-text">{resolvedName}</span>
          </h2>

          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtext}
          </p>

          {quote && (
            <div className="pt-1">
              <div className="mx-auto mb-3 h-px w-16 bg-divider" />
              <p className="px-4 text-xs italic text-accent-text">{quote}</p>
            </div>
          )}
        </div>

        {/* Equalizer bars */}
        <div
          className="relative my-5 flex items-end justify-center overflow-hidden"
          aria-hidden="true"
          style={{
            gap: '4px',
            height: '40px',
            // Fade bars at both ends
            maskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)',
          }}
        >
          {barHeights.map((h, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: '6px',
                height: `${h}px`,
                borderRadius: '3px',
                backgroundColor: 'var(--accent-text)',
                transformOrigin: 'bottom',
                animation: `wm-eq-rise 1.2s ease-in-out infinite`,
                animationDelay: `${i * 30}ms`,
              }}
            />
          ))}
        </div>

        {/* CTA section */}
        <div className="mt-1 space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStart}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Start my day
          </Button>

          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border-border-strong text-accent-text accent-[var(--accent)]"
            />
            <span>Don&apos;t show again today</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;
