'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Shield, FileText, ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { useScrollReveal } from '@/components/shared/useScrollReveal';
import { HeroStatsClient } from './HeroStats';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
};

const featureCards = [
  {
    icon: Calendar,
    title: 'Book rehearsals',
    description: 'Schedule sessions with coaches and studios.',
  },
  {
    icon: Shield,
    title: 'Verified coaches',
    description: 'Coaches are reviewed before they appear on Groove.',
  },
  {
    icon: FileText,
    title: 'Digital contracts',
    description: 'Agree on terms and sign online.',
  },
];

interface HeroProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

export function Hero({ stats }: HeroProps) {
  const [mounted, setMounted] = useState(false);
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section ref={ref} className="relative isolate overflow-hidden min-h-screen" aria-hidden="true">
        <div className="absolute inset-0 -z-10 bg-black" />
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className={cn(
        'relative isolate overflow-hidden min-h-screen',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/image/bg/hero-theater.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
        {/* Gradient overlay: black/80 -> black/50 -> black */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
        {/* Subtle side gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/40" />
        {/* Soft gold radial glow */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/3 h-72 w-[42rem] max-w-none -translate-x-1/2 rounded-full bg-[#C9A24A]/10 blur-[120px]"
        />
      </div>

      {/* Content */}
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-start justify-center px-5 py-28 sm:px-8 lg:px-12 lg:py-32">
        {/* Badge */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-8"
        >
          <span className="gl-dot relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
            <motion.span
              className="absolute inset-0 rounded-full bg-[#C9A24A] opacity-75"
              animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#C9A24A]" aria-hidden="true" />
          Groove · Performing Arts Platform
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp}
          transition={{ delay: 0.2 }}
          className="max-w-3xl text-balance text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Discover, connect, and{' '}
          <span className="bg-gradient-to-r from-[#C9A24A] to-[#F5B52E] bg-clip-text text-transparent">
            perform with Groove
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp}
          transition={{ delay: 0.3 }}
          className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg lg:text-xl"
        >
          The performing arts platform for San Jose del Monte.
          Find coaches, book rehearsals, sign contracts, and grow your craft — all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-start gap-4"
        >
          <Link href="#disciplines" className="gl-btn-gold inline-flex items-center gap-2 rounded-full bg-[#C9A24A] px-8 py-4 text-base font-semibold text-black transition-all hover:bg-[#F5B52E] hover:shadow-[0_0_30px_rgba(201,162,74,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24A] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
            Explore disciplines
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
          <Button
            size="lg"
            variant="ghost"
            className="rounded-full border border-white/20 bg-transparent px-8 py-4 text-base font-semibold text-white backdrop-blur-md hover:border-[#C9A24A]/50 hover:bg-white/[0.07] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24A] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            trailingIcon={<ArrowRight className="h-5 w-5" />}
          >
            Get started free
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.5 }}
          className="mt-14 flex flex-wrap items-center justify-start gap-8 text-sm font-medium text-white/60"
        >
          <span className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A24A]/10 text-[#C9A24A]">
              <span className="relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-[#C9A24A] animate-ping opacity-75" />
              </span>
            </span>
            Verified coaches
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A24A]/10 text-[#C9A24A]">
              <span className="relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-[#C9A24A] animate-ping opacity-75" />
              </span>
            </span>
            Studio locator
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A24A]/10 text-[#C9A24A]">
              <span className="relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-[#C9A24A] animate-ping opacity-75" />
              </span>
            </span>
            Digital contracts
          </span>
        </motion.div>

        {/* Feature cards - desktop only, below CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.6 }}
          className="mt-14 hidden lg:grid lg:grid-cols-3 gap-4 max-w-2xl"
        >
          {featureCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              className={cn(
                'relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm',
                'transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(201,162,74,0.15)]'
              )}
              style={{
                animation: 'float 3s ease-in-out infinite',
                animationDelay: `${i * 0.5}s`,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A24A]/10 text-[#C9A24A]">
                  <card.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{card.title}</p>
                  <p className="text-sm text-white/60">{card.description}</p>
                </div>
              </div>
              <style jsx global>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .float { animation: none !important; }
                }
              `}</style>
            </motion.div>
          ))}
        </motion.div>

        {/* Real Stats Strip - rendered by client component with server-fetched data */}
        <HeroStatsClient stats={stats} />

        {/* Scroll indicator */}
        <motion.a
          href="#disciplines"
          aria-label="Scroll to disciplines"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 transition-colors hover:text-[#C9A24A]"
        >
          <ArrowDown className="h-6 w-6 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </motion.a>
      </div>
    </section>
  );
}

export default Hero;