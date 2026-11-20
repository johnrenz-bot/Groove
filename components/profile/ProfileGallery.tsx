'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  Play,
  Upload,
  X,
} from 'lucide-react';

import { useSignedMedia, type ProfileMediaItem } from '@/features/community/components/SignedMedia';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/auth/ui/FileUpload';
import { Modal } from '@/components/ui/Modal';

/* ==========================================================================
   PROFILE GALLERY
   --------------------------------------------------------------------------
   Full-width bento gallery. Owner mode adds an upload tile (reuses the auth
   FileUpload) and client-side re-order/caption (persisted in localStorage —
   there is no `order` or `caption` column on `community_posts`). Visitor
   mode renders read-only media from the member's posts.
   ========================================================================== */

export type GalleryMode = 'owner' | 'visitor';
export type GalleryItem = ProfileMediaItem & { _local?: boolean };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
const LOCAL_KEY = (uid: string) => `groove-gallery-local:${uid}`;
const ORDER_KEY = (uid: string) => `groove-gallery-order:${uid}`;

function isVideoPath(path?: string | null) {
  if (!path) return false;
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'webm', 'mov', 'm4v'].includes(ext);
}

function readLocal(uid?: string): GalleryItem[] {
  if (!uid || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY(uid));
    return raw ? (JSON.parse(raw) as GalleryItem[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(uid: string | undefined, items: GalleryItem[]) {
  if (!uid) return;
  try {
    window.localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(items));
  } catch {
    /* quota / parse — the in-memory list still works for this session */
  }
}
function readOrder(uid?: string): Array<string> {
  if (!uid || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDER_KEY(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeOrder(uid: string | undefined, ids: string[]) {
  if (!uid) return;
  try {
    window.localStorage.setItem(ORDER_KEY(uid), JSON.stringify(ids));
  } catch {
    /* storage blocked — in-memory order still applies */
  }
}

type Filter = 'all' | 'photo' | 'video';

export function ProfileGallery({
  items,
  mode,
  userId,
  maxTiles = 7,
}: {
  items: GalleryItem[];
  mode: GalleryMode;
  userId?: string;
  maxTiles?: number;
}) {
  const [localItems, setLocalItems] = useState<GalleryItem[]>(() => readLocal(userId));
  const [order, setOrder] = useState<string[]>(() => readOrder(userId));
  const [filter, setFilter] = useState<Filter>('all');
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const media = useMemo(() => [...localItems, ...items.filter((i) => Boolean(i.media_path))], [localItems, items]);
  const photoItems = useMemo(() => media.filter((i) => !isVideoPath(i.media_path)), [media]);
  const videoItems = useMemo(() => media.filter((i) => isVideoPath(i.media_path)), [media]);

  const sortedMedia = useMemo(() => {
    if (!order.length) return media;
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...media].sort((a, b) => {
      const ai = idx.get(String(a.id));
      const bi = idx.get(String(b.id));
      if (ai === undefined && bi === undefined) return 0;
      if (ai === undefined) return 1;
      if (bi === undefined) return -1;
      return ai - bi;
    });
  }, [media, order]);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? sortedMedia
        : filter === 'photo'
          ? sortedMedia.filter((i) => !isVideoPath(i.media_path))
          : sortedMedia.filter((i) => isVideoPath(i.media_path)),
    [sortedMedia, filter]
  );

  const shown = filtered.slice(0, maxTiles);
  const extra = filtered.length - shown.length;
  const updateOrder = useCallback(
    (next: string[]) => {
      setOrder(next);
      writeOrder(userId, next);
    },
    [userId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = sortedMedia.map((m) => String(m.id));
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      const moved = arrayMove(ids, from, to);
      updateOrder(moved);
    },
    [sortedMedia, updateOrder]
  );

  /* Owner upload: image is decoded into memory and kept as a local preview.
     Publishing it to the community feed is what puts it in the real gallery. */
  const handleFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_EXT.test(file.name)) return 'JPG, PNG or WEBP only.';
      if (file.size > MAX_BYTES) return 'Max 5 MB per image.';
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || '');
          const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          setLocalItems((prev) => {
            const next = [{ id, media_path: url, caption: null, _local: true }, ...prev];
            writeLocal(userId, next.slice(0, 24));
            return next.slice(0, 24);
          });
        };
        reader.readAsDataURL(file);
        return null;
      } catch {
        return 'Could not read that image.';
      }
    },
    [userId]
  );

  const visibleTiles = (
    <div className="tile-gallery-grid">
      {shown.map((item, i) => {
        const moreTile = i === shown.length - 1 && extra > 0;
        return (
          <GalleryCell
            key={String(item.id)}
            item={item}
            extraCount={extra}
            moreTile={moreTile}
            onClick={() => setLightboxId(String(item.id))}
            onMore={moreTile ? () => setMoreOpen(true) : undefined}
            dragEnabled={mode === 'owner'}
          />
        );
      })}
      {mode === 'owner' && (
        <div className="overflow-hidden rounded-[1.25rem] border-2 border-dashed border-border-strong bg-muted">
          <FileUpload
            id="gallery-upload"
            label="Add photos"
            hint="JPG, PNG, WEBP · Max 5 MB · previews stay local"
            accept=".jpg,.jpeg,.png,.webp"
            file={null}
            onSelect={handleFile}
            onRemove={() => undefined}
            icon={Upload}
          />
        </div>
      )}
    </div>
  );

  if (media.length === 0 && mode !== 'owner') {
    return (
      <div className="tile-gallery-empty">
        <ImageIcon className="h-6 w-6 text-[var(--subtle-foreground)]" aria-hidden="true" />
        <p>No media yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="tile-gallery-head">
        <p className="m-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
          Gallery
        </p>
        <div className="tile-gallery-filters" role="tablist" aria-label="Filter media">
          {(
            [
              ['all', 'All', media.length],
              ['photo', 'Photos', photoItems.length],
              ['video', 'Videos', videoItems.length],
            ] as const
          ).map(([key, label, count]) =>
            count === 0 ? null : (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                data-active={filter === key}
                className="tile-gallery-pill"
                onClick={() => setFilter(key as Filter)}
              >
                {label}
                <span className="count">{count}</span>
              </button>
            )
          )}
        </div>
      </div>

      {mode === 'owner' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedMedia.map((m) => String(m.id))} strategy={rectSortingStrategy}>
            {visibleTiles}
          </SortableContext>
        </DndContext>
      ) : (
        visibleTiles
      )}

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Full gallery"
        size="2xl"
        bodyClassName="p-4"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((item) => (
            <GalleryCell
              key={String(item.id)}
              item={item}
              extraCount={0}
              moreTile={false}
              onClick={() => setLightboxId(String(item.id))}
              onMore={undefined}
              dragEnabled={false}
            />
          ))}
        </div>
      </Modal>

      <AnimatePresence>
        {lightboxId !== null && (
          <Lightbox
            items={filtered}
            id={lightboxId}
            onNavigate={setLightboxId}
            onClose={() => setLightboxId(null)}
            owner={mode === 'owner'}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── A single cell ───────────────────────────────────────────────────── */

function GalleryCell({
  item,
  extraCount,
  moreTile,
  onClick,
  onMore,
  dragEnabled = false,
}: {
  item: GalleryItem;
  extraCount: number;
  moreTile: boolean;
  onClick: () => void;
  onMore?: () => void;
  dragEnabled?: boolean;
}) {
  const sortable = useSortable({ id: String(item.id) });
  const { urls, broken } = useSignedMedia([item.media_path]);
  const url = urls[0];
  const isVideo = isVideoPath(item.media_path);
  const caption = item.caption?.trim();

  return (
    <div
      ref={sortable.setNodeRef}
      style={sortable.isDragging ? { zIndex: 2 } : undefined}
      className={cn(
        'relative aspect-square overflow-hidden rounded-[1.25rem] bg-muted',
        'tile-gallery-cell',
        moreTile && 'col-span-2 row-span-2'
      )}
      {...(sortable.attributes ?? {})}
    >
      <button
        type="button"
        className="h-full w-full cursor-pointer border-0 p-0"
        onClick={moreTile && onMore ? onMore : onClick}
        aria-label={caption ? `Open media: ${caption}` : 'Open media'}
      >
        {url && !broken[0] ? (
          isVideo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={caption || ''} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white" aria-hidden="true">
                <Play className="ml-0.5 h-4 w-4 fill-white" />
              </span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={caption || ''} loading="lazy" className="h-full w-full object-cover" />
          )
        ) : (
          <span className="flex h-full items-center justify-center text-[var(--subtle-foreground)]">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        {caption ? (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[10px] font-medium text-white line-clamp-1">
            {caption}
          </span>
        ) : null}
        {item._local ? (
          <span className="absolute left-1.5 top-1.5 inline-flex h-5 items-center rounded-full border border-white/15 bg-black/60 px-2 text-[9px] font-semibold uppercase tracking-wider text-white/85">
            Preview
          </span>
        ) : null}
        {moreTile ? (
          <span className="tile-gallery-more" aria-hidden="true">
            <span>+{extraCount}</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/80">
              more
            </span>
          </span>
        ) : null}
      </button>
      {dragEnabled ? (
        <button
          type="button"
          {...(sortable.listeners ?? {})}
          aria-label="Drag to reorder"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white/80 backdrop-blur-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/* ─── Lightbox ───────────────────────────────────────────────────────── */

function Lightbox({
  items,
  id,
  onNavigate,
  onClose,
  owner,
}: {
  items: GalleryItem[];
  id: string;
  onNavigate: (next: string | null) => void;
  onClose: () => void;
  owner: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const index = useMemo(() => items.findIndex((i) => String(i.id) === id), [items, id]);
  const item = index >= 0 ? items[index] : undefined;
  const { urls, broken } = useSignedMedia(item ? [item.media_path] : []);
  const url = urls[0];
  const isVideo = item ? isVideoPath(item.media_path) : false;

  const go = useCallback(
    (delta: number) => {
      if (!items.length) return;
      const nextIndex = (index + delta + items.length) % items.length;
      const nextId = items[nextIndex]?.id;
      if (nextId !== undefined) onNavigate(String(nextId));
    },
    [index, items, onNavigate]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  if (item === undefined || index < 0) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[1350] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.caption?.trim() || 'Media viewer'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="text-xs font-semibold tabular-nums text-white/70">
          {index + 1} / {items.length}
        </span>
        <div className="flex items-center gap-2">
          {owner && url ? (
            <a
              href={url}
              download
              className="hidden h-9 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 sm:inline-flex"
            >
              Download
            </a>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
        {url && !broken[0] ? (
          isVideo ? (
            <video
              key={url}
              src={url}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={item.caption?.trim() || ''} className="max-h-full max-w-full rounded-xl object-contain" />
          )
        ) : (
          <span className="text-sm text-white/60">Media failed to load.</span>
        )}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:right-4"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Caption + thumbnail strip */}
      {item.caption?.trim() ? (
        <p className="px-6 pb-2 text-center text-sm text-white/85">{item.caption.trim()}</p>
      ) : null}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto px-4 pb-4">
          {items.map((t, i) => (
            <button
              key={String(t.id)}
              type="button"
              onClick={() => onNavigate(String(t.id))}
              aria-label={`Go to media ${i + 1}`}
              aria-current={i === index}
              className={cn(
                'h-12 w-12 flex-none overflow-hidden rounded-lg border transition',
                i === index
                  ? 'border-[var(--accent)] ring-2 ring-[rgba(217, 180, 91,0.35)]'
                  : 'border-white/10 opacity-60 hover:opacity-100'
              )}
            >
              <ThumbThumb item={t} />
            </button>
          ))}
        </div>
      )}
    </motion.div>,
    document.body
  );
}

function ThumbThumb({ item }: { item: GalleryItem }) {
  const { urls, broken } = useSignedMedia([item.media_path]);
  const url = urls[0];
  if (!url || broken[0]) {
    return (
      <span className="flex h-full items-center justify-center bg-white/5 text-white/40">
        <ImageIcon className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}
