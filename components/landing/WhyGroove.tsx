'use client';

import React from 'react';
import {
  Users,
  MapPin,
  Shield,
  Clock,
  DollarSign,
  MessageSquare,
  Lightbulb,
  BarChart2,
} from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

/**
 * "Why Groove?" — Verified survey statistics section.
 *
 * All figures come from the STI College San Jose Del Monte Capstone Survey
 * of 152 performing artists in San Jose del Monte, Bulacan (2025).
 * Source: Groove: San Jose del Monte Bulacan's Web-Based Performing Arts Hub
 * with Smart Chat Support and Studio Locator — Capstone Project 2, BSIT 2025.
 */

interface StatPoint {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
  sourceRef: string; // Question reference from the survey
}

const STATS: StatPoint[] = [
  {
    icon: MapPin,
    label: 'Artists struggle to find local coaches',
    value: '78.9%',
    description: 'said it is "very difficult" to find coaches and choreographers; another 16.4% said "difficult"',
    sourceRef: 'Q2 — Difficulty finding coaches',
  },
  {
    icon: Users,
    label: 'Referrals are the only reliable path',
    value: '88.8%',
    description: 'rely on referrals from friends, colleagues, or industry contacts to find coaches',
    sourceRef: 'Q3 — Coach discovery method',
  },
  {
    icon: Shield,
    label: 'Right coach for the right genre is hard to find',
    value: '82.2%',
    description: 'said they "always" have difficulty finding a coach matching their specific genre; 9.2% said "often"',
    sourceRef: 'Q4 — Genre-specific coach difficulty',
  },
  {
    icon: DollarSign,
    label: 'Affordability is a major barrier',
    value: '96.1%',
    description: 'cited affordability as a challenge when hiring coaches or artists',
    sourceRef: 'Q5 — Affordability challenge',
  },
  {
    icon: Clock,
    label: 'Quick responses are rare',
    value: '82.2%',
    description: 'said they "always" have difficulty getting quick responses from coaches; 9.2% said "often"',
    sourceRef: 'Q6 — Response time difficulty',
  },
  {
    icon: Lightbulb,
    label: 'A dedicated platform would drive engagement',
    value: '98.7%',
    description: 'believe a website system would encourage more people to engage in performing arts',
    sourceRef: 'Q7 — Platform impact on engagement',
  },
  {
    icon: BarChart2,
    label: 'Finding rehearsal studios is difficult',
    value: '88.8%',
    description: 'found it "difficult" or "very difficult" to locate a nearby dance studio',
    sourceRef: 'Q8 — Studio discovery difficulty',
  },
  {
    icon: MessageSquare,
    label: 'No dedicated collaboration platform exists',
    value: '88.8%',
    description: 'noted the absence of a consistent platform for artist collaboration and feedback',
    sourceRef: 'Q10 — Need for collaboration platform',
  },
];

const SURVEY_META = {
  respondents: 152,
  location: 'San Jose del Monte, Bulacan',
  year: 2025,
  institution: 'STI College San Jose Del Monte',
  project: 'BS Information Technology Capstone Project 2',
  title: 'Groove: San Jose del Monte Bulacan\'s Web-Based Performing Arts Hub with Smart Chat Support and Studio Locator',
};

export function WhyGroove() {
  return (
    <section className="ld-section" aria-labelledby="why-groove-heading">
      <div className="ld-wrap">
        {/* Section Header */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">
            <span className="inline-flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
              Why Groove?
            </span>
          </p>
          <h2 id="why-groove-heading" className="ld-h2">
            Built on real data from {SURVEY_META.respondents} performing artists in {SURVEY_META.location}
          </h2>
          <p className="ld-p max-w-2xl">
            Every feature in Groove addresses a documented pain point. The numbers below come from a
            {SURVEY_META.year} capstone survey of <strong>{SURVEY_META.respondents} performing artists</strong>
            across San Jose del Monte, Bulacan — conducted as part of <em>{SURVEY_META.title}</em>
            ({SURVEY_META.project}, {SURVEY_META.institution}).
          </p>
        </Reveal>

        {/* Stats Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, idx) => (
            <Reveal key={stat.label} variant="scale" delay={idx * 50} className="h-full">
              <article className="ld-card ld-card--pad ld-card--lift h-full gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg group">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-text group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                  <stat.icon className="h-6 w-6" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <dt className="ld-stat__value text-3xl sm:text-4xl font-bold tabular-nums text-foreground group-hover:text-accent transition-colors">
                      {stat.value}
                    </dt>
                  </div>
                  <h3 className="mt-2 ld-h4 text-sm sm:text-base">{stat.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {stat.description}
                  </p>
                </div>

                {/* Source reference badge */}
                <div className="mt-auto pt-2 border-t border-[var(--border)]">
                  <span className="ld-small inline-flex items-center gap-1 text-[var(--subtle-foreground)]">
                    <BarChart2 className="h-3 w-3" aria-hidden="true" />
                    {stat.sourceRef}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}

          {/* Survey attribution card */}
          <Reveal variant="scale" delay={STATS.length * 50} className="h-full sm:col-span-2 lg:col-span-4">
            <article className="ld-card ld-card--pad ld-card--lift gap-4 border-accent/20 bg-accent/5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-text">
                  <BarChart2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="ld-h4">Survey Attribution & Methodology</h3>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Respondents</dt>
                      <dd className="font-medium">{SURVEY_META.respondents} performing artists</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Location</dt>
                      <dd className="font-medium">{SURVEY_META.location}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Conducted</dt>
                      <dd className="font-medium">{SURVEY_META.year}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Institution</dt>
                      <dd className="font-medium">{SURVEY_META.institution}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Project</dt>
                      <dd className="font-medium">{SURVEY_META.project}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--subtle-foreground)]">Title</dt>
                      <dd className="font-medium max-w-xs truncate">{SURVEY_META.title}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    The survey covered 10 questions on coach discovery, affordability, studio access,
                    response times, collaboration needs, and platform impact. All percentages reflect
                    the proportion of 152 respondents. Full questionnaire and raw data available in
                    the capstone documentation (Appendices B–C).
                  </p>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default WhyGroove;