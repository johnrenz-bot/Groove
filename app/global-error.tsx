'use client';

import { RotateCcw, Home } from 'lucide-react';

/**
 * GLOBAL ERROR BOUNDARY — `app/global-error.tsx`.
 *
 * The last line of defence. It fires when the ROOT LAYOUT itself throws, which
 * means `app/layout.tsx` never rendered: no fonts, no theme tokens, no
 * providers, no stylesheet from the layout tree.
 *
 * That constraint drives everything below. This file:
 *
 *   - renders its own `<html>` and `<body>`, because the ones that would normally
 *     do it are supplied by the layout that just crashed;
 *   - uses INLINE styles for everything, because a class like `bg-background`
 *     compiles to `background-color: var(--background)` and `--background` is
 *     declared in a stylesheet the failed layout was responsible for loading.
 *     The one thing that must NOT happen here is a page whose text is invisible
 *     because a CSS custom property did not resolve;
 *   - hard-codes the system font stack, because `--font-sans` comes from a
 *     `next/font` variable class the root layout puts on `<html>` and that is not
 *     present;
 *   - does NOT import `GrooveErrorScreen`. That component is right everywhere
 *     else, but it leans on `.g-display` and token utilities, and the one time it
 *     must render is the time those are least likely to resolve. A little
 *     duplicated markup is the correct trade for a page that must never be blank.
 *
 * `error.message` and `error.stack` are still not rendered — only `digest`, which
 * is an opaque hash, so it is safe to show and safe for a user to quote back.
 *
 * The brand is carried by the mascot lockup rendered inline rather than by the
 * `next/image` pipeline, which is also part of the layout that just failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const surface = '#f7f0e1';
  const ink = '#353535';
  const muted = '#6b6459';
  const faint = '#736b5f';
  const accent = '#2f3a45';
  const danger = '#ae313a';
  const font =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const secondaryButton: React.CSSProperties = {
    display: 'inline-flex',
    height: '3rem',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0 1.5rem',
    borderRadius: '9999px',
    border: '1px solid #ddd1b8',
    backgroundColor: 'transparent',
    color: ink,
    fontSize: '0.9375rem',
    fontWeight: 600,
    textDecoration: 'none',
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: surface,
          color: ink,
          fontFamily: font,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2.5rem 1.25rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '28rem' }}>
          {/* The mascot, drawn inline. `next/image` is part of the layout that
              just crashed, so the asset is read straight from `public`. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image/Logo/GroovePH-Logo.png"
            alt="Groove"
            width={56}
            height={56}
            style={{
              width: '3.5rem',
              height: '3.5rem',
              margin: '0 auto',
              borderRadius: '1rem',
              objectFit: 'contain',
            }}
          />

          <p
            style={{
              margin: '1.5rem 0 0',
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: danger,
            }}
          >
            Application error
          </p>

          <h1
            style={{
              margin: '0.5rem 0 0',
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: ink,
            }}
          >
            Groove couldn&rsquo;t start
          </h1>

          <p
            style={{
              margin: '0.75rem 0 0',
              fontSize: '0.9375rem',
              lineHeight: 1.65,
              color: muted,
            }}
          >
            Something went wrong before this page could load. Reloading usually
            fixes it. If it keeps happening, try again in a few minutes.
          </p>

          {error.digest && (
            <p
              style={{
                margin: '1.25rem 0 0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.6875rem',
                color: faint,
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                height: '3rem',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0 1.5rem',
                border: 'none',
                borderRadius: '9999px',
                backgroundColor: accent,
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                fontFamily: font,
                cursor: 'pointer',
              }}
            >
              <RotateCcw width={16} height={16} aria-hidden="true" />
              Try again
            </button>

            {/* A plain anchor, not `next/link`, on purpose. The rule is right
                everywhere else and wrong in this file: the root layout is what
                crashed, so the router and the client transition are exactly the
                things that cannot be trusted, and a hard document navigation is
                the only recovery guaranteed to work. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={secondaryButton}>
              <Home width={16} height={16} aria-hidden="true" />
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}