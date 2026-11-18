'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { getPlayerEngine, type EngineSnapshot } from '../engine/engine';
import { DEFAULT_QUEUE, SEED_TRACKS_MAP, SEED_PLAYLISTS } from '../data/seed';
import type { Track, PersistedPlayerState } from '../types/track';
import { MUSIC_ALLOWED_ROUTES, isMusicRoute } from '../lib/routes';
import { usePathname } from 'next/navigation';

export { MUSIC_ALLOWED_ROUTES, isMusicRoute };

export type RepeatMode = 'off' | 'all' | 'one';
const STORAGE_KEY = 'groove:player:v3'; // bump: drops stale queue from v2 that may contain non-playable IDs
const HISTORY_KEY = 'groove:player:history:v2';

/**
 * The playback context is now a thin shell over the singleton engine in
 * `features/music/engine`. It exists to:
 *   1. expose the engine's snapshot to React as context,
 *   2. own UI-only state (volume, mute, repeat, shuffle, queue) — these are
 *      product preferences, not playback state,
 *   3. persist and restore the queue + position + preferences.
 *
 * The engine handles the hard part: one hidden YouTube player, one HTMLAudio
 * element at a time, and a clean adapter interface between them.
 */

export interface MusicPlayerContextType {
  // playback core (mirrors engine snapshot)
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean; // buffering
  currentTime: number;
  duration: number;
  isActive: boolean;
  isVideoLoaded: boolean; // true once a track has reached `ready` this session
  isEmbedRestricted: boolean;
  error: string | null;
  openOnYouTubeUrl: string | null;
  volume: number;
  isMuted: boolean;

  // queue / playlist
  activePlaylist: { id: string; name: string; tracks: Track[] } | null;
  recentHistory: Track[];
  savedSession: { track: Track; position: number } | null;

  // preferences
  shuffle: boolean;
  repeatMode: RepeatMode;

  // actions
  playTrack: (track: Track, playlist?: { id: string; name: string; tracks: Track[] }, startSeconds?: number) => Promise<void>;
  togglePlay: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setQueue: (tracks: Track[]) => void;
  setActivePlaylist: (id: string) => void;
  /** Enqueue a track at the end of the queue. */
  enqueue: (track: Track) => void;
  /** Insert a track immediately after the current one ("Play next"). */
  playNextInQueue: (track: Track) => void;
  playFromQueue: (index: number) => Promise<void>;
  removeFromMyPlaylist: (trackId: string) => void;
  clearQueue: () => void;
  resumeRecentPlayback: () => void;
  closePlayer: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

/**
 * Normalize a persisted track entry to something playable, or return null.
 *
 * System tracks are normalized to their canonical catalog twin (drops stale,
 * renamed, removed, or needs-id ids). User-added tracks (id `user-*`) are not
 * in the catalog, so they are kept as-is when they are self-contained and
 * playable — user data must never be silently dropped.
 */
function toPlayableTrack(t: Track | null | undefined): Track | null {
  if (!t || typeof t !== 'object' || typeof t.id !== 'string') return null;

  const entry = SEED_TRACKS_MAP[t.id];
  if (entry) {
    if (entry.status !== 'ok') return null;
    if (entry.source === 'youtube') {
      return typeof entry.youtubeId === 'string' && entry.youtubeId.length > 0 ? entry : null;
    }
    if (entry.source === 'audio') {
      return typeof entry.url === 'string' && entry.url.length > 0 ? entry : null;
    }
    return null;
  }

  if (t.addedBy === 'user' && t.status === 'ok') {
    if (t.source === 'youtube' && typeof t.youtubeId === 'string' && t.youtubeId.length > 0) return t;
    if (t.source === 'audio' && typeof t.url === 'string' && t.url.length > 0) return t;
  }
  return null;
}

function parsePersisted(): PersistedPlayerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedPlayerState> | null;
    if (!parsed || parsed.version !== 3) return null; // v2 state is stale: discard
    if (!Array.isArray(parsed.queue)) return null;

    const normalized: Track[] = [];
    for (const entry of parsed.queue) {
      const playable = toPlayableTrack(entry as Track | null);
      if (playable) normalized.push(playable);
    }

    const currentTrackId =
      typeof parsed.currentTrackId === 'string' && normalized.some((t) => t.id === parsed.currentTrackId)
        ? parsed.currentTrackId
        : normalized[0]?.id ?? null;

    return {
      ...parsed,
      queue: normalized,
      currentTrackId,
    } as PersistedPlayerState;
  } catch {
    return null;
  }
}

function parseHistory(): Track[] {
  if (typeof window === 'undefined') return DEFAULT_QUEUE;
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Track[]) : null;
    if (!Array.isArray(parsed)) return DEFAULT_QUEUE;
    const playable = parsed
      .map((t) => toPlayableTrack(t))
      .filter((t): t is Track => t !== null);
    return playable.length > 0 ? playable : DEFAULT_QUEUE;
  } catch {
    return DEFAULT_QUEUE;
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = useMemo(() => isMusicRoute(pathname), [pathname]);

  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => getPlayerEngine().getSnapshot());
  const [queue, setQueueState] = useState<Track[]>(() => {
    const persisted = parsePersisted();
    return persisted?.queue?.length ? persisted.queue : DEFAULT_QUEUE;
  });
  const [activePlaylistId, setActivePlaylistIdState] = useState<string>(() => {
    const persisted = parsePersisted();
    return persisted?.currentTrackId ? 'user' : 'grooveph-hits-2020s';
  });
  const [volume, setVolumeState] = useState<number>(() => {
    const persisted = parsePersisted();
    if (persisted && typeof persisted.volume === 'number' && Number.isFinite(persisted.volume)) {
      return Math.max(0, Math.min(100, Math.round(persisted.volume)));
    }
    return 80;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const persisted = parsePersisted();
    return Boolean(persisted?.isMuted);
  });
  const [shuffle, setShuffle] = useState<boolean>(() => {
    const persisted = parsePersisted();
    return Boolean(persisted?.shuffle);
  });
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    const persisted = parsePersisted();
    return persisted?.repeat ?? 'one';
  });
  const [recentHistory, setRecentHistory] = useState<Track[]>(() => parseHistory());
  const [savedSession, setSavedSession] = useState<{ track: Track; position: number } | null>(null);
  const [isEmbedRestricted, setIsEmbedRestricted] = useState(false);


  // ───────────────────────────────────────── engine → React subscription
  useEffect(() => {
    const unsubscribe = getPlayerEngine().subscribe((event) => {
      setSnapshot(getPlayerEngine().getSnapshot());
      if (event.type === 'trackchange' && event.track) {
        const next = event.track;
        setRecentHistory((prev) => {
          const filtered = prev.filter((t) => t.id !== next.id);
          const updated = [next, ...filtered].slice(0, 15);
          try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* blocked */ }
          return updated;
        });
        setSavedSession({ track: next, position: 0 });
      }
      if (event.type === 'error') {
        setIsEmbedRestricted(true);
      }
      if (event.type === 'ready') {
        setIsEmbedRestricted(false);
      }
    });
    return unsubscribe;
  }, []);

  // ───────────────────────────────────────── engine queue sync
  useEffect(() => {
    getPlayerEngine().setQueue(queue);
    getPlayerEngine().setShuffle(shuffle);
    getPlayerEngine().setRepeat(repeatMode);
  }, [queue, shuffle, repeatMode]);

  // ───────────────────────────────────────── persist on changes
  // Position is captured by a ref and written at most once per 10s (plus on
  // page hide / unload); queue, track and preferences write immediately.
  // Serializing the whole payload on every `timeupdate` event (several times
  // per second during playback) was pure localStorage churn for no benefit.
  const persistTimerRef = useRef<number | null>(null);
  const latestPersistedRef = useRef<PersistedPlayerState | null>(null);
  const writePersisted = useCallback((persisted: PersistedPlayerState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* blocked */
    }
  }, []);

  useEffect(() => {
    const persisted: PersistedPlayerState = {
      version: 3,
      queue,
      currentTrackId: snapshot.track?.id ?? null,
      positionSec: Math.floor(snapshot.currentTimeSec),
      volume,
      isMuted,
      shuffle,
      repeat: repeatMode,
      savedAt: new Date().toISOString(),
    };
    latestPersistedRef.current = persisted;

    if (persistTimerRef.current !== null) return;
    const timer = window.setTimeout(() => {
      persistTimerRef.current = null;
      if (latestPersistedRef.current) writePersisted(latestPersistedRef.current);
    }, 1000);
    persistTimerRef.current = timer;
  }, [queue, snapshot.track?.id, snapshot.currentTimeSec, volume, isMuted, shuffle, repeatMode, writePersisted]);

  // Flush the latest payload on hide/unload and on a slow heartbeat so the
  // restored position is at most ~10s stale even if nothing else changed.
  useEffect(() => {
    const flush = () => {
      if (latestPersistedRef.current) writePersisted(latestPersistedRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const heartbeat = window.setInterval(flush, 10000);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [writePersisted]);

  // ------------------------- Restore on mount (SSR-safe)
  useEffect(() => {
    // Drop the legacy v2 payload once so it can never restore a stale queue.
    try { window.localStorage.removeItem('groove:player:v2'); } catch { /* blocked */ }
    const persisted = parsePersisted();
    if (!persisted) return;
    const track = snapshot.track ?? queue.find((t) => t.id === persisted.currentTrackId) ?? null;
    if (!track) return;
    // Preloaded into the engine; do NOT autoplay.
    void getPlayerEngine().load(track).then(() => {
      if (persisted.positionSec > 3) {
        getPlayerEngine().seekTo(persisted.positionSec);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount restore only
  }, []);

  /* ---------------- actions ---------------- */

  const playTrack = useCallback(
    async (track: Track, playlist?: { id: string; name: string; tracks: Track[] }, startSeconds?: number) => {
      // Resolve the list to play from BEFORE changing state, so the index
      // lookup never depends on a stale closure value.
      const baseList = playlist ? playlist.tracks : queue;
      const ensured = baseList.some((t) => t.id === track.id) ? baseList : [...baseList, track];
      const index = ensured.findIndex((t) => t.id === track.id);

      if (playlist) {
        setQueueState(ensured);
        setActivePlaylistIdState(playlist.id);
      } else if (!queue.some((t) => t.id === track.id)) {
        setQueueState((prev) => [...prev, track]);
      }

      await getPlayerEngine().playQueue(ensured, Math.max(0, index));
      if (startSeconds && startSeconds > 0) getPlayerEngine().seekTo(startSeconds);
    },
    [queue]
  );

  const togglePlay = useCallback(() => {
    void getPlayerEngine().togglePlay();
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);

  const toggleRepeat = useCallback(() => setRepeatModeState((v) => (v === 'off' ? 'all' : v === 'all' ? 'one' : 'off')), []);

  const playNext = useCallback(() => getPlayerEngine().next(), []);
  const playPrev = useCallback(() => getPlayerEngine().prev(), []);

  const seekTo = useCallback((seconds: number) => {
    getPlayerEngine().seekTo(seconds);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    setVolumeState(clamped);
    getPlayerEngine().setVolume(clamped);
    if (clamped > 0) {
      setIsMuted(false);
      getPlayerEngine().setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      getPlayerEngine().setMuted(!m);
      return !m;
    });
  }, []);

  const setQueue = useCallback((tracks: Track[]) => {
    setQueueState([...tracks]);
  }, []);

  const setActivePlaylist = useCallback((id: string) => {
    const found = SEED_PLAYLISTS.find((p) => p.id === id);
    if (found) {
      setQueueState([...found.tracks]);
      setActivePlaylistIdState(id);
    }
  }, []);

  const playFromQueue = useCallback(async (index: number) => {
    await getPlayerEngine().playAt(index);
  }, []);

  const enqueue = useCallback((track: Track) => {
    setQueueState((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const playNextInQueue = useCallback((track: Track) => {
    setQueueState((prev) => {
      const index = prev.findIndex((t) => t.id === track.id);
      if (index >= 0) {
        // Already in queue — move it after the current track.
        const next = [...prev];
        const [picked] = next.splice(index, 1);
        const currentIndex = getPlayerEngine().getCurrentIndex();
        const target = Math.min(next.length, Math.max(0, currentIndex + 1));
        next.splice(target, 0, picked);
        return next;
      }
      const currentIndex = getPlayerEngine().getCurrentIndex();
      const target = Math.min(prev.length, Math.max(0, currentIndex + 1));
      const next = [...prev];
      next.splice(target, 0, track);
      return next;
    });
  }, []);

  const removeFromMyPlaylist = useCallback((trackId: string) => {
    setQueueState((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
  }, []);

  const resumeRecentPlayback = useCallback(() => {
    const first = recentHistory[0];
    if (first) void playTrack(first);
  }, [playTrack, recentHistory]);

  const closePlayer = useCallback(() => {
    getPlayerEngine().pause();
    getPlayerEngine().setQueue([]);
    setQueueState([]);
  }, []);

  const activePlaylist = useMemo(() => {
    const found = SEED_PLAYLISTS.find((p) => p.id === activePlaylistId);
    if (found) return { id: found.id, name: found.name, tracks: found.tracks };
    return { id: 'user', name: 'My Playlist', tracks: queue };
  }, [activePlaylistId, queue]);

  const contextValue = useMemo<MusicPlayerContextType>(() => ({
    currentTrack: snapshot.track,
    isPlaying: snapshot.playing,
    isLoading: snapshot.buffering,
    currentTime: snapshot.currentTimeSec,
    duration: snapshot.durationSec,
    isActive,
    isVideoLoaded: snapshot.ready,
    isEmbedRestricted,
    error: snapshot.error,
    volume,
    isMuted,
    openOnYouTubeUrl: snapshot.track?.youtubeId
      ? `https://www.youtube.com/watch?v=${snapshot.track.youtubeId}`
      : null,
    activePlaylist,
    recentHistory,
    savedSession,
    shuffle,
    repeatMode,
    playTrack,
    togglePlay,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    setQueue,
    setActivePlaylist,
    enqueue,
    playNextInQueue,
    playFromQueue,
    removeFromMyPlaylist,
    clearQueue,
    resumeRecentPlayback,
    closePlayer,
  }), [
    snapshot, isActive, isEmbedRestricted, activePlaylist, recentHistory, savedSession,
    shuffle, repeatMode, volume, isMuted,
    playTrack, togglePlay, toggleShuffle, toggleRepeat, playNext, playPrev,
    seekTo, setVolume, toggleMute, setQueue, setActivePlaylist, enqueue,
    playNextInQueue, playFromQueue, removeFromMyPlaylist, clearQueue, resumeRecentPlayback, closePlayer,
  ]);

  return <MusicPlayerContext.Provider value={contextValue}>{children}</MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}

