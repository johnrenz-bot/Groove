'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Award, Sparkles, X, CheckCircle2, Share2, Download } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  badgeType: 'Groove Coach' | 'Groove Active';
  badgeDescription: string | null;
  tasks: Array<{ title: string; description: string }>;
  unlockedAt: string;
  onShare?: () => void;
  onDownload?: () => void;
}

/**
 * Celebration modal shown when a badge is unlocked.
 * Features custom badge design with Groove PH branding.
 * Custom styling ONLY within this component.
 */
export function AchievementModal({
  open,
  onClose,
  badgeType,
  badgeDescription,
  tasks,
  unlockedAt,
  onShare,
  onDownload,
}: AchievementModalProps) {
  const [animate, setAnimate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);
  const isCoach = badgeType === 'Groove Coach';

  const badgeGradient = isCoach
    ? 'from-amber-500 via-yellow-400 to-amber-600'
    : 'from-emerald-500 via-teal-400 to-emerald-600';

  const badgeGlow = isCoach
    ? 'rgba(232, 169, 59, 0.6)'
    : 'rgba(47, 185, 138, 0.6)';

  // Trigger animation on open
  useEffect(() => {
    if (!open) {
      // Use setTimeout to avoid react-hooks/set-state-in-effect
      const timer = window.setTimeout(() => {
        setAnimate(false);
        setShowConfetti(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // Use setTimeout to avoid react-hooks/set-state-in-effect
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setShowConfetti(false);
      requestAnimationFrame(() => {
        setAnimate(true);
        window.setTimeout(() => setShowConfetti(true), 300);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Auto-close after 10 seconds (optional)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, 15000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  // Confetti particles
  const confettiParticles = showConfetti
    ? Array.from({ length: 30 }, (_, i) => (
        <ConfettiParticle key={i} index={i} color={isCoach ? 'gold' : 'emerald'} />
      ))
    : null;

  const formattedDate = new Date(unlockedAt).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showClose={false}
      className="overflow-visible"
    >
      {/* Confetti layer */}
      <div
        ref={confettiRef}
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        aria-hidden="true"
      >
        {confettiParticles}
      </div>

      <div className="relative z-20 flex flex-col items-center text-center">
        {/* Badge reveal animation */}
        <div
          className={cn(
            'relative flex flex-col items-center gap-4',
            animate ? 'animate-in fade-in zoom-in-95 duration-700 ease-out-expo' : 'opacity-0 scale-95'
          )}
        >
          {/* Glowing background ring */}
          <div
            className={cn(
              'absolute -inset-4 rounded-3xl blur-2xl opacity-0 transition-opacity duration-700',
              animate && 'opacity-100'
            )}
            style={{ background: `radial-gradient(circle at center, ${badgeGlow} 0%, transparent 70%)` }}
            aria-hidden="true"
          />

          {/* Main badge */}
          <div
            className={cn(
              'relative flex h-40 w-40 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
              badgeGradient,
              'shadow-2xl',
              animate ? 'animate-in fade-in bounce-in duration-800 delay-200' : 'opacity-0 scale-50'
            )}
            style={{ boxShadow: `0 0 60px ${badgeGlow}, 0 20px 40px -12px ${badgeGlow}` }}
          >
            {/* Rotating sparkles */}
            <div className="absolute inset-0 animate-spin-slow" aria-hidden="true">
              <Sparkles className="absolute top-2 left-2 h-6 w-6 text-white/80" />
              <Sparkles className="absolute top-2 right-2 h-5 w-5 text-white/60" style={{ animationDelay: '1s' }} />
              <Sparkles className="absolute bottom-2 left-2 h-5 w-5 text-white/60" style={{ animationDelay: '2s' }} />
              <Sparkles className="absolute bottom-2 right-2 h-6 w-6 text-white/80" style={{ animationDelay: '1.5s' }} />
            </div>

            <Award className="h-20 w-20 text-white drop-shadow-2xl relative z-10" aria-hidden="true" />

            {/* Check mark */}
            <CheckCircle2
              className={cn(
                'absolute -bottom-2 -right-2 h-8 w-8 text-success drop-shadow-lg',
                animate && 'animate-in fade-in zoom-in-95 duration-500 delay-600'
              )}
              aria-hidden="true"
            />
          </div>

          {/* Badge name */}
          <div className={cn('flex flex-col items-center gap-1', animate && 'animate-in fade-in slide-up duration-500 delay-400')}>
            <span className="g-eyebrow text-accent-text">Achievement Unlocked</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{badgeType}</h2>
          </div>
        </div>

        {/* Description */}
        <div className={cn('mt-6 max-w-lg', animate && 'animate-in fade-in duration-500 delay-600')}>
          <p className="text-base leading-relaxed text-muted-foreground">
            {badgeDescription || `Congratulations! You've earned the ${badgeType} badge by completing all required tasks.`}
          </p>
          <p className="mt-2 text-sm text-subtle-foreground">
            Unlocked on {formattedDate}
          </p>
        </div>

        {/* Completed tasks summary */}
        <div className={cn('mt-8 w-full max-w-lg', animate && 'animate-in fade-in slide-up duration-500 delay-800')}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-subtle-foreground">Completed Tasks</h3>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 rounded-xl bg-card p-3 border border-border',
                  animate && 'animate-in fade-in slide-up duration-400'
                )}
                style={{ animationDelay: `${900 + index * 100}ms` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={cn('mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg', animate && 'animate-in fade-in slide-up duration-500 delay-1000')}>
          <Button
            variant="secondary"
            size="lg"
            icon={<Share2 className="h-4 w-4" />}
            onClick={onShare}
            className="w-full sm:w-auto"
          >
            Share Achievement
          </Button>
          <Button
            variant="outline"
            size="lg"
            icon={<Download className="h-4 w-4" />}
            onClick={onDownload}
            className="w-full sm:w-auto"
          >
            Save Badge
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Continue
            <X className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Custom styles for this modal only */}
      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
        .slide-up { animation-name: slide-up; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Modal>
  );
}

/* Confetti particle component */
function ConfettiParticle({ index, color }: { index: number; color: 'gold' | 'emerald' }) {
  const colors = {
    gold: ['#e8a93b', '#f2b858', '#fde68a', '#fff3cd', '#fbbf24'],
    emerald: ['#2fb98a', '#43c99b', '#6ee7b7', '#a7f3d0', '#34d399'],
  };
  const particleColor = colors[color][index % colors[color].length];
  const size = 6 + (index % 3) * 4;
  const left = 10 + (index % 10) * 8;
  const delay = (index % 5) * 150;
  const duration = 800 + (index % 3) * 400;

  return (
    <div
      className="absolute top-0"
      style={{
        left: `${left}%`,
        width: size,
        height: size,
        backgroundColor: particleColor,
        borderRadius: index % 2 === 0 ? '50%' : '0',
        transform: 'rotate(45deg)',
        animation: `confetti-fall ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms forwards`,
        opacity: 0,
      }}
      aria-hidden="true"
    />
  );
}

export default AchievementModal;