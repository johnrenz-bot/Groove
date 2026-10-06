'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
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

  if (!isVisible) return null;

  const resolvedName = displayName || propUsername || (role === 'coach' ? 'Coach' : 'Artist');

  const defaultSubtext =
    role === 'coach'
      ? 'Ready to continue mentoring your students today?'
      : 'Ready to find your next coach and continue your Groove journey?';

  const defaultQuote =
    role === 'coach'
      ? 'To teach is to touch a life forever. Inspire greatness today.'
      : 'Every great performance begins with the courage to take the first step.';

  const subtext = propSubtext || defaultSubtext;
  const quote = propQuote || defaultQuote;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md select-none animate-in fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md space-y-6 overflow-hidden rounded-3xl border border-border bg-card p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft shadow-inner">
            <Image
              src="/image/wc/logo.png"
              alt="Groove"
              width={44}
              height={44}
              className="h-11 w-auto object-contain"
              priority
            />
          </div>
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
            Welcome back,{' '}
            <span className="text-accent-text">{resolvedName}</span>
          </h2>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">{subtext}</p>
        </div>

        {quote && (
          <div className="pt-1">
            <div className="mx-auto mb-3 h-px w-16 bg-divider" />
            <p className="px-4 text-xs italic text-accent-text">{quote}</p>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <Button size="lg" className="w-full" onClick={handleStart}>
            Start my day
            <ArrowRight className="h-4 w-4" />
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