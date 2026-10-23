'use client';

import React from 'react';
import { DancerCircleRules } from '@/features/community/components/DancerCircleRules';
import { MusicMiniPlayer } from '@/features/showcase/components/MusicMiniPlayer';
import type { BackgroundMusic } from '@/features/showcase/hooks/useBackgroundMusic';
import { GROOVE_OFFICIAL_REHEARSAL_MIX } from '@/features/music/data/curatedTracks';

const noop = () => {};

const music = {
  isMuted: false,
  toggleMuted: noop,
  togglePlaying: noop,
  isPlaying: true,
  isLoading: false,
  volume: 80,
  changeVolume: noop,
  isLooping: true,
  toggleLoop: noop,
  isAudible: true,
  currentTrack: GROOVE_OFFICIAL_REHEARSAL_MIX,
  currentTrackTitle: 'Groove Rehearsal Mix',
  currentTrackArtist: 'Groove Official',
  currentTrackThumbnail: GROOVE_OFFICIAL_REHEARSAL_MIX.thumbnail,
  unavailableMessage: null,
  openOnYouTubeUrl: null,
  next: noop,
  prev: noop,
  isWaitingForGesture: false,
  playlist: null,
  savedSession: null,
  recentHistory: [],
  resumeRecentPlayback: noop,
  currentTime: 30,
  duration: 180,
  seekTo: noop,
  playTrack: noop,
  allTracks: [],
} as unknown as BackgroundMusic;

export default function PreviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-20">
      <h1 className="text-xl font-bold text-foreground">Showcase component preview</h1>
      <DancerCircleRules />
      <div className="h-[1200px]" />
      <MusicMiniPlayer music={music} />
    </main>
  );
}
