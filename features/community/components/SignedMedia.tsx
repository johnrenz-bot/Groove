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
import { ImageOff, Images, Loader2, Pin, Play } from 'lucide-react';
import { isVideoPath, signCommunityMediaBatch } from '../utils/communityMedia';

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
  /**
   * `grid` fills a fixed-ratio box; `feed` allows a taller image; `tile` is the
   * square profile-grid tile.
   */
  variant?: 'grid' | 'feed' | 'tile';
  className?: string;
}) {
  const url = urls[path];

  if (url) {
    /* A tile is a thumbnail, not a player: native controls would sit on top of
       the artwork and swallow the hover/click area of a ~200px square. The feed
       and grid variants are larger and keep full controls. */
    if (isVideoPath(path) && variant === 'tile') {
      return (
        <video
          src={url}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
          className={`h-full w-full bg-black object-cover ${className}`}
        />
      );
    }

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
          variant === 'grid' || variant === 'tile'
            ? `h-full w-full object-cover ${className}`
            : `max-h-[520px] w-full object-cover ${className}`
        }
        loading="lazy"
      />
    );
  }

  if (broken[path]) {
    /* Inside a square tile the full-sentence explanation does not fit and would
       shrink the artwork of every healthy tile around it, so the tile variant
       degrades to the icon alone; the long copy stays on the larger surfaces. */
    if (variant === 'tile') {
      return (
        <div
          className={`flex h-full w-full items-center justify-center bg-muted/50 ${className}`}
          role="img"
          aria-label={`${alt} — unavailable`}
          title="This file could not be loaded. It may have been removed, or media storage may not be configured yet."
        >
          <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      );
    }

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

  if (variant === 'tile') {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-muted/40 ${className}`}
        role="status"
        aria-label="Loading media"
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
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
 * A post as the profile grid needs it.
 *
 * Only `media_path` is required, because only `media_path` exists today:
 * `community_posts` (supabase/schema.sql) has id, author_id, caption,
 * media_path, talent, deleted_at and the timestamps — there is no `is_pinned`
 * and no carousel/media-count column.
 *
 * `is_pinned` and `carouselCount` are therefore OPTIONAL and default off. They
 * are read here so the overlay works the moment such a column is added to the
 * query, without inventing one: this component never fabricates a pinned or
 * multi-image post that the database does not say exists.
 */
export type ProfileMediaItem = {
  id: string | number;
  media_path?: string | null;
  caption?: string | null;
  /** Only rendered when the caller's query actually returns it. */
  is_pinned?: boolean | null;
  /** Rendered only when > 1. */
  carouselCount?: number | null;
};

/**
 * The corner badges on a tile. Top-left for state the member chose (pinned),
 * top-right for the media kind (video, carousel) — the same sides Instagram
 * uses, so the grid is readable without a legend.
 *
 * Each badge is decorative: the meaning is carried in `sr-only` text so a screen
 * reader is told the tile is a pinned video rather than only seeing icons.
 */
function TileBadges({ item }: { item: ProfileMediaItem }) {
  const isVideo = Boolean(item.media_path && isVideoPath(item.media_path));
  const carouselCount = item.carouselCount ?? 0;
  const showCarousel = carouselCount > 1;

  if (!item.is_pinned && !isVideo && !showCarousel) return null;

  const badge =
    'absolute flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-[2px]';

  return (
    <>
      {item.is_pinned && (
        <span className={`${badge} left-1.5 top-1.5`}>
          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Pinned</span>
        </span>
      )}
      {isVideo && (
        <span className={`${badge} right-1.5 top-1.5`}>
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          <span className="sr-only">Video</span>
        </span>
      )}
      {showCarousel && (
        <span
          className={`${badge} right-1.5 top-1.5`}
          title={`${carouselCount} items in this carousel`}
        >
          <Images className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{carouselCount} items in this carousel</span>
        </span>
      )}
    </>
  );
}

/**
 * ONE media tile: a perfect square that fills with the media.
 *
 * The square comes from `aspect-square` rather than a fixed pixel height, so the
 * tile is exactly as wide as its column at every breakpoint — five across on
 * desktop, three on a phone — with no letterboxing and no chance of two tiles in
 * the same row differing by a sub-pixel.
 *
 * `object-cover` is what stops a 4:3 photo from stretching inside a 1:1 box; the
 * grid crops to a square instead of distorting it.
 *
 * Overflow is clipped on the tile, and there is no gap and no rounding, because
 * the reference grid is edge-to-edge: adjacent tiles meet flush.
 */
function ProfileMediaTile({
  item,
  urls,
  broken,
}: {
  item: ProfileMediaItem;
  urls: Record<string, string>;
  broken: Record<string, boolean>;
}) {
  return (
    <div className="relative aspect-square overflow-hidden bg-muted">
      <SignedMedia
        path={item.media_path as string}
        urls={urls}
        broken={broken}
        alt={item.caption || 'Showcase media'}
        variant="tile"
      />
      <TileBadges item={item} />
    </div>
  );
}

/**
 * THE profile media grid — one implementation for all three profile surfaces.
 *
 * `/client/profile`, `/coach/profile` and `/userprofile/[id]` used to carry three
 * separate grids (and the public one had its own copy of the tile markup). They
 * were all `aspect-video` cards in a `g-card` wrapper with real gaps, which is the
 * opposite of the reference: it is a flush 5-column mosaic of squares.
 *
 * Layout contract, all of it in the two class strings below:
 *   - `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5` — 5 across on desktop, 4 on
 *     tablet, 3 on a phone. Each column is `1fr`, so all columns in a row are
 *     the same width by construction.
 *   - `gap-0` — zero gaps, horizontally and vertically.
 *   - `w-full` + `overflow-hidden` — the grid is edge-to-edge within whatever
 *     content width the page gives it, and cannot push the page wider.
 *
 * Handles its own batched signing, so callers pass rows and nothing else.
 *
 * The empty state is rendered by the caller (`emptyState`) because each surface
 * has its own copy and its own call to action; it is returned unwrapped so the
 * empty state keeps its own card styling rather than inheriting the mosaic.
 */
export function ProfileMediaGrid({
  items,
  emptyState,
  className = '',
}: {
  items: ProfileMediaItem[];
  emptyState?: React.ReactNode;
  className?: string;
}) {
  const { urls, broken } = useSignedMedia(items.map((i) => i.media_path));
  const withMedia = items.filter((i) => i.media_path);

  if (withMedia.length === 0) return <>{emptyState}</>;

  return (
    <div
      className={`grid w-full grid-cols-3 gap-0 overflow-hidden sm:grid-cols-4 lg:grid-cols-5 ${className}`}
    >
      {withMedia.map((item) => (
        <ProfileMediaTile key={item.id} item={item} urls={urls} broken={broken} />
      ))}
    </div>
  );
}

export default SignedMedia;
