'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

/**
 * Closing call to action — redesigned as a full-width dark panel with
 * a Philippine textile pattern overlay and warm amber accent.
 *
 * One headline, two actions, a proof row, and a cultural pattern accent.
 * No competing centres of gravity.
 */
const benefits = [
  'Book rehearsals & sessions',
  'Verified coaches & studios',
  'Digital contracts',
  'Community Showcase',
  'Groovey AI assistant',
];

export function FinalCta() {
  return (
    <section className="ld-section" aria-labelledby="cta-heading">
      <div className="ld-wrap">
        <Reveal variant="scale">
          <div className="ld-cta-panel" role="presentation">
            {/* Pattern overlay */}
            <div className="ld-cta-pattern" aria-hidden="true">
              <svg viewBox="0 0 96 96" width="100%" height="100%" preserveAspectRatio="none">
                <defs>
                  <pattern id="cta-banig" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="24" y2="0" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.5" />
                    <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.35" />
                    <line x1="0" y1="16" x2="24" y2="16" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.5" />
                    <line x1="0" y1="0" x2="0" y2="24" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.35" />
                    <line x1="8" y1="0" x2="8" y2="24" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.3" />
                    <line x1="16" y1="0" x2="16" y2="24" stroke="currentColor" strokeWidth="0.35" strokeOpacity="0.35" />
                    <line x1="0" y1="24" x2="24" y2="0" stroke="currentColor" strokeWidth="0.2" strokeOpacity="0.25" />
                    <rect x="10" y="10" width="4" height="4" stroke="currentColor" strokeWidth="0.25" fill="none" strokeOpacity="0.4" transform="rotate(45 12 12)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-banig)" />
              </svg>
            </div>

            {/* Gold accent bar at top */}
            <div className="ld-cta-accent-bar" aria-hidden="true" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4">
              <p className="ld-eyebrow">Ready to begin</p>

              <h2 id="cta-heading" className="ld-cta-heading">
                Ready to take the stage?
              </h2>

              <p className="ld-p max-w-xl">
                Join the growing community of performers and coaches in San Jose del Monte.
                Sign up in minutes and start your journey today.
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/register/client"
                  className="ld-btn ld-btn--gold group transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span>Get started free</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/login"
                  className="ld-btn2 ld-btn2--lg transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Sign in
                </Link>
              </div>

              {/* Proof line */}
              <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="ld-small inline-flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCta;