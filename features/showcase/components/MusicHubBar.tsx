'use client';

/**
 * The Community Showcase Music Hub — the ONLY persistent player UI.
 *
 * The floating dock was removed; everything lives here and in the inline panel
 * that expands beneath this bar. Playback never opens a popup.
 *
 * LAYOUT
 *   Desktop — full transport: Previous · Play/Pause · Next, then mute + volume,
 *             then New Playlist and the chevron.
 *   Mobile  — Play/Pause, Next and the chevron only, as specified. Previous,
 *             volume and New Playlist are reachable from the expanded panel.
 *
 * PERSISTENCE
 *   The bar is sticky, so playback keeps going and stays reachable while the
 *   member scrolls the feed.
 */

import React from 'react';
import {
  ChevronDown,
  ExternalLink,
  ListMusic,
  Music,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { BackgroundMusic } from '../hooks/useBackgroundMusic';
import { cn } from '@/components/shared/cn';

export interface MusicHubBarProps {
  music: BackgroundMusic;
  /** Expands the inline panel. `create` opens it straight into the create form. */
  onTogglePanel: (opts?: { create?: boolean }) => void;
  panelOpen: boolean;
  className?: string;
}

export function MusicHubBar({
  music,
  onTogglePanel,
  panelOpen,
  className,
}: MusicHubBarProps) {
  const {
    isMuted,
    toggleMuted,
    togglePlaying,
    volume,
    changeVolume,
    next,
    prev,
    isPlaying,
    isAudible,
    isWaitingForGesture,
    currentTrackTitle,
    currentTrackArtist,
    unavailableMessage,
    openOnYouTubeUrl,
  } = music;

  const iconBtn =
    'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <section
      aria-label="Community Showcase Music Hub"
      className={cn(
        'sticky top-[68px] z-20 rounded-[14px] border border-border bg-card shadow-[var(--shadow-sm)]',
        className
      )}
    >
      <div className="flex min-h-16 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <span
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text sm:flex"
          aria-hidden="true"
        >
          <Music className="h-4 w-4" />
        </span>

        {/* Labels + now playing. Truncated so controls can never be pushed off. */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-text">
            Community Showcase Music Hub
          </p>
          <h2 className="truncate text-sm font-bold text-foreground">
            Rehearsal &amp; Performance Playlists
          </h2>
          <p className="hidden truncate text-[11px] text-muted-foreground lg:block">
            Curate 8-count beats, vocal warmups, and choreography tracks for classes and live
            showcases.
          </p>
        </div>

        {/* Current track — always present, as specified. */}
        <div className="hidden min-w-0 max-w-[180px] shrink-0 xl:block">
          {unavailableMessage ? (
            <p className="flex items-center gap-1.5 text-[10px] text-warning">
              <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{unavailableMessage}</span>
            </p>
          ) : currentTrackTitle ? (
            <p className="truncate text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{currentTrackTitle}</span>
              {currentTrackArtist ? ` · ${currentTrackArtist}` : ''}
            </p>
          ) : (
            <p className="truncate text-[11px] text-muted-foreground">
              {isWaitingForGesture ? 'Tap anywhere to start the music' : 'No track playing yet'}
            </p>
          )}
        </div>

        {/* Transport. Mobile shows Play/Pause, Next and the chevron only. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous track"
            className={cn(iconBtn, 'hidden sm:inline-flex')}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={togglePlaying}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
            aria-pressed={isPlaying}
            className={cn(iconBtn, 'bg-accent text-accent-foreground hover:bg-accent-hover')}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />
            )}
          </button>

          <button type="button" onClick={next} aria-label="Next track" className={iconBtn}>
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Mute + volume. Hidden on mobile; both live in the panel there. */}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
              aria-pressed={isMuted}
              className={cn(iconBtn, 'h-9 w-9')}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <label htmlFor="showcase-music-volume" className="sr-only">
              Music volume
            </label>
            <input
              id="showcase-music-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Music volume"
              className="h-1 w-20 cursor-pointer rounded-full bg-muted accent-[var(--accent)]"
            />
          </div>

          <button
            type="button"
            onClick={() => onTogglePanel({ create: true })}
            className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-[11px] font-bold text-accent-foreground transition hover:bg-accent-hover lg:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Playlist</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePanel()}
            aria-label={panelOpen ? 'Collapse music hub' : 'Expand music hub'}
            aria-expanded={panelOpen}
            aria-controls="showcase-music-hub-panel"
            className={cn(iconBtn, panelOpen && 'bg-muted')}
          >
            {panelOpen ? (
              <ChevronDown className="h-4 w-4 rotate-180 transition-transform" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Status strip — the two messages that must stay readable and reachable. */}
      {(openOnYouTubeUrl || (unavailableMessage && isAudible === false)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider px-3 py-1.5 text-[11px] sm:px-4">
          {openOnYouTubeUrl ? (
            <span className="text-warning">This track cannot be embedded here.</span>
          ) : (
            <span className="truncate text-warning">{unavailableMessage}</span>
          )}
          <div className="flex shrink-0 items-center gap-3">
            {openOnYouTubeUrl && (
              <a
                href={openOnYouTubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-warning underline underline-offset-2 hover:brightness-110"
              >
                Open on YouTube
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={() => onTogglePanel()}
              className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline"
            >
              <ListMusic className="h-3 w-3" aria-hidden="true" />
              Open hub
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default MusicHubBar;