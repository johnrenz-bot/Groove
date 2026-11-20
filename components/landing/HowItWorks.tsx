'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, MessageSquare, FileCheck2, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

const STEPS = [
  {
    number: '01',
    title: 'Find a Coach',
    description:
      'Browse verified coach profiles by discipline, review transparent rates, specialties, and real-time studio availability.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Message to Agree',
    description:
      'Discuss routine goals, song choices, and rehearsal schedules directly in chat before confirming. Nothing is charged yet.',
    icon: MessageSquare,
  },
  {
    number: '03',
    title: 'Book & Sign Contract',
    description:
      'Lock in the date. The digital session agreement, schedule, and fee are bound together with official e-signatures.',
    icon: FileCheck2,
  },
  {
    number: '04',
    title: 'Rehearse & Grow',
    description:
      'Meet at verified studios or online. Track your performance milestones and easily rebook your ongoing sessions.',
    icon: Sparkles,
  },
];

export function HowItWorks() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="relative mx-auto max-w-[1240px] px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24">
      {/* Section Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading
          eyebrow="How It Works"
          title="From discovery to performance in four clear steps."
          description="A calm, structured process designed to eliminate confusion, lost messages, and unrecorded session terms."
          align="left"
        />
      </motion.div>

      {/* Steps Container with Animated Connecting Line */}
      <div className="relative mt-16">
        {/* Animated Connecting Line (Desktop) */}
        <div
          aria-hidden="true"
          className="absolute left-[12%] right-[12%] top-9 hidden h-[2px] -translate-y-1/2 overflow-hidden md:block"
        >
          {/* Base line */}
          <div className="h-full w-full bg-white/10" />
          {/* Glowing Animated Pulse */}
          <motion.div
            initial={prefersReducedMotion ? false : { x: '-100%' }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    x: ['-100%', '100%'],
                  }
            }
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 h-full w-1/2 bg-gradient-to-r from-transparent via-[#E6CB8A] to-transparent "
          />
        </div>

        {/* Step Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -6,
                        borderColor: 'rgba(255,127,71, 0.45)',
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255,127,71, 0.1)',
                      }
                }
                className="group relative flex flex-col items-start rounded-[18px] border border-white/8 bg-surface p-6  transition-all duration-200"
              >
                {/* Step Number Badge */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E6CB8A] to-[#D9B45B] text-black ">
                  <span className="text-base font-extrabold tracking-tight">{step.number}</span>
                </div>

                {/* Icon & Title */}
                <div className="mt-6 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-bold text-white tracking-wide group-hover:text-muted-foreground transition-colors">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs leading-relaxed text-white/65">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;

