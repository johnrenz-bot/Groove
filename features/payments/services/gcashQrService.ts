'use client';

/**
 * GCash QR code — storage and profile persistence.
 *
 * WHY THIS FILE EXISTS RATHER THAN EXTENDING `gcashService.ts`
 *   `gcashService.uploadGCashQrCode` writes to the PUBLIC `avatars` bucket and,
 *   when the upload fails, silently returns a base64 data URL instead. That
 *   fallback is worse than a visible failure: the UI reports success, the row
 *   records a megabyte of base64 in a TEXT column, and nobody finds out until
 *   the image renders or the table grows. `fetchGCashProfile` has the same shape
 *   — it falls back to a localStorage mirror, so a profile "exists" on one
 *   browser and nowhere else.
 *
 *   Everything below fails loudly instead. There is no localStorage mirror and
 *   no data-URL path: if Supabase Storage rejects the write, the caller gets a
 *   real error and the UI says so.
 *
 * STORAGE SHAPE
 *   Private bucket `payment-qr-codes`, object path `<auth.uid()>/<epoch>.<ext>`.
 *   Both the bucket visibility and that path shape come from
 *   `supabase/migrations/25_gcash_qr_codes.sql`; changing one without the other
 *   produces a silent RLS failure, not a helpful message.
 *
 *   Only the PATH is persisted. The bucket is private, so display URLs must be
 *   signed on demand (`signedQrUrl`) — a stored URL would either expire or
 *   require making the bucket public.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

/* -------------------------------------------------------------------------- */
/* Validation — pure, and mirrored by the storage RLS policy                  */
/* -------------------------------------------------------------------------- */

/** 2 MB. A QR screenshot is a cropped phone photo, not a document. */
export const GCASH_QR_MAX_BYTES = 2 * 1024 * 1024;

/** Must match `allowed_mime_types` on the `payment-qr-codes` bucket. */
export const GCASH_QR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const GCASH_QR_BUCKET = 'payment-qr-codes';

/** The extension stored on disk, derived from the MIME type. */
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Reject anything Storage would reject, before the user waits for a round trip.
 *
 * The returned string is user-facing. The RLS policy in migration 25 is the
 * actual authority — these checks are trivially bypassable from the client,
 * which is exactly why both exist and must agree.
 */
export function validateGCashQrFile(file: File): string | null {
  if (!GCASH_QR_MIME_TYPES.includes(file.type as (typeof GCASH_QR_MIME_TYPES)[number])) {
    return 'That file type is not supported. Upload a PNG, JPG, or WEBP image of your GCash QR code.';
  }
  if (file.size > GCASH_QR_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(
      GCASH_QR_MAX_BYTES
    )} — please crop it to just the QR code and try again.`;
  }
  if (file.size === 0) {
    return 'That file is empty. Please choose a different image.';
  }
  return null;
}

/**
 * Build the object path. Mandated by the storage policy:
 * folder segment [1] must be the caller's uid, exactly one folder deep, and
 * the leaf must match `^[0-9]{13}\.[A-Za-z0-9]{1,5}$`.
 */
export function gcashQrObjectPath(userId: string, file: File, now: number = Date.now()): string {
  const ext = EXT_BY_MIME[file.type] ?? 'png';
  return `${userId}/${now}.${ext}`;
}

/**
 * Reject a caller that is trying to write into someone else's folder.
 *
 * RLS already refuses this, so this is defence in depth with a readable error:
 * `userId` comes from a React prop in several call sites, and a mismatched id
 * would otherwise surface as an opaque storage 403.
 */
export function assertOwnsQrPath(userId: string, path: string): void {
  const [folder, ...rest] = path.split('/');
  if (folder !== userId || rest.length !== 1) {
    throw new Error('A GCash QR code may only be stored under your own account folder.');
  }
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

/** The row shape of `public.gcash_profiles`. */
export interface GCashQrRecord {
  id?: string;
  user_id: string;
  account_name: string;
  account_number: string;
  /** Storage path in `payment-qr-codes`. The source of truth. */
  qr_code_path: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveGCashQrInput {
  userId: string;
  accountName: string;
  accountNumber: string;
  notes?: string | null;
  /** Path of an already-uploaded QR, or null to clear it. */
  qrCodePath?: string | null;
  /** Newly selected file to upload, when replacing the image. */
  file?: File | null;
}

type Client = ReturnType<typeof createClient>;

/**
 * The Storage bucket handle for `payment-qr-codes`.
 *
 * WHY THE CAST
 *   This project has no generated `Database` type, so `SupabaseClient` is
 *   parameterised with `any`. supabase-js then resolves `storage.from(name)`
 *   through its generic TABLE overload — `keyof any` accepts every string — and
 *   types the result as a PostgREST query builder, on which
 *   `createSignedUrl` does not exist. The runtime call is correct; this narrows
 *   the return to the Storage API the method actually comes from.
 *
 *   If a generated `database.types.ts` is ever added to this project, delete
 *   this helper: the overload will pick Storage on its own.
 */
type StorageBucketApi = ReturnType<SupabaseClient['storage']['from']>;

function storageBucket(supabase: Client): StorageBucketApi {
  return supabase.storage.from(GCASH_QR_BUCKET) as unknown as StorageBucketApi;
}

function client(): Client {
  return createClient();
}

/** Upload the image. Returns the Storage path — never a URL. */
export async function uploadGCashQr(file: File, userId: string): Promise<string> {
  const invalid = validateGCashQrFile(file);
  if (invalid) throw new Error(invalid);

  const path = gcashQrObjectPath(userId, file);
  const supabase = client();

  const { error } = await storageBucket(supabase)
    // upsert: true because the policy grants UPDATE as well as INSERT; a second
    // upload of the same millisecond would otherwise fail on a unique key.
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    throw new Error(`Your QR code image could not be stored: ${error.message}`);
  }
  return path;
}

/** Remove the stored image. Best-effort: the row update still runs if this fails. */
export async function removeGCashQrObject(path: string, userId: string): Promise<void> {
  assertOwnsQrPath(userId, path);
  const { error } = await storageBucket(client()).remove([path]);
  if (error) {
    // Surfaced, not swallowed: an orphaned object is a real (if minor) leak.
    console.warn(`GCash QR object could not be removed (${path}): ${error.message}`);
  }
}

/**
 * Create or update the profile row.
 *
 * One call uploads the image (when a new file was chosen) and writes the row, so
 * the two cannot disagree — there is no window where the path points at an
 * object that does not exist, which is the failure mode that leaves a profile
 * with a permanently broken QR.
 *
 * `account_number` is normalised to 09XXXXXXXXX. `is_active` is left alone on
 * save and only cleared by `clearGCashQr`, so saving an edited name does not
 * silently re-enable a profile the owner had switched off.
 */
export async function saveGCashQr(input: SaveGCashQrInput): Promise<GCashQrRecord> {
  const name = input.accountName.trim();
  const number = input.accountNumber.replace(/[\s-]/g, '');

  if (name.length < 2) {
    throw new Error('Enter the name registered on your GCash account.');
  }
  if (!/^(09|\+639)\d{9}$/.test(number)) {
    throw new Error('Enter an 11-digit Philippine mobile number, e.g. 0917 123 4567.');
  }

  const supabase = client();
  const normalized = number.startsWith('+63') ? `0${number.slice(3)}` : number;

  // Upload first: if the image cannot be stored there is no point writing a row
  // that points at it.
  const existing = input.qrCodePath ?? null;
  const uploaded = input.file ? await uploadGCashQr(input.file, input.userId) : null;
  const qrCodePath: string | null = uploaded ?? existing;

  // A newly uploaded image supersedes the old object — delete it so the bucket
  // does not accumulate orphans on every replace.
  if (input.file && existing && existing !== qrCodePath) {
    await removeGCashQrObject(existing, input.userId);
  }

  const { data, error } = await supabase
    .from('gcash_profiles')
    .upsert(
      {
        user_id: input.userId,
        account_name: name,
        account_number: normalized,
        qr_code_path: qrCodePath,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) {
    // The image is already in the bucket but nothing points at it. Remove it
    // here rather than leaving an orphan that no code path can ever reach.
    if (uploaded) {
      await removeGCashQrObject(uploaded, input.userId).catch(() => undefined);
    }
    throw new Error(`Your GCash details could not be saved: ${error.message}`);
  }
  if (!data) {
    if (uploaded) {
      await removeGCashQrObject(uploaded, input.userId).catch(() => undefined);
    }
    throw new Error('Your GCash details could not be saved. Please try again.');
  }
  return data as GCashQrRecord;
}

/** Read the signed-in member's own record. `null` when they have not set one up. */
export async function fetchGCashQr(userId: string): Promise<GCashQrRecord | null> {
  const { data, error } = await client()
    .from('gcash_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Your GCash details could not be loaded: ${error.message}`);
  }
  return (data as GCashQrRecord | null) ?? null;
}

/**
 * Delete the row and the image.
 *
 * The image is removed first: if the row delete fails the object is still
 * gone, which leaves a harmless NULL path rather than an unreachable file.
 */
export async function clearGCashQr(userId: string): Promise<void> {
  const supabase = client();
  const existing = await fetchGCashQr(userId);

  if (existing?.qr_code_path) {
    await removeGCashQrObject(existing.qr_code_path, userId);
  }

  const { error } = await supabase.from('gcash_profiles').delete().eq('user_id', userId);
  if (error) {
    throw new Error(`Your GCash details could not be removed: ${error.message}`);
  }
}

/** Remove just the image, keeping the name and number. */
export async function clearGCashQrImage(userId: string): Promise<void> {
  const supabase = client();
  const existing = await fetchGCashQr(userId);
  if (!existing) return;

  if (existing.qr_code_path) {
    await removeGCashQrObject(existing.qr_code_path, userId);
  }

  const { error } = await supabase
    .from('gcash_profiles')
    .update({ qr_code_path: null })
    .eq('user_id', userId);
  if (error) {
    throw new Error(`Your QR code could not be removed: ${error.message}`);
  }
}

/**
 * A short-lived display URL for a stored QR.
 *
 * The bucket is private, so this is the only way to render the image. Returns
 * null when there is no path or the URL cannot be signed (not the owner, object
 * deleted) — callers render a placeholder rather than a broken <img>.
 */
export async function signedQrUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // tolerate a legacy URL value
  const { data, error } = await storageBucket(client()).createSignedUrl(path, 60 * 30);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/* -------------------------------------------------------------------------- */
/* Pre-auth helpers (registration)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Persist the QR for an account that has just been created.
 *
 * Registration calls this AFTER signUp() has produced a session, because the
 * storage policy is `TO authenticated` and an anon write is refused. That is
 * the same ordering the client/coach ID upload already uses.
 *
 * Returns a message rather than throwing, because GCash is OPTIONAL at
 * registration: a failure here must not discard an account that was created
 * successfully. The caller surfaces the text so the member knows to finish the
 * job from their profile.
 */
export async function attachGCashQrAfterSignup(input: SaveGCashQrInput): Promise<string | null> {
  try {
    await saveGCashQr(input);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Your GCash details could not be saved.';
  }
}