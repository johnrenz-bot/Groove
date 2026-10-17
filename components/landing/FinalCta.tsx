'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * Closing call to action.
 *
 * A single centred card: one headline, one line of support copy, two actions
 * and a benefits row underneath. The previous version stacked a 5-item grid of
 * benefit cards below two more CTAs and a decorative grid overlay — three
 * competing centres of gravity. Benefits now read as one line of quiet proof
 * text, which is what they are.
 */
const benefits = [
  'Book rehearsals & sessions',
  'Verified coaches & studios',
  'Digital contracts',
  'Community Showcase',
  'Groovey AI assistant',
];

import { Reveal } from '@/components/shared/Reveal';

export function FinalCta() {
  return (
    <section className="ld-section" aria-labelledby="cta-heading">
      <div className="ld-wrap">
        <Reveal variant="scale">
          <div className="ld-card ld-card--pad flex flex-col items-center gap-6 px-6 py-14 text-center sm:px-12 sm:py-16 shadow-xl border-accent/20">
            <p className="ld-eyebrow">Ready to begin</p>

            <h2 id="cta-heading" className="ld-h2 max-w-2xl">
              Ready to take the stage?
            </h2>

            <p className="ld-p max-w-xl">
              Join the growing community of performers and coaches in San Jose del Monte. Sign
              up in minutes and start your journey today.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/register/client" className="ld-btn transition-transform duration-200 hover:-translate-y-0.5">
                Get started free
              </Link>
              <Link href="/login" className="ld-btn2 ld-btn2--lg transition-transform duration-200 hover:-translate-y-0.5">
                Sign in
              </Link>
            </div>

            {/* Proof line. One row, one weight, no icons competing with the CTAs. */}
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="ld-small inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCta;