'use client';

/**
 * Showcase performance — coach side.
 *
 * Real counts only: showcase/community posts authored by this coach and the
 * reacts received on them. If either query fails we say so — never a fake zero.
 */

import React from 'react';
import Link from 'next/link';
import { Sparkles, Heart, Users } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';

export function ShowcaseStats({
  postCount,
  reactsReceived,
}: {
  postCount: number | null;
  reactsReceived: number | null;
}) {
  const unavailable = postCount === null && reactsReceived === null;

  return (
    <PanelCard
      icon={<Sparkles className="h-4 w-4" />}
      title="Showcase Performance"
      viewAllHref="/coach/talents"
      viewAllLabel="Open showcase"
    >
      {unavailable ? (
        <p className="py-6 text-center text-xs leading-relaxed text-muted-foreground">
          Showcase stats are unavailable right now. Your posts still live on the showcase.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-accent-text" aria-hidden="true" />
            <p className="mt-2 font-serif text-4xl font-bold tabular-nums leading-none tracking-tight text-foreground">
              {postCount ?? '—'}
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Post{postCount === 1 ? '' : 's'} published
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4 text-center">
            <Heart className="mx-auto h-5 w-5 text-danger" aria-hidden="true" />
            <p className="mt-2 font-serif text-4xl font-bold tabular-nums leading-none tracking-tight text-foreground">
              {reactsReceived ?? '—'}
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Reacts received
            </p>
          </div>
        </div>
      )}

      <Link
        href="/coach/talents"
        className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View your showcase
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </PanelCard>
  );
}

export default ShowcaseStats;

