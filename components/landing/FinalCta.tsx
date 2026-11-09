'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/shared/Reveal';

const benefits = [
  'Book rehearsals & sessions',
  'Verified coaches & studios',
  'Digital contracts',
  'Community Showcase',
  'Groovey AI assistant',
];

export function FinalCta() {
  return (
    <section
      id="cta"
      className="ld-section scroll-mt-28"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="rounded-[16px] border border-border bg-card p-6 sm:p-10 text-center shadow-sm">
          <Reveal>
            <p className="text-sm font-semibold text-accent uppercase tracking-wider">
              Ready to begin
            </p>

            <h2 id="cta-heading" className="mt-3 text-3xl font-serif font-bold text-foreground sm:text-4xl">
              Ready to take the stage?
            </h2>

            <p className="mt-4 max-w-[62ch] text-lg text-muted-foreground sm:mx-auto">
              Join the growing community of performers and coaches in San Jose del Monte.
              Sign up in minutes and start your journey today.
            </p>

            {/* Benefits */}
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register/client"
                className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-accent px-6 text-base font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Get started free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-[8px] border border-border bg-background px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default FinalCta;