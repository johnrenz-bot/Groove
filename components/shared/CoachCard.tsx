'use client';

import React from 'react';
import { Star, MapPin, Bot, Calendar, MessageSquare } from 'lucide-react';
import { FullCoach } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { ImageCard } from '@/components/shared/ImageCard';
import { VerifiedBadge } from '@/components/verification/VerifiedBadge';
import { coachBookingGate } from '@/lib/verification';
import { statusMeta } from '@/lib/presence';
import { usePresence } from '@/lib/presence/usePresence';

/**
 * Coach directory card.
 *
 * Presentation only. All layout, hover, touch and motion behaviour lives in the
 * shared `ImageCard`, which is also used by the studio, discipline and
 * registration role cards — no card styling is redefined here.
 */
interface CoachCardProps {
  coach: FullCoach;
  onBook?: (coach: FullCoach) => void;
  onAskAI?: (coach: FullCoach) => void;
  /** Called when Book is pressed on an unverified coach, to surface the notice. */
  onBlockedBook?: (coach: FullCoach) => void;
  className?: string;
}

/**
 * Live availability chip for a coach card.
 *
 * A component of its own because `usePresence` is a hook and cannot be called
 * from inside the card's JSX. Styled to sit on the card's dark media overlay, so
 * it carries its own background rather than borrowing the surface tokens.
 */
function CoachPresence({ coach }: { coach: FullCoach }) {
  const presence = usePresence(coach.id, coach.status);
  const meta = statusMeta(presence);
  // Offline is the default for an account that never set a status, so it is not
  // worth a chip on a directory of twenty coaches; the rest are worth showing.
  if (presence === 'offline') return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
      title={`Status: ${meta.label}`}
    >
      <span className={`g-presence-dot g-presence-dot--${presence}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function CoachCard({
  coach,
  onBook,
  onAskAI,
  onBlockedBook,
  className = '',
}: CoachCardProps) {
  const cp = coach.coach_profile;
  // An unverified coach cannot take bookings, so the Book action is replaced with
  // an explanation rather than left to fail at submit time. The hardcoded
  // "Verified coach" tick this badge used to be is now driven by the real flag.
  const gate = coachBookingGate(coach);
  const bookAction = gate.allowed
    ? {
        label: 'Book',
        variant: 'primary' as const,
        icon: <Calendar className="h-3.5 w-3.5" />,
        onClick: () => onBook?.(coach),
      }
    : {
        label: 'Verify first',
        icon: <Calendar className="h-3.5 w-3.5" />,
        onClick: () => onBlockedBook?.(coach),
      };
  const rating = coach.rating ?? 5.0;
  const ratingCount = coach.rating_count ?? 0;
  const location = coach.city_name || coach.address_summary || 'San Jose del Monte';
  const category = cp?.talents || 'Performing Arts';
  const fee = cp?.service_fee ?? 500;
  const bio = coach.bio || 'Dedicated performing arts coach guiding students in artistic excellence.';

  return (
    <ImageCard
      className={className}
      image={coach.photo_url}
      alt={`Coach ${coach.firstname} ${coach.lastname}`}
      name={`Coach ${coach.firstname} ${coach.lastname}`}
      subtitle={category}
      description={bio}
      overlay
      aspect="aspect-[3/4]"
      fallback={
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-xl font-bold uppercase tracking-wide text-accent-text">
          {getInitials(coach.firstname, coach.lastname)}
        </span>
      }
      badges={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {category}
          </span>
          {/* Presence sits beside the category chip so availability is visible
              on the card itself, not only after opening a profile. */}
          <CoachPresence coach={coach} />
          <VerifiedBadge
            verified={coach.account_verified}
            size="sm"
            label="Verified coach"
            className="border-white/20 bg-black/55 text-white"
          />
        </>
      }
      status={
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
          <Star className="h-3 w-3 fill-accent text-accent" />
          <span>{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
          <span className="font-normal text-white/60">({ratingCount})</span>
        </span>
      }
      location={
        <>
          <MapPin className="h-3 w-3 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </>
      }
      rate={
        <>
          &#8369;{fee}
          <span className="ml-1 text-xs font-normal text-white/70">/ session</span>
        </>
      }
      actions={[
        { label: 'View', href: `/userprofile/${coach.id}` },
        {
          // Deep link into the EXISTING messenger, addressed by id. The
          // messenger opens this coach's thread if one exists and starts one on
          // the first message sent, so no duplicate conversation is created and
          // no second messaging UI is introduced.
          label: 'Message',
          href: `/messages?user=${coach.id}`,
          icon: <MessageSquare className="h-3.5 w-3.5" />,
        },
        {
          label: 'AI',
          icon: <Bot className="h-3.5 w-3.5 text-accent-text" />,
          onClick: () => onAskAI?.(coach),
        },
        bookAction,
      ]}
    />
  );
}

export default CoachCard;