'use client';

/**
 * Shared access to the booking agreement that belongs to a conversation.
 *
 * The agreement is NOT a message and NOT re-created here. `public.agreements`
 * rows are written once, by the coach, when a request is accepted (see
 * handleAccept in app/(coach)/coach/appointments/page.tsx). This module only
 * READS them and performs the per-party signature write, so a conversation can
 * never show a second, divergent copy of the document.
 *
 * Storage: signatures live in the PRIVATE `contract-signatures` bucket. The
 * columns hold the object PATH, never a URL — a URL would either expire or need
 * a public bucket, and a signature is a legal artefact that must not be
 * permanently fetchable. Display URLs are short-lived signed URLs.
 *
 * Path shape is dictated by the RLS policy in 02_booking_schema.sql:
 *     contract-signatures/<appointment_id>/<party>-<unix>.png
 * foldername() excludes the leaf, so the appointment id is segment [2], and the
 * leaf must start with 'client' or 'coach' or the upload is refused. Getting
 * this wrong produces a silent RLS failure, not a helpful message.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type SigningRole = 'client' | 'coach';

export interface AgreementParty {
  id: string;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  photo_url?: string | null;
}

/** The agreement row plus the two profiles it binds. */
export interface BookingAgreement {
  id: number;
  appointment_id: number | null;
  client_id: string;
  coach_id: string;
  version: string;
  status: string;
  session_type: string | null;
  location: string | null;
  rate: number | null;
  appointment_price: string | null;
  session_duration: string | null;
  payment_method: string | null;
  notice_hours: number | null;
  notice_days: number | null;
  cancellation_method: string | null;
  cancellation_terms: string | null;
  terms: string | null;
  responsibilities: string | null;
  payment_terms: string | null;
  content: string | null;
  agreement_date: string | null;
  scheduled_at: string | null;
  client_signature_path: string | null;
  coach_signature_path: string | null;
  client_signed_at: string | null;
  coach_signed_at: string | null;
  countersigned_at: string | null;
  client?: AgreementParty | null;
  coach?: AgreementParty | null;
}

const SIGNATURE_BUCKET = 'contract-signatures';

/** The reference a human would quote: the booking's 5-digit number. */
export function agreementReference(agreement: BookingAgreement | null): string {
  if (!agreement?.appointment_id) return '—';
  return `#${String(agreement.appointment_id).padStart(5, '0')}`;
}

/**
 * Find the agreement for a conversation between two people.
 *
 * Returns the most relevant row: a signed one beats an unsigned one, otherwise
 * the newest. Only agreements where the two are the client/coach pair are
 * considered, so an unrelated booking between the same people in the opposite
 * role pairing cannot leak into this conversation.
 */
export async function fetchBookingAgreement(
  supabase: SupabaseClient,
  a: string,
  b: string
): Promise<BookingAgreement | null> {
  if (!a || !b || a === b) return null;

  const { data, error } = await supabase
    .from('agreements')
    .select(
      `*,
       client:client_id (id, firstname, lastname, username, photo_url),
       coach:coach_id  (id, firstname, lastname, username, photo_url)`
    )
    .or(
      `and(client_id.eq.${a},coach_id.eq.${b}),and(client_id.eq.${b},coach_id.eq.${a})`
    )
    .order('appointment_id', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) throw error;
  const rows = (data ?? []) as unknown as BookingAgreement[];
  if (rows.length === 0) return null;

  // Prefer a fully signed agreement, then one waiting on signatures, then
  // anything else. This keeps a stale draft from taking priority over the live
  // one once the parties have signed.
  return (
    rows.find((r) => r.client_signed_at && r.coach_signed_at) ??
    rows.find((r) => r.status === 'awaiting_signatures' || r.status === 'signed') ??
    rows[0]
  );
}

/** Signed URL for a stored signature object. Returns null when there is no image. */
export async function signSignature(
  supabase: SupabaseClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  // Tolerate a value that is already a URL (older rows written by
  // app/contracts/[id]/page.tsx before it was fixed) rather than double-signing.
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Which party the signed-in user is on this agreement. */
export function roleFor(agreement: BookingAgreement, userId: string): SigningRole | null {
  if (agreement.client_id === userId) return 'client';
  if (agreement.coach_id === userId) return 'coach';
  return null;
}

export function otherParty(agreement: BookingAgreement, userId: string): AgreementParty | null {
  const otherId = roleFor(agreement, userId) === 'client' ? agreement.coach_id : agreement.client_id;
  return (otherId === agreement.client_id ? agreement.client : agreement.coach) ?? null;
}

export function fullName(p: AgreementParty | null | undefined): string {
  if (!p) return '';
  return [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || p.username || '';
}

/**
 * Record this party's signature.
 *
 * Writes ONLY the column belonging to `role` — the database enforces that with
 * guard_agreement_edit_scope(), so a client cannot sign as the coach even if
 * this function were called with the wrong role. The timestamp is left to the
 * database (guard_agreement_signature stamps it) and the booking's move to
 * CONFIRMED is done by confirm_booking_when_both_signed(). Nothing here writes
 * an appointment status.
 */
export async function signAgreement(
  supabase: SupabaseClient,
  args: {
    agreement: BookingAgreement;
    role: SigningRole;
    /** The authenticated user, used only to build the path segment policy. */
    userId: string;
    dataUrl: string;
  }
): Promise<void> {
  const { agreement, role, dataUrl } = args;
  if (!agreement.appointment_id) {
    throw new Error('This agreement is not linked to a booking yet.');
  }

  const blob = await (await fetch(dataUrl)).blob();
  const filename = `${role}-${Date.now()}.png`;
  const path = `${agreement.appointment_id}/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, blob, { contentType: 'image/png', upsert: false });
  if (uploadErr) {
    throw new Error(`The signature image could not be stored (${uploadErr.message}).`);
  }

  const column = role === 'client' ? 'client_signature_path' : 'coach_signature_path';

  const { error: updateErr } = await supabase
    .from('agreements')
    .update({ [column]: path })
    .eq('id', agreement.id);

  if (updateErr) {
    throw new Error(`The signature could not be recorded (${updateErr.message}).`);
  }
}

/* ------------------------------------------------------------------ */
/* Presentation helpers — formatting only, no invented content        */
/* ------------------------------------------------------------------ */

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return 'Not stated';
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'To be agreed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return 'To be agreed';
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (m) {
    const h = Number(m[1]);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m[2]} ${suffix}`;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : formatTimeTime(d);
}

function formatTimeTime(d: Date): string {
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

/** "1 day" / "24 hours" from whichever notice window the coach actually set. */
export function noticeWindow(a: BookingAgreement): string | null {
  if (a.notice_days && a.notice_days > 0) {
    return `${a.notice_days} day${a.notice_days === 1 ? '' : 's'}`;
  }
  if (a.notice_hours && a.notice_hours > 0) {
    return `${a.notice_hours} hour${a.notice_hours === 1 ? '' : 's'}`;
  }
  return null;
}
