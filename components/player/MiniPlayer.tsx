'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ChevronUp,
  ListMusic,
  Loader2,
  Minus,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMusicPlayer } from '@/features/music/context/MusicPlayerContext';
import { GROOVEPH_HITS_2020S } from '@/features/music/data/seed';
import { EqualizerBars } from '@/components/loading/GrooveSpinner';
import { cn } from '@/lib/utils';
import { PlaylistPanel } from './PlaylistPanel';

const MINIMIZED_KEY = 'groove:player:minimized';
const VOLUME_KEY = 'groove:player:volume';

const iconBtn =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The persistent bottom-docked music player.
 *
 * One instance, mounted once in the dashboard shell (see
 * components/shared/DashboardLayout.tsx), so music and the controls survive
 * every client-side route change. Never autoplays; the YouTube resource is
 * route-gated by `isMusicRoute`. Rendered nowhere on public/auth pages —
 * the dashboard layouts are the only mount points.
 */
export function MiniPlayer({ className }: { className?: string }) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    error,
    savedSession,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    playTrack,
  } = useMusicPlayer();

  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);

  // SSR-safe hydration: read persisted UI state only after mount.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setMinimized(window.localStorage.getItem(MINIMIZED_KEY) === '1');
        const savedVolume = window.localStorage.getItem(VOLUME_KEY);
        if (savedVolume !== null) {
          const n = Number(savedVolume);
          if (Number.isFinite(n)) setVolume(Math.max(0, Math.min(100, Math.round(n))));
        }
      } catch {
        /* storage blocked — defaults */
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time restore only
  }, []);

  // Persist volume + minimized on change (guarded for SSR).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* storage blocked */
    }
  }, [volume, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MINIMIZED_KEY, minimized ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  }, [minimized, hydrated]);

  /* --- Media Session API --------------------------------------------------- */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const track = currentTrack ?? GROOVEPH_HITS_2020S.tracks[0];
    const artwork: Array<{ src: string; sizes: string; type: string }> = track.artwork
      ? [{ src: track.artwork, sizes: '512x512', type: 'image/jpeg' }]
      : [];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'GroovePH — Rehearsal Mixes',
        artwork,
      });
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const seek = details.seekOffset;
        if (typeof seek === 'number') seekTo(Math.max(0, currentTime + seek));
      });
    } catch {
      /* media session unsupported — silence */
    }
    return () => {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- action handlers are stable
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.artwork, currentTime]);

  /* --- Keyboard shortcuts --------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Never hijack Space/Enter activation of a real control.
      const interactive = (target?.closest('button, a, [role="button"], [role="tab"], [role="option"], [role="switch"], [role="slider"]') ?? null) !== null;
      if (interactive) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        seekTo(Math.max(0, currentTime - 5));
      } else if (event.key === 'ArrowRight') {
        seekTo(Math.min(duration || currentTime + 5, currentTime + 5));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [currentTime, duration, togglePlay, seekTo]);

  const track = currentTrack ?? savedSession?.track ?? GROOVEPH_HITS_2020S.tracks[0];
  const trackTitle = track.title;
  const trackArtist = track.artist;
  const thumbnail = track.artwork;

  const isError = Boolean(error);

  const startPlayback = useCallback(() => {
    playTrack(currentTrack ?? GROOVEPH_HITS_2020S.tracks[0]);
  }, [currentTrack, playTrack]);

  const retry = useCallback(() => {
    if (currentTrack) playTrack(currentTrack);
    else startPlayback();
  }, [currentTrack, playTrack, startPlayback]);

  /* --- Minimized pill -------------------------------------------------------- */
  if (minimized) {
    return (
      <div
        role="region"
        aria-label="Minimized music player"
        className={cn(
          'fixed z-[35] select-none',
          'bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2',
          className
        )}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-3 flex h-14 items-center gap-2 rounded-2xl border border-divider bg-card/95 pl-2 pr-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:mx-0 sm:w-[380px] sm:max-w-[92vw]">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-muted">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-accent-text">♪</span>
            )}
          </div>
          {isPlaying && <EqualizerBars bars={4} height={18} />}
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Restore music player"
            title="Restore music player"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronUp className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
            <span className="hidden sm:inline">Player</span>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
            className="ml-auto inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    );
  }

  /* --- Full mini player ---------------------------------------------------- */
  return (
    <div
      role="region"
      aria-label="Music player"
      className={cn(
        'fixed z-[35] select-none',
        'bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[420px] sm:max-w-[92vw] sm:-translate-x-1/2',
        className
      )}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Expanded panel: queue + controls */}
      {expanded && (
        <div className="mx-3 mb-2 sm:mx-0">
          <PlaylistPanel onClose={() => setExpanded(false)} />
        </div>
      )}

      {/* Main dock bar */}
      <div className="mx-3 flex items-center gap-2 rounded-2xl border border-divider bg-card/95 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:mx-0">
        {/* Cover */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-accent-text">♪</span>
          )}
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Track meta + progress */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isPlaying && <EqualizerBars bars={3} height={12} />}
            <div className="min-w-0 flex-1 overflow-hidden">
              <p
                className="truncate whitespace-nowrap text-[11px] font-bold leading-tight text-foreground"
                title={trackTitle}
                aria-label={trackTitle}
              >
                {trackTitle}
              </p>
            </div>
          </div>
          <p className="mt-0.5 truncate text-[9px] font-medium text-muted-foreground" title={trackArtist}>
            {trackArtist}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-7 shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
            <label htmlFor="mini-player-seek" className="sr-only">Seek</label>
            <input
              id="mini-player-seek"
              type="range"
              min={0}
              max={Math.max(1, Math.floor(duration || 1))}
              step={1}
              value={Math.floor(currentTime)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek"
              aria-valuetext={formatTime(currentTime)}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
            />
            <span className="w-7 shrink-0 text-right font-mono text-[9px] tabular-nums text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transport */}
        <button type="button" onClick={playPrev} aria-label="Previous track" title="Previous track" className={iconBtn}>
          <SkipBack className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause ${trackTitle}` : `Play ${trackTitle}`}
          title={isPlaying ? 'Pause' : 'Play'}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5 translate-x-px fill-current" aria-hidden="true" />
          )}
        </button>
        <button type="button" onClick={playNext} aria-label="Next track" title="Next track" className={iconBtn}>
          <SkipForward className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>

        {/* Volume (popover) — desktop only; mobile uses the queue panel */}
        <button
          type="button"
          onClick={() => setVolumeOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={volumeOpen}
          aria-label="Volume"
          title={`Volume ${isMuted ? 0 : volume}%`}
          className={cn(iconBtn, 'hidden sm:inline-flex')}
        >
          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        </button>

        {/* Expand / minimize */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="mini-player-expanded"
          aria-label={expanded ? 'Hide queue' : 'Show queue'}
          title={expanded ? 'Hide queue' : 'Queue'}
          className={iconBtn}
        >
          <ListMusic className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="Minimize music player"
          title="Minimize"
          className={iconBtn}
        >
          <Minus className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
        </button>
      </div>

      {/* Inline error banner (never a modal) */}
      {isError && (
        <div className="mx-3 mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-1.5 text-[10px] text-danger sm:mx-0" role="alert">
          <span className="min-w-0 truncate">Unable to load audio for this track.</span>
          <button
            type="button"
            onClick={retry}
            className="shrink-0 cursor-pointer rounded-lg bg-danger/15 px-2 py-1 font-semibold text-danger transition hover:bg-danger/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Retry
          </button>
        </div>
      )}

      {/* Volume popover */}
      {volumeOpen && (
        <div
          role="dialog"
          aria-label="Volume"
          className="absolute bottom-[calc(100%+0.5rem)] right-3 flex w-48 items-center gap-2 rounded-2xl border border-divider bg-card/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:right-0"
        >
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
          <label htmlFor="mini-player-volume-pop" className="sr-only">Music volume</label>
          <input
            id="mini-player-volume-pop"
            type="range"
            min={0}
            max={100}
            step={1}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
            aria-label="Music volume"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {isMuted ? 0 : volume}%
          </span>
        </div>
      )}
    </div>
  );
}

export default MiniPlayer;

