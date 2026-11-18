'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Profile cover photos — deterministic storage, no schema change.
 *
 * `profiles` has no `cover_url` column, and migrations in this repo are applied
 * out of band (see supabase/migrations). Rather than depend on a column that may
 * not exist yet, the cover lives at a FIXED path inside the same PUBLIC
 * `avatars` bucket the avatar upload already uses:
 *
 *     avatars/<uid>/cover.jpg
 *
 * Because the path is deterministic, any visitor can resolve the URL with no
 * database read at all — the public profile simply tries the URL and falls back
 * to the designed cover when it 404s (see <ProfileCoverFallback>). The owner
 * upserts with `upsert: true`, which overwrites the object atomically, so there
 * is never a moment where half a cover is live.
 *
 * The trade-off is cache propagation: after a re-upload, a visitor may see the
 * previous cover until the browser/CDN entry expires (uploads use a 300s
 * cacheControl). The uploading member sees their new cover instantly because the
 * hero appends a `?v=<timestamp>` cache-buster to their own view only.
 *
 * PRIVACY: the cover is public by design — it is presented on the public
 * profile — so no private data belongs in it. It is no more exposed than the
 * avatar, which is already public.
 */

export const COVER_BUCKET = 'avatars';
export const COVER_PATH = (uid: string) => `${uid}/cover.jpg`;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function coverPublicUrl(uid: string): string {
  const supabase = createClient();
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(COVER_PATH(uid)).data.publicUrl;
}

/** Validate an image before it is cropped — same rules as the avatar path. */
export function validateCoverFile(file: File): string | null {
  if (!COVER_ACCEPTED_TYPES.includes(file.type as (typeof COVER_ACCEPTED_TYPES)[number])) {
    return 'Cover must be a JPG, PNG or WebP image.';
  }
  if (file.size > COVER_MAX_BYTES) {
    return 'Cover image must be smaller than 5 MB.';
  }
  return null;
}

/** Upload a cropped cover. Overwrites any previous cover for this member. */
export async function uploadCoverImage(uid: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(COVER_PATH(uid), blob, {
    contentType: blob.type || 'image/jpeg',
    // Short cache so a re-upload propagates quickly; the owner's own view
    // cache-busts with ?v=<timestamp> regardless.
    cacheControl: '300',
    upsert: true,
  });
  if (error) {
    throw new Error(error.message || 'Failed to upload cover photo.');
  }
  return coverPublicUrl(uid);
}

/** Remove the cover — the <img onError> fallback takes over everywhere. */
export async function removeCoverImage(uid: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(COVER_BUCKET).remove([COVER_PATH(uid)]);
  if (error) {
    throw new Error(error.message || 'Failed to remove the cover photo.');
  }
}
