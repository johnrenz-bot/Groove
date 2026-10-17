'use client';

/**
 * Modern Compact Collapsible Music Player.
 *
 * Dedicated to the Groove Rehearsal Mix (https://youtu.be/3vmewzGcX2I)
 *
 * FEATURES:
 *   - Sleek glassmorphic container with refined dark/light border and blur.
 *   - Auto-play attempt on entering allowed routes (/coach/talents & /client/talent).
 *   - Autoplay policy compliance with clear visual prompt when browser requires gesture.
 *   - Direct real-time volume slider (0-100), quick presets (25%, 50%, 80%, 100%), and mute/unmute.
 *   - Continuous loop toggle with active status indicator.
 *   - Live audio visualizer animation when playback is active.
 *   - Uninterrupted audio playback across expand and collapse toggles.
 *   - Smooth responsive layout for mobile, tablet, and desktop viewports.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Info,
  Loader2,
  Music,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { BackgroundMusic } from '../hooks/useBackgroundMusic';
import { MusicDetailsModal } from '@/features/music/components/MusicDetailsModal';
import { cn } from '@/components/shared/cn';

export interface MusicHubBarProps {
  music: BackgroundMusic;
  /** Optional external control for panel open state */
  onTogglePanel?: () => void;
  panelOpen?: boolean;
  className?: string;
}

export function MusicHubBar({
  music,
  onTogglePanel,
  panelOpen,
  className,
}: MusicHubBarProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const isExpanded = panelOpen !== undefined ? panelOpen : internalExpanded;

  const toggleExpanded = () => {
    if (onTogglePanel) {
      onTogglePanel();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const {
    isMuted,
    toggleMuted,
    togglePlaying,
    volume,
    changeVolume,
    isLooping,
    toggleLoop,
    isPlaying,
    isLoading,
    unavailableMessage,
    openOnYouTubeUrl,
    isWaitingForGesture,
    currentTrackTitle,
    currentTrackArtist,
    currentTrackThumbnail,
    next: handleNext,
    prev: handlePrev,
    savedSession,
    resumeRecentPlayback,
    currentTime,
    duration,
  } = music;

  const hasRecentSession = Boolean(
    !isPlaying &&
    savedSession?.track &&
    savedSession.position > 0 &&
    (currentTrackTitle !== savedSession.track.title || currentTime !== savedSession.position)
  );

  return (
    <>
      <section
        aria-label="Groove Rehearsal Mix Music Hub"
        className={cn(
          'sticky top-[68px] z-20 rounded-2xl border border-border/80 bg-card/95 shadow-md shadow-black/5 backdrop-blur-xl transition-all duration-300 dark:border-border/60 dark:bg-card/90 dark:shadow-black/20',
          isWaitingForGesture && 'ring-2 ring-accent/40 border-accent/60',
          className
        )}
      >
        {/* Top Glass Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* Main Bar Header — Always visible */}
        <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 sm:px-5">
          {/* Left: Badge, Track Meta & State */}
          <div className="flex min-w-0 items-center gap-3">
            {/* Animated Music Visualizer / Icon (Click to open details modal) */}
            <button
              type="button"
              onClick={() => setDetailsModalOpen(true)}
              title="Open Track Details & Rehearsal Catalogue"
              className={cn(
                'relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all duration-300 active:scale-95',
                isPlaying
                  ? 'border-accent/40 bg-accent/15 text-accent shadow-sm shadow-accent/20'
                  : isWaitingForGesture
                  ? 'border-accent bg-accent/10 text-accent animate-pulse'
                  : 'border-border/70 bg-muted/60 text-muted-foreground hover:border-accent/40 hover:bg-muted'
              )}
              aria-label="Open Track Details & Rehearsal Catalogue"
            >
              {isPlaying ? (
                <span className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-accent rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3.5" />
                  <span className="w-1 bg-accent rounded-full animate-[pulse_1.0s_ease-in-out_infinite] h-4" />
                  <span className="w-1 bg-accent rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2.5" />
                  <span className="w-1 bg-accent rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-4" />
                </span>
              ) : currentTrackThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrackThumbnail}
                  alt=""
                  className="h-full w-full rounded-[10px] object-cover"
                />
              ) : (
                <Music className="h-4 w-4" />
              )}
            </button>

            {/* Hub Title & Live Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent-text">
                  Music Hub
                </span>
                <span className="text-muted-foreground/30 text-xs">·</span>
                
                {/* Status Indicator Pill */}
                {unavailableMessage ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                    <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>Audio Notice</span>
                  </span>
                ) : isWaitingForGesture ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    <span>Autoplay paused · Tap Play</span>
                  </span>
                ) : isPlaying ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 dark:text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span>Playing{isLooping ? ' (Loop)' : ''}</span>
                  </span>
                ) : isLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-accent" />
                    <span>Loading track…</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Ready to stream
                  </span>
                )}
              </div>

              <div
                onClick={() => setDetailsModalOpen(true)}
                className="group flex items-center gap-2 cursor-pointer"
                title="Click to view track details and tracklist"
              >
                <h2 className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-accent-text sm:text-[0.9375rem]">
                  {currentTrackTitle || 'Groove Rehearsal Mix'}
                </h2>
                <span className="hidden rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-text sm:inline-block">
                  Official Audio
                </span>
                <Info className="h-3 w-3 text-muted-foreground transition opacity-0 group-hover:opacity-100 hidden sm:inline" />
              </div>
            </div>
          </div>

          {/* Right Side: Quick Action & Expand / Collapse Controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Quick Play/Pause Header Button */}
            <button
              type="button"
              onClick={togglePlaying}
              disabled={isLoading}
              aria-label={isPlaying ? `Pause ${currentTrackTitle}` : `Play ${currentTrackTitle}`}
              className={cn(
                'inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all active:scale-95',
                isWaitingForGesture || !isPlaying
                  ? 'bg-accent text-accent-foreground shadow-sm shadow-accent/25 hover:bg-accent-hover ring-2 ring-accent/30'
                  : 'border border-border/80 bg-muted/80 text-foreground hover:bg-muted'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play Track'}</span>
            </button>

            {/* Quick Volume / Mute Toggle in bar */}
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
              className="inline-flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
              title={isMuted ? 'Unmute' : `Mute (Current: ${volume}%)`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-danger" />
              ) : volume < 50 ? (
                <Volume1 className="h-4 w-4 text-accent-text" />
              ) : (
                <Volume2 className="h-4 w-4 text-accent-text" />
              )}
            </button>

            {/* Details Modal Trigger Button */}
            <button
              type="button"
              onClick={() => setDetailsModalOpen(true)}
              aria-label="Track Details & Song Catalogue"
              title="Track Details & Song Catalogue"
              className="hidden sm:inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>

            {/* Expand / Collapse Controls Button */}
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse music controls' : 'Expand music controls'}
              className={cn(
                'inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all active:scale-95',
                isExpanded
                  ? 'border-accent/40 bg-accent/10 text-accent-text shadow-2xs'
                  : 'border-border/70 bg-card text-foreground hover:border-border hover:bg-muted'
              )}
            >
              <span>{isExpanded ? 'Less' : 'Controls'}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Recent Playback Resumption Alert Banner (if returning with saved position) */}
        {hasRecentSession && savedSession && (
          <div className="flex items-center justify-between border-t border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-foreground sm:px-5">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="truncate">
                Resume recent playback:{' '}
                <strong>{savedSession.track.title}</strong> ({Math.floor(savedSession.position / 60)}:
                {String(Math.floor(savedSession.position % 60)).padStart(2, '0')})
              </span>
            </div>
            <button
              type="button"
              onClick={resumeRecentPlayback}
              className="shrink-0 inline-flex cursor-pointer items-center gap-1 rounded-md bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground hover:bg-accent-hover transition active:scale-95"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Resume</span>
            </button>
          </div>
        )}

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div className="border-t border-border/70 bg-muted/30 px-3.5 py-3.5 sm:px-5">
          {/* Autoplay restriction prompt if browser paused playback */}
          {isWaitingForGesture && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-medium text-foreground shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent shrink-0" />
                <span>Browser autoplay policy paused audio. Click <strong>Play Mix</strong> to enable background music.</span>
              </div>
              <button
                type="button"
                onClick={togglePlaying}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-3 py-1 text-xs font-bold text-accent-foreground hover:bg-accent-hover"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Play Now</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Primary Controls: Big Play/Pause, Loop Toggle, Restart */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlaying}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause Groove Rehearsal Mix' : 'Play Groove Rehearsal Mix'}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm shadow-accent/20 transition hover:bg-accent-hover disabled:opacity-50 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4 fill-current translate-x-px" aria-hidden="true" />
                )}
                <span>{isPlaying ? 'Pause' : 'Play Mix'}</span>
              </button>

              {/* Loop Toggle */}
              <button
                type="button"
                onClick={toggleLoop}
                aria-pressed={isLooping}
                title={isLooping ? 'Continuous loop is ON' : 'Turn continuous loop ON'}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95',
                  isLooping
                    ? 'border-accent/50 bg-accent/15 text-accent shadow-2xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Repeat className={cn('h-3.5 w-3.5', isLooping && 'text-accent')} aria-hidden="true" />
                <span>{isLooping ? 'Loop: On' : 'Loop: Off'}</span>
              </button>

              {/* Previous / Next buttons */}
              <button
                type="button"
                onClick={handlePrev}
                title="Previous track"
                aria-label="Previous track"
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <SkipBack className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                title="Next track"
                aria-label="Next track"
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="h-3.5 w-3.5" />
              </button>

              {/* Restart Track button */}
              <button
                type="button"
                onClick={() => music.seekTo(0)}
                title="Restart track from 0:00"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restart</span>
              </button>

              {/* Open Details Modal Button */}
              <button
                type="button"
                onClick={() => setDetailsModalOpen(true)}
                title="Open Music Hub details modal"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-xs font-bold text-accent-text transition hover:bg-accent hover:text-accent-foreground active:scale-95"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Track Details</span>
              </button>
            </div>

            {/* Volume, Slider & Presets */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={toggleMuted}
                  aria-label={isMuted ? 'Unmute music' : 'Mute music'}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-danger" aria-hidden="true" />
                  ) : volume < 50 ? (
                    <Volume1 className="h-4 w-4 text-accent-text" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-accent-text" aria-hidden="true" />
                  )}
                </button>

                <label htmlFor="music-volume-slider" className="sr-only">
                  Playback volume
                </label>
                <input
                  id="music-volume-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  className="h-1.5 w-24 sm:w-28 cursor-pointer accent-accent transition"
                  aria-label="Volume slider 0 to 100"
                />

                <span className="w-9 text-right font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {isMuted ? 0 : volume}%
                </span>
              </div>

              {/* Volume quick presets */}
              <div className="hidden items-center gap-1 sm:flex">
                {[25, 50, 80, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => changeVolume(val)}
                    className={cn(
                      'h-7 rounded-lg px-2 text-[10px] font-bold transition active:scale-95 cursor-pointer',
                      !isMuted && volume === val
                        ? 'bg-accent/20 text-accent font-extrabold border border-accent/40'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                    )}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Graceful error / Audio Note notice if any */}
          {unavailableMessage && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2 text-xs text-warning">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{unavailableMessage}</span>
              </div>
              {openOnYouTubeUrl && (
                <a
                  href={openOnYouTubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline hover:text-foreground"
                >
                  <span>Listen on YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </section>

    {/* Music Details Modal */}
    <MusicDetailsModal
      open={detailsModalOpen}
      onClose={() => setDetailsModalOpen(false)}
      music={music}
    />
  </>
  );
}

export default MusicHubBar;