'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { AchievementRequirement } from '@/lib/achievements/types';
import { FeatureProgress } from '@/components/notifications/FeatureProgress';

export interface ProfileProgressCardProps {
  role: 'client' | 'coach';
  /** Live checklist from `profileTaskRequirements` — the real, role-specific set. */
  requirements: AchievementRequirement[];
  className?: string;
}

/**
 * Profile completion for one specific role.
 *
 * Client profiles have three requirements and coach profiles have seven; the
 * counts come from the requirements passed in, never from another feature's
 * total. The card updates as soon as the saved profile rows change.
 */
export function ProfileProgressCard({
  role,
  requirements,
  className,
}: ProfileProgressCardProps) {
  const total = requirements.length;
  const completed = requirements.filter((requirement) => requirement.met).length;
  const remaining = total - completed;
  const complete = total > 0 && completed === total;

  const description = complete
    ? 'Every required profile detail is in place.'
    : remaining === 1
      ? '1 required detail still needs your attention.'
      : `${remaining} required details still need your attention.`;

  return (
    <section
      className={cn('g-card p-4 sm:p-5', className)}
      aria-labelledby={`profile-completion-${role}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <FeatureProgress
          variant="ring"
          size="lg"
          tone={complete ? 'success' : 'gold'}
          completed={completed}
          total={total}
          showLabel={false}
          showValue={false}
          ariaLabel={`${role === 'coach' ? 'Coach' : 'Performer'} profile completion: ${completed} of ${total} requirements met`}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2
              id={`profile-completion-${role}`}
              className="text-sm font-semibold text-foreground"
            >
              Profile completion
            </h2>
            <p className="text-xs font-medium tabular-nums text-muted-foreground">
              {completed} of {total} complete
            </p>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>

          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Profile requirements">
            {requirements.map((requirement) => (
              <li
                key={requirement.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  requirement.met
                    ? 'bg-success-soft text-success'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {requirement.met ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
                )}
                <span>{requirement.label}</span>
                <span className="sr-only">
                  {requirement.met ? ' — completed' : ' — not completed'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ProfileProgressCard;
