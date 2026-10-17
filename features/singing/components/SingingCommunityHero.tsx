'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, Mic, Trophy, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import { PhilippineSunMark } from '@/features/dance/components/PhilippineSunMark';
import { SafeImage } from '@/features/dance/components/SafeImage';

interface SingingCommunityHeroProps {
  totalUpdatesCount: number;
  totalEventsCount: number;
  federationsCount?: number;
  lastUpdated?: string;
  onExploreEvents?: () => void;
}

export function SingingCommunityHero({
  totalUpdatesCount,
  totalEventsCount,
  federationsCount = 8,
  lastUpdated = 'Recently verified',
  onExploreEvents,
}: SingingCommunityHeroProps) {
  const stats = [
    { icon: Globe, label: 'Organizations', value: federationsCount },
    { icon: Trophy, label: 'Upcoming', value: totalEventsCount },
    { icon: CalendarDays, label: 'Dispatches', value: totalUpdatesCount },
  ];

  return (
    <section
      aria-labelledby="singing-hero-title"
      className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10"
    >
      {/* Philippine sun watermark */}
      <PhilippineSunMark
        size={280}
        className="absolute -right-16 -top-16 h-56 w-56 text-[#C9A24C] opacity-[0.12] sm:h-72 sm:w-72"
      />
      {/* Gold hairline along the top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r from-transparent via-[#C9A24C]/60 to-transparent"
      />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: eyebrow, headline, copy, CTAs */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              National &amp; Global Vocal Pulse
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
              Editorial-Verified · Official Source-Linked
            </span>

            <span className="text-xs text-muted-foreground">
              Last updated: <span className="font-medium text-foreground">{lastUpdated}</span>
            </span>
          </div>

          <div className="mt-5 max-w-3xl">
            <h1
              id="singing-hero-title"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Singing &amp; Vocal <span className="font-normal italic text-muted-foreground">Community</span>
            </h1>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-accent-text sm:text-base">
              Choral Ensembles · Masterclasses · Vocal Competitions · Philippines &amp; Worldwide
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Connecting Philippine vocalists, choir scholars, and voice coaches with premier choral
              federations and classical vocal competitions. Real-time competition calls, masterclass
              announcements, and vocal pedagogy dispatches curated for singers, pedagogues, and audiences.
            </p>
          </div>

          {/* CTA actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {onExploreEvents ? (
              <button
                type="button"
                onClick={onExploreEvents}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:text-sm"
              >
                <span>Upcoming Showcases &amp; Competitions</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <a
                href="#upcoming-events"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:text-sm"
              >
                <span>Upcoming Showcases &amp; Competitions</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}

            <Link
              href="/client/talent?talent=Singing"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-5 py-2.5 text-xs font-bold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:text-sm"
            >
              <Mic className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
              <span>Find Vocal Coaches</span>
            </Link>
          </div>
        </div>

        {/* Right: hero visual + stats block */}
        <div className="flex min-w-0 flex-col gap-5 lg:justify-end">
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted/20 lg:block">
            <SafeImage
              src="/image/pa/ccp-eastern-chamber-singers.jpg"
              alt="Philippine choral ensemble performing in formal attire on a concert stage"
              sizes="(min-width: 1024px) 340px, 0px"
              className="object-cover object-center"
              eager
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent"
            />
          </div>

          {/* Stat band */}
          <dl className="grid grid-cols-3 divide-x divide-divider rounded-xl border border-border bg-muted/20">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="px-4 py-3 text-left sm:px-5">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
