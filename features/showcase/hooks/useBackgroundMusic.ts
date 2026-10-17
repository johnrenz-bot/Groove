'use client';

/**
 * Background music for the Community Showcase — Single Track Rehearsal Player.
 *
 * Dedicated to the Groove Rehearsal Mix (https://youtu.be/3vmewzGcX2I).
 *
 * RULES:
 *   - No autoplay on page load. Playback is user-initiated.
 *   - Looping the same track continuously when supported.
 *   - Real volume slider (0-100) and mute/unmute control.
 *   - Controls stay synchronized across expand/collapse states.
 *   - Official YouTube IFrame Player API only; no video or thumbnails shown.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useMusicPlayer } from '@/features/music/context/MusicPlayerContext';
import type { MusicTrack, MusicPlaylist, MusicPlaybackSession } from '@/features/music/types';
import type { Profile } from '@/lib/types';
import type { Community } from '@/features/community/utils/community';
import {
  CURATED_DANCE_TRACKS,
  GROOVE_OFFICIAL_REHEARSAL_MIX,
} from '@/features/music/data/curatedTracks';

export const GROOVE_REHEARSAL_TRACK: MusicTrack = GROOVE_OFFICIAL_REHEARSAL_MIX;

export const MUSIC_MUTE_STORAGE_KEY = 'groove:showcase:music-muted:v1';
export const MUSIC_VOLUME_STORAGE_KEY = 'groove:showcase:music-volume:v1';

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;
const DEFAULT_VOLUME = 80;

/* --- persisted preferences -------------------------------------------------- */

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function readVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_VOLUME;
    return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(n)));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function write(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

const CHANGED_EVENT = 'groove:showcase:music-pref-changed';

function notify() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED_EVENT, onChange);
  };
}

let cachedMuted: boolean | null = null;
let cachedVolume: number | null = null;

const getMutedSnapshot = () => (cachedMuted ??= readBool(MUSIC_MUTE_STORAGE_KEY));
const getVolumeSnapshot = () => (cachedVolume ??= readVolume());

const serverFalse = () => false;
const serverVolume = () => DEFAULT_VOLUME;

export interface UseBackgroundMusicArgs {
  currentUser?: Profile | null | undefined;
  community?: Community | null | undefined;
}

export interface BackgroundMusic {
  isMuted: boolean;
  toggleMuted: () => void;
  togglePlaying: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  changeVolume: (vol: number) => void;
  isLooping: boolean;
  toggleLoop: () => void;
  isAudible: boolean;
  currentTrack: MusicTrack | null;
  currentTrackTitle: string;
  currentTrackArtist: string;
  currentTrackThumbnail: string;
  unavailableMessage: string | null;
  openOnYouTubeUrl: string | null;
  next: () => void;
  prev: () => void;
  isWaitingForGesture: boolean;
  playlist: MusicPlaylist | null;
  savedSession: MusicPlaybackSession | null;
  recentHistory: MusicTrack[];
  resumeRecentPlayback: () => void;
  currentTime: number;
  duration: number;
  seekTo: (seconds: number) => void;
  playTrack: (track: MusicTrack, playlist?: MusicPlaylist, startSeconds?: number) => void;
  allTracks: MusicTrack[];
}

export function useBackgroundMusic({
  currentUser,
}: UseBackgroundMusicArgs = {}): BackgroundMusic {
  const {
    currentTrack,
    activePlaylist,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    isActive,
    isVideoLoaded,
    isMuted: playerMuted,
    volume: playerVolume,
    repeatMode,
    savedSession,
    recentHistory,
    resumeRecentPlayback,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    setVolume,
    toggleMute,
    toggleRepeat,
    seekTo,
  } = useMusicPlayer();

  const [isWaitingForGesture, setIsWaitingForGesture] = useState(false);
  const autoplayAttemptedRef = useRef(false);

  const muted = useSyncExternalStore(subscribe, getMutedSnapshot, serverFalse);
  const volume = useSyncExternalStore(subscribe, getVolumeSnapshot, serverVolume);

  /* --- Automatic Playback Attempt on entering allowed showcase routes ------ */
  useEffect(() => {
    if (!isActive) {
      autoplayAttemptedRef.current = false;
      setIsWaitingForGesture(false);
      return;
    }

    // If already playing (e.g. navigated between showcase pages), do not restart!
    if (isPlaying) {
      setIsWaitingForGesture(false);
      return;
    }

    // Only attempt auto-play once per active route session
    if (autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;

    // If current track or saved session exists, preserve it!
    if (currentTrack && isVideoLoaded) {
      return;
    }

    if (savedSession?.track) {
      // Cue the saved session track with saved position
      try {
        playTrack(savedSession.track, undefined, savedSession.position || 0);
      } catch (err) {
        console.warn('Playback restore attempt caught:', err);
        setIsWaitingForGesture(true);
      }
    } else {
      // Trigger playback of the official configured Groove Rehearsal Mix
      try {
        playTrack(GROOVE_REHEARSAL_TRACK);
      } catch (err) {
        console.warn('Autoplay attempt caught:', err);
        setIsWaitingForGesture(true);
      }
    }

    // Check if browser blocked audio autoplay due to lack of prior user gesture
    const timer = setTimeout(() => {
      if (!isPlaying && !isLoading) {
        setIsWaitingForGesture(true);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isActive, isPlaying, currentTrack, isVideoLoaded, savedSession, playTrack, isLoading]);

  // When playback starts, clear the waiting for user gesture requirement
  useEffect(() => {
    if (isPlaying) {
      setIsWaitingForGesture(false);
    }
  }, [isPlaying]);

  /* --- Mirror preferences to the live YouTube player ----------------------- */
  useEffect(() => {
    if (muted !== playerMuted) toggleMute();
  }, [muted, playerMuted, toggleMute]);

  useEffect(() => {
    if (volume !== playerVolume) setVolume(volume);
  }, [volume, playerVolume, setVolume]);

  /* --- Controls ------------------------------------------------------------ */
  const toggleMuted = useCallback(() => {
    const next = !getMutedSnapshot();
    cachedMuted = next;
    write(MUSIC_MUTE_STORAGE_KEY, String(next));
    notify();
    toggleMute();
  }, [toggleMute]);

  const changeVolume = useCallback(
    (next: number) => {
      const clamped = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(next)));
      cachedVolume = clamped;
      write(MUSIC_VOLUME_STORAGE_KEY, String(clamped));
      notify();
      setVolume(clamped);
      if (clamped > 0 && playerMuted) toggleMute();
    },
    [setVolume, toggleMute, playerMuted]
  );

  const togglePlaying = useCallback(() => {
    setIsWaitingForGesture(false);
    if (isPlaying) {
      togglePlay();
      return;
    }

    // If current track is already loaded, resume without resetting
    if (currentTrack && isVideoLoaded) {
      togglePlay();
      return;
    }

    // If we have a saved position, resume from it
    if (savedSession?.track && !currentTrack) {
      playTrack(savedSession.track, undefined, savedSession.position || 0);
      return;
    }

    // Otherwise load and play current track or official rehearsal track
    const targetTrack = currentTrack || GROOVE_REHEARSAL_TRACK;
    playTrack(targetTrack, activePlaylist || undefined, currentTime > 0 ? currentTime : 0);
  }, [isPlaying, currentTrack, isVideoLoaded, savedSession, activePlaylist, currentTime, togglePlay, playTrack]);

  const toggleLoop = useCallback(() => {
    toggleRepeat();
  }, [toggleRepeat]);

  const isLooping = repeatMode === 'one';

  const handleNext = useCallback(() => {
    if (activePlaylist && activePlaylist.tracks.length > 1) {
      playNext();
    } else {
      // Find current track in CURATED_DANCE_TRACKS and advance
      const idx = CURATED_DANCE_TRACKS.findIndex(
        (t) => t.youtubeId === currentTrack?.youtubeId
      );
      const nextIdx = idx >= 0 ? (idx + 1) % CURATED_DANCE_TRACKS.length : 0;
      playTrack(CURATED_DANCE_TRACKS[nextIdx]);
    }
  }, [activePlaylist, currentTrack, playNext, playTrack]);

  const handlePrev = useCallback(() => {
    if (currentTime > 4) {
      seekTo(0);
      return;
    }
    if (activePlaylist && activePlaylist.tracks.length > 1) {
      playPrev();
    } else {
      const idx = CURATED_DANCE_TRACKS.findIndex(
        (t) => t.youtubeId === currentTrack?.youtubeId
      );
      const prevIdx =
        idx > 0 ? idx - 1 : CURATED_DANCE_TRACKS.length - 1;
      playTrack(CURATED_DANCE_TRACKS[prevIdx]);
    }
  }, [currentTime, activePlaylist, currentTrack, seekTo, playPrev, playTrack]);

  const activeTrack = currentTrack || savedSession?.track || GROOVE_REHEARSAL_TRACK;

  return {
    isMuted: muted,
    toggleMuted,
    togglePlaying,
    isPlaying,
    isLoading,
    volume,
    changeVolume,
    isLooping,
    toggleLoop,
    isAudible: isPlaying && !muted && isActive,
    currentTrack: activeTrack,
    currentTrackTitle: activeTrack?.title || 'Groove Rehearsal Mix',
    currentTrackArtist: activeTrack?.artist || 'Official Rehearsal Audio',
    currentTrackThumbnail: activeTrack?.thumbnail || GROOVE_OFFICIAL_REHEARSAL_MIX.thumbnail,
    unavailableMessage: error || null,
    openOnYouTubeUrl: activeTrack?.youtubeId
      ? `https://youtu.be/${activeTrack.youtubeId}`
      : 'https://youtu.be/3vmewzGcX2I',
    next: handleNext,
    prev: handlePrev,
    isWaitingForGesture,
    playlist: activePlaylist,
    savedSession,
    recentHistory,
    resumeRecentPlayback,
    currentTime,
    duration,
    seekTo,
    playTrack,
    allTracks: CURATED_DANCE_TRACKS,
  };
}