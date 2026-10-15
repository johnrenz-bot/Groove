'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { useScrollReveal } from '@/components/shared/useScrollReveal';
import { Search, Calendar, FileText, Users, MessageSquare, BarChart3, Bot, User, CalendarDays, Check, FilePen, Star, DollarSign, Sparkles } from 'lucide-react';

const clientFeatures = [
  { icon: Search, title: 'Find verified coaches nearby', description: 'Search by discipline, location, and budget. Filter by ratings, availability, and specialization.' },
  { icon: Calendar, title: 'Book rehearsal sessions and studios', description: 'Real-time calendar with instant confirmation. Reschedule or cancel with one tap.' },
  { icon: FileText, title: 'Digital contracts and e-signatures', description: 'Legally binding session agreements. Auto-generated PDFs with timestamps and audit trail.' },
  { icon: Users, title: 'Showcase Feed: share performances', description: 'Post videos, photos, and updates. Get feedback from coaches and peers.' },
  { icon: MessageSquare, title: 'Messages and calendar in one place', description: 'Unified inbox for coach chats, session reminders, and booking updates.' },
  { icon: BarChart3, title: 'Track bookings, status, and progress', description: 'Personal dashboard with session history, skill milestones, and progress analytics.' },
  { icon: Bot, title: 'Groovey AI coach assistant', description: '24/7 instant answers about bookings, coach bios, pricing, and platform policies.' },
];

const coachFeatures = [
  { icon: User, title: 'Public coach profile and portfolio', description: 'Showcase credentials, specialties, rates, and verified reviews. SEO-optimized.' },
  { icon: CalendarDays, title: 'Manage schedule and availability', description: 'Set recurring slots, block dates, and sync with Google Calendar.' },
  { icon: Check, title: 'Accept/decline bookings', description: 'Review requests with student details. One-tap confirm or propose alternatives.' },
  { icon: FilePen, title: 'Create and send contracts', description: 'Template-based digital agreements. Auto-fill student info. Track signature status.' },
  { icon: Star, title: 'Community Showcase to attract talents', description: 'Post teaching demos, student highlights, and class announcements.' },
  { icon: DollarSign, title: 'Earnings and session tracking', description: 'Revenue dashboard with payouts, pending sessions, and tax-ready reports.' },
  { icon: Bot, title: 'Groovey AI assistant', description: 'Automated scheduling, student matching, and policy questions answered instantly.' },
];

type Audience = 'client' | 'coach';

function FeatureList({ features, index }: { features: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; description: string }>; index: number }) {
  return (
    <motion.ul
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, staggerChildren: 0.08 }}
      className="space-y-5"
    >
      {features.map((feature, i) => (
        <motion.li
          key={feature.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-4 p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#C9A24A]/30 hover:bg-white/[0.05] transition-all"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A24A]/10 text-[#C9A24A]" aria-hidden="true">
            <feature.icon className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white">{feature.title}</h4>
            <p className="mt-1 text-sm text-white/60 leading-relaxed">{feature.description}</p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function AudienceContent({ audience, onCTA }: { audience: Audience; onCTA: () => void }) {
  const isClient = audience === 'client';
  const features = isClient ? clientFeatures : coachFeatures;

  return (
    <motion.div
      key={audience}
      initial={{ opacity: 0, x: isClient ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full bg-[#C9A24A]/10 px-4 py-2 text-sm font-semibold text-[#C9A24A]"
        >
          <Sparkles className="h-4 w-4 text-[#C9A24A]" aria-hidden="true" />
          {isClient ? 'For Performers' : 'For Coaches'}
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {isClient ? 'Everything you need to grow your craft' : 'Grow your coaching practice'}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 max-w-xl mx-auto text-base leading-relaxed text-white/60"
        >
          {isClient
            ? 'Browse coaches, manage bookings, and connect with the community — all from one place.'
            : 'Tools built for instructors — manage your schedule, connect with local talent, and build a reputation in the SJDM performing arts scene.'}
        </motion.p>
      </div>

      <FeatureList features={features} index={0} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex justify-center"
      >
        <Button
          size="lg"
          onClick={onCTA}
          className="rounded-full bg-[#C9A24A] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5B52E] hover:shadow-[0_0_30px_rgba(201,162,74,0.4)]"
        >
          {isClient ? 'Join as Performer' : 'Join as Coach'}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function AudienceTabs() {
  const [activeTab, setActiveTab] = useState<Audience>('client');
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

  const handleCTA = () => {
    if (activeTab === 'client') {
      window.location.href = '/register/client';
    } else {
      window.location.href = '/register/coach';
    }
  };

  return (
    <section ref={ref} id="audience" className="g-section mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <p className="gl-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-6">
          <span className="gl-dot relative h-2 w-2 rounded-full bg-[#C9A24A]" aria-hidden="true">
            <motion.span className="absolute inset-0 rounded-full bg-[#C9A24A] animate-ping opacity-75" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#C9A24A]" aria-hidden="true" />
          Audience
        </p>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Built for performers and the coaches who guide them
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-base leading-relaxed text-white/60 sm:text-lg">
          Two experiences, one platform. Choose your path and discover tools designed specifically for you.
        </p>
      </motion.div>

      {/* Tab Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-12 inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/10 p-1"
        role="tablist"
        aria-label="Select audience"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'client'}
          onClick={() => setActiveTab('client')}
          className={cn(
            'rounded-full px-6 py-2.5 text-sm font-semibold transition-all',
            activeTab === 'client'
              ? 'bg-[#C9A24A] text-black shadow-[0_0_30px_rgba(201,162,74,0.3)]'
              : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
          )}
        >
          Performer
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'coach'}
          onClick={() => setActiveTab('coach')}
          className={cn(
            'rounded-full px-6 py-2.5 text-sm font-semibold transition-all',
            activeTab === 'coach'
              ? 'bg-[#C9A24A] text-black shadow-[0_0_30px_rgba(201,162,74,0.3)]'
              : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
          )}
        >
          Coach
        </button>
      </motion.div>

      {/* Content */}
      <AudienceContent
        audience={activeTab}
        onCTA={handleCTA}
      />
    </section>
  );
}

export default AudienceTabs;