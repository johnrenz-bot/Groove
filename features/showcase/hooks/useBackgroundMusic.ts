'use client';

/**
 * Background music for the Community Showcase.
 *
 * PLAYER OWNERSHIP
 *   There is exactly ONE player: the `MusicPlayerProvider` mounted by
 *   `DashboardLayout`, which gates itself to the Showcase routes via the
 *   pathname. This hook never constructs a player, never injects an iframe and
 *   never subscribes to the YouTube API. Moving between the two Showcase pages
 *   therefore keeps playing through the same instance, and leaving them stops it.
 *
 * AUTOPLAY, HONESTLY
 *   Browsers block programmatic playback until the user has interacted with the
 *   page. We attempt once; if it does not stick we wait for the first real
 *   interaction and try again. We never mute-and-unmute in a loop, and we never
 *   attempt to bypass the policy.
 *
 * HYDRATION
 *   Preferences are read through `useSyncExternalStore`, so the server snapshot is
 *   used for the first client render and no "muted then unmuted" flash occurs.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useMusicPlayer } from '@/features/music/context/MusicPlayerContext';
import { fetchPlaylists } from '@/features/music/services/playlistService';
import type { MusicPlaylist } from '@/features/music/types';
import type { Profile } from '@/lib/types';
import type { Community } from '@/features/community/utils/community';

/**
 * Namespaced and versioned. The `v1` suffix lets a future change to a
 * preference's meaning invalidate old values instead of misreading them.
 */
export const MUSIC_MUTE_STORAGE_KEY = 'groove:showcase:music-muted:v1';
export const MUSIC_VOLUME_STORAGE_KEY = 'groove:showcase:music-volume:v1';
export const MUSIC_PLAYED_STORAGE_KEY = 'groove:showcase:music-autoplayed:v1';

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;
const DEFAULT_VOLUME = 80;

/* --- persisted preferences -------------------------------------------------- */

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    // Private mode / storage blocked.
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
  } catch {
    // Non-fatal: the preference simply will not survive the session.
  }
}

/** `storage` only fires in OTHER tabs, so a same-tab write needs its own signal. */
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

// getSnapshot must be cached, or concurrent rendering tears.
let cachedMuted: boolean | null = null;
let cachedVolume: number | null = null;
let cachedPlayed: boolean | null = null;

const getMutedSnapshot = () => (cachedMuted ??= readBool(MUSIC_MUTE_STORAGE_KEY));
const getVolumeSnapshot = () => (cachedVolume ??= readVolume());
const getPlayedSnapshot = () => (cachedPlayed ??= readBool(MUSIC_PLAYED_STORAGE_KEY));

// What the server rendered; the real values land immediately after hydration.
const serverFalse = () => false;
const serverVolume = () => DEFAULT_VOLUME;

export interface UseBackgroundMusicArgs {
  currentUser: Profile | null | undefined;
  community: Community | null | undefined;
}

export interface BackgroundMusic {
  isMuted: boolean;
  /** Mutes/unmutes background music without disturbing the track. */
  toggleMuted: () => void;
  /** Real pause/resume — deliberately separate from muting. */
  togglePlaying: () => void;
  /** Transport state, i.e. whether the player has a track in progress. */
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  changeVolume: (vol: number) => void;
  next: () => void;
  prev: () => void;
  isAudible: boolean;
  isWaitingForGesture: boolean;
  currentTrackTitle: string | null;
  currentTrackArtist: string | null;
  unavailableMessage: string | null;
  /** Offered only when the owner disabled embedding. */
  openOnYouTubeUrl: string | null;
  /** The playlist the hub resolved, so the inline panel can edit the same one. */
  playlist: MusicPlaylist | null;
}

export function useBackgroundMusic({
  currentUser,
  community,
}: UseBackgroundMusicArgs): BackgroundMusic {
  const {
    currentTrack,
    activePlaylist,
    isPlaying,
    isLoading,
    error,
    isActive,
    isVideoLoaded,
    isMuted: playerMuted,
    volume: playerVolume,
    openOnYouTubeUrl,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    setVolume,
    toggleMute,
  } = useMusicPlayer();

  const muted = useSyncExternalStore(subscribe, getMutedSnapshot, serverFalse);
  const volume = useSyncExternalStore(subscribe, getVolumeSnapshot, serverVolume);
  const hasAutoplayedBefore = useSyncExternalStore(subscribe, getPlayedSnapshot, serverFalse);

  const advancingRef = useRef(false);
  const unlockCleanupRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [playlistMessage, setPlaylistMessage] = useState<string | null>(null);

  const memberId = currentUser?.id ?? null;
  const enabled = Boolean(memberId) && isActive;

  /* --- Resolve a playlist for this member ---------------------------------- */
  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;

    void (async () => {
      try {
        const userName =
          `${currentUser?.firstname || ''} ${currentUser?.lastname || ''}`.trim() || undefined;
        const list = await fetchPlaylists(
          community ?? 'General',
          memberId,
          userName,
          currentUser?.role as 'client' | 'coach' | 'admin'
        );
        if (cancelled) return;
        const withTracks = (list || []).find(
          (p) => Array.isArray(p.tracks) && p.tracks.length > 0
        );
        setPlaylist(withTracks ?? list?.[0] ?? null);
        setPlaylistMessage(
          withTracks ? null : 'No playable tracks yet — add one to start the music.'
        );
      } catch (err) {
        console.error('Could not load showcase playlists:', err);
        if (!cancelled) setPlaylistMessage('Playlists could not be loaded right now.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only the member id matters; the profile object is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, community]);

  /* --- Autoplay, with a one-shot gesture retry ----------------------------- */
  const startPlayback = useCallback(() => {
    if (!playlist || playlist.tracks.length === 0) return;
    const first = playlist.tracks[0];

    // Only skip the reload when the player genuinely holds a loaded clip. After
    // `stopVideo()` on leaving the Showcase, `currentTrack` is remembered but
    // nothing is loaded — so coming back reloads instead of assuming silence.
    if (activePlaylist?.id === playlist.id && currentTrack && isVideoLoaded) return;

    playTrack(first, playlist);
  }, [playlist, activePlaylist?.id, currentTrack, isVideoLoaded, playTrack]);

  useEffect(() => {
    if (!enabled || muted || startedRef.current) return;
    if (!playlist || playlist.tracks.length === 0) return;

    startedRef.current = true;
    startPlayback();

    if (!hasAutoplayedBefore) {
      write(MUSIC_PLAYED_STORAGE_KEY, 'true');
      notify();
    }

    // If the browser blocked us, nothing will be audible. Listen once for the
    // member's first real interaction and try again — the sanctioned pattern.
    const onGesture = () => {
      startPlayback();
      unlockCleanupRef.current?.();
      unlockCleanupRef.current = null;
    };

    const opts: AddEventListenerOptions = { once: true, passive: true };
    UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, onGesture, opts));
    unlockCleanupRef.current = () => {
      UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, onGesture, opts));
    };

    return () => {
      unlockCleanupRef.current?.();
      unlockCleanupRef.current = null;
    };
  }, [enabled, muted, playlist, startPlayback, hasAutoplayedBefore]);

  /* --- Preferences mirrored onto the live player --------------------------- */
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
      // Dragging off zero is an implicit unmute, as in every other player.
      if (clamped > 0 && playerMuted) toggleMute();
    },
    [setVolume, toggleMute, playerMuted]
  );

  const next = useCallback(() => {
    if (advancingRef.current) return;
    const source = activePlaylist ?? playlist;
    if (!source || source.tracks.length === 0) return;
    // One advance per press, however fast the member taps.
    advancingRef.current = true;
    Promise.resolve().then(() => {
      advancingRef.current = false;
    });
    playNext();
  }, [activePlaylist, playlist, playNext]);

  const prev = useCallback(() => {
    if (advancingRef.current) return;
    const source = activePlaylist ?? playlist;
    if (!source || source.tracks.length === 0) return;
    advancingRef.current = true;
    Promise.resolve().then(() => {
      advancingRef.current = false;
    });
    playPrev();
  }, [activePlaylist, playlist, playPrev]);

  // The player skips broken tracks itself and only reports once nothing is left,
  // so the bar says no more and no less than the engine actually decided.
  const unavailableMessage =
    playlistMessage ?? (error && error.includes('No playable tracks') ? error : null);

  return {
    isMuted: muted,
    toggleMuted,
    togglePlaying: togglePlay,
    isPlaying,
    isLoading,
    volume,
    changeVolume,
    next,
    prev,
    isAudible: isPlaying && !muted && isActive,
    isWaitingForGesture: enabled && !muted && !isPlaying && !isLoading && !currentTrack,
    currentTrackTitle: currentTrack?.title ?? null,
    currentTrackArtist: currentTrack?.artist ?? null,
    unavailableMessage,
    openOnYouTubeUrl,
    playlist,
  };
}