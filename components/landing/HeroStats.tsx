'use client';

import { formatStatValue } from './landingStats';

interface HeroStatsClientProps {
  stats: {
    coaches: number;
    studios: number;
    disciplines: number;
  };
}

export function HeroStatsClient({ stats }: HeroStatsClientProps) {
  const displayStats = [
    { key: 'coaches', label: 'Verified coaches', count: stats.coaches },
    { key: 'studios', label: 'Studios listed', count: stats.studios },
    { key: 'disciplines', label: 'Disciplines', count: stats.disciplines },
  ].filter((stat) => stat.count > 0);

  if (displayStats.length === 0) return null;

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-6" role="group" aria-label="Platform statistics">
      {displayStats.map((stat, idx) => (
        <div key={stat.key} className="flex flex-col items-center">
          <span className="text-2xl font-bold text-foreground sm:text-3xl" aria-hidden="true">
            {formatStatValue(stat.count, stat.label)}
          </span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export default HeroStatsClient;