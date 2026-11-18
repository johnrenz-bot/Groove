import React from 'react';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';

/**
 * Support CTA for the Help & FAQ page.
 *
 * A visible card linking to /support — the only official entry point to
 * admins for account issues from the member-facing app. Kept as a component
 * so the public and dashboard chromes render the same card.
 */
export function SupportCta() {
  return (
    <section
      aria-labelledby="support-cta"
      className="mx-auto mt-10 max-w-5xl rounded-2xl border border-border bg-accent-soft px-6 py-6 sm:px-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <LifeBuoy className="h-7 w-7 shrink-0 text-accent-text" aria-hidden="true" />
          <div>
            <h2 id="support-cta" className="text-sm font-bold uppercase tracking-[0.1em] text-accent-text">
              Still stuck?
            </h2>
            <p className="mt-1 text-sm text-foreground/90">
              Verification rejections, disputes, suspensions — the admin team responds in-app.
            </p>
          </div>
        </div>
        <Link
          href="/support"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-accent px-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Contact support
        </Link>
      </div>
    </section>
  );
}

