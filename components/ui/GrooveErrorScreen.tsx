import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/components/shared/cn';

/**
 * THE ONE ERROR SCREEN.
 *
 * `app/not-found.tsx`, `app/error.tsx` and `app/global-error.tsx` all render
 * this. Three files existed for three failure modes and, before this, none of
 * them existed at all — Next's stock screens were what a visitor saw, which
 * means a branded product was presenting a generic framework page.
 *
 * The shapes here are deliberate:
 *
 *   - The status code is the HEADLINE, not decoration. 404, 403, 500 and 503 are
 *     different problems with different next steps, and a visitor who is told
 *     "something went wrong" learns nothing. `code` is required for exactly that
 *     reason, and `title` is only shown when the code alone is not enough.
 *   - The headline is `noindex` because a 500 or a 503 in someone's browser says
 *     nothing useful to a crawler, and a transient failure should not be indexed.
 *   - NO STACK TRACE, digest, message or any other server detail is rendered.
 *     `error.message` from a thrown server error frequently contains file paths,
 *     SQL or Supabase internals. Where a developer needs a correlation id,
 *     `digest` is safe (it is an opaque hash) and is rendered on request only.
 *   - Copy is written for the person looking at it, not for the developer.
 */

export type ErrorTone = 'neutral' | 'danger' | 'warning' | 'info';

export function GrooveErrorScreen({
  code,
  title,
  description,
  tone = 'neutral',
  digest,
  actions,
  className = '',
}: {
  /** HTTP status, shown as the headline. Required — see above. */
  code: string | number;
  /** Optional second line. Omit when `code` already says it. */
  title?: string;
  description: React.ReactNode;
  tone?: ErrorTone;
  /**
   * Opaque correlation hash from Next's error object. SAFE to show; the error's
   * `message` and `stack` are not, and are deliberately not accepted here so
   * that no caller can pass them by accident.
   */
  digest?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16 text-center font-sans text-foreground',
        className
      )}
    >
      <div className="w-full max-w-md">
        {/* The one place the Groove mark appears on an error page: it says what
            the visitor is still inside, which an unbranded screen does not. */}
        <Image
          src="/image/Logo/GroovePH-Logo.png"
          alt="Groove"
          width={56}
          height={56}
          preload
          className="mx-auto h-14 w-14 rounded-2xl object-contain"
        />

        <p
          className={cn(
            'mt-6 text-[11px] font-semibold uppercase tracking-[0.16em]',
            tone === 'danger' && 'text-danger',
            tone === 'warning' && 'text-warning',
            tone === 'info' && 'text-info',
            tone === 'neutral' && 'text-muted-foreground'
          )}
        >
          Error {code}
        </p>

        <h1 className="g-display mt-2">{title ?? code}</h1>

        <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>

        {/* Only ever a digest. See the prop's doc comment. */}
        {digest && (
          <p className="mt-5 font-mono text-[11px] text-subtle-foreground">
            Reference: {digest}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actions ?? (
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-[0.9375rem] font-semibold tracking-[-0.01em] text-accent-foreground transition-colors duration-150 hover:bg-accent-hover active:scale-[0.98]"
            >
              Back to home
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default GrooveErrorScreen;