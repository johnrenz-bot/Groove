'use client';

/**
 * Renders one party's stored signature image for a read-only viewer
 * (currently the admin agreements register).
 *
 * WHY THIS EXISTS
 * The admin register previously showed a ✓/✗ badge derived from the mere
 * PRESENCE of client_signature_path / coach_signature_path. That column holds a
 * storage PATH, not a URL, and the bucket is private — so a path is not
 * loadable and an admin could confirm that a signature "existed" without ever
 * seeing it. This resolves the path to a short-lived signed URL and shows the
 * actual image, plus the timestamps.
 *
 * Reuses signSignature() from lib/bookingAgreement, the same helper the
 * /messages card uses, so there is one rule for turning a path into something
 * loadable. Read-only: it never uploads, never writes, and never touches a
 * booking.
 *
 * Distinct states rather than a broken <img>:
 *   no path            -> "Not signed yet"
 *   signed_at present  -> the image (or "Image unavailable" if signing failed)
 *   path but no signed_at -> "Signature on file, not yet timestamped"
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signSignature } from '../services/bookingAgreement';

function formatStamp(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AgreementSignature({
  role,
  path,
  signedAt,
}: {
  role: 'Client' | 'Coach';
  /** The stored object path, or null when the party has not signed. */
  path: string | null | undefined;
  /** The database timestamp. Authoritative for "did they sign". */
  signedAt: string | null | undefined;
}) {
  /**
   * Only ONE piece of state, and it is keyed by the path it was resolved for.
   *
   * The previous version kept `url`, `loading` and `failed` separately and had
   * to clear them at the top of the effect whenever `path` changed. Those
   * synchronous setState calls were the lint error, and they were also a source
   * of truth that could drift from `path` mid-change.
   *
   * Now the three flags are DERIVED during render from this one record plus the
   * current `path`:
   *   - a path that has not been resolved yet reads as loading
   *   - a resolved path with a null url reads as failed
   *   - a missing path needs no state at all to express "no signature"
   * Tagging the record with its path is what stops one party's image being
   * shown while the other's is still resolving.
   */
  const [resolved, setResolved] = useState<{ path: string; url: string | null } | null>(null);

  const key = path ?? null;
  const url = resolved && resolved.path === key ? resolved.url : null;
  const loading = key !== null && resolved?.path !== key;
  const failed = key !== null && resolved?.path === key && resolved.url === null;

  useEffect(() => {
    // Nothing to resolve, and nothing to reset: `key` is null, so every derived
    // flag above is already false.
    if (!path) return;

    let cancelled = false;
    void (async () => {
      // The first statement that touches state is AFTER this await, so the
      // effect body itself never calls setState synchronously.
      try {
        const supabase = createClient();
        const signed = await signSignature(supabase, path);
        if (!cancelled) setResolved({ path, url: signed });
      } catch {
        if (!cancelled) setResolved({ path, url: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path]);

  const hasPath = Boolean(path);
  const hasStamp = Boolean(signedAt);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {role}
        </span>
        <span
          className={
            hasStamp
              ? 'text-[11px] font-semibold text-success'
              : 'text-[11px] font-semibold text-muted-foreground'
          }
        >
          {hasStamp ? '✓ Signed' : hasPath ? 'Not timestamped' : 'Not signed yet'}
        </span>
      </div>

      {/* White ground regardless of theme: the stored PNG is near-black ink. */}
      <div className="mt-2 flex h-20 items-center justify-center rounded-md border border-border bg-white px-2">
        {loading ? (
          <span className="text-[11px] text-slate-400">Loading…</span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${role.toLowerCase()} signature`}
            className="max-h-14 w-auto object-contain"
            style={{ filter: 'none' }}
          />
        ) : failed ? (
          <span className="text-center text-[11px] text-slate-500">
            Image unavailable
          </span>
        ) : (
          <span className="text-center text-[11px] italic text-slate-400">
            {hasPath ? 'Awaiting signature image' : 'Not signed yet'}
          </span>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {hasStamp ? formatStamp(signedAt) : 'No signature timestamp'}
      </p>
    </div>
  );
}

export default AgreementSignature;
