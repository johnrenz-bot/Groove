'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles, Calendar, Users, TrendingUp, Search, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_CARD_CLASS,
  MODAL_CHIP_CLASS,
  MODAL_ICON_TILE_CLASS,
  MODAL_OVERLAY_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { useSession } from '@/components/header/SessionProvider';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
}: WelcomeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [displayName, setDisplayName] = useState(propUsername || '');
  const { status, profile } = useSession();
  const { t } = useLanguage();

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
          .select('firstname')
          .eq('id', authUser.id)
          .maybeSingle();
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

    if (status !== 'authenticated') {
      setInternalOpen(false);
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
  }, [controlledIsOpen, status]);

  const effectiveRole: 'client' | 'coach' | 'admin' =
    profile?.role === 'coach' || profile?.role === 'admin' ? profile.role : role;

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

  const handleAskAi = (prompt?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('groovey:open', { detail: { prompt } }));
    }
  };

  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const { backdropProps } = useModalDismiss({ open: isVisible, onClose: handleClose });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    cardRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [isVisible]);

  if (!isVisible) return null;

  const resolvedName =
    profile?.firstname ||
    displayName ||
    propUsername ||
    (effectiveRole === 'coach' ? 'Coach' : 'Artist');

  const isCoach = effectiveRole === 'coach';

  const clientSteps = [
    { icon: Search, title: t('showcase.stepDiscoverTitle', 'Discover'), body: t('showcase.stepDiscoverBody', 'Browse verified coaches for dance, vocals, acting, and theater in San Jose del Monte, Bulacan.') },
    { icon: Calendar, title: t('showcase.stepBookTitle', 'Book'), body: t('showcase.stepBookBody', 'Pick a schedule and book a rehearsal or class.') },
    { icon: Users, title: t('showcase.stepConnectTitle', 'Connect'), body: t('showcase.stepConnectBody', 'Join the Community Showcase, share clips, and climb the Tambayan Leaderboard.') },
    { icon: TrendingUp, title: t('showcase.stepGrowTitle', 'Grow'), body: t('showcase.stepGrowBody', 'Track your sessions and progress.') },
  ];

  const coachSteps = [
    { icon: CheckCircle2, title: t('welcome.coachStep1Title', 'Set up profile'), body: t('welcome.coachStep1Body', 'Complete your coach profile and showcase your specialties.') },
    { icon: Clock, title: t('welcome.coachStep2Title', 'Open schedule'), body: t('welcome.coachStep2Body', 'Set your availability so students can book rehearsals.') },
    { icon: Calendar, title: t('welcome.coachStep3Title', 'Accept bookings'), body: t('welcome.coachStep3Body', 'Review and confirm student booking requests.') },
    { icon: Users, title: t('welcome.coachStep4Title', 'Grow your students'), body: t('welcome.coachStep4Body', 'Track sessions and help performers level up.') },
  ];

  const steps = isCoach ? coachSteps : clientSteps;

  const chips = [
    t('welcome.chip1', 'Find me a dance coach'),
    t('welcome.chip2', 'How do I book?'),
    t('welcome.chip3', 'Tips for my first rehearsal'),
  ];

  return (
    <div
      className={MODAL_OVERLAY_CLASS}
      {...backdropProps}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wm-title"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-3xl select-text flex-col overflow-y-auto rounded-t-3xl border border-accent-border bg-card shadow-[0_0_60px_-12px_var(--accent-soft)] focus:outline-none sm:w-[94vw] sm:rounded-3xl motion-reduce:animate-none animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalCloseButton
          onClose={handleClose}
          label="Close welcome modal"
          className="absolute right-4 top-4 z-10"
        />

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Hero panel */}
          <div className="relative overflow-hidden bg-gradient-to-br from-accent-soft via-card to-card px-6 py-8 sm:px-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'conic-gradient(from 0deg at 50% 50%, transparent 0deg, var(--accent-soft) 20deg, transparent 40deg, transparent 360deg)',
              }}
            />
            <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
              <Image
                src="/image/Logo/welcome-Logo.png"
                alt="Groove"
                width={180}
                height={112}
                className="object-contain"
                preload
              />
              <div className="mt-6 space-y-2">
                <p className="text-sm font-bold text-accent-text">
                  {t('welcome.maligayang', 'Maligayang pagdating sa GroovePH!')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('welcome.englishLine', 'Welcome to GroovePH')}
                </p>
                <p className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                  {t('welcome.welcomeBack', 'Welcome back, {name}', { name: resolvedName })}
                </p>
                <p className="text-xs italic text-accent-text">
                  {t('welcome.tagline', 'Para sa sining, para sa Pilipino.')}
                </p>
              </div>

              <div
                aria-hidden="true"
                className="mt-6 flex items-end justify-center gap-1 md:justify-start"
                style={{ height: '32px' }}
              >
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="motion-reduce:animate-none"
                    style={{
                      display: 'inline-block',
                      width: '4px',
                      height: `${10 + Math.round(Math.sin(i * 0.7) * 8 + 8)}px`,
                      borderRadius: '2px',
                      backgroundColor: 'var(--accent-text)',
                      animation: `wm-eq-rise 1.2s ease-in-out infinite`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content panel */}
          <div className="space-y-6 px-6 py-8 sm:px-8">
            <div>
              <h2 id="wm-title" className="text-base font-semibold text-foreground sm:text-lg">
                {t('welcome.howItWorks', 'How GroovePH works')}
              </h2>
              <div className="mt-4 space-y-3">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <span className={MODAL_ICON_TILE_CLASS}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{step.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI card */}
            <div className={MODAL_CARD_CLASS}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('welcome.aiTitle', 'Grooveyy AI')}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('welcome.aiBody', 'Ask Grooveyy AI for dance tips, schedules, or help getting started.')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAskAi(chip)}
                    className={MODAL_CHIP_CLASS}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => handleAskAi()}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t('welcome.askAi', 'Ask Grooveyy AI')}
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStart}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t('welcome.startMyDay', 'Start my day')}
              </Button>

              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-border-strong text-accent-text accent-[var(--accent)]"
                />
                <span>{t('welcome.dontShow', "Don't show again today")}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;
