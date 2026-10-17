'use client';

/**
 * Music Details Modal for Groove Music Hub.
 *
 * Provides:
 *   - Hi-res Cover art preview with live vinyl/playback animations.
 *   - Comprehensive track metadata (Title, Artist, Duration, Audio source status).
 *   - Full interactive playback transport: Play/Pause, Next/Prev, Seek slider, Loop toggle.
 *   - Volume slider with direct presets (25%, 50%, 80%, 100%) and Mute/Unmute.
 *   - Rehearsal Catalogue selection with instant playback.
 *   - Chronological Recently Played History with one-click replay.
 *   - Dark glassmorphic design matching GrooveSystem aesthetic.
 */

import React, { useState } from 'react';
import {
  ExternalLink,
  History,
  ListMusic,
  Loader2,
  Music,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import type { BackgroundMusic } from '@/features/showcase/hooks/useBackgroundMusic';
import type { MusicTrack } from '../types';
import { cn } from '@/components/shared/cn';

export interface MusicDetailsModalProps {
  open: boolean;
  onClose: () => void;
  music: BackgroundMusic;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MusicDetailsModal({
  open,
  onClose,
  music,
}: MusicDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'tracks' | 'history'>('tracks');

  const {
    currentTrack,
    currentTrackTitle,
    currentTrackArtist,
    currentTrackThumbnail,
    isPlaying,
    isLoading,
    isMuted,
    volume,
    isLooping,
    currentTime,
    duration,
    togglePlaying,
    toggleMuted,
    toggleLoop,
    changeVolume,
    next,
    prev,
    seekTo,
    playTrack,
    allTracks,
    recentHistory,
    openOnYouTubeUrl,
    savedSession,
    resumeRecentPlayback,
  } = music;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Groove Rehearsal Audio & Details"
      description="Studio-ready rehearsal tracks, choreography counts & playback controls"
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* Main Track Showcase: Cover Art + Info */}
        <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[160px_1fr]">
          {/* Cover Art Artwork with Vinyl Glow */}
          <div className="group relative mx-auto aspect-square w-36 overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-1.5 shadow-xl sm:w-40">
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/60">
              {currentTrackThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrackThumbnail}
                  alt={currentTrackTitle}
                  className={cn(
                    'h-full w-full object-cover transition-transform duration-700',
                    isPlaying ? 'scale-105' : 'scale-100 group-hover:scale-105'
                  )}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/10 text-accent">
                  <Music className="h-10 w-10 animate-pulse" />
                </div>
              )}

              {/* Status Pill on Art */}
              <div className="absolute left-2 top-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md',
                    isPlaying
                      ? 'border border-emerald-500/30 bg-emerald-950/80 text-emerald-400'
                      : 'border border-border/80 bg-background/80 text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-muted-foreground'
                    )}
                  />
                  {isPlaying ? 'Live' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Track Details & Tags */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-text border border-accent/30">
                Official Audio
              </span>
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/60">
                Studio Rehearsal
              </span>
              {openOnYouTubeUrl && (
                <a
                  href={openOnYouTubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-text hover:underline"
                >
                  <span>Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {currentTrackTitle}
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              {currentTrackArtist}
            </p>

            {/* Playback Position / Duration Summary */}
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-muted-foreground sm:justify-start">
              <span className="font-mono text-foreground font-semibold">
                {formatTime(currentTime)}
              </span>
              <span>/</span>
              <span className="font-mono">
                {duration > 0 ? formatTime(duration) : (currentTrack?.duration || '3:45')}
              </span>
              {isLooping && (
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  Looping
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seek / Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={duration > 0 ? Math.floor(duration) : 240}
              value={Math.floor(currentTime)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Track progress slider"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-accent transition-all hover:h-2.5"
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-2">
              {savedSession && savedSession.position > 0 && Math.abs(savedSession.position - currentTime) > 5 && (
                <button
                  type="button"
                  onClick={resumeRecentPlayback}
                  className="text-[10px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  Resume at {formatTime(savedSession.position)}
                </button>
              )}
              <span>{duration > 0 ? formatTime(duration) : (currentTrack?.duration || '3:45')}</span>
            </div>
          </div>
        </div>

        {/* Main Transport & Volume Controls */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Primary Controls */}
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <button
                type="button"
                onClick={prev}
                title="Previous track"
                aria-label="Previous track"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground active:scale-95"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={togglePlaying}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
                className="inline-flex h-12 px-6 cursor-pointer items-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-foreground shadow-md shadow-accent/25 transition hover:bg-accent-hover active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current translate-x-px" />
                )}
                <span>{isPlaying ? 'Pause' : 'Play Track'}</span>
              </button>

              <button
                type="button"
                onClick={next}
                title="Next track"
                aria-label="Next track"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground active:scale-95"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={toggleLoop}
                aria-pressed={isLooping}
                title={isLooping ? 'Continuous loop is ON' : 'Turn continuous loop ON'}
                className={cn(
                  'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95',
                  isLooping
                    ? 'border-accent/50 bg-accent/15 text-accent shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Repeat className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => seekTo(0)}
                title="Restart from 0:00"
                aria-label="Restart track"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Volume & Presets */}
            <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
              <button
                type="button"
                onClick={toggleMuted}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-danger" />
                ) : volume < 50 ? (
                  <Volume1 className="h-4 w-4 text-accent-text" />
                ) : (
                  <Volume2 className="h-4 w-4 text-accent-text" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume slider"
                className="h-1.5 w-24 cursor-pointer accent-accent transition sm:w-28"
              />
              <span className="w-8 font-mono text-[11px] font-semibold text-muted-foreground">
                {isMuted ? 0 : volume}%
              </span>

              {/* Presets */}
              <div className="hidden items-center gap-1 sm:flex">
                {[25, 50, 80, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => changeVolume(v)}
                    className={cn(
                      'h-6 rounded-md px-1.5 text-[10px] font-bold cursor-pointer transition',
                      !isMuted && volume === v
                        ? 'border border-accent/40 bg-accent/20 text-accent'
                        : 'border border-border/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rehearsal Catalogue & History Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tracks')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                  activeTab === 'tracks'
                    ? 'border border-accent/30 bg-accent/15 text-accent-text'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <ListMusic className="h-3.5 w-3.5" />
                <span>Rehearsal Mixes ({allTracks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                  activeTab === 'history'
                    ? 'border border-accent/30 bg-accent/15 text-accent-text'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <History className="h-3.5 w-3.5" />
                <span>Recent History ({recentHistory.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Tap track to stream immediately
            </span>
          </div>

          {/* Tab 1: Rehearsal Catalogue */}
          {activeTab === 'tracks' && (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 g-scroll">
              {allTracks.map((trk, i) => {
                const isCurrent = currentTrack?.youtubeId === trk.youtubeId;
                return (
                  <div
                    key={trk.id || trk.youtubeId}
                    onClick={() => playTrack(trk)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-2.5 transition cursor-pointer',
                      isCurrent
                        ? 'border-accent/40 bg-accent/10 shadow-xs ring-1 ring-accent/30'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted">
                        {trk.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={trk.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Music className="h-4 w-4" />
                          </div>
                        )}
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                            <span className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 bg-accent animate-[pulse_0.7s_infinite] h-2.5" />
                              <span className="w-0.5 bg-accent animate-[pulse_1.0s_infinite] h-3" />
                              <span className="w-0.5 bg-accent animate-[pulse_0.5s_infinite] h-1.5" />
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-xs font-semibold',
                            isCurrent ? 'text-accent-text font-bold' : 'text-foreground'
                          )}
                        >
                          {trk.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {trk.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {trk.duration || '3:45'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCurrent) {
                            togglePlaying();
                          } else {
                            playTrack(trk);
                          }
                        }}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer',
                          isCurrent && isPlaying
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3 fill-current translate-x-px" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Recent History */}
          {activeTab === 'history' && (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 g-scroll">
              {recentHistory.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No playback history yet. Start streaming a rehearsal mix!
                </p>
              ) : (
                recentHistory.map((trk) => {
                  const isCurrent = currentTrack?.youtubeId === trk.youtubeId;
                  return (
                    <div
                      key={`hist-${trk.youtubeId}`}
                      onClick={() => playTrack(trk)}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-2.5 transition cursor-pointer',
                        isCurrent
                          ? 'border-accent/40 bg-accent/10 shadow-xs'
                          : 'border-border/60 bg-card hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted">
                          {trk.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={trk.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Music className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {trk.title}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {trk.artist}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(trk);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent-text hover:bg-accent hover:text-accent-foreground transition cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Playback preserves seamlessly across coach and client showcase routes.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default MusicDetailsModal;
