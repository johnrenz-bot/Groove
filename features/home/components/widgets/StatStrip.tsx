'use client';

/**
 * The four actionable stat tiles shared by both home dashboards.
 * Each tile is a link into the feature it summarises.
 */

import React from 'react';
import { StatCard, type StatTone } from '@/components/ui/StatCard';

export interface StatTileInput {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  sub?: string;
  accentColor: StatTone;
  href?: string;
}

export function StatStrip({ tiles }: { tiles: StatTileInput[] }) {
  return (
    <div className="app-stat-grid">
      {tiles.map((tile, index) => (
        <StatCard
          key={`${tile.label}-${index}`}
          icon={tile.icon}
          value={tile.value}
          label={tile.label}
          sub={tile.sub}
          accentColor={tile.accentColor}
          href={tile.href}
        />
      ))}
    </div>
  );
}

