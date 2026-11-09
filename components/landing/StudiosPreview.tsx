'use client';

import React from 'react';
import { MapPin, Check } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

const studios = [
  {
    name: 'Kidlat Dance Studio',
    type: 'Dance Studio',
    location: 'San Jose del Monte, Bulacan',
    distance: '2.3 km away',
    verified: true,
  },
  {
    name: 'Harmony Rehearsal Space',
    type: 'Rehearsal Studio',
    location: 'Munoz, Nueva Ecija',
    distance: '15.8 km away',
    verified: true,
  },
  {
    name: 'Stage Craft Academy',
    type: 'Theater Studio',
    location: 'Mandaluyong, Manila',
    distance: '22.1 km away',
    verified: false,
  },
  {
    name: 'Vocal Harmony Studio',
    type: 'Vocal Studio',
    location: 'Quezon City',
    distance: '18.5 km away',
    verified: true,
  },
];

export function StudiosPreview() {
  return (
    <section
      id="studios"
      className="ld-section scroll-mt-28"
      aria-labelledby="studios-heading"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        {/* Section header */}
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            Studios
          </p>
          <h2 id="studios-heading" className="text-3xl font-serif font-bold text-foreground sm:text-4xl">
            Find rehearsal spaces near you
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover verified studios and rehearsal spaces across San Jose del Monte and Bulacan.
          </p>
        </Reveal>

        {/* Studio cards grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {studios.map((studio, idx) => (
            <Reveal key={studio.name} delay={idx * 100}>
              <div className="group flex flex-col gap-3 rounded-[12px] border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {studio.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">{studio.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{studio.type}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {studio.location} • {studio.distance}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* View all link */}
        <Reveal delay={400} className="mt-10 text-center">
          <a
            href="/users"
            className="inline-flex h-12 items-center gap-2 rounded-[8px] border border-border bg-background px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            View all studios
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export default StudiosPreview;