'use client';

/**
 * Shared renderer for private-bucket media.
 *
 * The Showcase appears in three places — the client profile, the coach profile,
 * and the public profile — and all three were rendering `post.media_path`
 * directly as an <img src>. Because that column holds a storage PATH (the
 * bucket is private), every one of those images was broken, and would have been
 * broken before the path change too, because the old code stored a
 * getPublicUrl() URL that a private bucket refuses to serve.
 *
 * This component is the one place that turns a path into something loadable, so
 * the three surfaces cannot drift again. It owns:
 *   - resolving paths to short-lived signed URLs, in one batch for the page
 *   - the video-vs-image decision
 *   - the loading / broken / loaded states
 *
 * It contains no upload logic: uploading stays with the Community Feed, which is
 * where posts are created. These surfaces are read-only.
 */

import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { isVideoPath, signCommunityMediaBatch } from './communityMedia';

type State = 'loading' | 'ready' | 'broken';

/**
 * Resolve many paths at once and report which ones failed.
 *
 * Batched deliberately: signing per image would open one Storage request per
 * media item on every render.
 */
export function useSignedMedia(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).sort().join('\u0000');
  const [state, setState] = useState<{
    key: string;
    urls: Record<string, string>;
    broken: Record<string, boolean>;
  }>({ key: '', urls: {}, broken: {} });

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    void (async () => {
      const wanted = key.split('\u0000');
      const urls = await signCommunityMediaBatch(wanted);
      if (cancelled) return;
      setState({
        key,
        urls,
        broken: Object.fromEntries(wanted.filter((p) => !urls[p]).map((p) => [p, true])),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}

/**
 * One media item: image, video, or an explicit unavailable state.
 *
 * `variant` picks the shape so the profile grids and the Community Feed can each
 * keep their own layout while sharing the resolution logic.
 */
export function SignedMedia({
  path,
  urls,
  broken,
  alt,
  variant = 'grid',
  className = '',
}: {
  /** The stored storage path. Never a URL. */
  path: string;
  urls: Record<string, string>;
  broken: Record<string, boolean>;
  alt: string;
  /** `grid` fills a fixed-ratio box; `feed` allows a taller image. */
  variant?: 'grid' | 'feed';
  className?: string;
}) {
  const url = urls[path];

  if (url) {
    return isVideoPath(path) ? (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className={
          variant === 'grid'
            ? `h-full w-full bg-black object-cover ${className}`
            : `max-h-[520px] w-full bg-black object-contain ${className}`
        }
      />
    ) : (
      <img
        src={url}
        alt={alt}
        className={
          variant === 'grid'
            ? `h-full w-full object-cover ${className}`
            : `max-h-[520px] w-full object-cover ${className}`
        }
        loading="lazy"
      />
    );
  }

  if (broken[path]) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-muted/50 px-4 text-center ${
          variant === 'grid' ? 'h-full min-h-[120px]' : 'py-10'
        } ${className}`}
        role="img"
        aria-label={`${alt} — unavailable`}
      >
        <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-[11px] font-semibold text-muted-foreground">Media unavailable</p>
        {/* Deliberately says the file could not be loaded rather than implying
            it was never uploaded — those are different faults and a member
            cannot tell them apart from a broken image icon. */}
        <p className="max-w-[16rem] text-[10px] text-subtle-foreground">
          This file could not be loaded. It may have been removed, or media
          storage may not be configured yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-muted/40 ${
        variant === 'grid' ? 'h-full min-h-[120px]' : 'h-40'
      } ${className}`}
      role="status"
      aria-label="Loading media"
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

/**
 * Convenience wrapper: renders a grid of media for a list of posts and handles
 * the batch signing for the whole page.
 *
 * This is what the three profile surfaces use, so none of them has to know about
 * signing, batching, or the three media states.
 */
export function ShowcaseGrid({
  items,
  variant = 'grid',
  emptyState,
}: {
  /** Anything with an id and a media_path. */
  items: { id: string | number; media_path?: string | null; caption?: string | null }[];
  variant?: 'grid' | 'feed';
  /** Rendered when there is nothing to show. */
  emptyState?: React.ReactNode;
}) {
  const { urls, broken } = useSignedMedia(items.map((i) => i.media_path));
  const withMedia = items.filter((i) => i.media_path);

  if (withMedia.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {withMedia.map((item) => (
        <div key={item.id} className="g-card space-y-2 overflow-hidden p-3">
          <div className="aspect-video overflow-hidden rounded-xl bg-muted">
            <SignedMedia
              path={item.media_path as string}
              urls={urls}
              broken={broken}
              alt={item.caption || 'Showcase media'}
              variant={variant}
            />
          </div>
          {item.caption && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default SignedMedia;
