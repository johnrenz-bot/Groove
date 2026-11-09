'use client';

import { usePathname } from 'next/navigation';

export type PagePatternsVariant = 'full' | 'top-only' | 'none';

/**
 * GLOBAL BLACK-AND-GOLD GEOMETRIC BACKGROUND — ONE mount for the whole site.
 *
 * Mounted ONCE in `app/layout.tsx`, so every route inherits the same artwork
 * and there is exactly one copy in the DOM. Because the root layout never
 * remounts on client-side navigation, these fixed rails stay in place across
 * route changes and never reload. No page mounts its own copy (`PagePatterns`
 * is referenced only from the root layout), so there is nothing to keep in
 * sync route-by-route.
 *
 * Artwork (all in `app/globals.css`, as CSS masks over data-URI SVGs — sharp
 * at any size, zero image requests, no blur filters, no animation):
 *   - Two full-height woven edge rails, one at each screen edge. Each rail is
 *     a repeating diagonal diamond lattice (nested diamonds with small solid
 *     diamonds in the gaps, echoing traditional woven / bamboo geometry) that
 *     fades smoothly to transparent before the centre, plus a fine gold trim
 *     line along its inner edge. The centre of the viewport stays clean for
 *     readability; the pattern lives in the side gutters.
 *   - Four compass / sunburst ornaments (concentric rings, eight alternating
 *     rays, cardinal diamonds and a centre star) set over the rails near the
 *     top and bottom edges — top pair always on, bottom pair only for
 *     `variant="full"` (the root mount). Hidden on phones, small on tablets,
 *     so they never compete with the header, the drawer or body text.
 *   - A very faint diagonal dark-gold metallic wash across the viewport
 *     (3-5% alpha) so the black reads deep and premium rather than flat.
 *
 * Colour / opacity come from `--pattern-color` / `--pattern-opacity` /
 * `--pattern-opacity-sun`, defined per theme on `:root` / `.light` — dark and
 * light follow the Light/Dark/System switch with no JS and no flicker, and
 * light mode simply reads as muted gold on cream.
 *
 * Layering: `fixed inset-0 z-0` with `pointer-events-none`, so the decoration
 * can never block a click, capture a scroll or trap a focus state. The page
 * background colour lives on <body> (Tailwind `bg-background`); the full-page
 * shells below are made transparent by the solid, same-colour bridge rules in
 * globals.css (`.min-h-screen.bg-background`, plus the forced-dark shells in
 * dark themes only) so the weave shows through every shell without touching
 * any layout file, sidebar, navigation or component. All page content sits in
 * the `relative z-10` wrapper in app/layout.tsx, while the navbar (z-1000),
 * dropdowns (z-100 inside the bar's own layer), the mobile drawer (z-1100),
 * modals (z-1200+) and the Grooveyy AI widget sit far above. `overflow-hidden`
 * on this container crops anything off-screen, so
 * the pattern cannot create horizontal scroll at any viewport width.
 *
 * Exceptions (by design, not by omission):
 *   - Auth routes (/login, /register/*) keep their own cinematic layer
 *     (AmbientBackground + PixelBackground + split imagery) and stay off
 *     here, so two woven backgrounds never stack behind a form. This layer
 *     is the single global background for every other route.
 *   - Dense admin tables (`data-dim="strong"`) and the landing hero
 *     (`data-dim="soft"`) render the same artwork quieter, so data and
 *     photography stay readable. Nothing else changes.
 */
export function PagePatterns({ variant = 'full' }: { variant?: PagePatternsVariant }) {
  const pathname = usePathname();

  if (variant === 'none') return null;

  // Auth screens have their own full-bleed cinematic background; patterns add noise
  // there, so the shared mount stays off on those routes.
  const isAuthRoute =
    pathname === '/login' ||
    pathname?.startsWith('/login/') ||
    pathname === '/register' ||
    pathname?.startsWith('/register/');
  if (isAuthRoute) return null;

  // Dense admin tables and the landing hero get a quieter treatment so data
  // and imagery stay readable. Everything else renders at full strength.
  const dim = pathname?.startsWith('/admin') ? 'strong' : pathname === '/' ? 'soft' : undefined;
  const showBottom = variant === 'full';

  return (
    <div
      aria-hidden="true"
      data-dim={dim}
      className="page-patterns pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Diagonal dark-gold metallic wash — depth without brightness. */}
      <div className="pp-metallic" />

      {/* Left woven edge rail: diamond lattice. The inner trim line is a
          sibling outside the masked rail, so the centre fade cannot hide it. */}
      <div className="pp-rail pp-rail-left">
        <div className="pp-rail-weave" />
      </div>
      <div className="pp-trim pp-trim-left" />

      {/* Right woven edge rail (mirror). */}
      <div className="pp-rail pp-rail-right">
        <div className="pp-rail-weave" />
      </div>
      <div className="pp-trim pp-trim-right" />

      {/* Compass / sunburst ornaments over the rails. */}
      <div className="pp-compass pp-compass-tl">
        <div className="pp-compass-art" />
      </div>
      <div className="pp-compass pp-compass-tr">
        <div className="pp-compass-art" />
      </div>

      {showBottom && (
        <>
          <div className="pp-compass pp-compass-bl">
            <div className="pp-compass-art" />
          </div>
          <div className="pp-compass pp-compass-br">
            <div className="pp-compass-art" />
          </div>
        </>
      )}
    </div>
  );
}

export default PagePatterns;
