'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { MusicPlaylist, MusicTrack, MusicPlaybackSession } from '../types';
import { GROOVE_OFFICIAL_REHEARSAL_MIX } from '../data/curatedTracks';
// The route gate lives in `lib/routes` so it can be unit-tested without React,
// and is re-exported here so player consumers keep a single import site.
import { MUSIC_ALLOWED_ROUTES, isMusicRoute } from '../lib/routes';
import {
  classifyPlaybackError,
  planSkip,
  type PlaybackErrorInfo,
} from '../lib/playbackPolicy';

export { MUSIC_ALLOWED_ROUTES, isMusicRoute };

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export type RepeatMode = 'none' | 'all' | 'one';

const SESSION_STORAGE_KEY = 'groove:music:playback-session:v2';
const HISTORY_STORAGE_KEY = 'groove:music:history:v2';

function readSavedSession(): MusicPlaybackSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSavedSession(session: MusicPlaybackSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {}
}

function readHistory(): MusicTrack[] {
  if (typeof window === 'undefined') return [GROOVE_OFFICIAL_REHEARSAL_MIX];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [GROOVE_OFFICIAL_REHEARSAL_MIX];
  } catch {
    return [GROOVE_OFFICIAL_REHEARSAL_MIX];
  }
}

function writeHistory(tracks: MusicTrack[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tracks.slice(0, 15)));
  } catch {}
}

interface MusicPlayerContextType {
  currentTrack: MusicTrack | null;
  activePlaylist: MusicPlaylist | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  error: string | null;
  /**
   * False on every route outside the Showcase. Derived straight from the
   * pathname, so it can never drift from where the player actually is.
   */
  isActive: boolean;
  /**
   * True while the YouTube player actually holds a loaded clip.
   */
  isVideoLoaded: boolean;
  /**
   * True while the current track is only blocked because its owner disabled
   * embedding.
   */
  isEmbedRestricted: boolean;
  openOnYouTubeUrl: string | null;
  savedSession: MusicPlaybackSession | null;
  recentHistory: MusicTrack[];
  resumeRecentPlayback: () => void;
  playTrack: (track: MusicTrack, playlist?: MusicPlaylist, startSeconds?: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  closePlayer: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

/** YT.PlayerState value for "nothing loaded". */
const YT_UNSTARTED = -1;

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<MusicPlaylist | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('one');
  const [isShuffle, setIsShuffle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedRestricted, setIsEmbedRestricted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [savedSession, setSavedSession] = useState<MusicPlaybackSession | null>(null);
  const [recentHistory, setRecentHistory] = useState<MusicTrack[]>([]);

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const pendingTrackRef = useRef<MusicTrack | null>(null);
  const pendingStartSecondsRef = useRef<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize saved session and history from localStorage
  useEffect(() => {
    const session = readSavedSession();
    if (session) {
      setSavedSession(session);
      if (session.track) {
        setCurrentTrack(session.track);
        setCurrentTime(session.position || 0);
        if (session.duration) setDuration(session.duration);
      }
    }
    setRecentHistory(readHistory());
  }, []);

  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const skipInFlightRef = useRef(false);
  const skipAttemptsRef = useRef<Set<string>>(new Set());
  const handlePlayerErrorRef = useRef<(code: unknown) => void>(() => {});

  const pathname = usePathname();
  const isActive = useMemo(() => isMusicRoute(pathname), [pathname]);

  // Record playback session
  const saveCurrentSession = useCallback((track: MusicTrack, pos: number, dur?: number) => {
    const sess: MusicPlaybackSession = {
      track,
      position: Math.max(0, Math.floor(pos)),
      duration: dur,
      volume,
      isMuted,
      updatedAt: new Date().toISOString(),
    };
    setSavedSession(sess);
    writeSavedSession(sess);
  }, [volume, isMuted]);

  // Add to track history
  const addToHistory = useCallback((track: MusicTrack) => {
    setRecentHistory((prev) => {
      const filtered = prev.filter((t) => t.youtubeId !== track.youtubeId && t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 15);
      writeHistory(updated);
      return updated;
    });
  }, []);

  /**
   * Leaving the Showcase stops playback immediately and releases the YouTube
   * resource. We record the exact track and position so the member can resume.
   */
  useEffect(() => {
    if (isActive) return;
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    skipInFlightRef.current = false;
    try {
      if (playerRef.current?.getCurrentTime && currentTrack) {
        const cur = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration?.();
        if (typeof cur === 'number' && !isNaN(cur)) {
          saveCurrentSession(currentTrack, cur, dur);
        }
      }
      playerRef.current?.pauseVideo();
      playerRef.current?.stopVideo?.();
    } catch {
      // The player may not exist yet on a cold route transition.
    }
  }, [isActive, currentTrack, saveCurrentSession]);

  /** Clears any queued skip. Called whenever the user takes control. */
  const cancelPendingSkip = useCallback(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    skipInFlightRef.current = false;
  }, []);

  useEffect(() => () => {
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
  }, []);

  const playTrackInternal = useCallback((track: MusicTrack, startSeconds: number = 0) => {
    if (!playerRef.current || !playerReadyRef.current) {
      pendingTrackRef.current = track;
      pendingStartSecondsRef.current = startSeconds;
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      playerRef.current.loadVideoById({
        videoId: track.youtubeId,
        startSeconds: Math.max(0, Math.floor(startSeconds)),
      });
      playerRef.current.playVideo();
      setIsPlaying(true);
      setCurrentTime(startSeconds);
    } catch (e) {
      console.error('Error playing track on YouTube Player:', e);
      setIsLoading(false);
    }
  }, []);

  const playTrack = useCallback(
    (track: MusicTrack, playlist?: MusicPlaylist, startSeconds: number = 0) => {
      if (!isActive) return;
      cancelPendingSkip();
      skipAttemptsRef.current = new Set();
      setIsEmbedRestricted(false);
      setCurrentTrack(track);
      if (playlist) {
        setActivePlaylist(playlist);
      }
      addToHistory(track);
      saveCurrentSession(track, startSeconds);
      playTrackInternal(track, startSeconds);
    },
    [cancelPendingSkip, playTrackInternal, isActive, addToHistory, saveCurrentSession]
  );


  const getCurrentIndex = useCallback(() => {
    if (!activePlaylist || !currentTrack) return -1;
    return activePlaylist.tracks.findIndex(
      (t) => t.youtubeId === currentTrack.youtubeId || t.id === currentTrack.id
    );
  }, [activePlaylist, currentTrack]);

  const playNext = useCallback(() => {
    if (!isActive) return;
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;
    const tracks = activePlaylist.tracks;
    const currentIndex = getCurrentIndex();

    let nextIndex = 0;
    if (isShuffle && tracks.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (nextIndex === currentIndex);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= tracks.length) {
        if (repeatMode === 'none') {
          setIsPlaying(false);
          setIsLoading(false);
          // Leave no stale banner behind at the end of the playlist.
          setError(null);
          setIsEmbedRestricted(false);
          return;
        }
        nextIndex = 0;
      }
    }

    const nextTrack = tracks[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack, activePlaylist);
    }
  }, [activePlaylist, getCurrentIndex, isShuffle, repeatMode, playTrack, isActive]);

  /**
   * Handles a YouTube `onError`.
   *
   * Order matters: classify, record the failure, publish the message, and only
   * then decide whether to skip. The `skipInFlightRef` guard means a player that
   * fires several errors for one track queues exactly one skip, and
   * `skipAttemptsRef` means an all-restricted playlist walks each track once and
   * then stops instead of cycling forever.
   */
  const handlePlayerError = useCallback(
    (rawCode: unknown) => {
      const info: PlaybackErrorInfo = classifyPlaybackError(rawCode);
      console.warn('YouTube Player error code:', rawCode, `(${info.kind})`);

      setIsLoading(false);
      setIsPlaying(false);
      setIsEmbedRestricted(info.openOnYouTube);
      setError(info.message);

      // Record the failure before planning, so the failed track can never be
      // the next candidate — including in the single-element playlist case.
      const failedId = currentTrack?.youtubeId;
      if (failedId) skipAttemptsRef.current.add(failedId);

      // A second error while a skip is already queued is a duplicate: the
      // playlist decision has been made, so drop it.
      if (skipInFlightRef.current) return;

      const decision = planSkip({
        trackIds: activePlaylist?.tracks.map((t) => t.youtubeId) ?? [],
        currentIndex: getCurrentIndex(),
        attempted: skipAttemptsRef.current,
        isShuffle,
      });

      if (decision.type === 'stop') {
        if (decision.reason === 'exhausted') {
          setIsPlaying(false);
          setIsLoading(false);
          setError('No playable tracks left in this playlist.');
          setIsEmbedRestricted(false);
        }
        return;
      }

      skipInFlightRef.current = true;
      // Clear a superseded timer so two skips can never stack up.
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);

      const nextTrack = activePlaylist?.tracks[decision.index];
      if (!nextTrack) {
        skipInFlightRef.current = false;
        return;
      }

      skipTimerRef.current = setTimeout(() => {
        skipTimerRef.current = null;
        skipInFlightRef.current = false;

        setCurrentTrack(nextTrack);
        setActivePlaylist(activePlaylist);
        playTrackInternal(nextTrack);
        // `playTrackInternal` clears the banner; re-assert it so the user can
        // see WHY we moved on (and reach the YouTube link) until the new track
        // actually starts playing, which clears it via onStateChange.
        setIsEmbedRestricted(info.openOnYouTube);
        setError(info.message);
      }, info.retryable ? 800 : 1200);
    },
    [currentTrack, activePlaylist, getCurrentIndex, isShuffle, playTrackInternal]
  );

  // Keep the session-long player callback pointed at the current implementation.
  // No dependency array: this must be refreshed after every render so `onError`
  // never runs against a stale playlist.
  useEffect(() => {
    handlePlayerErrorRef.current = handlePlayerError;
  });

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
    } else {
      playNext();
    }
  }, [repeatMode, currentTrack, playNext]);

  const initPlayer = useCallback(() => {
    if (playerRef.current || !window.YT || !window.YT.Player) return;

    let container = document.getElementById('groove-hidden-yt-player');
    if (!container) {
      container = document.createElement('div');
      container.id = 'groove-hidden-yt-player';
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '240px';
      container.style.height = '180px';
      container.style.pointerEvents = 'none';
      container.style.opacity = '0.01';
      document.body.appendChild(container);
    }

    try {
      playerRef.current = new window.YT.Player('groove-hidden-yt-player', {
        height: '180',
        width: '240',
        videoId: pendingTrackRef.current?.youtubeId || '3vmewzGcX2I',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          // NO `loop: 1` and NO `playlist:` here. The pair is the documented
          // recipe for making the EMBED loop one video forever — and it did:
          // after the first track ended the embed restarted a short segment
          // on repeat instead of advancing, and the dock's repeat setting was
          // ignored. `playlist` is also pinned at construction time, so once a
          // different track was loaded the embed's loop target was a stale
          // video id.
          //
          // Looping is owned by the APP: `handleTrackEnded` re-plays the track
          // when repeatMode is 'one' and otherwise defers to `playNext`, which
          // honours 'none' (stop at the end) and 'all' (wrap). `playbackPolicy`
          // then guarantees the auto-skip path can never cycle. Do not add
          // these two playerVars back.
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            if (pendingTrackRef.current) {
              const trk = pendingTrackRef.current;
              const startSec = pendingStartSecondsRef.current || 0;
              pendingTrackRef.current = null;
              pendingStartSecondsRef.current = 0;
              playTrackInternal(trk, startSec);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            const state = event.data;
            if (state === 1) {
              // A track that actually started playing clears the skip banner.
              cancelPendingSkip();
              setIsPlaying(true);
              setIsLoading(false);
              setIsVideoLoaded(true);
              setError(null);
              setIsEmbedRestricted(false);
            } else if (state === 2) {
              setIsPlaying(false);
              setIsLoading(false);
              setIsVideoLoaded(true);
            } else if (state === 3) {
              setIsLoading(true);
            } else if (state === YT_UNSTARTED) {
              // `stopVideo()` lands here. Clearing the flags here rather than in
              // the route-change effect is what keeps that effect free of
              // setState.
              setIsPlaying(false);
              setIsLoading(false);
              setIsVideoLoaded(false);
              setError(null);
              setIsEmbedRestricted(false);
            } else if (state === 0) {
              handleTrackEnded();
            }
          },
          onError: (e: any) => {
            handlePlayerErrorRef.current(e?.data);
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize YouTube IFrame Player', e);
    }
  }, [playTrackInternal, handleTrackEnded, cancelPendingSkip]);

  /**
   * Load the YouTube IFrame Player API and build the hidden player.
   *
   * Declared after every callback it wires up and invoked from the mount effect
   * below, so it can never be reached through a stale closure. The player itself
   * lives for the whole session; its `onError` therefore goes through
   * `handlePlayerErrorRef`, which is refreshed after every render.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      initPlayer();
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [initPlayer]);

  const togglePlay = useCallback(() => {
    if (!isActive) return;
    if (!playerRef.current || !playerReadyRef.current || !currentTrack) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Toggle play error', e);
    }
  }, [isPlaying, currentTrack, isActive]);

  const playPrev = useCallback(() => {
    if (!isActive) return;
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;
    const tracks = activePlaylist.tracks;
    const currentIndex = getCurrentIndex();

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = tracks.length - 1;
    }

    const prevTrack = tracks[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack, activePlaylist);
    }
  }, [activePlaylist, getCurrentIndex, playTrack, isActive]);

  const seekTo = useCallback((seconds: number) => {
    if (!playerRef.current || !playerReadyRef.current) return;
    try {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    } catch (e) {
      console.warn('Seek error', e);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setVolumeState(clamped);
    if (!playerRef.current || !playerReadyRef.current) return;
    try {
      playerRef.current.setVolume(clamped);
      if (clamped > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    } catch (e) {
      console.warn('Volume error', e);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !playerReadyRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.warn('Mute error', e);
    }
  }, [isMuted]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'one' ? 'none' : 'one'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const closePlayer = useCallback(() => {
    cancelPendingSkip();
    skipAttemptsRef.current = new Set();
    setIsEmbedRestricted(false);
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {}
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  }, [cancelPendingSkip]);

  const resumeRecentPlayback = useCallback(() => {
    if (!isActive) return;
    const session = savedSession || readSavedSession();
    if (session?.track) {
      playTrack(session.track, activePlaylist || undefined, session.position || 0);
    } else if (currentTrack) {
      if (isVideoLoaded) {
        togglePlay();
      } else {
        playTrack(currentTrack, activePlaylist || undefined, currentTime || 0);
      }
    } else {
      playTrack(GROOVE_OFFICIAL_REHEARSAL_MIX, undefined, 0);
    }
  }, [isActive, savedSession, currentTrack, isVideoLoaded, currentTime, activePlaylist, togglePlay, playTrack]);

  // Update current time & duration timer while playing
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current && playerReadyRef.current) {
          try {
            const cur = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            if (typeof cur === 'number' && !isNaN(cur)) {
              setCurrentTime(cur);
              if (currentTrack) {
                saveCurrentSession(currentTrack, cur, dur);
              }
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
          } catch (e) {}
        }
      }, 500);
    } else if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, currentTrack, saveCurrentSession]);

  return (
    <MusicPlayerContext.Provider
      value={{
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
        isActive,
        isVideoLoaded,
        isEmbedRestricted,
        openOnYouTubeUrl:
          isEmbedRestricted && currentTrack
            ? `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`
            : null,
        savedSession,
        recentHistory,
        resumeRecentPlayback,
        playTrack,
        togglePlay,
        playNext,
        playPrev,
        seekTo,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        closePlayer,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
