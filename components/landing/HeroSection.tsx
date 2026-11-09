'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, CalendarDays, MessageSquare, Sparkles } from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';

const FLOATING_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Verified coaches',
    description: 'Document-checked profiles',
    position: 'top-0 left-0 w-64',
    floatDuration: 4.5,
    floatDelay: 0,
  },
  {
    icon: CalendarDays,
    title: 'Book a session',
    description: 'Schedule + agreement',
    position: 'top-24 right-0 w-60',
    floatDuration: 5.2,
    floatDelay: 1.4,
  },
  {
    icon: MessageSquare,
    title: 'Direct messaging',
    description: 'Discuss before you book',
    position: 'bottom-0 left-8 w-64',
    floatDuration: 4.8,
    floatDelay: 0.7,
  },
];

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[740px] lg:min-h-[820px] overflow-hidden flex items-center">
      {/* Background Theater Image */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/Hero-landing/hero-theater.jpg"
          alt="Groove Theater Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark Left-to-Right and Bottom Gradient Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/95 via-[#0a0a0a]/80 to-[#0a0a0a]/45"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-col justify-center px-6 pb-24 pt-28 sm:px-8 lg:px-10 lg:pb-32 lg:pt-32">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8B84B]/30 bg-black/60 px-3.5 py-1.5 text-xs text-white/80 backdrop-blur-xl shadow-[0_0_20px_rgba(232,184,75,0.12)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8B84B]/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8B84B]" />
              </span>
              Performing arts platform · Bulacan
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-bold leading-[1.05] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.75rem, 6vw, 4.75rem)' }}
          >
            A performing arts home for{' '}
            <span className="bg-gradient-to-r from-[#E8B84B] to-[#f4be4d] bg-clip-text text-transparent">
              San Jose del Monte.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
          >
            GroovePH connects performers with verified coaches, rehearsal studios and digital session agreements — one calm place for the whole craft.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/register/client">
              <GradientButton className="px-6 py-3.5">
                Get started free <ArrowRight className="h-4 w-4" />
              </GradientButton>
            </Link>
            <Link href="#disciplines">
              <OutlineButton className="px-6 py-3.5">Explore disciplines</OutlineButton>
            </Link>
          </motion.div>
        </div>

        {/* Floating Glassmorphism Cards with Gold Borders and Hover Effects */}
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative h-[420px] w-[370px]">
            {FLOATING_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 40, y: 10 }}
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1, x: 0 }
                      : {
                          opacity: 1,
                          x: 0,
                          y: [0, -9, 0],
                        }
                  }
                  transition={{
                    opacity: { duration: 0.8, delay: 0.3 + idx * 0.18, ease: [0.16, 1, 0.3, 1] },
                    x: { duration: 0.8, delay: 0.3 + idx * 0.18, ease: [0.16, 1, 0.3, 1] },
                    y: {
                      duration: card.floatDuration,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: card.floatDelay,
                    },
                  }}
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scale: 1.03,
                          boxShadow: '0 16px 40px rgba(232, 184, 75, 0.25)',
                          borderColor: 'rgba(232, 184, 75, 0.7)',
                        }
                  }
                  className={`absolute ${card.position} cursor-default rounded-[24px] border border-[#E8B84B]/30 bg-black/55 p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(232,184,75,0.12)] transition-colors duration-200`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#E8B84B]/35 bg-[#E8B84B]/10 text-[#E8B84B] shadow-[0_0_15px_rgba(232,184,75,0.2)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white tracking-wide">{card.title}</p>
                      <p className="text-xs text-white/60">{card.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

