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
 * Compact stats strip — sits at the bottom of the cinematic hero section.
 * Glass-morphism pill bar with three real-database numbers.
 */
export function HeroStatsClient({ stats }: HeroStatsClientProps) {
  const displayStats = [
    { key: 'coaches', label: 'Verified coaches', count: stats.coaches },
    { key: 'studios', label: 'Studios listed', count: stats.studios },
    { key: 'disciplines', label: 'Disciplines', count: stats.disciplines },
  ].filter((stat) => stat.count > 0);

  if (displayStats.length === 0) return null;

  return (
    <div className="ld-hero-stats" role="group" aria-label="Platform statistics">
      {displayStats.map((stat, idx) => (
        <div key={stat.key} className="ld-hero-stat">
          {idx > 0 && (
            <div className="ld-hero-stat-rule" aria-hidden="true" />
          )}
          <span className="ld-hero-stat-value" aria-hidden="true">
            {formatStatValue(stat.count, stat.label)}
          </span>
          <span className="ld-hero-stat-label" aria-hidden="true">{stat.label}</span>
          <span className="sr-only">
            {formatStatValue(stat.count, stat.label)} {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default HeroStatsClient;