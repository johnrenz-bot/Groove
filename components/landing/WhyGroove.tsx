'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Search,
  Users,
  Sparkles,
  Banknote,
  Clock,
  Lightbulb,
  MapPin,
  ShieldCheck,
  BarChart2,
} from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface SurveyStat {
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATS: SurveyStat[] = [
  {
    value: 78.9,
    suffix: '%',
    label: 'Struggle to Find Coaches',
    description: 'Said it is "very difficult" to find verified coaches & choreographers locally; another 16.4% said difficult.',
    icon: Search,
  },
  {
    value: 88.8,
    suffix: '%',
    label: 'Rely on Referrals Only',
    description: 'Rely solely on word-of-mouth and friend referrals due to the absence of a unified public directory.',
    icon: Users,
  },
  {
    value: 82.2,
    suffix: '%',
    label: 'Genre Matching Obstacles',
    description: 'Struggle consistently to find instructors specialized in their exact performing arts genre.',
    icon: Sparkles,
  },
  {
    value: 96.1,
    suffix: '%',
    label: 'Affordability Challenges',
    description: 'Face unstandardized coaching fees and financial barriers to accessing sustained arts training.',
    icon: Banknote,
  },
  {
    value: 82.2,
    suffix: '%',
    label: 'Inquiry Delays & Friction',
    description: 'Experience delayed responses or unanswered messages when trying to schedule rehearsal sessions.',
    icon: Clock,
  },
  {
    value: 98.7,
    suffix: '%',
    label: 'Want a Dedicated Platform',
    description: 'Believe a purpose-built website system will encourage more people to engage in performing arts.',
    icon: Lightbulb,
  },
  {
    value: 88.8,
    suffix: '%',
    label: 'Studio Space Scarcity',
    description: 'Find it difficult or very difficult to locate and book equipped rehearsal studios in their vicinity.',
    icon: MapPin,
  },
  {
    value: 88.8,
    suffix: '%',
    label: 'Need Artist Collaboration',
    description: 'Noted the absence of a consistent platform for artist networking, contracts, and creative projects.',
    icon: ShieldCheck,
  },
];

function CountUpNumber({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [val, setVal] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVal(target);
      return;
    }
    if (!isInView) return;

    const duration = 1400; // ms
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = parseFloat((ease * target).toFixed(1));
      setVal(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setVal(target);
      }
    }

    requestAnimationFrame(step);
  }, [isInView, target, prefersReducedMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {val.toFixed(1)}
      {suffix}
    </span>
  );
}

export function WhyGroove() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="why-groove" className="relative mx-auto max-w-[1240px] px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[600px] rounded-full bg-[#E8B84B]/5 blur-[140px]"
      />

      {/* Section Heading */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading
          eyebrow="Why Groove?"
          title="Built on real data from 152 local performing artists."
          description="Groove was engineered to address documented gaps in San Jose del Monte's creative scene — transforming fragmented referrals into a secure, verified community."
          align="left"
        />
      </motion.div>

      {/* 8 Statistic Cards */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: -4,
                      borderColor: 'rgba(232, 184, 75, 0.45)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(232, 184, 75, 0.1)',
                    }
              }
              className="group relative flex flex-col justify-between rounded-[22px] border border-white/5 bg-[#121212]/70 p-6 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
            >
              {/* Card top row */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E8B84B]/25 bg-[#E8B84B]/10 text-[#E8B84B] shadow-[0_0_12px_rgba(232,184,75,0.15)] group-hover:border-[#E8B84B]/50 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Stat 0{idx + 1}
                  </span>
                </div>

                {/* Animated Stat Value */}
                <div className="mt-5 text-3xl font-bold tracking-tight text-[#E8B84B]">
                  <CountUpNumber target={stat.value} suffix={stat.suffix} />
                </div>

                {/* Label */}
                <h3 className="mt-2 text-base font-semibold text-white tracking-wide">
                  {stat.label}
                </h3>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {stat.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Attribution Badge */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-white/55"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8B84B]/30 bg-[#E8B84B]/10 px-3 py-1 font-semibold text-[#E8B84B]">
          <BarChart2 className="h-3.5 w-3.5" />
          152 respondents
        </span>
        <span className="text-white/30">·</span>
        <span>San Jose del Monte, Bulacan</span>
        <span className="text-white/30">·</span>
        <span>2025</span>
        <span className="text-white/30">·</span>
        <span className="font-medium text-white/70">STI College San Jose Del Monte</span>
      </motion.div>
    </section>
  );
}

export default WhyGroove;
