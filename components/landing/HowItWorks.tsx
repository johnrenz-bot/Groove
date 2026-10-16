'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * "How it works" — four numbered steps.
 *
 * The old version ran a framer-motion scale spring on each badge and an
 * infinite ping ring that repeated every 2.4s, forever, on every card. That is
 * four looping animations on a page the visitor is trying to read. The numbers
 * are now static, the ring is gone, and the only motion left is the 180ms card
 * lift on hover.
 *
 * The step number doubles as the list marker: the `<ol>` carries the semantics,
 * the badge is decorative, and each step is an `<h3>` so the sequence is
 * navigable by heading level.
 */
const steps = [
  {
    number: 1,
    title: 'Create your profile',
    description:
      'Sign up as a performer or a coach. Add your disciplines, rates, availability, and portfolio in a few minutes.',
    highlights: ['Instant setup', 'Secure & private', 'Multi-discipline support'],
  },
  {
    number: 2,
    title: 'Find a coach or studio',
    description:
      'Search verified coaches by discipline, compare rates and reviews, then request a session that fits your schedule.',
    highlights: ['Smart filters', 'Verified reviews', 'Real-time availability'],
  },
  {
    number: 3,
    title: 'Book and sign contract',
    description:
      'Confirm the agreement with a digital signature, coordinate in the studio, and grow your craft with the community.',
    highlights: ['Digital signature', 'Auto-generated PDF', 'Audit trail'],
  },
  {
    number: 4,
    title: 'Rehearse and perform',
    description:
      'Track progress, share performances on the Showcase, and build your reputation in the performing arts community.',
    highlights: ['Progress dashboard', 'Community Showcase', 'Coach feedback'],
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="ld-section" aria-labelledby="how-heading">
      <div className="ld-wrap">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">How it works</p>
          <h2 id="how-heading" className="ld-h2">
            From discovery to performance in four steps
          </h2>
          <p className="ld-p">
            Groove makes it simple to find the right coach, book a session, and sign your
            agreement — all in one place.
          </p>
        </div>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number}>
              <article className="ld-card ld-card--pad ld-card--lift h-full gap-4">
                <span className="ld-num" aria-hidden="true">
                  {step.number}
                </span>
                <h3 className="ld-h3">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {step.description}
                </p>
                <ul className="mt-auto flex flex-col gap-1.5 pt-2">
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
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="ld-small">Ready to start your journey?</p>
          <Link href="/register/client" className="ld-btn">
            Get started free
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;