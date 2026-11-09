'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Music, Film, Theater, Check } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

const DISCIPLINES_DATA = [
  {
    title: 'Dance & Choreography',
    tagline: 'Hip-Hop to Ballet',
    description:
      'Connect with expert choreographers and dancers specializing in Hip-Hop, Contemporary, Ballet, Ballroom, K-Pop, and traditional folk dances.',
    icon: Sparkles,
    genres: ['Hip-Hop', 'Contemporary', 'Ballet', 'Ballroom', 'K-Pop', 'Folk'],
    href: '/community/performing-arts/dance',
  },
  {
    title: 'Vocal Performance',
    tagline: 'Pop to Musical Theater',
    description:
      'Train your vocals across Pop, R&B, Classical, Acoustic, and Musical Theater with experienced vocal coaches and session mentors.',
    icon: Music,
    genres: ['Pop', 'R&B', 'Classical', 'Acoustic', 'Musical Theater'],
    href: '/community/performing-arts/singing',
  },
  {
    title: 'Acting & Stage Craft',
    tagline: 'Method to Screen Presence',
    description:
      'Learn method acting, improvisation, monologue delivery, audition preparation, and screen presence from accomplished theater artists.',
    icon: Film,
    genres: ['Method Acting', 'Improv', 'Audition Prep', 'Screen Acting'],
    href: '/community/performing-arts/acting',
  },
  {
    title: 'Theater & Production',
    tagline: 'Stagecraft & Direction',
    description:
      'Immerse yourself in live show discipline, musical theater staging, stage direction, production design, and ensemble performance.',
    icon: Theater,
    genres: ['Musical Theater', 'Stage Management', 'Directing', 'Production Design'],
    href: '/community/performing-arts/theater',
  },
];

export function Disciplines() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="disciplines" className="relative mx-auto max-w-[1240px] px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24">
      {/* Section Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading
          eyebrow="Disciplines"
          title="Every performing art has a home here."
          description="From street dance to classical ballet, vocal coaching to full theatrical staging — four core disciplines, dozens of genres, unified in one platform."
          align="left"
        />
      </motion.div>

      {/* 4 Equal Cards Grid */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {DISCIPLINES_DATA.map((discipline, idx) => {
          const Icon = discipline.icon;
          return (
            <motion.div
              key={discipline.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: -6,
                      borderColor: 'rgba(232, 184, 75, 0.5)',
                      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 25px rgba(232, 184, 75, 0.12)',
                    }
              }
              className="group relative flex flex-col justify-between rounded-[24px] border border-white/5 bg-[#121212]/70 p-6 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#E8B84B]/25 bg-[#E8B84B]/10 text-[#E8B84B] shadow-[0_0_15px_rgba(232,184,75,0.15)] group-hover:border-[#E8B84B]/60 transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E8B84B]/70">
                    Discipline 0{idx + 1}
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="mt-5 text-xl font-bold text-white tracking-tight group-hover:text-[#E8B84B] transition-colors">
                  {discipline.title}
                </h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#E8B84B]/80">
                  {discipline.tagline}
                </p>

                {/* Description */}
                <p className="mt-3 text-xs leading-relaxed text-white/65">
                  {discipline.description}
                </p>

                {/* Genre Tags */}
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {discipline.genres.map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/70"
                    >
                      <Check className="h-2.5 w-2.5 text-[#E8B84B]" />
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <Link
                  href={discipline.href}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 group-hover:text-[#E8B84B] transition-colors"
                >
                  Explore community
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
