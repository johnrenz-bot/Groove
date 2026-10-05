'use client';

import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  FileText,
  ImageOff,
  Loader2,
  Maximize2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SIGNED_URL_TTL_SECONDS, VERIFICATION_BUCKET } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

/**
 * Secure preview of one private verification document.
 *
 * `verification-documents` is a PRIVATE bucket, so every file needs a
 * short-lived signed URL generated with the *reviewer's* own session — the
 * "Admins read all verification docs" storage policy is what authorises it, and
 * nothing here works for a non-admin. The stored value is always a Storage path,
 * never a URL, and it is never persisted in place of one.
 *
 * Two details this handles that a plain `<img>` would not:
 *   - PDFs render in an iframe rather than an img tag (an img of a PDF is
 *     broken in every browser), with a fallback link.
 *   - A failed signature leaves an explicit "could not be loaded" state rather
 *     than a broken image, because "admin cannot see the ID" must never be
 *     mistaken for "the user submitted nothing".
 */

export type DocumentState = 'loading' | 'ready' | 'missing' | 'error' | 'unsupported';

interface SignedDocument {
  url: string;
  kind: 'image' | 'pdf' | 'unsupported';
}

function classify(path: string): SignedDocument['kind'] {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'unsupported';
}

export function VerificationDocumentCard({
  label,
  path,
  hint,
  required = true,
  onOpen,
}: {
  label: string;
  path: string | null;
  hint?: string;
  required?: boolean;
  /** Called with the signed URL when the admin asks for the full-size view. */
  onOpen?: (url: string) => void;
}) {
  const [signed, setSigned] = useState<SignedDocument | null>(null);
  const [error, setError] = useState(false);
  // Which path the loaded `signed`/`error` belong to. Comparing this during
  // render is what keeps a previous account's document from flashing behind the
  // new one, and it removes the need for a reset effect.
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    void (async () => {
      try {
        // An absolute URL is already usable; only Storage paths need signing.
        if (path.startsWith('http://') || path.startsWith('https://')) {
          if (cancelled) return;
          setSigned({ url: path, kind: classify(path) });
          setError(false);
          setLoadedPath(path);
          return;
        }

        const supabase = createClient();
        const { data, error: signError } = await supabase.storage
          .from(VERIFICATION_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

        if (cancelled) return;
        if (signError || !data?.signedUrl) {
          console.error(`Failed to sign ${label}:`, signError);
          setSigned(null);
          setError(true);
          setLoadedPath(path);
          return;
        }

        setSigned({ url: data.signedUrl, kind: classify(path) });
        setError(false);
        setLoadedPath(path);
      } catch (err) {
        if (cancelled) return;
        console.error(`Failed to sign ${label}:`, err);
        setSigned(null);
        setError(true);
        setLoadedPath(path);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, label]);

  // Derived, never stored: a card with no path is "missing" by definition, and a
  // card still loading its own path is "loading" — neither needs an effect.
  const state: DocumentState = !path
    ? 'missing'
    : loadedPath !== path
      ? 'loading'
      : error
        ? 'error'
        : signed
          ? 'ready'
          : 'loading';

  return (
    <figure
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors',
        state === 'missing' ? 'border-dashed border-border-strong' : 'border-border'
      )}
    >
      <figcaption className="flex items-start justify-between gap-3 border-b border-divider px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            {label}
            {required ? (
              <span className="text-danger" aria-hidden="true" title="Required">
                *
              </span>
            ) : null}
          </p>
          {hint && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        <PresenceChip state={state} />
      </figcaption>

      <div className="relative flex min-h-[172px] items-center justify-center bg-muted/50">
        {state === 'loading' && (
          <span className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="g-spin h-5 w-5 text-accent-text" aria-hidden="true" />
            Loading document…
          </span>
        )}

        {state === 'missing' && (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-[11px] text-muted-foreground">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            Not submitted
          </span>
        )}

        {state === 'error' && (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-[11px] text-danger">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            Could not load this file
          </span>
        )}

        {state === 'ready' && signed?.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signed.url}
            alt={`${label} submitted for verification`}
            className="h-52 w-full bg-muted object-cover"
          />
        )}

        {state === 'ready' && signed?.kind === 'pdf' && (
          <iframe
            src={signed.url}
            title={`${label} submitted for verification`}
            className="h-52 w-full bg-card"
          />
        )}

        {state === 'ready' && signed?.kind === 'unsupported' && (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-[11px] text-muted-foreground">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Preview unavailable for this file type
          </span>
        )}

        {state === 'ready' && signed && (
          <div className="absolute right-2 top-2 flex gap-1.5">
            {signed.kind !== 'unsupported' && (
              <button
                type="button"
                onClick={() => onOpen?.(signed.url)}
                aria-label={`View ${label} full size`}
                title="View full size"
                className="cursor-pointer rounded-full border border-border bg-overlay/85 p-1.5 text-foreground backdrop-blur transition-colors hover:bg-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <a
              href={signed.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${label} in a new tab`}
              title="Open in a new tab"
              className="cursor-pointer rounded-full border border-border bg-overlay/85 p-1.5 text-foreground backdrop-blur transition-colors hover:bg-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {path && (
        <p className="truncate border-t border-divider px-4 py-2 font-mono text-[10px] text-subtle-foreground">
          {path}
        </p>
      )}
    </figure>
  );
}

function PresenceChip({ state }: { state: DocumentState }) {
  if (state === 'missing') {
    return (
      <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        Missing
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="shrink-0 rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">
        Unreadable
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
      Submitted
    </span>
  );
}

/**
 * Full-size viewer for a signed document URL.
 *
 * Separate from the card because the modal is mounted once and the cards render
 * many: keeping the lightbox out of each card avoids N focus traps on a page
 * that shows up to nine.
 */
export function DocumentLightbox({
  url,
  label,
  onClose,
}: {
  url: string | null;
  label: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [url, onClose]);

  if (!url) return null;
  const kind = classify(url);

  return (
    <div
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center gap-4 bg-overlay p-4 backdrop-blur-sm animate-in fade-in sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-5xl items-center justify-between gap-4">
        <p className="truncate text-sm font-bold text-foreground">{label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close document viewer"
          className="shrink-0 cursor-pointer rounded-full border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex max-h-[80vh] w-full max-w-5xl flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
        {kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="max-h-[80vh] w-auto max-w-full object-contain"
          />
        ) : kind === 'pdf' ? (
          <iframe src={url} title={label} className="h-[80vh] w-full" />
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-3 p-10 text-center text-sm text-foreground"
          >
            <FileText className="h-8 w-8 text-accent-text" aria-hidden="true" />
            Open this document in a new tab
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        This is a private document, served through a short-lived signed link. Do not share it.
      </p>
    </div>
  );
}

export default VerificationDocumentCard;