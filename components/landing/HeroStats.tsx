'use client';

import { formatStatValue } from './landingStats';

interface HeroStatsClientProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

/**
 * The numbers under the hero.
 *
 * Real counts fetched on the server (`getLandingStats`) and passed down — there
 * is no placeholder and no hard-coded figure. If every count is zero the strip
 * renders nothing at all rather than an empty band.
 *
 * Rows wrap on narrow screens and the hairline rules only appear once the row
 * is wide enough for them to separate something real.
 */
export function HeroStatsClient({ stats }: HeroStatsClientProps) {
  const displayStats = [
    { key: 'coaches', label: 'Verified coaches', count: stats.coaches },
    { key: 'studios', label: 'Studios listed', count: stats.studios },
    { key: 'disciplines', label: 'Disciplines', count: stats.disciplines },
  ].filter((stat) => stat.count > 0);

  if (displayStats.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-14 border-t border-[var(--border)] pt-8"
      aria-label="Platform statistics"
    >
      <dl className="flex flex-wrap items-stretch justify-center gap-x-10 gap-y-6 sm:gap-x-16">
        {displayStats.map((stat) => (
          <div key={stat.key} className="ld-stat">
            <dd className="ld-stat__value">{formatStatValue(stat.count, stat.label)}</dd>
            <dt className="ld-stat__label">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default HeroStatsClient;