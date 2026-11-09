'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Sparkles, Music, Film, Drama } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { EqualizerBars } from './GrooveSpinner';
import { GoldParticles } from './GoldParticles';
import { GROOVE_LOADING_MESSAGES } from './messages';

export interface LoadingScreenProps {
  /** Controlled mode: false fades out. Omit for timed splash behaviour. */
  isLoading?: boolean;
  /** Timed splash duration in ms (default 400 for back-compat). */
  minDuration?: number;
  /** Hard ceiling so a stuck loader can never trap the user. */
  maxDuration?: number;
  message?: string;
  messages?: string[];
  /** Determinate 0–100 fill. Omit to simulate toward 90%. */
  progress?: number | null;
  onFinish?: () => void;
  className?: string;
  fullScreen?: boolean;
  showParticles?: boolean;
}

const DISCIPLINES = [
  { label: 'Dance', icon: Sparkles },
  { label: 'Vocal', icon: Music },
  { label: 'Acting', icon: Film },
  { label: 'Theater', icon: Drama },
];

/** Ease toward a target so the bar feels fluid, not stepped. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Cinematic splash. Entrance motion is pure CSS (`g-loader-enter`, delays
 * inline) so server HTML and the first client render are byte-identical —
 * no framer-motion SSR hydration drift. The rotating message re-keys a
 * CSS fade instead of AnimatePresence for the same reason.
 */
export function LoadingScreen({
  isLoading,
  minDuration = 400,
  maxDuration = 8000,
  message,
  messages = [...GROOVE_LOADING_MESSAGES],
  progress = null,
  onFinish,
  className = '',
  fullScreen = true,
  showParticles = true,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [simProgress, setSimProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [reduce, setReduce] = useState(false);
  // Client-only after mount: server paints the empty stage, hydration
  // matches it, then the full cinematic content swaps in as an update.
  // This eliminates SSR/hydration drift from animated inline styles.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ---- simulated progress (determinate only when explicitly passed) ----
  useEffect(() => {
    if (progress !== null) {
      setSimProgress(Math.min(100, Math.max(0, progress)));
      return;
    }
    if (startedAt.current === null) startedAt.current = Date.now();
    const span = Math.max(900, Math.min(minDuration || 1600, 2600));
    const t0 = startedAt.current;
    if (reduce) {
      setSimProgress(92);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - t0;
      const t = Math.min(1, elapsed / span);
      // Hold at 92% until the caller signals completion.
      setSimProgress(Math.round(easeOutCubic(t) * 92));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [progress, minDuration, reduce]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setSimProgress(100);
    window.setTimeout(() => {
      setFading(true);
      window.setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 420);
    }, 180);
  }, [onFinish]);

  // ---- timed / controlled completion with a hard safety net ----
  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
    let t: number | undefined;

    if (isLoading === false) {
      t = window.setTimeout(finish, 0);
    } else if (isLoading === undefined && minDuration > 0) {
      t = window.setTimeout(finish, minDuration);
    }
    // Never stuck: even if the caller forgets to flip `isLoading`,
    // the splash lifts after maxDuration.
    const safety = window.setTimeout(finish, maxDuration);

    return () => {
      if (t !== undefined) window.clearTimeout(t);
      window.clearTimeout(safety);
    };
  }, [isLoading, minDuration, maxDuration, finish]);

  // ---- rotating messages (fixed line-height so nothing shifts) ----
  useEffect(() => {
    if (!visible || message || messages.length <= 1 || reduce) return;
    const id = window.setInterval(
      () => setMsgIndex((p) => (p + 1) % messages.length),
      2000
    );
    return () => window.clearInterval(id);
  }, [visible, message, messages.length, reduce]);

  // ---- cursor-responsive ambient glow (fine pointers only) ----
  useEffect(() => {
    if (reduce || !fullScreen) return;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let queued = 0;
    const onMove = (e: PointerEvent) => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        const el = glowRef.current;
        if (!el) return;
        el.style.transform = `translate(${e.clientX - 260}px, ${e.clientY - 260}px)`;
        el.style.opacity = '1';
      });
    };
    const onLeave = () => {
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (queued) cancelAnimationFrame(queued);
    };
  }, [reduce, fullScreen]);

  if (!visible) return null;

  const displayMessage = message ?? messages[msgIndex % messages.length];
  const fill = progress !== null ? Math.min(100, Math.max(0, progress)) : simProgress;

  if (!ready) {
    // Identical on server and first client render: empty stage in the
    // theme's page colour (black in dark, cream in light).
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading Groove Performing Arts Platform"
        className={cn(
          fullScreen
            ? 'fixed inset-0 z-[1400] bg-background'
            : 'min-h-[50vh] w-full bg-transparent',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Groove Performing Arts Platform"
      aria-busy={!fading}
      className={cn(
        'select-none overflow-hidden',
        fullScreen
          ? 'fixed inset-0 z-[1400] flex flex-col items-center justify-center bg-background text-foreground'
          : 'flex w-full flex-col items-center justify-center py-16 text-foreground',
        fading ? 'pointer-events-none opacity-0' : 'opacity-100',
        'transition-opacity duration-500 ease-out',
        className
      )}
      style={
        fullScreen
          ? {
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,196,81,0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 12% 108%, rgba(174,49,58,0.06) 0%, transparent 55%), var(--background)',
            }
          : { background: 'transparent' }
      }
    >
      {/* Aurora washes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="g-aurora absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full motion-reduce:animate-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(245,196,81,0.13) 0%, rgba(245,196,81,0.04) 45%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="g-aurora-delayed absolute bottom-[-180px] left-[8%] h-[380px] w-[520px] rounded-full motion-reduce:animate-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(201,162,74,0.08) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }}
        />
        {/* light trails — two hairlines that sweep across the stage */}
        <div className="absolute left-0 right-0 top-[18%] h-px overflow-hidden opacity-30">
          <div className="g-trail h-full w-1/3 bg-gradient-to-r from-transparent via-[#F5C451]/60 to-transparent" />
        </div>
        <div className="absolute bottom-[22%] left-0 right-0 h-px overflow-hidden opacity-20">
          <div className="g-trail-reverse h-full w-1/3 bg-gradient-to-r from-transparent via-[#F5C451]/50 to-transparent" />
        </div>
        {/* vignette — generous in dark, a soft cream depth in light */}
        <div className="g-loader-vignette absolute inset-0" />
        {/* cursor glow (desktop only, throttled by RAF) */}
        <div
          ref={glowRef}
          className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full opacity-0 transition-opacity duration-700 ease-out"
          style={{
            background:
              'radial-gradient(circle, rgba(245,196,81,0.09) 0%, transparent 60%)',
            filter: 'blur(30px)',
            willChange: 'transform',
          }}
        />
      </div>

      {showParticles ? <GoldParticles count={14} /> : null}

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-5 px-6 text-center">
        {/* Eyebrow */}
        <div
          className="g-loader-enter inline-flex items-center gap-2 rounded-full border border-[rgba(245,196,81,0.28)] bg-card/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5C451] backdrop-blur-md"
          style={{ boxShadow: '0 0 24px rgba(245,196,81,0.12)', animationDelay: '0ms' }}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5C451]/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F5C451]" />
          </span>
          Performing Arts Platform
        </div>

        {/* Logo medallion with orbiting ring */}
        <div className="g-loader-enter group relative" style={{ animationDelay: '90ms' }}>
          <div
            aria-hidden="true"
            className="g-orbit-slow absolute -inset-3 rounded-full motion-reduce:animate-none"
            style={{
              border: '1px dashed rgba(245,196,81,0.35)',
            }}
          />
          <div
            aria-hidden="true"
            className="g-orbit absolute -inset-3 rounded-full motion-reduce:animate-none"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(245,196,81,0.5) 60deg, transparent 120deg, transparent 360deg)',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1px), black calc(100% - 1px))',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 1px), black calc(100% - 1px))',
              animationDuration: '14s',
            }}
          />
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[rgba(245,196,81,0.3)] bg-card/80 shadow-[0_0_60px_rgba(245,196,81,0.18)] backdrop-blur-md transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none sm:h-32 sm:w-32">
            <Image
              src="/image/Logo/GroovePH-Logo.png"
              alt="GroovePH"
              width={128}
              height={128}
              priority
              className="h-full w-full object-cover"
              style={{ filter: 'saturate(1.05)' }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 35%)',
              }}
            />
          </div>
        </div>

        {/* Wordmark */}
        <div className="g-loader-enter space-y-1.5" style={{ animationDelay: '180ms' }}>
          <p className="font-display text-4xl leading-none tracking-[0.08em] text-foreground sm:text-5xl">
            GROOVE
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Where talent takes the stage
          </p>
        </div>

        {/* Disciplines */}
        <div className="g-loader-enter flex flex-wrap items-center justify-center gap-1.5" style={{ animationDelay: '260ms' }}>
          {DISCIPLINES.map((d, i) => {
            const Icon = d.icon;
            return (
              <span
                key={d.label}
                className="g-loader-enter inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm"
                style={{ animationDelay: `${280 + i * 60}ms` }}
              >
                <Icon className="h-3 w-3 text-[#F5C451]" aria-hidden="true" />
                {d.label}
              </span>
            );
          })}
        </div>

        {/* Visualizer */}
        <div className="g-loader-enter" style={{ animationDelay: '360ms' }}>
          <EqualizerBars bars={26} height={30} />
        </div>

        {/* Progress */}
        <div className="g-loader-enter w-full max-w-[280px] space-y-2.5" style={{ animationDelay: '420ms' }}>
          <div
            className="relative h-[6px] w-full overflow-hidden rounded-full border border-border bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fill}
            aria-label="Loading progress"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${fill}%`,
                background:
                  'linear-gradient(90deg, #C9A24C 0%, #F5C451 55%, #FFD36B 100%)',
                boxShadow: '0 0 16px rgba(245,196,81,0.55)',
                transition: 'width 280ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
            {/* travelling sheen */}
            <div
              aria-hidden="true"
              className="g-progress-sheen absolute inset-y-0 w-1/3 motion-reduce:animate-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.08em]">
            <span className="tabular-nums text-[#F5C451]">{fill}%</span>
            <span className="uppercase text-subtle-foreground">Groove is tuning up</span>
          </div>
        </div>

        {/* Message — keyed CSS fade so server/client agree. Fixed height
            so rotating lines never shift the bar or footer. */}
        <div className="flex h-6 items-center justify-center">
          <p
            key={displayMessage}
            className="g-message-fade text-[13px] font-medium tracking-[0.02em] text-foreground/75"
          >
            {displayMessage}
          </p>
        </div>
      </div>

      {/* Footer hint */}
      <p className="g-loader-enter absolute bottom-6 left-0 right-0 z-10 text-center text-[11px] tracking-[0.18em] text-subtle-foreground" style={{ animationDelay: '520ms' }}>
        SAN JOSE DEL MONTE · BULACAN
      </p>
    </div>
  );
}

export default LoadingScreen;
