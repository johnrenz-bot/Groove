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
 * Client component that renders the stats strip.
 * Receives pre-fetched stats as props from the server component.
 */
export function HeroStatsClient({ stats }: HeroStatsClientProps) {
  const displayStats = [
    { key: 'coaches', label: 'Verified Coaches', count: stats.coaches },
    { key: 'studios', label: 'Studios Listed', count: stats.studios },
    { key: 'disciplines', label: 'Disciplines', count: stats.disciplines },
  ].filter((stat) => stat.count > 0);

  if (displayStats.length === 0) {
    return null;
  }

  return (
    <section className="mt-16" aria-label="Platform statistics">
      <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 py-6">
        {displayStats.map((stat, index) => (
          <div key={stat.key} className="flex flex-col items-center text-center">
            <div className="text-3xl md:text-4xl font-semibold text-white tabular-nums">
              {formatStatValue(stat.count, stat.label)}
            </div>
            <p className="mt-1 text-xs md:text-sm font-medium uppercase tracking-wider text-white/50">
              {stat.label}
            </p>
            {index < displayStats.length - 1 && (
              <div className="hidden md:block w-px h-10 bg-white/10 mx-5 md:mx-8" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default HeroStatsClient;