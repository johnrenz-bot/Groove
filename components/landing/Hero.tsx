'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { HeroStatsClient } from './HeroStats';
import { motion, useReducedMotion } from 'framer-motion';

interface HeroProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

export function Hero({ stats }: HeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="ld-hero relative flex min-h-[60vh] flex-col items-center justify-center"
      aria-labelledby="hero-heading"
    >
      {/* Cinematic background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/image/bg/hero-cinematic.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(to top, rgba(17,17,16,0.92) 0%, rgba(17,17,16,0.6) 40%, rgba(17,17,16,0.2) 70%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1240px] px-5 text-center sm:px-8">
        {/* Eyebrow */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft/30 px-4 py-1.5 text-xs font-semibold text-accent-text">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Performing Arts Platform
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          id="hero-heading"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-4xl font-serif font-bold leading-tight text-foreground sm:text-5xl lg:text-[3rem]"
        >
          A performing arts home for San Jose del Monte.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 max-w-[62ch] text-lg text-muted-foreground sm:mx-auto"
        >
          GroovePH is a web-based performing arts hub for San Jose del Monte, Bulacan —
          a shared place to find verified coaches, book sessions, and keep the details
          of an agreement together.
        </motion.p>

        {/* Trust badges */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-6 flex flex-wrap justify-center gap-2.5 text-sm"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            San Jose del Monte, Bulacan
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Verified coach directory
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Bookings &amp; agreements
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/register/client"
            className="inline-flex h-[42px] items-center gap-2 rounded-[8px] bg-accent px-6 text-base font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Get started free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#disciplines"
            className="inline-flex h-[42px] items-center gap-2 rounded-[8px] border border-border bg-card px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Browse disciplines
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" aria-hidden="true" />
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroStatsClient stats={stats} />
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12"
        >
          <div className="animate-bounce">
            <ChevronDown className="h-6 w-6 text-accent-text" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Icons for trust badges
function MapPin(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Shield(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-5-4-5-11V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a5 5 0 0 0 5 5z" />
    </svg>
  );
}

function Calendar(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default Hero;