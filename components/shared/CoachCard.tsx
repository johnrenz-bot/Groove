'use client';

import React from 'react';
import Link from 'next/link';
import { Star, MapPin, Bot, Calendar, MessageSquare, User, ArrowUpRight } from 'lucide-react';
import { FullCoach } from '@/lib/types';
import { getInitials, parseGenres } from '@/lib/utils';
import { VerifiedBadge, VerifiedIcon } from '@/features/verification/components/VerifiedBadge';
import { coachBookingGate } from '@/features/verification/services/verification';
import { statusMeta } from '@/features/presence/utils/presence';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { cn } from '@/components/shared/cn';

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
 */
function CoachPresence({ coach }: { coach: FullCoach }) {
  const presence = usePresence(coach.id, coach.status);
  const meta = statusMeta(presence);
  if (presence === 'offline') return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md"
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
  const gate = coachBookingGate(coach);
  const rating = coach.rating ?? 5.0;
  const ratingCount = coach.rating_count ?? 0;
  const location = coach.city_name || coach.address_summary || 'San Jose del Monte, Bulacan';
  const category = cp?.talents || 'Performing Arts';
  const fee = cp?.service_fee ?? 500;
  const duration = cp?.duration || '1 hr session';
  const bio = coach.bio || 'Dedicated performing arts instructor guiding students in artistic excellence and technique.';
  const genres = parseGenres(cp?.genres);
  const fullName = `Coach ${coach.firstname} ${coach.lastname}`;

  return (
    <article
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-[#0e1217] shadow-lg transition-all duration-500 hover:border-accent/50 hover:shadow-[0_20px_48px_rgba(0,0,0,0.7)] aspect-[3/4] sm:aspect-[4/5] min-h-[480px] w-full',
        className
      )}
    >
      {/* 1. Full-Bleed Media Background */}
      {coach.photo_url ? (
        <img
          src={coach.photo_url}
          alt={fullName}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-[#161a22] via-[#0f1318] to-[#0a0c0e]">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent-soft text-2xl font-black uppercase tracking-wider text-accent-text shadow-inner">
            {getInitials(coach.firstname, coach.lastname)}
          </span>
        </div>
      )}

      {/* 2. Gradient Overlays */}
      {/* Top Scrim for Badges */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Bottom Deep Cinematic Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-5/6 bg-gradient-to-t from-black via-black/85 via-45% to-transparent z-10 transition-opacity duration-300 group-hover:opacity-95"
        aria-hidden="true"
      />

      {/* Subtle Full Dark Tint on Hover (Desktop) */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10"
        aria-hidden="true"
      />

      {/* 3. Top Floating Badges */}
      <div className="relative z-20 flex items-start justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
            {category}
          </span>
          <CoachPresence coach={coach} />
          <VerifiedBadge
            verified={coach.account_verified}
            size="sm"
            label="Verified"
            className="border-white/20 bg-black/65 text-white backdrop-blur-md"
          />
        </div>

        {/* Rating */}
        <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          <span>{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
          <span className="font-normal text-white/60">({ratingCount})</span>
        </div>
      </div>

      {/* 4. Bottom Information & Actions Panel */}
      <div className="relative z-20 flex flex-col justify-end p-5 sm:p-6 w-full">
        {/* Persistent Details (Visible Always) */}
        <div className="space-y-1.5">
          {/* Fee Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-black/70 px-3 py-1 text-xs font-bold tabular-nums text-accent-text backdrop-blur-md shadow-sm">
            ₱{fee.toLocaleString()}
            <span className="text-[10px] font-normal text-white/70">/ {duration}</span>
          </div>

          {/* Coach Name */}
          <h3 className="flex items-center gap-2 text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-md">
            <span className="truncate">{fullName}</span>
            <VerifiedIcon verified={coach.account_verified} className="h-4 w-4 shrink-0 text-accent" />
          </h3>

          {/* Location & Specialty line */}
          <p className="flex items-center gap-1.5 text-xs text-white/80 drop-shadow-sm font-medium">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>

          {/* Genre Chips */}
          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm"
                >
                  {g}
                </span>
              ))}
              {genres.length > 3 && (
                <span className="text-[10px] font-semibold text-white/60">
                  +{genres.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expandable on Hover (Desktop) / Always Visible (Mobile) */}
        <div className="flex flex-col gap-3 transition-all duration-500 ease-out max-md:mt-3 max-md:opacity-100 max-md:translate-y-0 md:max-h-0 md:opacity-0 md:translate-y-4 md:group-hover:mt-3 md:group-hover:max-h-56 md:group-hover:opacity-100 md:group-hover:translate-y-0 overflow-hidden">
          {/* Short Bio */}
          <p className="line-clamp-2 text-xs leading-relaxed text-white/85 drop-shadow-sm font-medium">
            {bio}
          </p>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/userprofile/${coach.id}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-black/50 px-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-black hover:border-white"
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile</span>
            </Link>

            <Link
              href={`/messages?user=${coach.id}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-black/50 px-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-black hover:border-white"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </Link>

            <button
              type="button"
              onClick={() => onAskAI?.(coach)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent-soft/80 px-2 text-xs font-semibold text-accent-text backdrop-blur-md transition hover:bg-accent hover:text-accent-foreground"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>AI</span>
            </button>
          </div>

          {/* Primary CTA: Book Session */}
          {gate.allowed ? (
            <button
              type="button"
              onClick={() => onBook?.(coach)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-lg transition hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] active:scale-[0.98]"
            >
              <Calendar className="h-4 w-4" />
              <span>Book Session</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBlockedBook?.(coach)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/60 px-4 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
            >
              <Calendar className="h-4 w-4" />
              <span>Verify First to Book</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default CoachCard;