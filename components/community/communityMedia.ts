'use client';

/**
 * Community Showcase media — upload, and resolve for display.
 *
 * WHY THIS EXISTS
 *   The Showcase's upload has never worked. The bucket `media-posts` did not
 *   exist, so Supabase answered `NoSuchBucket`, and the old code did
 *   `if (!uploadErr && uploadData)` — which quietly left `media_path` NULL,
 *   created a text-only post, and reported success. The member's image was gone
 *   with no error shown. A failed upload that produces a *successful* post is
 *   the worst possible failure mode, so every step here reports rather than
 *   degrades.
 *
 * WHAT IS STORED
 *   `community_posts.media_path` — the existing column, untouched — now holds the
 *   storage PATH inside the bucket, e.g.
 *
 *       posts/dancer/<uid>/1756..._a1b2c.jpg
 *
 *   It does NOT hold a URL. That is the project's established rule for private
 *   media (see verification-documents and lib/utils.ts): a stored URL is either
 *   permanently public or expires. A path re-resolves, so the bucket can stay
 *   private and a rotated key or a new signing TTL does not strand old rows.
 *
 *   No new column was added, and no existing storage system was replaced.
 *
 * THE COMMUNITY SEGMENT
 *   The path embeds the community so storage RLS can enforce the same isolation
 *   as community_posts: `community_slug(folder) = my_community()`. Without it a
 *   member could request a signed URL for another community's image.
 */

import { createClient } from '@/lib/supabase/client';
import { SIGNED_URL_TTL_SECONDS } from '@/lib/utils';
import { communitySlug, type Community } from '@/lib/community';

export const MEDIA_BUCKET = 'media-posts';

/** Mirrors the bucket's allowed_mime_types and file_size_limit in SQL. */
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

const ALLOWED = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Reject a file before it is uploaded.
 *
 * The bucket enforces the same limits, so this is UX rather than security — but
 * uploading 40 MB only to have Storage reject it wastes the member's bandwidth
 * and their time, and the failure message is far worse than this one.
 */
export function validateMedia(file: File): ValidationResult {
  if (!ALLOWED.includes(file.type)) {
    return {
      ok: false,
      reason: 'That file type is not supported. Use a JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV file.',
    };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return {
      ok: false,
      reason: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB.`,
    };
  }
  return { ok: true };
}

export function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(path);
}

/** `post_1756..._a1b2c.jpg` — no user-supplied characters ever reach the path. */
function safeLeaf(file: File): string {
  const ext = (file.name.split('.').pop() || 'bin')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5) || 'bin';
  const rand = Math.random().toString(36).substring(2, 8);
  return `post_${Date.now()}_${rand}.${ext}`;
}

/**
 * Upload one file and return the path to store in `media_path`.
 *
 * Throws with a readable message on every failure — including the ones that used
 * to be swallowed. A caller must never be able to end up with a post that
 * silently lost its image.
 */
export async function uploadCommunityMedia(
  file: File,
  authorId: string,
  community: Community
): Promise<string> {
  const check = validateMedia(file);
  if (!check.ok) throw new Error(check.reason);

  const supabase = createClient();
  const path = `posts/${communitySlug(community)?.toLowerCase() ?? 'unknown'}/${authorId}/${safeLeaf(file)}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) {
    // NoSuchBucket means supabase/media_posts.sql was never applied. Naming it
    // saves an administrator from reading a generic Storage failure.
    const message =
      error.message === 'Bucket not found'
        ? 'Media storage is not set up yet — apply supabase/media_posts.sql.'
        : error.message;
    throw new Error(message);
  }

  return path;
}

/**
 * Resolve one stored path to a short-lived signed URL.
 *
 * Returns null rather than throwing: one unreadable image must not blank out the
 * whole feed, so a failure degrades that image alone.
 */
export async function signCommunityMedia(path: string): Promise<string | null> {
  // A row written before this fix stored a public URL. Render those as-is rather
  // than passing a full URL to Storage as if it were a path.
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Resolve many paths at once.
 *
 * One round trip for the whole page rather than one per image — a feed of twenty
 * posts would otherwise open twenty Storage requests on every render.
 */
export async function signCommunityMediaBatch(
  paths: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const supabase = createClient();

  const results = await Promise.all(
    unique.map(async (path) => {
      if (/^https?:\/\//i.test(path)) return [path, path] as const;
      const { data } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ? ([path, data.signedUrl] as const) : ([path, ''] as const);
    })
  );

  const out: Record<string, string> = {};
  results.forEach(([path, url]) => {
    // A path that failed to sign maps to '' and renders as the unavailable state,
    // which is honest — a broken image icon would not be.
    if (url) out[path] = url;
  });
  return out;
}
