'use server';

import { createHash, timingSafeEqual } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity } from '@/lib/admin/access';
import { getConfiguredPasscode, type PasscodeResult } from './config';

/**
 * ADMIN PASSCODE VERIFICATION — SERVER SIDE, AND ACTUALLY A VERIFICATION.
 *
 * What this replaced: a page that read six boxes, joined them into a string,
 * checked `length !== 6`, then read the caller's role and redirected. The joined
 * string was never compared with anything. Any `profiles.role = 'admin'`
 * account "authenticated" by typing `000000`, and the form's own copy promised
 * "6-digit administrative security passcode" — a control that did not control.
 *
 * The comparison lives here, on the server, so the passcode is never shipped to
 * the browser and never appears in a client bundle.
 *
 * `ADMIN_PASSCODE` is documented in `.env.example`. When it is not configured
 * the page refuses to render a form at all rather than pretending — see
 * `page.tsx`.
 */

/**
 * Constant-time comparison.
 *
 * Both sides are hashed first so they are always the same length: comparing the
 * raw buffers with `timingSafeEqual` throws when they differ in size, and the
 * throw itself is a length oracle. Hashing also collapses "no passcode
 * configured" and "wrong passcode" into the same code path.
 */
function safeEqual(a: string, b: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  return timingSafeEqual(hash(a), hash(b));
}

export async function verifyAdminPasscode(
  _prev: PasscodeResult | null,
  formData: FormData
): Promise<PasscodeResult> {
  const entered = String(formData.get('passcode') ?? '').trim();
  const expected = getConfiguredPasscode();

  if (!expected) {
    return {
      ok: false,
      error: 'Admin passcode verification is not configured on this deployment.',
    };
  }

  if (!/^\d{6}$/.test(entered)) {
    return { ok: false, error: 'Enter the full 6-digit administrative passcode.' };
  }

  if (!safeEqual(entered, expected)) {
    return { ok: false, error: 'That passcode is not correct.' };
  }

  // The passcode is the second factor, not the first. A valid session and the
  // pinned admin identity still have to hold before anything is granted.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!isAdminIdentity({ role: profile?.role, email: profile?.email })) {
    return { ok: false, error: 'This account is not an administrator.' };
  }

  redirect('/admin/dashboard');
}