'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { cn } from '@/components/shared/cn';
import type { BadgeVariant } from '@/components/ui/Badge';

export interface UpcomingSessionsWidgetProps {
  appointments: Appointment[];
  loading?: boolean;
  viewAllHref: string;
  perspective: 'client' | 'coach';
  className?: string;
}

function statusVariant(status: string): BadgeVariant {
  if (status === 'confirmed') return 'approved';
  if (status === 'pending') return 'pending';
  if (status === 'cancelled') return 'cancelled';
  return 'neutral';
}

export function UpcomingSessionsWidget({
  appointments,
  loading = false,
  viewAllHref,
  perspective,
  className,
}: UpcomingSessionsWidgetProps) {
  return (
    <Card padding="md" className={cn('h-full', className)}>
      <CardHeader
        icon={<Calendar className="h-4 w-4" />}
        title="Upcoming Sessions"
        subtitle="Your booked rehearsals"
        action={
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-muted-foreground transition hover:text-accent-text"
          >
            View all
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="g-skeleton h-16 rounded-2xl" aria-hidden />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          compact
          icon={<Calendar className="h-5 w-5" />}
          title="No upcoming sessions."
          description="Book a coach to schedule rehearsal."
          actionHref={perspective === 'client' ? '/client/talent' : '/coach/appointments'}
          action="Browse"
        />
      ) : (
        <div className="space-y-2.5">
          {appointments.map((appt) => {
            const name =
              perspective === 'client'
                ? appt.coach
                  ? `${appt.coach.firstname} ${appt.coach.lastname}`
                  : 'Coach Session'
                : (appt as unknown as { client?: { firstname?: string; lastname?: string } }).client
                  ? `${(appt as unknown as { client?: { firstname?: string; lastname?: string } }).client!.firstname ?? ''} ${(appt as unknown as { client?: { firstname?: string; lastname?: string } }).client!.lastname ?? ''}`.trim()
                  : appt.name ?? 'Student';

            return (
              <div
                key={appt.id}
                className="rounded-2xl border border-border bg-card p-3.5 transition hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-foreground">{name}</span>
                  <Badge variant={statusVariant(appt.status)} dot>
                    {appt.status}
                  </Badge>
                </div>
                <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden />
                    {formatDate(appt.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden />
                    {appt.start_time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default UpcomingSessionsWidget;
