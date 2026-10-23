'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

/**
 * "How it works" — four steps in a horizontal timeline on desktop,
 * vertical stack on mobile. A connector line runs between steps.
 * Each step is a numbered card with title, description, and highlights.
 */
const steps = [
  {
    number: 1,
    title: 'Create your profile',
    description:
      'Sign up as a performer or a coach. Add your disciplines, rates, availability, and portfolio in a few minutes.',
    highlights: ['Instant setup', 'Secure & private', 'Multi-discipline support'],
    accent: 'rgba(201,162,74,0.9)',
  },
  {
    number: 2,
    title: 'Find a coach or studio',
    description:
      'Search verified coaches by discipline, compare rates and reviews, then request a session that fits your schedule.',
    highlights: ['Smart filters', 'Verified reviews', 'Real-time availability'],
    accent: 'rgba(174,49,58,0.8)',
  },
  {
    number: 3,
    title: 'Book and sign contract',
    description:
      'Confirm the agreement with a digital signature, coordinate in the studio, and grow your craft with the community.',
    highlights: ['Digital signature', 'Auto-generated PDF', 'Audit trail'],
    accent: 'rgba(37,99,235,0.8)',
  },
  {
    number: 4,
    title: 'Rehearse and perform',
    description:
      'Track progress, share performances on the Showcase, and build your reputation in the performing arts community.',
    highlights: ['Progress dashboard', 'Community Showcase', 'Coach feedback'],
    accent: 'rgba(201,162,74,0.9)',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="ld-section" aria-labelledby="how-heading">
      <div className="ld-wrap">
        {/* Section header */}
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">How it works</p>
          <h2 id="how-heading" className="ld-h2">
            From discovery to performance in four steps
          </h2>
          <p className="ld-p">
            Groove makes it simple to find the right coach, book a session, and sign your
            agreement — all in one place.
          </p>
        </Reveal>

        {/* Steps — horizontal timeline on lg, stacked on mobile */}
        <div className="mt-12 ld-how-grid" role="list">
          {steps.map((step, idx) => (
            <Reveal key={step.number} variant="up" delay={idx * 80} className="h-full">
              <article
                className="ld-how-card h-full group"
                role="listitem"
                style={{ '--step-accent': step.accent } as React.CSSProperties}
              >
                {/* Connector line (not on last step) */}
                {idx < steps.length - 1 && (
                  <div className="ld-how-connector" aria-hidden="true" />
                )}

                {/* Step number badge */}
                <div className="ld-how-num" aria-hidden="true">
                  {step.number}
                </div>

                {/* Content */}
                <h3 className="ld-h3 mt-4">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] flex-1">
                  {step.description}
                </p>

                {/* Highlights */}
                <ul className="mt-4 flex flex-col gap-1.5 pt-3 border-t border-[var(--border)]">
                  {step.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="inline-flex items-start gap-2 text-[13px] text-[var(--muted-foreground)]"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]"
                        aria-hidden="true"
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="ld-small text-center">Ready to start your journey?</p>
          <Link href="/register/client" className="ld-btn group">
            <span>Get started free</span>
            <ArrowRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;