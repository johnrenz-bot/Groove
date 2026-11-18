'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * Share the public profile — real, working share.
 *
 * Uses the Web Share API where available (mobile, some desktop Chromium) and
 * falls back to copying the absolute public URL to the clipboard. The feedback
 * ("Copied") is rendered inline on the control itself for two seconds; nothing
 * is invented — the URL shared is exactly the public profile route.
 */
export function ProfileShareButton({
  path,
  title,
  variant = 'icon',
  className,
}: {
  /** Absolute path of the public profile, e.g. `/userprofile/<id>` — never a guessed id. */
  path: string;
  /** Title passed to navigator.share. */
  title: string;
  /** `icon` = square icon button; `full` = labelled secondary button. */
  variant?: 'icon' | 'full';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const share = useCallback(async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch (err) {
      // A dismissed share sheet is not an error — do not fall through to the
      // clipboard, or "copied" would flash every time the sheet is cancelled.
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
    // No share sheet available (or it failed) — copy the URL to the clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions policy) — leave the button unchanged;
      // the URL is still visible in the address bar of the preview page.
    }
  }, [path, title]);

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className={cn(
          'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          className
        )}
        aria-label="Share your public profile"
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4 text-accent-text" aria-hidden="true" />
        )}
        {copied ? 'Link copied' : 'Share profile'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={cn(
        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        className
      )}
      aria-label={copied ? 'Profile link copied to clipboard' : 'Share profile'}
      title={copied ? 'Copied!' : 'Share profile'}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Link2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

export default ProfileShareButton;
