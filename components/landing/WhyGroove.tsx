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
import { InfoTip } from '@/components/ui/InfoTip';

/**
 * "Why Groove?" — Verified survey statistics section.
 *
 * All figures come from the STI College San Jose Del Monte Capstone Survey
 * of 152 performing artists in San Jose del Monte, Bulacan (2025).
 * Source: Groove: San Jose del Monte Bulacan's Web-Based Performing Arts Hub
 * with Smart Chat Support and Studio Locator — Capstone Project 2, BSIT 2025.
 *
 * Layout: two-column editorial with a large pull-quote left + stats grid right
 * on desktop; single column on mobile. The attribution card is now a subtle
 * footnote bar below the grid rather than a duplicate stat card.
 */

interface StatPoint {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
  sourceRef: string;
}

const STATS: StatPoint[] = [
  {
    icon: MapPin,
    label: 'Struggle to find local coaches',
    value: '78.9%',
    description: 'said it is "very difficult" to find coaches and choreographers; another 16.4% said "difficult"',
    sourceRef: 'Q2',
  },
  {
    icon: Users,
    label: 'Rely on referrals only',
    value: '88.8%',
    description: 'rely on referrals from friends, colleagues, or industry contacts to find coaches',
    sourceRef: 'Q3',
  },
  {
    icon: Shield,
    label: 'Can\'t find genre-specific coaches',
    value: '82.2%',
    description: 'said they "always" have difficulty finding a coach matching their specific genre',
    sourceRef: 'Q4',
  },
  {
    icon: DollarSign,
    label: 'Face affordability barriers',
    value: '96.1%',
    description: 'cited affordability as a challenge when hiring coaches or artists',
    sourceRef: 'Q5',
  },
  {
    icon: Clock,
    label: 'Get slow responses from coaches',
    value: '82.2%',
    description: 'said they "always" have difficulty getting quick responses from coaches',
    sourceRef: 'Q6',
  },
  {
    icon: Lightbulb,
    label: 'Want a dedicated platform',
    value: '98.7%',
    description: 'believe a website system would encourage more people to engage in performing arts',
    sourceRef: 'Q7',
  },
  {
    icon: BarChart2,
    label: 'Can\'t find rehearsal studios',
    value: '88.8%',
    description: 'found it "difficult" or "very difficult" to locate a nearby dance studio',
    sourceRef: 'Q8',
  },
  {
    icon: MessageSquare,
    label: 'Lack a collaboration platform',
    value: '88.8%',
    description: 'noted the absence of a consistent platform for artist collaboration',
    sourceRef: 'Q10',
  },
];

const SURVEY_META = {
  respondents: 152,
  location: 'San Jose del Monte, Bulacan',
  year: 2025,
  institution: 'STI College San Jose Del Monte',
  project: 'BS Information Technology Capstone Project 2',
  title: "Groove: San Jose del Monte Bulacan's Web-Based Performing Arts Hub with Smart Chat Support and Studio Locator",
};

const SURVEY_DETAILS = (
  <>
    <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
      Every feature in Groove addresses a documented pain point. The numbers below come from a
      {SURVEY_META.year} capstone survey of <strong>{SURVEY_META.respondents} performing artists</strong>
      {' '}across San Jose del Monte, Bulacan — conducted as part of{' '}
      <em>{SURVEY_META.title}</em>
      ({SURVEY_META.project}, {SURVEY_META.institution}).
    </p>
    <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
      The survey covered 10 questions on coach discovery, affordability, studio access,
      response times, collaboration needs, and platform impact. All percentages reflect
      the proportion of 152 respondents. Full questionnaire and raw data available in
      the capstone documentation (Appendices B–C).
    </p>
  </>
);

export function WhyGroove() {
  return (
    <section className="ld-section" aria-labelledby="why-groove-heading">
      <div className="ld-wrap">

        {/* ── Section header ─────────────────────────────────────────────── */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">
            <span className="inline-flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
              Why Groove?
            </span>
          </p>
          <h2 id="why-groove-heading" className="ld-h2">
            Built on real data from {SURVEY_META.respondents} performing artists
          </h2>
          <InfoTip
            title="About this data"
            short="Based on a 2025 capstone survey of 152 performing artists in SJDM, Bulacan by STI College."
            details={SURVEY_DETAILS}
            align="center"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-accent-text transition-colors"
            label="Learn more about the survey methodology"
          />
        </Reveal>

        {/* ── Pull-quote + accent bar ────────────────────────────────────── */}
        <Reveal className="mt-12 mb-8">
          <div className="ld-why-pullquote" aria-hidden="true">
            <div className="ld-why-pullquote__bar" />
            <blockquote className="ld-why-pullquote__text">
              <span className="ld-why-pullquote__pct">98.7%</span>
              {' '}of local performers believe a dedicated platform would
              transform the arts scene in Bulacan.
            </blockquote>
          </div>
        </Reveal>

        {/* ── Stats grid ─────────────────────────────────────────────────── */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, idx) => (
            <Reveal key={stat.label} variant="scale" delay={idx * 45} className="h-full">
              <article className="ld-why-card h-full group">
                {/* Icon */}
                <div className="ld-why-card__icon group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>

                {/* Stat value */}
                <div className="flex-1 min-w-0">
                  <dt className="ld-why-card__value group-hover:text-accent-text transition-colors">
                    {stat.value}
                  </dt>
                  <h3 className="ld-why-card__label">{stat.label}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                    {stat.description}
                  </p>
                </div>

                {/* Source tag */}
                <div className="mt-auto pt-2 border-t border-[var(--border)] flex items-center gap-1">
                  <BarChart2 className="h-3 w-3 text-[var(--subtle-foreground)]" aria-hidden="true" />
                  <span className="text-[11px] text-[var(--subtle-foreground)] font-medium">
                    Survey {stat.sourceRef}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* ── Attribution footnote ───────────────────────────────────────── */}
        <Reveal delay={STATS.length * 45} className="mt-6">
          <div className="ld-why-attribution">
            <BarChart2 className="h-4 w-4 shrink-0 text-[var(--subtle-foreground)]" aria-hidden="true" />
            <p className="text-[13px] text-[var(--subtle-foreground)] leading-relaxed">
              <strong className="text-[var(--muted-foreground)]">Survey attribution:</strong>
              {' '}{SURVEY_META.respondents} respondents · {SURVEY_META.location} ·{' '}
              {SURVEY_META.year} · {SURVEY_META.institution} · {SURVEY_META.project}
            </p>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

export default WhyGroove;