'use client';

/**
 * Save/load service for the tee customizer.
 *
 * Signed-in users persist to `public.shirt_designs` through Supabase. Guests
 * get a local draft list in localStorage so the page remains useful without an
 * account; the UI tells them that a share link needs sign-in.
 */

import { createClient } from '@/lib/supabase/client';
import { createDesignId } from '../defaults';
import { isUuid, normalizeDesign } from '../serialization';
import type { TeeDesign } from '../types';

const LOCAL_KEY = 'groove-tee-designs-v1';
const LOCAL_LIMIT = 12;

export interface SaveResult {
  ok: boolean;
  design?: TeeDesign;
  shareId?: string;
  error?: string;
  needsAuth?: boolean;
}

export interface SavedDesignSummary {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  shareId: string | null;
  source: 'account' | 'local';
}

function readLocalList(): TeeDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDesign);
  } catch {
    return [];
  }
}

function writeLocalList(designs: TeeDesign[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(designs.slice(0, LOCAL_LIMIT)));
}

export function listLocalDesigns(): TeeDesign[] {
  return readLocalList().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveLocalDesign(design: TeeDesign): SaveResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Local saving is only available in the browser.' };
  }

  const next: TeeDesign = {
    ...design,
    id: isUuid(design.id) ? design.id : createDesignId(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const existing = readLocalList();
    const index = existing.findIndex((entry) => entry.id === next.id);
    if (index >= 0) existing[index] = next;
    else existing.unshift(next);
    writeLocalList(existing);
    return { ok: true, design: next };
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      error: quota
        ? 'This design is too large for local storage. Sign in to save it to your account, or remove an imported image and try again.'
        : 'The design could not be saved on this device.',
    };
  }
}

export function loadLocalDesign(id?: string): TeeDesign | null {
  const designs = listLocalDesigns();
  if (!designs.length) return null;
  if (!id) return designs[0];
  return designs.find((design) => design.id === id) ?? null;
}

export function deleteLocalDesign(id: string): void {
  try {
    writeLocalList(readLocalList().filter((design) => design.id !== id));
  } catch {
    // A failed local delete is non-fatal; the draft simply remains.
  }
}

function friendlyAccountError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'The design could not be saved. Try again.';
  if (error.code === '23503') {
    return 'Your profile is not ready yet. Finish setting up your account, then try again.';
  }
  if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to save this design. Sign in again and retry.';
  }
  if (error.code === 'PGRST301') {
    return 'Your session expired. Sign in again and retry.';
  }
  return 'The design could not be saved. Try again.';
}

/**
 * Upserts the design for the signed-in account. Guest callers get a
 * `needsAuth` result so the UI can offer the local save instead.
 */
export async function saveDesignToAccount(
  design: TeeDesign,
  options: { isPublic?: boolean; shareId?: string } = {}
): Promise<SaveResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      needsAuth: true,
      error: 'Sign in to save this design to your account.',
    };
  }

  const now = new Date().toISOString();
  const next: TeeDesign = normalizeDesign({
    ...design,
    id: isUuid(design.id) ? design.id : createDesignId(),
    userId: user.id,
    updatedAt: now,
  });

  const row: Record<string, unknown> = {
    id: next.id,
    user_id: user.id,
    title: next.name,
    design: next,
  };
  // Only touch visibility/share fields when publishing. An ordinary save leaves
  // an existing share link intact instead of silently unpublishing it.
  if (options.isPublic !== undefined) row.is_public = options.isPublic;
  if (options.shareId) row.share_id = options.shareId;

  const { error } = await supabase.from('shirt_designs').upsert(row, { onConflict: 'id' });

  if (error) {
    return { ok: false, error: friendlyAccountError(error) };
  }

  return { ok: true, design: next, shareId: options.shareId };
}

export async function publishDesign(design: TeeDesign): Promise<SaveResult> {
  const shareId = createDesignId();
  const result = await saveDesignToAccount(design, { isPublic: true, shareId });
  if (!result.ok) return result;
  return { ...result, shareId };
}

export function shareUrlFor(shareId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/builder/share/${shareId}`;
}

export async function listAccountDesigns(): Promise<SavedDesignSummary[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('shirt_designs')
    .select('id, title, updated_at, is_public, share_id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? 'Untitled tee'),
    updatedAt: String(row.updated_at ?? ''),
    isPublic: Boolean(row.is_public),
    shareId: row.share_id ? String(row.share_id) : null,
    source: 'account' as const,
  }));
}

export async function loadAccountDesign(id: string): Promise<TeeDesign | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shirt_designs')
    .select('design')
    .eq('id', id)
    .maybeSingle();

  if (error || !data?.design) return null;
  return normalizeDesign(data.design);
}

export async function deleteAccountDesign(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('shirt_designs').delete().eq('id', id);
  return !error;
}
