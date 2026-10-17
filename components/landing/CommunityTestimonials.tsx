'use client';

import React from 'react';
import { Sparkles, Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  discipline: string;
  city: string;
  quote: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Angelo Reyes',
    role: 'Hip Hop Dancer & Competitor',
    discipline: 'Dance',
    city: 'San Jose del Monte',
    quote:
      'Finding verified rehearsal studios and scheduling crew sessions used to take days of back-and-forth messaging. Groove streamlined our entire rehearsal routine with instant studio bookings.',
    initials: 'AR',
  },
  {
    name: 'Clarisse Mendoza',
    role: 'Vocal Coach & Mentor',
    discipline: 'Singing',
    city: 'Bulacan',
    quote:
      'As a coach, having digital agreements and automated session tracking gives parents complete peace of mind. The platform treats performing arts with true professionalism.',
    initials: 'CM',
  },
  {
    name: 'Jethro Santos',
    role: 'Theater Actor',
    discipline: 'Theater',
    city: 'Malolos',
    quote:
      'The Community Showcase lets us share monologues and stage routine highlights with local directors. I landed my first community production lead role through connections made here.',
    initials: 'JS',
  },
  {
    name: 'Katrina Diaz',
    role: 'Stage Performer & Student',
    discipline: 'Acting',
    city: 'San Jose del Monte',
    quote:
      'The feedback loops from coaches are detailed and constructive. Having audio clips, notes, and milestones in one dashboard helped me ace my conservatory auditions.',
    initials: 'KD',
  },
];

import { Reveal } from '@/components/shared/Reveal';

export function CommunityTestimonials() {
  return (
    <section className="ld-section" aria-labelledby="testimonials-heading">
      <div className="ld-wrap">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">
            <span className="gl-dot" aria-hidden="true" />
            Voices of Groove
          </p>
          <h2 id="testimonials-heading" className="ld-h2">
            What performers and coaches say
          </h2>
          <p className="ld-p">
            Real stories from local artists, mentors, and performers honing their craft across
            San Jose del Monte and Bulacan.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((item, idx) => (
            <Reveal key={item.name} variant="scale" delay={idx * 60} className="h-full">
              <div
                className="relative flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg dark:hover:shadow-accent/5"
              >
                {/* Top Accent Gradient Line */}
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

                <div>
                  {/* Discipline Tag & Star Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-text">
                      <Sparkles className="h-3 w-3" />
                      {item.discipline}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500" aria-label="5 stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-text">
                    {item.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                      {item.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.role} · {item.city}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CommunityTestimonials;
