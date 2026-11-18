'use client';

/**
 * Students panel for the coach dashboard.
 *
 * Same spirit as the client's coach panel: the 4 newest client-role accounts,
 * test accounts excluded. Coaches never see another coach here.
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInitials } from '@/lib/utils';
import type { StudentSummary } from '../../types';

export function CoachStudentsPanel({ students }: { students: StudentSummary[] }) {
  return (
    <PanelCard
      icon={<GraduationCap className="h-4 w-4" />}
      title="Students in San Jose del Monte"
      viewAllHref="/coach/talents"
      viewAllLabel="View all"
    >
      {students.length === 0 ? (
        <EmptyState
          compact
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
          title="No students yet"
          description="Clients who join GroovePH near San Jose del Monte will appear here. Invite your first client to get started."
          actionHref="/coach/talents"
          action="Browse the showcase"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3.5">
          {students.map((student) => {
            const name = `${student.firstname} ${student.lastname}`.trim();
            return (
              <li
                key={student.id}
                className="group flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted focus-visible:outline-none"
              >
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-foreground ring-2 ring-border">
                  {student.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- roster avatars keep parity with the existing directory tiles
                    <img
                      src={student.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(student.firstname, student.lastname)
                  )}
                </span>
                <span className="w-full truncate text-xs font-bold text-foreground">{name}</span>
                <span className="w-full truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {student.talent?.trim() || 'Performing Arts'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

export default CoachStudentsPanel;

