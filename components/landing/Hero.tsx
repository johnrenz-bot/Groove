'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { HeroStatsClient } from './HeroStats';

/**
 * The hero.
 *
 * SHAPE OF THE SECTION
 *   Two columns on desktop — text left (max 620px), portrait right — and a
 *   single stacked column below 900px. The text column is left-aligned rather
 *   than centred: the headline is long enough that centring it produces three
 *   ragged lines and a much weaker first impression.
 *
 * WHY THE IMAGE IS A FRAME, NOT A BACKGROUND
 *   The old hero painted `/image/bg/hero-theater.jpg` edge to edge under three
 *   stacked black gradients and a gold blur. That can only work on a black
 *   page — it is invisible-by-design in the light theme, and it forced the whole
 *   section to hard-code white type. Keeping the same asset inside a rounded,
 *   bordered frame means the page reads correctly in both themes, the headline
 *   is never competing with a photograph, and the asset is still on the page.
 */
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const trustPoints = ['Verified coaches', 'Studio locator', 'Digital contracts'];

interface HeroProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

export function Hero({ stats }: HeroProps) {
  return (
    <section className="ld-hero" aria-labelledby="hero-heading">
      <div className="ld-wrap">
        <div className="ld-hero-grid">
          {/* ── Copy ─────────────────────────────────────────────────── */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="ld-hero-text"
          >
            <p className="ld-badge shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span>Groove · Bulacan Performing Arts Hub</span>
            </p>

            <h1 id="hero-heading" className="ld-h1">
              Discover, connect, and{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-amber-500 to-orange-400">
                perform with Groove
              </span>
            </h1>

            <p className="ld-lead">
              The premier performing arts platform for San Jose del Monte and Bulacan. Find verified coaches, book
              rehearsals, sign digital agreements, and grow your craft — all in one unified ecosystem.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="#disciplines"
                className="ld-btn group shadow-md shadow-accent/20 transition-all duration-300 hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5"
              >
                <span>Explore disciplines</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/register/client"
                className="ld-btn2 ld-btn2--lg transition-all duration-300 hover:border-accent/50 hover:bg-muted"
              >
                Get started free
              </Link>
            </div>

            {/* Trust line: quiet, single row, checkmarks only — no second CTA. */}
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {trustPoints.map((point) => (
                <li key={point} className="ld-small inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Portrait ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
            className="ld-hero-art"
          >
            <Image
              src="/image/bg/hero-theater.jpg"
              alt="Performers on stage during a GroovePH rehearsal."
              fill
              priority
              sizes="(max-width: 900px) 100vw, 320px"
              className="object-cover"
            />
          </motion.div>
        </div>

        {/* Real platform numbers, fetched on the server and rendered by a small
            client component. Hidden entirely when the database is empty. */}
        <HeroStatsClient stats={stats} />
      </div>

      <div className="ld-fade" aria-hidden="true" />
    </section>
  );
}

export default Hero;