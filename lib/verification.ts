/**
 * Verification domain rules — one place, shared by the admin console, the
 * booking flows, and the profile surfaces.
 *
 * The database is the authority (`public.missing_verification_documents` in
 * `supabase/verification_workflow.sql`), and it raises if an account is approved
 * with a required document missing. This module mirrors that rule so the UI can
 * explain the problem *before* an admin presses Approve, and so the badge,
 * booking gate, and profile status can never disagree with each other.
 */

import type { AdminUserRecord } from '@/lib/admin/service';
import type { ClientProfile, CoachProfile, Profile } from '@/lib/types';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface RequiredDocument {
  /** Column on the role's detail table. */
  key: 'portfolio_path' | 'valid_id_path' | 'id_selfie_path';
  label: string;
  hint: string;
  /** Whether approval is blocked while this is missing. */
  required: boolean;
}

/** Coach: portfolio + government ID + selfie with the ID. All three required. */
export const COACH_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    key: 'portfolio_path',
    label: 'Portfolio / Resume',
    hint: 'PDF, JPG or PNG up to 5 MB',
    required: true,
  },
  {
    key: 'valid_id_path',
    label: 'Valid Government ID',
    hint: 'Passport, UMID, Driver’s Licence, Postal or Student ID',
    required: true,
  },
  {
    key: 'id_selfie_path',
    label: 'Selfie with Government ID',
    hint: 'Your face and the ID both clearly visible',
    required: true,
  },
];

/** Client: government ID only. */
export const CLIENT_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    key: 'valid_id_path',
    label: 'Valid Government ID',
    hint: 'Passport, UMID, Driver’s Licence, Postal or Student ID',
    required: true,
  },
];

export function requiredDocuments(role: string | null | undefined): RequiredDocument[] {
  if (role === 'coach') return COACH_REQUIRED_DOCUMENTS;
  if (role === 'client') return CLIENT_REQUIRED_DOCUMENTS;
  return [];
}

/**
 * The effective verification state for a profile.
 *
 * `verification_status` is the column written by the admin console, but it is
 * derived defensively from `account_verified` too: a row written before the
 * column existed (or by the signup trigger's `role = 'admin'` shortcut) must
 * never report "pending" while the boolean says otherwise.
 */
export function verificationStatusOf(
  profile:
    | (Pick<Profile, 'account_verified'> & Partial<Pick<Profile, 'verification_status'>>)
    | null
    | undefined
): VerificationStatus {
  if (!profile) return 'pending';
  if (profile.account_verified) return 'verified';

  const stored = profile.verification_status?.toLowerCase();
  if (stored === 'rejected') return 'rejected';
  if (stored === 'verified') return 'verified';
  return 'pending';
}

export function isVerified(profile: { account_verified?: boolean | null } | null | undefined): boolean {
  return Boolean(profile?.account_verified);
}

/** One row per required document for a given account, with its submitted path. */
export interface DocumentSlot extends RequiredDocument {
  path: string | null;
  present: boolean;
}

/**
 * Which documents an account has submitted, in requirement order.
 *
 * `coach_profile` / `client_profile` come from the same joined select the admin
 * directory already uses, so this needs no extra round trip.
 */
export function documentSlots(user: AdminUserRecord): DocumentSlot[] {
  const coach = user.coach_profile as CoachProfile | null | undefined;
  const client = user.client_profile as ClientProfile | null | undefined;

  const pathFor = (key: RequiredDocument['key']): string | null => {
    if (user.role === 'coach') {
      const value = coach?.[key];
      return typeof value === 'string' && value.trim() ? value : null;
    }
    if (user.role === 'client') {
      // Clients submit a single document; the other keys have no column.
      return key === 'valid_id_path' && client?.valid_id_path ? client.valid_id_path : null;
    }
    return null;
  };

  return requiredDocuments(user.role).map((doc) => {
    const path = pathFor(doc.key);
    return { ...doc, path, present: Boolean(path) };
  });
}

/** Labels of required documents still missing. Empty array = approvable. */
export function missingRequiredDocuments(user: AdminUserRecord): string[] {
  return documentSlots(user)
    .filter((slot) => slot.required && !slot.present)
    .map((slot) => slot.label);
}

export function canApproveVerification(user: AdminUserRecord): boolean {
  // Admins are auto-verified at signup and submit no documents.
  if (user.role === 'admin') return true;
  return missingRequiredDocuments(user).length === 0;
}

/** Human wording for the missing-document block on the Approve control. */
export function approvalBlockMessage(user: AdminUserRecord): string | null {
  const missing = missingRequiredDocuments(user);
  if (missing.length === 0) return null;
  const subject = user.role === 'coach' ? 'A coach' : 'A client';
  return `${subject} cannot be verified until every required document is submitted. Missing: ${missing.join(
    ', '
  )}.`;
}

/* -------------------------------------------------------------------------- */
/* Booking gating                                                              */
/* -------------------------------------------------------------------------- */

export interface VerificationGate {
  allowed: boolean;
  /** Present when blocked: what is wrong, in the user's own words. */
  reason: string | null;
  /** Where the message should send them. */
  ctaHref: string | null;
}

const BOOKING_CTA: Record<string, string> = {
  client: '/client/profile',
  coach: '/coach/profile',
};

function profileHref(profile: { role?: string | null } | null | undefined): string | null {
  if (!profile?.role) return null;
  return BOOKING_CTA[profile.role] ?? null;
}

/**
 * Can this user take part in a booking right now?
 *
 * Three separate reasons, because they need three different messages:
 * unverified (finish verification), rejected (read the reason, fix, resubmit),
 * and suspended (contact an administrator — resubmitting will not help).
 */
export function bookingGate(profile: Profile | null | undefined): VerificationGate {
  if (!profile) {
    return { allowed: false, reason: 'Sign in to book a session.', ctaHref: '/login' };
  }

  if (profile.status === 'suspended') {
    return {
      allowed: false,
      reason:
        'This account is suspended, so bookings are unavailable. Please contact the Groove System administrator.',
      ctaHref: null,
    };
  }

  if (!profile.account_verified) {
    const ctaHref = profileHref(profile);
    const rejected = verificationStatusOf(profile) === 'rejected';

    return {
      allowed: false,
      reason: rejected
        ? 'Your verification was rejected, so booking is unavailable until it is corrected. Check your profile for the reason, upload the corrected documents, and an administrator will review them again.'
        : 'Your account is not verified yet, so booking is unavailable. Complete your identity verification from your profile and an administrator will review it.',
      ctaHref,
    };
  }

  return { allowed: true, reason: null, ctaHref: null };
}

/** The same gate for the coach half of a booking. */
export function coachBookingGate(
  coach: Pick<Profile, 'account_verified' | 'status' | 'role'> | null | undefined
): VerificationGate {
  if (!coach) {
    return { allowed: false, reason: 'This coach could not be loaded.', ctaHref: null };
  }
  return bookingGate(coach as Profile);
}