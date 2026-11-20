'use client';

import React from 'react';
import {
  Calendar,
  Camera,
  Loader2,
  MapPin,
  Star,
  UserRound,
} from 'lucide-react';
import { PhilippineSunMark } from '@/features/discipline/components/PhilippineSunMark';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { PhilippineFlag } from '@/components/ui/PhilippineFlag';
import { cn } from '@/lib/utils';

/* ==========================================================================
   PROFILE HERO — the identity header for every profile surface
   --------------------------------------------------------------------------
   One component, two display contexts:

     • owner    (/client/profile, /coach/profile) — camera overlays on the
                 avatar and cover, rendered only when the page passes the
                 matching callbacks. Stats come from live fetches.
     • visitor  (/userprofile/[id]) — same geometry, no edit affordances;
                 `presence` and clickable follower stats are supplied by the
                 page.

   The cover has two honest states: the member's uploaded cover (a
   deterministic public URL in the `avatars` bucket) or a designed fallback
   built from the brand mark and warm gradients. There is no placeholder
   imagery pretending to be a photo.

   Page owns ALL behaviour: upload handlers, share/copy, follow logic, the
   actions row. This component renders what it is given.
   ========================================================================== */

export type HeroRole = 'client' | 'coach';
export interface HeroStat {
  label: string;
  value: React.ReactNode;
  /** When set, the stat renders as a button (e.g. open the follow list). */
  onClick?: () => void;
  ariaLabel?: string;
}

export function ProfileHero({
  role,
  name,
  username,
  rolePill,
  bio,
  locationText,
  memberSince,
  verified,
  presence,
  customId,
  photoUrl,
  coverUrl,
  coverCacheBust,
  stats,
  actions,
  onChangePhoto,
  photoUploading = false,
  onChangeCover,
  coverUploading = false,
  coverButtonLabel,
  avatarAlt,
}: {
  role: HeroRole;
  name: string;
  /** Already-masked-or-not — the page decides what the viewer may see. */
  username?: string | null;
  /** The accent pill: primary discipline / talent ("Dance", "Coach", …). */
  rolePill?: string | null;
  bio?: string | null;
  locationText?: string | null;
  memberSince?: string | null;
  verified: boolean;
  /** Visitor context only: a presence pill (Online / Busy / …). */
  presence?: React.ReactNode;
  /** Visitor context only: public custom id, e.g. "M-0007". */
  customId?: string | null;
  photoUrl?: string | null;
  coverUrl?: string | null;
  /** Owner context: bump after a cover re-upload so the new bytes appear now. */
  coverCacheBust?: number;
  stats: HeroStat[];
  /** Right-aligned action cluster (buttons supplied by the page). */
  actions?: React.ReactNode;
  onChangePhoto?: () => void;
  photoUploading?: boolean;
  onChangeCover?: () => void;
  coverUploading?: boolean;
  coverButtonLabel?: string;
  avatarAlt?: string;
}) {
  const isCoach = role === 'coach';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'G';
  const [coverFailed, setCoverFailed] = React.useState(false);
  const [photoFailed, setPhotoFailed] = React.useState(false);

  // Reset the fallback state when the underlying URL changes (re-upload).
  React.useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl, coverCacheBust]);
  React.useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  const showCoverImage = Boolean(coverUrl) && !coverFailed;
  const coverSrc = coverCacheBust && coverUrl ? `${coverUrl}?v=${coverCacheBust}` : coverUrl;

  return (
    <section className="profile-hero" aria-label={name}>
      {/* ── Cover ─────────────────────────────────────────────── */}
      <div className="profile-cover" aria-hidden={showCoverImage ? undefined : true}>
        {showCoverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc ?? undefined}
            alt={`${name}'s cover photo`}
            onError={() => setCoverFailed(true)}
            className="profile-cover-img"
          />
        ) : (
          <div className="profile-cover-fallback">
            <PhilippineSunMark size={360} className="absolute -right-20 -top-28 text-[var(--accent)] opacity-[0.18]" />
            <PhilippineSunMark size={150} className="absolute -left-10 bottom-[-3.5rem] text-[var(--accent)] opacity-[0.12]" />
            <div
              className="absolute left-5 top-4 select-none text-[11px] font-extrabold uppercase tracking-[0.42em] text-white/[0.16] sm:left-7 sm:top-5"
              aria-hidden="true"
            >
              GroovePH
            </div>
            <div
              className="absolute bottom-3 left-5 select-none text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--accent-text)]/50 sm:left-7"
              aria-hidden="true"
            >
              Performing Arts
            </div>
          </div>
        )}
        <div className="profile-cover-fade" aria-hidden="true" />

        {onChangeCover && (
          <button
            type="button"
            onClick={onChangeCover}
            disabled={coverUploading}
            className="profile-cover-btn"
            aria-label={coverUploading ? 'Uploading cover photo' : 'Change cover photo'}
          >
            {coverUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{coverUploading ? 'Uploading…' : (coverButtonLabel ?? 'Change cover')}</span>
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar (overlaps the cover) */}
          <div className="relative -mt-12 flex-none sm:-mt-16">
            <span className="profile-avatar-ring">
              {photoUrl && !photoFailed ? (
                <span className="profile-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={avatarAlt ?? name}
                    onError={() => setPhotoFailed(true)}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span className="profile-avatar" aria-hidden="true">
                  <span className="text-2xl font-extrabold uppercase tracking-wide text-[var(--accent-text)] sm:text-3xl">
                    {initials}
                  </span>
                </span>
              )}
            </span>
            {onChangePhoto && (
              <button
                type="button"
                onClick={onChangePhoto}
                disabled={photoUploading}
                className="profile-camera-badge"
                aria-label={photoUploading ? 'Uploading photo' : 'Change profile photo'}
                title={photoUploading ? 'Uploading…' : 'Change profile photo'}
              >
                {photoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="m-0 font-sans text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.015em] text-foreground sm:text-[2rem]">
                {name}
              </h1>
              <VerifiedBadge verified={verified} size="md" className="translate-y-[1px]" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-muted-foreground">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-accent-border/60 bg-accent-soft px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-accent-text">
                {isCoach ? <Star className="h-3 w-3" aria-hidden="true" /> : <UserRound className="h-3 w-3" aria-hidden="true" />}
                {isCoach ? 'Coach' : 'Client'}
              </span>
              {rolePill && (
                <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted/60 px-2.5 text-[11px] font-semibold text-foreground/90">
                  {rolePill}
                </span>
              )}
              {username && (
                <span className="font-medium text-foreground/90">@{username}</span>
              )}
              {customId && (
                <span className="tabular-nums text-subtle-foreground">ID {customId}</span>
              )}
              {presence}
            </div>
          </div>

          {/* Actions (visitor & owner contexts both fill this slot) */}
          {actions && (
            <div className="flex flex-none flex-wrap items-center gap-2 sm:justify-end sm:pb-1">
              {actions}
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-[13.5px] leading-relaxed text-muted-foreground">
            {bio}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
          {locationText && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
              {locationText}
            </span>
          )}
          {memberSince && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
              {memberSince}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5" title="Philippines">
            <PhilippineFlag />
            <span className="sr-only">Philippines</span>
          </span>
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="mt-4 flex flex-wrap items-stretch gap-y-3 border-t border-border/70 pt-4" role="group" aria-label="Profile statistics">
            {stats.map((stat, index) => {
              const content = (
                <>
                  <b className="block font-sans text-[1.3rem] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums">
                    {stat.value}
                  </b>
                  <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                    {stat.label}
                  </span>
                </>
              );
              const divider = index > 0 ? 'sm:border-l sm:border-border/70 sm:pl-6' : '';
              return stat.onClick ? (
                <button
                  key={`${stat.label}-${index}`}
                  type="button"
                  onClick={stat.onClick}
                  aria-label={stat.ariaLabel ?? `${stat.label} — view list`}
                  className={cn(
                    'cursor-pointer pr-5 text-left transition-colors hover:[&>b]:text-accent-text focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    divider
                  )}
                >
                  {content}
                </button>
              ) : (
                <div key={`${stat.label}-${index}`} className={cn('pr-5', divider)}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileHero;
