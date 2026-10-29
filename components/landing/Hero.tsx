'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { HeroStatsClient } from './HeroStats';

interface HeroProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

export function Hero({ stats }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // A restrained parallax. The photograph is scaled slightly in CSS so the
  // translated layer never exposes an edge at the top of the section.
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '8%']
  );
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0px', '0px'] : ['0px', '28px']
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.7],
    prefersReducedMotion ? [1, 1] : [1, 0]
  );

  return (
    <section
      ref={heroRef}
      className="ld-hero-cinematic relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* ── Cinematic Background Image ────────────────────────────────────── */}
      <motion.div className="ld-hero-media absolute inset-0 z-0" style={{ y: imageY }}>
        <Image
          src="/image/bg/hero-cinematic.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="ld-hero-media__img object-cover object-center"
        />
      </motion.div>

      {/* ── Layered Gradient Overlays for readability ──────────────────────── */}
      {/* Primary dark gradient — bottom up */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to top, rgba(6,6,8,0.97) 0%, rgba(6,6,8,0.75) 38%, rgba(6,6,8,0.35) 65%, rgba(6,6,8,0.12) 100%)',
        }}
      />
      {/* Left vignette for the text column */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to right, rgba(6,6,8,0.9) 0%, rgba(6,6,8,0.58) 42%, rgba(6,6,8,0.08) 72%, rgba(6,6,8,0) 88%)',
        }}
      />
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-32 z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to bottom, rgba(6,6,8,0.65) 0%, transparent 100%)',
        }}
      />

      {/* ── Filipino Textile Pattern Overlay ──────────────────────────────── */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        aria-hidden="true"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cg fill='none' stroke='%23F7F0E1' stroke-width='0.5'%3E%3Cpath d='M0 24h48M24 0v48M0 0l48 48M48 0L0 48M12 0v48M36 0v48M0 12h48M0 36h48'/%3E%3Crect x='20' y='20' width='8' height='8' stroke-opacity='0.7'/%3E%3Ccircle cx='24' cy='24' r='3' stroke-opacity='0.5'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 70% 100% at 75% 50%, transparent 30%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 100% at 75% 50%, transparent 30%, black 100%)',
        }}
      />

      {/* ── Parol-inspired corner accent ──────────────────────────────────── */}
      <div
        className="absolute top-0 right-0 z-[2] pointer-events-none"
        aria-hidden="true"
        style={{
          width: '280px',
          height: '280px',
          opacity: 0.08,
          background:
            'conic-gradient(from 0deg at 100% 0%, rgba(201,162,74,0.0) 0deg, rgba(201,162,74,0.6) 45deg, rgba(201,162,74,0.0) 90deg)',
        }}
      />

      {/* ── Hero Content ──────────────────────────────────────────────────── */}
      {/* The copy and the stats strip are siblings in a single flex column.
          The stats used to be absolutely pinned to the bottom of the section,
          which made them collide with the CTA and trust rows on short
          viewports. In normal flow they can only ever sit below the copy. */}
      <motion.div
        className="ld-hero-inner ld-wrap relative z-10"
        style={{ y: contentY, opacity }}
      >
        <div className="ld-hero-copy">
          {/* Eyebrow badge */}
          <motion.p
            className="ld-hero-badge"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            Groove · Bulacan Performing Arts Hub
          </motion.p>

          {/* Main headline */}
          <motion.h1
            id="hero-heading"
            className="ld-hero-h1"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Where Arts{' '}
            <span className="ld-hero-h1-accent">
              Find Their
              <br className="hidden sm:block" />
              {' '}Stage
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="ld-hero-lead"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            The premier performing arts platform for San Jose del Monte and Bulacan.
            Find verified coaches, book rehearsals, sign digital agreements, and grow
            your craft — all in one unified ecosystem.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="ld-hero-ctas"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/register/client" className="ld-hero-btn-primary group">
              <span>Get started free</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
            <Link href="#disciplines" className="ld-hero-btn-secondary">
              Explore disciplines
            </Link>
          </motion.div>

          {/* Trust points row */}
          <motion.div
            className="ld-hero-trust-row"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            {['Verified coaches', 'Studio locator', 'Digital contracts'].map((point, i) => (
              <motion.span
                key={point}
                className="ld-hero-trust"
                initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {point}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* ── Stats strip + scroll cue, both in normal flow ─────────────── */}
        <div className="ld-hero-baseline">
          <HeroStatsClient stats={stats} />

          <motion.div
            className="ld-hero-scroll"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            aria-hidden="true"
          >
            <span className="ld-hero-scroll__label">Scroll</span>
            <motion.span
              className="ld-hero-scroll__line"
              animate={
                prefersReducedMotion
                  ? undefined
                  : { scaleY: [1, 0.4, 1], opacity: [0.4, 0.8, 0.4] }
              }
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="ld-hero-scroll__chevron" />
            </motion.span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Bottom fade into next section ─────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 z-[3] pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--background))',
        }}
      />
    </section>
  );
}

export default Hero;
