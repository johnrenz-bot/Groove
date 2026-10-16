'use client';

import { useEffect } from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { GrooveErrorScreen } from '@/components/ui/GrooveErrorScreen';

/**
 * ROUTE-LEVEL ERROR BOUNDARY — `app/error.tsx`.
 *
 * Catches a crash in this segment and everything under it: a server component
 * that threw, a data fetch that surfaced as an exception, a render error in a
 * client child. The rest of the app keeps working, which is the whole reason
 * this is separate from `global-error.tsx`.
 *
 * WHAT IS DELIBERATELY NOT RENDERED
 *
 *   `error.message` and `error.stack` are never shown. A thrown Supabase or
 *   server-component error routinely carries table names, column names, file
 *   paths and occasionally a connection string. This file reads only
 *   `error.digest` — an opaque hash Next generates — and puts it on screen as a
 *   reference the user can quote back. Next still logs the full error in the
 *   server console, so nothing is lost to developers.
 *
 * RETRY, NOT RELOAD
 *
 *   `reset()` re-renders this segment and re-runs its data, with no full page
 *   load. That is the correct action for a transient failure — a dropped
 *   connection, a timeout, a rate limit. A full reload would throw away the
 *   signed-in session's in-memory state to fix something this boundary has
 *   already fixed.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Keeps the real error out of the DOM but in the browser console for a
  // developer with devtools open. Next logs it server-side regardless.
  useEffect(() => {
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <GrooveErrorScreen
      code="Error"
      tone="danger"
      title="Something went wrong on our side"
      description="This page hit an unexpected error. Trying again usually fixes it. If it keeps happening, contact support and quote the reference below."
      digest={error.digest}
      actions={
        <>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold tracking-[-0.01em] text-accent-foreground transition-colors duration-150 hover:bg-accent-hover active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>

          {/* A plain anchor, not `next/link`: this boundary fires because the
              route segment is already in a broken state, so a hard document
              navigation is the only recovery guaranteed to get a clean
              application running. The rule is right everywhere else and wrong
              on an error page. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground transition-colors duration-150 hover:bg-muted active:scale-[0.98]"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Back to home
          </a>
        </>
      }
    />
  );
}