'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Compass, ClipboardCheck, Music, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { useScrollReveal } from '@/components/shared/useScrollReveal';

const steps = [
  {
    number: 1,
    title: 'Create your profile',
    description: 'Sign up as a performer or a coach. Add your disciplines, rates, availability, and portfolio in a few minutes.',
    icon: Sparkles,
    color: '#C9A24A',
    bgColor: 'rgba(201, 162, 74, 0.1)',
  },
  {
    number: 2,
    title: 'Find a coach or studio',
    description: 'Search verified coaches by discipline, compare rates and reviews, then request a session that fits your schedule.',
    icon: Compass,
    color: '#6FBF93',
    bgColor: 'rgba(111, 191, 147, 0.1)',
  },
  {
    number: 3,
    title: 'Book and sign contract',
    description: 'Confirm the agreement with a digital signature, coordinate in the studio, and grow your craft with the community.',
    icon: ClipboardCheck,
    color: '#7FB0D0',
    bgColor: 'rgba(127, 176, 208, 0.1)',
  },
  {
    number: 4,
    title: 'Rehearse and perform',
    description: 'Track progress, share performances on the Showcase, and build your reputation in the performing arts community.',
    icon: Music,
    color: '#C9A24A',
    bgColor: 'rgba(201, 162, 74, 0.1)',
  },
];

function StepCard({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative"
    >
      <div className="relative">
        {/* Connecting line */}
        {!isLast && (
          <div className="absolute left-[2.5rem] top-[5.5rem] bottom-[3rem] w-px bg-gradient-to-b from-[#C9A24A]/30 to-transparent" />
        )}

        {/* Step number circle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
          style={{
            borderColor: step.color,
            backgroundColor: step.bgColor,
          }}
        >
          <span className="text-lg font-bold" style={{ color: step.color }}>
            {step.number}
          </span>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ borderColor: step.color }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.div>
      </div>

      {/* Card content */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="ml-14 flex-1 min-w-0"
      >
        <div className={cn(
          'g-card h-full p-6 md:p-8 transition-all duration-300 hover:border-[#C9A24A]/30 hover:shadow-[0_0_30px_rgba(201,162,74,0.15)]',
          'border-white/10 bg-white/[0.03]'
        )}>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">
            {step.title}
          </h3>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-white/60">
            {step.description}
          </p>

          {/* Highlights */}
          <ul className="mt-5 space-y-3">
            {[
              'Instant search & filters',
              'Verified reviews & ratings',
              'Secure digital contracts',
            ].map((highlight, i) => (
              <motion.li
                key={highlight}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: step.color }} />
                {highlight}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="gl-band g-section scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
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
            How it works
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            From discovery to performance in three steps
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base leading-relaxed text-white/60 sm:text-lg">
            Groove makes it simple to find the right coach, book a session, and sign your agreement — all in one place.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} isLast={index === steps.length - 1} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm font-medium uppercase tracking-wider text-white/50 mb-4">
            Ready to start your journey?
          </p>
          <a
            href="/register/client"
            className="inline-flex items-center gap-2 rounded-full bg-[#C9A24A] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5B52E] hover:shadow-[0_0_30px_rgba(201,162,74,0.4)] transition-all"
          >
            Get started free
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorks;