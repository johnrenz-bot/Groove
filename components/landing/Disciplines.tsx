'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle2, Music, Drama, Theater, Sparkles } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { useScrollReveal } from '@/components/shared/useScrollReveal';

interface DisciplineCardProps {
  title: string;
  tagline: string;
  image: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
  index: number;
}

const disciplines = [
  {
    title: 'Dance & Choreography',
    tagline: 'Hip-Hop to Ballet',
    image: '/image/wc/dance.jpg',
    description:
      'Connect with expert choreographers and dancers specializing in Hip-Hop, Contemporary, Ballet, Ballroom, K-Pop, and traditional folk dances.',
    highlights: [
      'Solo & Group Choreography',
      'Rehearsal Preparation',
      'Technique Refinement',
      'Audition Coaching',
    ],
    icon: <Music className="h-5 w-5" />,
  },
  {
    title: 'Vocal Performance & Coaching',
    tagline: 'Pop to Musical Theater',
    image: '/image/wc/singg.png',
    description:
      'Train your vocals across Pop, R&B, Classical, Acoustic, and Musical Theater with experienced vocal coaches.',
    highlights: [
      'Breath Control & Range',
      'Pitch Precision',
      'Stage Presence & Mic Technique',
      'Harmony & Arrangement',
    ],
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    title: 'Acting & Stage Craft',
    tagline: 'Method to screen presence',
    image: '/image/wc/acting.jpg',
    description:
      'Learn method acting, improvisation, audition preparation, and screen presence from accomplished theatre and TV artists.',
    highlights: [
      'Character Development',
      'Script Analysis',
      'Monologue Coaching',
      'Camera & Screen Techniques',
    ],
    icon: <Drama className="h-5 w-5" />,
  },
  {
    title: 'Theater & Production',
    tagline: 'Stagecraft & direction',
    image: '/image/wc/theater.jpg',
    description:
      'Immerse yourself in full stagecraft, musical theater production, stage management, and performance directing.',
    highlights: [
      'Musical Theater Execution',
      'Stage Direction',
      'Collaborative Ensembles',
      'Live Show Discipline',
    ],
    icon: <Theater className="h-5 w-5" />,
  },
];

function DisciplineCard({ title, tagline, image, description, highlights, icon, index }: DisciplineCardProps) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group"
    >
      <div className={cn(
        'g-card relative aspect-[4/3] overflow-hidden rounded-2xl',
        'transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,162,74,0.3)]'
      )}>
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-white/10 rounded-2xl" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#C9A24A]/10 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
            {icon}
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/70">
            {tagline}
          </p>

          <div className="mt-4 grid grid-rows-[0fr] transition-all duration-500 group-hover:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <p className="pt-3 text-sm leading-relaxed text-white/90">
                {description}
              </p>
              <ul className="mt-4 space-y-2">
                {highlights.map((h) => (
                  <motion.li
                    key={h}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 text-xs text-white/80"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {h}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/90">
                <span>Find coaches</span>
                <motion.span
                  initial={{ x: 0 }}
                  animate={{ x: 4 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block"
                >
                  →
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Disciplines() {
  return (
    <section id="disciplines" className="g-section mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <p className="gl-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-6">
          <span className="gl-dot relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
            <motion.span className="absolute inset-0 rounded-full bg-[#C9A24A] animate-ping opacity-75" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#C9A24A]" aria-hidden="true" />
          Disciplines
        </p>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Every performing art has a home here
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-base leading-relaxed text-white/60 sm:text-lg">
          From hip-hop to ballet, vocal coaching to stage direction — find the right discipline and the right people to grow with.
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {disciplines.map((discipline, index) => (
          <DisciplineCard key={discipline.title} {...discipline} index={index} />
        ))}
      </div>
    </section>
  );
}

export default Disciplines;