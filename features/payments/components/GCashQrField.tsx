'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, QrCode, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  clearGCashQr,
  clearGCashQrImage,
  fetchGCashQr,
  formatBytes,
  GCASH_QR_MAX_BYTES,
  saveGCashQr,
  signedQrUrl,
  validateGCashQrFile,
  type GCashQrRecord,
} from '../services/gcashQrService';

/**
 * GCash QR image control.
 *
 * ONE component, two modes, because the two differ only in WHEN the bytes reach
 * Storage — not in what they look like or what they validate:
 *
 *   `deferred`   Registration. The member has no session yet and the storage
 *                policy is `TO authenticated`, so an upload here would 403. The
 *                file is held in state and handed to the page, which uploads it
 *                after signUp() returns a session — the same ordering the
 *                identity-document upload already uses on both register pages.
 *
 *   `immediate`  Profile. The member has a session, so `GCashQrCard` writes the
 *                row itself and this component only renders the stored image.
 *
 * PREVIEW SOURCING
 *   A file the user has chosen but not yet uploaded can only be previewed from
 *   an object URL; a stored file lives in a PRIVATE bucket, so it is previewed
 *   from a short-lived signed URL. `previewUrl` falls back to `storedUrl` for
 *   exactly that reason.
 */
export interface GCashQrUploaderProps {
  mode: 'deferred' | 'immediate';
  /** Path already on the row. Used to render the replace/remove state. */
  currentPath?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /**
   * Immediate mode only: the stored image has to be deleted from Storage, not
   * just forgotten locally. Omitting this would leave a control labelled "Remove"
   * that silently does nothing until the user also presses Save — which is not a
   * thing anyone expects of a button called Remove.
   */
  onClearStored?: () => void | Promise<void>;
  /** Validation message for this slot, owned by the parent form. */
  error?: string | null;
  disabled?: boolean;
  label?: string;
}

export function GCashQrUploader({
  mode,
  currentPath = null,
  file,
  onFileChange,
  onClearStored,
  error,
  disabled = false,
  label = 'GCash QR Code',
}: GCashQrUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  /** The signed URL, kept tagged with the path it belongs to. */
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // Object URLs are created in the event handler rather than derived in an
  // effect. Doing it here means the blob exists exactly as long as the file is
  // selected, and is revoked the moment it is replaced or cleared. The ref holds
  // the live URL so unmount cleanup can revoke it without touching state.
  const objectUrlRef = React.useRef<string | null>(null);

  const replaceObjectUrl = useCallback((file: File | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    objectUrlRef.current = url;
    setObjectUrl(url);
  }, []);

  // Revoke on unmount so a blob never outlives the component.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  /*
   * The bucket is private, so a stored image needs a signed URL before it can be
   * rendered at all. Keying the result by path — rather than storing a bare URL —
   * means "no URL for this path yet" is a DERIVED value instead of a second piece
   * of state that has to be reset, which is what would otherwise force a
   * synchronous setState inside this effect.
   */
  useEffect(() => {
    if (mode !== 'immediate' || !currentPath) return;
    let cancelled = false;
    void (async () => {
      const url = await signedQrUrl(currentPath);
      if (!cancelled && url) setSigned({ path: currentPath, url });
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, currentPath]);

  const storedUrl = signed && signed.path === currentPath ? signed.url : null;
  const resolving = mode === 'immediate' && Boolean(currentPath) && !storedUrl;

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;
    const invalid = validateGCashQrFile(selected);
    if (invalid) {
      setLocalError(invalid);
      // Reset the input so re-picking the same rejected file still fires change.
      e.target.value = '';
      return;
    }
    setLocalError(null);
    replaceObjectUrl(selected);
    onFileChange(selected);
  };

  const handleRemove = () => {
    setLocalError(null);
    replaceObjectUrl(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';

    // In immediate mode there may also be an image ALREADY in Storage. Clearing
    // the selection alone would leave it there, so the parent is asked to delete
    // it. Failures are surfaced rather than swallowed: the row and the object
    // must not be allowed to drift apart quietly.
    if (mode === 'immediate' && currentPath && onClearStored) {
      setClearing(true);
      void Promise.resolve(onClearStored())
        .catch((err: unknown) => {
          setLocalError(
            err instanceof Error ? err.message : 'The stored QR code could not be removed.'
          );
        })
        .finally(() => setClearing(false));
    }
  };

  const displayUrl = objectUrl ?? storedUrl;
  const pendingUpload = mode === 'deferred' && Boolean(file);

  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-muted/20 p-4 transition hover:border-accent-border hover:bg-muted/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-sm">
            {resolving ? (
              <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </span>
            ) : displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt={`${label} preview`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                <QrCode className="h-7 w-7 opacity-40" aria-hidden="true" />
                <span className="mt-0.5 text-[9px]">None</span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              {label}{' '}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Optional
              </span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Upload the QR code from your GCash app so it can be scanned straight from your profile.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              PNG, JPG or WEBP · up to {formatBytes(GCASH_QR_MAX_BYTES)}
            </p>
            {file && (
              <p className="mt-1 truncate text-[11px] font-semibold text-accent-text">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
            {pendingUpload && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Saved to your account when you finish registering.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSelect}
            disabled={disabled}
            aria-label={displayUrl ? `Replace ${label}` : `Upload ${label}`}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            icon={<Upload className="h-3.5 w-3.5" />}
          >
            {displayUrl ? 'Replace' : 'Upload'}
          </Button>
          {displayUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || clearing}
              onClick={handleRemove}
              className="text-danger hover:bg-danger-soft hover:text-danger"
              icon={clearing ? undefined : <Trash2 className="h-3.5 w-3.5" />}
            >
              {clearing ? 'Removing' : 'Remove'}
            </Button>
          )}
        </div>
      </div>

      {(error || localError) && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error || localError}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The signed-in GCash panel: shows the stored QR and manages upload, replace and
 * remove against the database. Rendered on the client and coach profile pages.
 *
 * OPTIONAL BY DESIGN
 *   Nothing here is required to use the platform, so the card never blocks the
 *   surrounding profile form. It is self-contained: save and remove write the
 *   `gcash_profiles` row only, and leave `profiles` / `coach_profiles` alone.
 */
export function GCashQrCard({
  userId,
  accountName,
  accountNumber,
  notes,
  onChanged,
}: {
  userId: string;
  /** Prefilled from the profile so the form starts from real data. */
  accountName: string;
  accountNumber: string;
  notes?: string | null;
  onChanged?: (record: GCashQrRecord | null) => void;
}) {
  const [name, setName] = useState(accountName);
  const [number, setNumber] = useState(accountNumber);
  const [note, setNote] = useState(notes ?? '');
  const [path, setPath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hasRecord, setHasRecord] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load once on mount. A failure here must not blank the profile page, so the
  // form still renders and the message is shown inline.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchGCashQr(userId);
        if (cancelled) return;
        setHasRecord(Boolean(data));
        setPath(data?.qr_code_path ?? null);
        if (data?.account_name) setName(data.account_name);
        if (data?.account_number) setNumber(data.account_number);
        setNote(data?.notes ?? '');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Your GCash details could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveGCashQr({
        userId,
        accountName: name,
        accountNumber: number,
        notes: note,
        qrCodePath: path,
        file,
      });
      setHasRecord(true);
      setPath(saved.qr_code_path ?? null);
      setFile(null);
      setSuccess('Your GCash details have been saved.');
      onChanged?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your GCash details could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [userId, name, number, note, path, file, onChanged]);

  const onRemoveImage = useCallback(async () => {
    // Deletes the object from Storage and NULLs the column on the row. The name
    // and number are left alone — removing an image is not the same as removing
    // the whole GCash setup, which is what the "Remove GCash details" button is
    // for.
    await clearGCashQrImage(userId);
    setPath(null);
    setFile(null);
    setSuccess('Your QR code has been removed. Your GCash name and number are unchanged.');
  }, [userId]);

  const onRemove = useCallback(async () => {
    setRemoving(true);
    setError(null);
    setSuccess(null);
    try {
      await clearGCashQr(userId);
      setHasRecord(false);
      setPath(null);
      setFile(null);
      setSuccess('Your GCash details have been removed.');
      onChanged?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your GCash details could not be removed.');
    } finally {
      setRemoving(false);
    }
  }, [userId, onChanged]);

  if (loading) {
    return (
      <div className="g-card flex items-center gap-3 p-6" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-accent-text" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading your GCash details…</p>
      </div>
    );
  }

  return (
    <section className="g-card p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">GCash QR Code</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional. Share a scannable GCash QR so sessions can be paid without exchanging numbers.
          </p>
        </div>
        {hasRecord && !error && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Saved
          </span>
        )}
      </header>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gcash-name" className="g-label">
              GCash Registered Name
            </label>
            <input
              id="gcash-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className="g-input mt-1.5 w-full"
            />
          </div>
          <div>
            <label htmlFor="gcash-number" className="g-label">
              GCash Mobile Number
            </label>
            <input
              id="gcash-number"
              type="tel"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="0917 123 4567"
              className="g-input mt-1.5 w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="gcash-notes" className="g-label">
            Payment Instructions
          </label>
          <input
            id="gcash-notes"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Send the booking reference in the GCash message."
            className="g-input mt-1.5 w-full"
          />
        </div>

        <GCashQrUploader
          mode="immediate"
          currentPath={path}
          file={file}
          onFileChange={setFile}
          onClearStored={path ? onRemoveImage : undefined}
        />

        {error && (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        {success && (
          <p role="status" className="flex items-start gap-1.5 text-xs text-success">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
          <div>
            {hasRecord && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                loading={removing}
                className="text-danger hover:bg-danger-soft hover:text-danger"
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Remove GCash details
              </Button>
            )}
          </div>
          <Button type="button" variant="primary" size="sm" loading={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save GCash details'}
          </Button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Your QR image is stored in a private bucket and is not published anywhere else on
          Groove. It is only rendered for you, from a short-lived signed link.
        </p>
      </div>
    </section>
  );
}

export default GCashQrUploader;