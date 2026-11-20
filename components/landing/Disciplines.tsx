'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Disciplines — the editorial gallery.
 *
 * Asymmetric 12-column composition: one tall feature frame (Dance), two
 * stacked frames (Vocal Performance, Acting), and a wide cinematic banner
 * (Theater). Real photography from the repository — never placeholders —
 * under dark gradient scrims so copy stays legible.
 */
const DISCIPLINES = [
  {
    id: '01',
    title: 'Dance & Choreography',
    tagline: 'Hip-Hop to Ballet',
    genres: ['Hip-Hop', 'Contemporary', 'Ballet', 'K-Pop', 'Folk'],
    href: '/community/performing-arts/dance',
    image: '/images/community/dance/hero-dance.jpg',
    alt: 'Dancers performing on stage under theatrical lighting',
    layout: 'feature' as const,
  },
  {
    id: '02',
    title: 'Vocal Performance',
    tagline: 'Pop to Musical Theater',
    genres: ['Pop', 'R&B', 'Classical', 'Musical Theater'],
    href: '/community/performing-arts/singing',
    image: '/singing-updates/world-choir-games-2026.jpg',
    alt: 'Choir and vocal ensemble performing on stage',
    layout: 'tile' as const,
  },
  {
    id: '03',
    title: 'Acting & Stage Craft',
    tagline: 'Method to Screen Presence',
    genres: ['Method Acting', 'Improv', 'Audition Prep'],
    href: '/community/performing-arts/acting',
    image: '/acting-updates/dulaang-up-auditions.jpg',
    alt: 'Actors auditioning on stage',
    layout: 'tile' as const,
  },
  {
    id: '04',
    title: 'Theater & Production',
    tagline: 'Stagecraft & Direction',
    genres: ['Musical Theater', 'Directing', 'Production Design'],
    href: '/community/performing-arts/theater',
    image: '/theater-updates/vlf-21-festival-announcement.jpg',
    alt: 'Theater festival stage with ensemble production',
    layout: 'banner' as const,
  },
];

export function Disciplines() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="disciplines" className="relative mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8 lg:px-10 lg:py-28">
      <SectionHeading
        eyebrow="Disciplines"
        title="Every performing art has a home here."
        description="From street dance to classical ballet, vocal coaching to full theatrical staging — four core disciplines, dozens of genres, one platform."
        align="left"
      />

      {/* Asymmetric editorial gallery */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
        {DISCIPLINES.map((d, idx) => {
          const span =
            d.layout === 'feature'
              ? 'sm:col-span-2 lg:col-span-6 lg:row-span-2 min-h-[26rem] sm:min-h-[30rem] lg:min-h-[34rem]'
              : d.layout === 'banner'
                ? 'sm:col-span-2 lg:col-span-12 min-h-[15rem] sm:min-h-[17rem]'
                : 'lg:col-span-6 min-h-[15rem] sm:min-h-[16rem] lg:min-h-0';

          return (
            <motion.div
              key={d.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative overflow-hidden rounded-[22px] border border-white/8 ${span}`}
            >
              <Image
                src={d.image}
                alt={d.alt}
                fill
                sizes={
                  d.layout === 'feature'
                    ? '(max-width: 1024px) 100vw, 55vw'
                    : d.layout === 'banner'
                      ? '100vw'
                      : '(max-width: 1024px) 50vw, 38vw'
                }
                className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
              />
              {/* Scrim — heavier at the bottom for type, lighter at rest */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5 transition-opacity duration-500 group-hover:from-black/95"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden="true"
                style={{ background: 'transparent' }}
              />

              {/* Index — top left */}
              <span className="absolute left-5 top-5 inline-flex items-center rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-md">
                Discipline {d.id}
              </span>
              <ArrowUpRight
                className="absolute right-5 top-5 h-5 w-5 text-white/60 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                aria-hidden="true"
              />

              {/* Copy — bottom */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  {d.tagline}
                </p>
                <h3 className="mt-1.5 font-sans text-xl font-semibold leading-tight tracking-[-0.01em] text-white sm:text-2xl">
                  {d.title}
                </h3>
                <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                  {d.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-white/12 bg-black/40 px-2.5 py-0.5 text-[10px] font-medium text-white/75 backdrop-blur-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <Link
                  href={d.href}
                  className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-[#F6EEDC]"
                >
                  Explore community
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default Disciplines;
