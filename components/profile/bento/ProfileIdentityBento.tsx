'use client';

import React from 'react';
import Link from 'next/link';
import {
  Camera,
  Calendar,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Star,
  UserRound,
  Image as ImageIcon,
} from 'lucide-react';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { PhilippineFlag } from '@/components/ui/PhilippineFlag';

/* ==========================================================================
   OWN-PROFILE IDENTITY (bento tiles)
   --------------------------------------------------------------------------
   Hero + cover photo + actions for the member's own profile page.
   Shared between /client/profile and /coach/profile; each page passes its
   own data. Keeps the existing photo-upload handler and routes untouched.
   ========================================================================== */

export function ProfileIdentityBento({
  firstname,
  lastname,
  username,
  role,
  photoUrl,
  bio,
  cityName,
  provinceName,
  accountVerified,
  memberSince,
  postsCount,
  reviewsCount,
  rating,
  extraStatLabel = 'Posts',
  publicHref,
  revealUsername,
  skillsBadge,
  photoUploading,
  onPhotoUpload,
  onEdit,
}: {
  firstname: string | null | undefined;
  lastname: string | null | undefined;
  username: string | null | undefined;
  role: 'client' | 'coach';
  photoUrl: string | null | undefined;
  bio: string | null | undefined;
  cityName?: string | null | undefined;
  provinceName?: string | null | undefined;
  accountVerified: boolean;
  memberSince?: string | null;
  postsCount: number;
  reviewsCount?: number;
  rating?: number | null;
  extraStatLabel?: string;
  publicHref: string;
  revealUsername?: boolean;
  skillsBadge?: string;
  photoUploading?: boolean;
  onPhotoUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit?: () => void;
}) {
  const fullName = `${firstname ?? ''} ${lastname ?? ''}`.trim() || 'Groove member';
  const initials = `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase() || 'G';
  const location = [cityName, provinceName].filter(Boolean).join(', ');
  const isCoach = role === 'coach';

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="tile tile-hero" aria-label={fullName}>
        <div className="tile-head">
          <p className="tile-label">
            {isCoach ? <Star aria-hidden="true" /> : <UserRound aria-hidden="true" />}
            {isCoach ? 'COACH PROFILE' : 'CLIENT / PERFORMER'}
          </p>
          <VerifiedBadge verified={accountVerified} size="sm" />
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <span className="tile-avatar-ring">
            <span className="tile-avatar">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true">{initials}</span>
              )}
            </span>
            <span className="tile-presence" data-status="online" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="tile-name">{fullName}</h1>
            <p className="tile-meta">
              {skillsBadge ? <span className="g-pill g-pill-accent">{skillsBadge}</span> : null}
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" /> {location}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar aria-hidden="true" /> {memberSince}
                </span>
              )}
              <span title="Philippines" aria-label="Philippines" className="inline-flex items-center gap-1.5">
                <PhilippineFlag /> Philippines
              </span>
            </p>
            {username && (
              <p className="tile-meta">
                <span className="font-medium text-[var(--foreground)]">
                  @{revealUsername ? username : '•'.repeat(Math.max(3, username.length))}
                </span>
              </p>
            )}
            {bio && <p className="tile-intro">{bio}</p>}
          </div>
        </div>

        <div className="tile-counts">
          <div className="tile-count">
            <b>{postsCount}</b>
            <span>{extraStatLabel}</span>
          </div>
          {isCoach ? (
            <div className="tile-count">
              <b>{rating ?? '—'}</b>
              <span>Rating</span>
            </div>
          ) : null}
          {typeof reviewsCount === 'number' && (
            <div className="tile-count">
              <b>{reviewsCount}</b>
              <span>Reviews</span>
            </div>
          )}
        </div>
      </section>

      {/* ── COVER PHOTO ──────────────────────────────────────────── */}
      <section className="tile tile-cover" aria-label="Cover photo">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={fullName} className="tile-cover-img" />
        ) : (
          <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[#1b1b1b] text-5xl font-extrabold text-[var(--accent-text)]">
            {initials}
          </div>
        )}
        <div className="tile-cover-gradient" aria-hidden="true" />
        <div className="tile-cover-caption">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
            Cover photo
          </p>
          <p className="text-base font-bold text-white">{fullName}</p>
        </div>
      </section>

      {/* ── ACTIONS ──────────────────────────────────────────────── */}
      <section className="tile tile-actions" aria-label="Actions">
        {onPhotoUpload ? (
          <label
            className={`tile-btn-primary cursor-pointer ${photoUploading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {photoUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-4 w-4" aria-hidden="true" />
            )}
            {photoUploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhotoUpload}
              disabled={photoUploading}
              className="sr-only"
            />
          </label>
        ) : null}

        {onEdit ? (
          <button type="button" onClick={onEdit} className="tile-btn-secondary">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </button>
        ) : null}

        <Link href={publicHref} className="tile-btn-secondary">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview public profile
        </Link>
      </section>
    </>
  );
}

export default ProfileIdentityBento;
