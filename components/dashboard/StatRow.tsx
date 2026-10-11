import React from 'react';
import { StatCard } from '@/components/shared/StatCard';

export interface StatRowItem {
  value: React.ReactNode;
  label: string;
  description?: string;
  icon: React.ReactNode;
}

export interface StatRowProps {
  stats: StatRowItem[];
  loading?: boolean;
}

export function StatRow({ stats, loading = false }: StatRowProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="g-skeleton h-32 rounded-[20px]" aria-hidden />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      {stats.map((s, i) => (
        <StatCard
          key={i}
          value={s.value}
          label={s.label}
          description={s.description}
          icon={s.icon}
        />
      ))}
    </div>
  );
}

export default StatRow;
