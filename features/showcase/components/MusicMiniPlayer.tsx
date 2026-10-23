'use client';

/**
 * Groove Rehearsal Mix — floating mini-player.
 *
 * The showcase used to carry a full-width, sticky transport bar. It was taller
 * than the content it sat above and pushed the actual showcase heading down the
 * page. This is the replacement: a small docked player that floats above the
 * showcase, can be dragged anywhere, and snaps to the nearest vertical edge.
 *
 * BEHAVIOUR
 *   - Three states: minimized (just art + play), compact (title + transport) and
 *     expanded (volume, skip, loop, track details).
 *   - Pointer dragging from any non-control part of the surface, with a
 *     keyboard equivalent on the grip (arrow keys / Home / End).
 *   - Dock side, vertical position and state are persisted to localStorage. The
 *     first paint is deterministic and the saved values are applied after mount,
 *     so there is no hydration mismatch.
 *   - The audio itself lives in `MusicPlayerProvider`, above the route. This
 *     component only renders controls, so changing state or route never
 *     interrupts playback.
 *   - z-index 30 deliberately sits BELOW the app header (100), Grooveyy (40) and
 *     Back to top (50): the player can never cover those controls. The dock is
 *     also clamped between the header and the bottom-right widget zone.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  Loader2,
  Minus,
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  TriangleAlert,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { BackgroundMusic } from '../hooks/useBackgroundMusic';
import { MusicDetailsModal } from '@/features/music/components/MusicDetailsModal';
import { cn } from '@/components/shared/cn';

export interface MusicMiniPlayerProps {
  music: BackgroundMusic;
  className?: string;
}

type DockSide = 'left' | 'right';
type PlayerMode = 'minimized' | 'compact' | 'expanded';

interface PlayerPrefs {
  side: DockSide;
  yRatio: number;
  mode: PlayerMode;
}

interface Size {
  w: number;
  h: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  width: number;
  height: number;
  moved: boolean;
  lastLeft: number;
  lastTop: number;
}

const PREFS_KEY = 'groove:showcase:mini-player:v1';
const PREFS_EVENT = 'groove:showcase:mini-player-changed';
const DEFAULT_PREFS: PlayerPrefs = { side: 'right', yRatio: 0.3, mode: 'compact' };
const SERVER_VIEWPORT: Size = { w: 1280, h: 800 };

/** Keep clear of the 64px app header and the bottom-right widget cluster. */
const TOP_SAFE = 76;
const BOTTOM_SAFE_DESKTOP = 152;
const BOTTOM_SAFE_MOBILE = 140;
const DRAG_THRESHOLD = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readPrefs(): PlayerPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;

    const mode: PlayerMode =
      parsed.mode === 'minimized' || parsed.mode === 'expanded' || parsed.mode === 'compact'
        ? parsed.mode
        : DEFAULT_PREFS.mode;
    const side: DockSide = parsed.side === 'left' || parsed.side === 'right'
      ? parsed.side
      : DEFAULT_PREFS.side;
    const yRatio =
      typeof parsed.yRatio === 'number' && Number.isFinite(parsed.yRatio)
        ? clamp(parsed.yRatio, 0, 1)
        : DEFAULT_PREFS.yRatio;

    return { side, yRatio, mode };
  } catch {
    return null;
  }
}

function writePrefs(prefs: PlayerPrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage can be disabled; position is still remembered for this session */
  }
}

/*
 * The player position is an external store rather than React state seeded in an
 * effect: `useSyncExternalStore` renders the server snapshot first and then
 * applies localStorage after hydration, so saved coordinates can never cause a
 * hydration mismatch or a cascading second render.
 */
let cachedPrefs: PlayerPrefs | null = null;

function getPrefsSnapshot(): PlayerPrefs {
  cachedPrefs ??= readPrefs() ?? DEFAULT_PREFS;
  return cachedPrefs;
}

function getServerPrefsSnapshot(): PlayerPrefs {
  return DEFAULT_PREFS;
}

function subscribePrefs(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handleChange = () => {
    cachedPrefs = null;
    onChange();
  };
  window.addEventListener('storage', handleChange);
  window.addEventListener(PREFS_EVENT, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(PREFS_EVENT, handleChange);
  };
}

function updatePrefs(patch: Partial<PlayerPrefs>) {
  if (typeof window === 'undefined') return;
  cachedPrefs = { ...getPrefsSnapshot(), ...patch };
  writePrefs(cachedPrefs);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

let cachedViewport: Size | null = null;

function getViewportSnapshot(): Size {
  if (typeof window === 'undefined') return SERVER_VIEWPORT;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!cachedViewport || cachedViewport.w !== w || cachedViewport.h !== h) {
    cachedViewport = { w, h };
  }
  return cachedViewport;
}

function getServerViewportSnapshot(): Size {
  return SERVER_VIEWPORT;
}

function subscribeViewport(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

export function MusicMiniPlayer({ music, className }: MusicMiniPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastDragEndRef = useRef(0);

  const prefs = useSyncExternalStore(subscribePrefs, getPrefsSnapshot, getServerPrefsSnapshot);
  const { side, yRatio, mode } = prefs;
  const viewport = useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    getServerViewportSnapshot
  );
  const [box, setBox] = useState<Size>({ w: 0, h: 0 });
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hasPositioned, setHasPositioned] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    isPlaying,
    isLoading,
    isMuted,
    isWaitingForGesture,
    unavailableMessage,
    openOnYouTubeUrl,
    currentTrackTitle,
    currentTrackArtist,
    currentTrackThumbnail,
    volume,
    isLooping,
    togglePlaying,
    toggleMuted,
    toggleLoop,
    changeVolume,
    next,
    prev,
  } = music;

  const trackTitle = currentTrackTitle || 'Groove Rehearsal Mix';

  /* --- Measurement --------------------------------------------------------- */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const next = { w: el.offsetWidth, h: el.offsetHeight };
      setBox((current) =>
        current.w === next.w && current.h === next.h ? current : next
      );
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Do not animate the very first placement. The player is server-rendered at a
  // responsive `right` anchor and then takes over with measured pixels.
  useEffect(() => {
    if (box.w === 0 || hasPositioned) return;
    const frame = window.requestAnimationFrame(() => setHasPositioned(true));
    return () => window.cancelAnimationFrame(frame);
  }, [box.w, hasPositioned]);

  const isMobile = viewport.w < 640;
  const margin = isMobile ? 12 : 20;
  const bottomSafe = isMobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP;
  const availableY = Math.max(0, viewport.h - box.h - bottomSafe - TOP_SAFE);
  const dockedTop = TOP_SAFE + availableY * yRatio;
  const dockedLeft = side === 'left'
    ? margin
    : Math.max(margin, viewport.w - box.w - margin);

  const style: React.CSSProperties =
    dragPos !== null
      ? { left: dragPos.left, top: dragPos.top }
      : box.w > 0
        ? { left: dockedLeft, top: dockedTop }
        : { right: 16, top: '30%' };

  /* --- Dragging ------------------------------------------------------------ */
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;

    const el = rootRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      lastLeft: rect.left,
      lastTop: rect.top,
    };
    setDragging(true);
    setDragPos({ left: rect.left, top: rect.top });

    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture is a progressive enhancement */
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;

      const left = clamp(drag.originLeft + dx, 4, Math.max(4, viewport.w - drag.width - 4));
      const top = clamp(drag.originTop + dy, 4, Math.max(4, viewport.h - drag.height - 4));

      drag.lastLeft = left;
      drag.lastTop = top;
      setDragPos({ left, top });
    },
    [viewport.w, viewport.h]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      dragRef.current = null;
      setDragging(false);

      if (drag.moved) {
        const nearestSide: DockSide =
          drag.lastLeft + drag.width / 2 < viewport.w / 2 ? 'left' : 'right';
        const safeBottom = viewport.w < 640 ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP;
        const span = Math.max(1, viewport.h - drag.height - safeBottom - TOP_SAFE);
        updatePrefs({
          side: nearestSide,
          yRatio: clamp((drag.lastTop - TOP_SAFE) / span, 0, 1),
        });
        lastDragEndRef.current = Date.now();
      }

      setDragPos(null);
    },
    [viewport.w, viewport.h]
  );

  const handleRootClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // A click that ended a drag is not a request to change state.
      if (Date.now() - lastDragEndRef.current < 250) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-no-drag], [data-drag-handle]')) return;
      if (mode === 'minimized') updatePrefs({ mode: 'compact' });
    },
    [mode]
  );

  const handleGripKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      let handled = true;
      switch (event.key) {
        case 'ArrowLeft':
          updatePrefs({ side: 'left' });
          break;
        case 'ArrowRight':
          updatePrefs({ side: 'right' });
          break;
        case 'ArrowUp':
          updatePrefs({ yRatio: clamp(yRatio - 0.08, 0, 1) });
          break;
        case 'ArrowDown':
          updatePrefs({ yRatio: clamp(yRatio + 0.08, 0, 1) });
          break;
        case 'Home':
          updatePrefs({ yRatio: 0 });
          break;
        case 'End':
          updatePrefs({ yRatio: 1 });
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    },
    [yRatio]
  );

  /* --- Presentation -------------------------------------------------------- */
  const statusTone = unavailableMessage
    ? 'text-warning'
    : isWaitingForGesture
      ? 'text-accent-text'
      : isPlaying
        ? 'text-success'
        : 'text-muted-foreground';

  const statusText = unavailableMessage
    ? 'Audio unavailable'
    : isWaitingForGesture
      ? 'Tap play to start'
      : isLoading
        ? 'Loading track…'
        : isPlaying
          ? isLooping
            ? 'Playing · loop on'
            : 'Playing'
          : 'Paused';

  const iconButton =
    'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

  const playButton =
    'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm shadow-accent/25 transition hover:bg-accent-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <>
      <div
        ref={rootRef}
        role="region"
        aria-label="Groove music mini-player"
        data-state={mode}
        style={style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleRootClick}
        className={cn(
          'fixed z-30 select-none touch-none',
          hasPositioned && !dragging && 'transition-[left,top] duration-300 ease-out',
          mode === 'minimized'
            ? 'w-auto'
            : mode === 'expanded'
              ? 'w-[340px] max-w-[calc(100vw-1.5rem)]'
              : 'w-[330px] max-w-[calc(100vw-1.5rem)]',
          className
        )}
      >
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-accent-border/60 bg-card/95 text-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.85)] ring-1 ring-white/5 backdrop-blur-xl',
            isWaitingForGesture && 'border-accent/70',
            dragging && 'cursor-grabbing shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)]'
          )}
        >
          {/* Main row — present in every state. */}
          <div className="flex items-center gap-1.5 p-1.5 pl-1">
            <button
              type="button"
              data-drag-handle
              aria-label="Move music player. Use arrow keys to change its position."
              title="Drag to move · arrow keys to dock"
              onKeyDown={handleGripKeyDown}
              className="flex h-9 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/70 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <span
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted"
              title={mode === 'minimized' ? trackTitle : undefined}
            >
              {currentTrackThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrackThumbnail}
                  alt={mode === 'minimized' ? trackTitle : ''}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-accent-text">
                  <Music className="h-4 w-4" aria-hidden="true" />
                </span>
              )}

              {isPlaying && (
                <span className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/45 pb-1.5">
                  {[0, 1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className="g-eq-bar h-2.5 w-[2px] rounded-full bg-accent"
                      style={{ animationDelay: `${bar * 110}ms` }}
                    />
                  ))}
                </span>
              )}
            </span>

            {mode === 'minimized' ? (
              <>
                <button
                  type="button"
                  data-no-drag
                  onClick={togglePlaying}
                  disabled={isLoading}
                  aria-label={isPlaying ? `Pause ${trackTitle}` : `Play ${trackTitle}`}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className={cn(playButton, 'h-8 w-8')}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : isPlaying ? (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  data-no-drag
                  onClick={() => updatePrefs({ mode: 'compact' })}
                  aria-label="Expand music player"
                  title="Expand music player"
                  className={iconButton}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold leading-tight text-foreground">
                    {trackTitle}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium leading-tight',
                      statusTone
                    )}
                  >
                    {isPlaying && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                    )}
                    {unavailableMessage && (
                      <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{statusText}</span>
                  </p>
                </div>

                <button
                  type="button"
                  data-no-drag
                  onClick={togglePlaying}
                  disabled={isLoading}
                  aria-label={isPlaying ? `Pause ${trackTitle}` : `Play ${trackTitle}`}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className={playButton}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
                  )}
                </button>

                {/* The expanded panel has its own mute + slider, so the compact
                    mute is hidden there rather than duplicated. */}
                {mode !== 'expanded' && (
                  <button
                    type="button"
                    data-no-drag
                    onClick={toggleMuted}
                    aria-label={isMuted ? 'Unmute music' : 'Mute music'}
                    title={isMuted ? 'Unmute' : `Mute (${volume}%)`}
                    className={iconButton}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-danger" aria-hidden="true" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-4 w-4 text-accent-text" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-accent-text" aria-hidden="true" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  data-no-drag
                  onClick={() =>
                    updatePrefs({ mode: mode === 'expanded' ? 'compact' : 'expanded' })
                  }
                  aria-expanded={mode === 'expanded'}
                  aria-label={
                    mode === 'expanded'
                      ? 'Hide volume and track controls'
                      : 'Show volume and track controls'
                  }
                  title={mode === 'expanded' ? 'Less controls' : 'More controls'}
                  className={cn(
                    iconButton,
                    mode === 'expanded' && 'bg-accent-soft text-accent-text'
                  )}
                >
                  {mode === 'expanded' ? (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {mode === 'expanded' && (
                  <button
                    type="button"
                    data-no-drag
                    onClick={() => updatePrefs({ mode: 'minimized' })}
                    aria-label="Minimize music player"
                    title="Minimize player"
                    className={iconButton}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Expanded controls. */}
          {mode === 'expanded' && (
            <div className="border-t border-border/70 bg-muted/20 px-2.5 pb-2.5 pt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-no-drag
                  onClick={prev}
                  aria-label="Previous track"
                  title="Previous track"
                  className={iconButton}
                >
                  <SkipBack className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  data-no-drag
                  onClick={togglePlaying}
                  disabled={isLoading}
                  aria-label={isPlaying ? `Pause ${trackTitle}` : `Play ${trackTitle}`}
                  className={playButton}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  data-no-drag
                  onClick={next}
                  aria-label="Next track"
                  title="Next track"
                  className={iconButton}
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  data-no-drag
                  onClick={toggleLoop}
                  aria-pressed={isLooping}
                  aria-label={isLooping ? 'Turn continuous loop off' : 'Turn continuous loop on'}
                  title={isLooping ? 'Loop on' : 'Loop off'}
                  className={cn(iconButton, isLooping && 'bg-accent-soft text-accent-text')}
                >
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  data-no-drag
                  onClick={() => setDetailsOpen(true)}
                  className="ml-auto inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Music className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Track</span>
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-2 py-1.5">
                <button
                  type="button"
                  data-no-drag
                  onClick={toggleMuted}
                  aria-label={isMuted ? 'Unmute music' : 'Mute music'}
                  className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                  ) : volume < 50 ? (
                    <Volume1 className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  )}
                </button>

                <label htmlFor="showcase-mini-volume" className="sr-only">
                  Music volume
                </label>
                <input
                  id="showcase-mini-volume"
                  data-no-drag
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={isMuted ? 0 : volume}
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
                  aria-label="Music volume"
                />

                <span className="w-8 shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {isMuted ? 0 : volume}%
                </span>
              </div>

              {unavailableMessage && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-warning">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p>{unavailableMessage}</p>
                    {openOnYouTubeUrl && (
                      <a
                        href={openOnYouTubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold underline hover:text-foreground"
                      >
                        Listen on YouTube
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
                {currentTrackArtist || 'Official Rehearsal Audio'}
              </p>
            </div>
          )}
        </div>

        <span className="sr-only" aria-live="polite">
          {`Music player docked ${side === 'left' ? 'left' : 'right'}.`}
        </span>
      </div>

      <MusicDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        music={music}
      />
    </>
  );
}

export default MusicMiniPlayer;
