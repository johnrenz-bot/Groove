'use client';

import { usePathname } from 'next/navigation';

export type PagePatternsVariant = 'full' | 'top-only' | 'none';

/**
 * Shared four-corner page decoration for Landing, Client, Coach and Admin.
 *
 * Mounted ONCE in `app/layout.tsx`, so every area inherits the same artwork
 * and there is exactly one copy in the DOM. It replaces the dashboard-only
 * <PatternBackdrop /> (top corners only), which was removed from
 * DashboardLayout for this reason.
 *
 * Corners:
 *   top-left     brick-tile chevrons (existing artwork, unchanged)
 *   top-right    diagonal brick bands + sunburst star (existing, unchanged)
 *   bottom-left  NEW — same chevron mask, flipped vertically and smaller,
 *                so it rhymes with the top-left without being a plain copy
 *   bottom-right NEW — same diagonal bands flipped vertically + a smaller
 *                sunburst, mirroring the top-right for balance
 *
 * Artwork is CSS masks over data-URI SVGs (see globals.css `--gp-*`), so it
 * stays sharp at any size, adds no image requests, and uses no blur filters.
 * Colour/opacity come from `--pattern-color` / `--pattern-opacity`, which are
 * defined per theme — the patterns follow the Light/Dark/System switch with
 * no JS and no flicker.
 *
 * Layering: `fixed inset-0 z-0` with `pointer-events-none`. The page background
 * colour lives ONLY on <body> (globals.css `body { background: ... }`), and
 * every full-page wrapper (DashboardLayout, PublicLayout) is transparent, so
 * nothing opaque sits between the patterns and the viewport. All page content
 * renders inside a `relative z-10` wrapper in app/layout.tsx, while the
 * navbar (z-40), dropdowns (z-50/60), modals (z-70+) and the Grooveyy AI
 * widget (z-40/50) sit far above. Nothing clickable is ever covered, and the
 * off-screen cropping cannot create horizontal scroll.
 */
export function PagePatterns({ variant = 'full' }: { variant?: PagePatternsVariant }) {
  const pathname = usePathname();

  if (variant === 'none') return null;

  // Auth screens have their own full-bleed split imagery; patterns add noise
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
      {/* Top-left: brick chevrons (existing artwork) */}
      <div className="pp-corner pp-pos-tl origin-top-left scale-[0.45] md:scale-[0.7] lg:scale-100">
        <div className="pp-art pp-chevron" />
      </div>

      {/* Top-right: diagonal brick bands (existing artwork) */}
      <div className="pp-corner pp-pos-tr-bands origin-top-right scale-[0.45] md:scale-[0.7] lg:scale-100">
        <div className="pp-art pp-bands">
          <div className="pp-band" />
          <div className="pp-band" />
          <div className="pp-band" />
        </div>
      </div>

      {/* Top-right: sunburst star (existing artwork) */}
      <div className="pp-corner pp-pos-tr-sun origin-top-right scale-[0.45] md:scale-[0.7] lg:scale-100">
        <div className="pp-art pp-sun pp-hide-below-900" />
      </div>

      {showBottom && (
        <>
          {/* Bottom-left: chevrons flipped vertically + smaller */}
          <div className="pp-corner pp-pos-bl origin-bottom-left scale-[0.45] opacity-70 md:scale-[0.7] md:opacity-90 lg:scale-100 lg:opacity-100">
            <div className="pp-art pp-chevron-sm pp-flip-y" />
          </div>

          {/* Bottom-right: diagonal bands flipped vertically */}
          <div className="pp-corner pp-pos-br-bands origin-bottom-right scale-[0.45] opacity-70 md:scale-[0.7] md:opacity-90 lg:scale-100 lg:opacity-100">
            <div className="pp-art pp-bands-sm pp-flip-y">
              <div className="pp-band" />
              <div className="pp-band" />
              <div className="pp-band" />
            </div>
          </div>

          {/* Bottom-right: smaller sunburst */}
          <div className="pp-corner pp-pos-br-sun origin-bottom-right scale-[0.45] md:scale-[0.7] lg:scale-100">
            <div className="pp-art pp-sun-sm pp-hide-below-768" />
          </div>
        </>
      )}
    </div>
  );
}

export default PagePatterns;
