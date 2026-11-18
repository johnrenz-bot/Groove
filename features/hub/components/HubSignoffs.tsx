'use client';

/**
 * HubSignoffs — the signature/stage timeline shared by the Case Panel.
 *
 * Renders one avatar per lifecycle step, connected by lines, with a status
 * glyph on each. Deterministic from the booking row + the stamps written by
 * the guard — never guessed.
 *
 * Steps are role-dependent; the order below mirrors the actual DB state
 * machine.
 */
import React from 'react';
import { Check, Clock3, X, UserRound, AlertTriangle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import {
  buildTimeline,
  statusMeta,
} from '@/features/appointments/services/bookingStatus';
import type { Appointment } from '@/lib/types';

interface Stamps {
  [stage: string]: string | null;
}

export function HubSignoffs({
  appointment,
  stamps,
}: {
  appointment: Pick<Appointment, 'status' | 'date' | 'start_time'>;
  stamps: Stamps;
}) {
  const timeline = buildTimeline(appointment.status, stamps);

  return (
    <ol className="relative mt-3 space-y-3" aria-label="Signature timeline">
      {timeline.map((stage) => {
        const done = stage.reached;
        const current = stage.current;
        const offPath = isTerminalOffPath(appointment.status);
        const Icon = offPath
          ? appointment.status === 'declined' || appointment.status === 'cancelled'
            ? X
            : AlertTriangle
          : done
            ? Check
            : current
              ? Clock3
              : UserRound;
        const tone = offPath
          ? 'danger'
          : done
            ? 'success'
            : current
              ? 'accent'
              : 'muted';
        return (
          <li key={stage.status} className="relative flex items-start gap-3 pl-9">
            {/* connector line (decorative) */}
            <span
              aria-hidden="true"
              className="absolute left-[0.9375rem] top-6 h-full w-px bg-divider"
            />
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border  text-[11px]',
                tone === 'success' && ' bg-success-soft text-success',
                tone === 'accent' && ' border-accent-border bg-accent-soft text-accent-text',
                tone === 'muted' && ' border border-border bg-muted text-muted-foreground',
                tone === 'danger' && ' bg-danger-soft text-danger'
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {stage.label}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                {done
                  ? formatAt(stage.at)
                  : stage.current
                    ? 'In progress'
                    : 'Not started'}
              </p>
              {!done && stage.current && !offPath && (
                <p className="text-[10px] text-accent-text">
                  {appointment.status === 'agreement_required' ? 'Waiting for signatures' : statusMeta(appointment.status).description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function isTerminalOffPath(status: string | null): boolean {
  return ['declined', 'cancelled', 'expired', 'no_show'].includes(status ?? '');
}
function formatAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

