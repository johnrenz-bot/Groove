'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  X,
  Tv,
  ChevronDown,
  Music,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { cn } from '@/components/shared/cn';

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MusicPlayerDock: React.FC = () => {
  const {
    currentTrack,
    activePlaylist,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    error,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    closePlayer,
  } = useMusicPlayer();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Floating Bottom Dock */}
      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl transition-all duration-300',
          isMinimized ? 'translate-y-[calc(100%-46px)]' : 'translate-y-0'
        )}
      >
        <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl p-3 sm:p-4 text-foreground transition-all">
          {/* Minimized Bar Handler */}
          {isMinimized && (
            <div
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between cursor-pointer px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="font-semibold text-foreground truncate">{currentTrack.title}</span>
                <span className="opacity-70 truncate">— {currentTrack.artist}</span>
              </div>
              <span className="text-[11px] font-medium bg-muted px-2 py-0.5 rounded-full">Expand Player ↑</span>
            </div>
          )}

          {!isMinimized && (
            <div className="space-y-2">
              {/* Top Row: Track Meta, Controls, Volume & Window actions */}
              <div className="flex items-center justify-between gap-3">
                {/* Track Meta */}
                <div className="flex items-center gap-3 min-w-0 max-w-[40%] sm:max-w-[35%]">
                  <div className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden border border-border bg-muted">
                    {currentTrack.thumbnail ? (
                      <Image
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        fill
                        className={cn(
                          'object-cover transition-transform duration-500',
                          isPlaying && 'scale-105'
                        )}
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
                      {currentTrack.title}
                    </p>
                    <p className="text-[11px] truncate text-muted-foreground">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                {/* Center Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    aria-label="Toggle shuffle"
                    className={cn(
                      'p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors',
                      isShuffle && 'text-accent font-bold bg-accent-soft'
                    )}
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={playPrev}
                    aria-label="Previous track"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={isLoading}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="p-2.5 rounded-xl bg-accent text-accent-foreground hover:opacity-90 shadow-sm transition-transform active:scale-95 flex items-center justify-center"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current translate-x-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={playNext}
                    aria-label="Next track"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleRepeat}
                    aria-label="Toggle repeat"
                    className={cn(
                      'p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors',
                      repeatMode !== 'none' && 'text-accent font-bold bg-accent-soft'
                    )}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  </button>
                </div>

                {/* Right Actions: Volume, Watch Video, Minimize, Close */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden md:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 h-1 bg-muted accent-accent cursor-pointer rounded-full"
                    />
                  </div>

                  {/* Watch Video Mode */}
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    title="Watch Choreography / Video"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <Tv className="h-4 w-4" />
                  </button>

                  {/* Minimize */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize player"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Close Player */}
                  <button
                    type="button"
                    onClick={closePlayer}
                    title="Close player"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Timestamps */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                <span className="w-9 text-right">{formatSeconds(currentTime)}</span>
                <div
                  className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer group"
                  onClick={(e) => {
                    if (duration > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPos = (e.clientX - rect.left) / rect.width;
                      seekTo(clickPos * duration);
                    }
                  }}
                >
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="w-9">{formatSeconds(duration)}</span>
              </div>

              {/* Notification Banner on Video owner restrictions */}
              {error && (
                <div className="text-[11px] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-center truncate">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Choreography & Performance Video Popover Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-accent-soft text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="font-semibold text-sm truncate text-foreground">
                  {currentTrack.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
                >
                  <span>Open in YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1`}
                title={currentTrack.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
