'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Search,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Zap,
  Award,
  CalendarDays,
  CheckCircle2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';

type Audience = 'client' | 'coach';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PERFORMER_FEATURES: FeatureCard[] = [
  {
    icon: Search,
    title: 'Verified Coach Directory',
    description: 'Browse vetted instructor profiles filtered by discipline, specialization, rates, and verified credentials.',
  },
  {
    icon: MapPin,
    title: 'Rehearsal Studio Locator',
    description: 'Locate nearby dance, vocal, and rehearsal spaces across San Jose del Monte with map navigation and hourly rates.',
  },
  {
    icon: ShieldCheck,
    title: 'Digital Session Agreements',
    description: 'Lock in sessions with transparent terms, digital signatures, and fee schedules together in one official record.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Consultation Chat',
    description: 'Message instructors beforehand to discuss routine goals, song choices, and expectations before confirming.',
  },
  {
    icon: Sparkles,
    title: 'Community Showcase Feed',
    description: 'Share routine clips, monologues, and rehearsal milestones to gain visibility with peers and coaches.',
  },
  {
    icon: Zap,
    title: 'Groovey AI Guidance',
    description: 'Get 24/7 smart assistant help for studio directions, discipline navigation, and booking guidance.',
  },
];

const COACH_FEATURES: FeatureCard[] = [
  {
    icon: Award,
    title: 'Professional Portfolio',
    description: 'Showcase your credentials, certifications, disciplines, performance reels, and verified student reviews.',
  },
  {
    icon: CalendarDays,
    title: 'Schedule & Availability',
    description: 'Set custom recurring slots, blackout dates, and manage booking requests in one unified calendar.',
  },
  {
    icon: CheckCircle2,
    title: 'Student Booking Management',
    description: 'Review incoming session requests with full student context, goals, and confirm or propose alternate times.',
  },
  {
    icon: FileText,
    title: 'Automated Digital Contracts',
    description: 'Pre-fill legally clear session agreements with automatic PDF generation and timestamped e-signatures.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Student Messaging',
    description: 'Coordinate session routines, share audio tracks, notes, and give constructive feedback seamlessly.',
  },
  {
    icon: TrendingUp,
    title: 'Local Scene Recognition',
    description: 'Build your reputation in San Jose del Monte and Bulacan, connecting with dedicated performers ready to learn.',
  },
];

export function AudienceTabs() {
  const [activeTab, setActiveTab] = useState<Audience>('client');
  const prefersReducedMotion = useReducedMotion();

  const isPerformer = activeTab === 'client';
  const features = isPerformer ? PERFORMER_FEATURES : COACH_FEATURES;

  return (
    <section id="for-artists" className="relative mx-auto max-w-[1240px] px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24">
      {/* Section Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading
          eyebrow="Two Experiences · One Platform"
          title="Built for performers and the coaches who guide them."
          description="Tailored toolsets for artists honing their craft and mentors building a professional coaching practice in Bulacan."
          align="left"
        />
      </motion.div>

      {/* Animated Tab Switcher */}
      <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="inline-flex rounded-full border border-white/10 bg-[#121212]/80 p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('client')}
            className={`relative rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
              isPerformer ? 'text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            {isPerformer && (
              <motion.div
                layoutId="audienceTabActivePill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E8B84B] to-[#f4be4d] shadow-[0_0_20px_rgba(232,184,75,0.4)]"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              For Performers
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coach')}
            className={`relative rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
              !isPerformer ? 'text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            {!isPerformer && (
              <motion.div
                layoutId="audienceTabActivePill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E8B84B] to-[#f4be4d] shadow-[0_0_20px_rgba(232,184,75,0.4)]"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Award className="h-3.5 w-3.5" />
              For Coaches
            </span>
          </button>
        </div>

        {/* Tab Meta Info */}
        <p className="text-xs text-white/50">
          {isPerformer
            ? '6 core tools for performers, dancers, vocalists and actors'
            : '6 specialized tools for verified instructors, choreographers and directors'}
        </p>
      </div>

      {/* 6 Feature Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -15 }}
          transition={{ duration: 0.35 }}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -4,
                        borderColor: 'rgba(232, 184, 75, 0.4)',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(232, 184, 75, 0.08)',
                      }
                }
                className="group relative flex flex-col justify-between rounded-[22px] border border-white/5 bg-[#121212]/70 p-6 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E8B84B]/25 bg-[#E8B84B]/10 text-[#E8B84B] shadow-[0_0_12px_rgba(232,184,75,0.15)] group-hover:border-[#E8B84B]/50 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/40">
                      0{idx + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Dynamic CTAs */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link href={isPerformer ? '/register/client' : '/register/coach'}>
          <GradientButton className="px-6 py-3.5">
            {isPerformer ? 'Get started as Performer' : 'Apply as Coach'}
            <ArrowRight className="h-4 w-4" />
          </GradientButton>
        </Link>
        <Link href="#how-it-works">
          <OutlineButton className="px-6 py-3.5">
            See how it works
          </OutlineButton>
        </Link>
      </div>
    </section>
  );
}

export default AudienceTabs;
