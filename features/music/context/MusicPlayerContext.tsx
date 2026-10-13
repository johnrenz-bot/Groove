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
import { MusicPlaylist, MusicTrack } from '../types';
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
   *
   * `currentTrack` alone is not enough: after `stopVideo()` the track is still
   * remembered but nothing is loaded, so a consumer deciding whether to reload
   * has to look at the player, not at our own bookkeeping.
   */
  isVideoLoaded: boolean;
  /**
   * True while the current track is only blocked because its owner disabled
   * embedding. `openOnYouTubeUrl` is then non-null so the hub can offer a way
   * to watch it. We never attempt to work around the restriction — we skip.
   */
  isEmbedRestricted: boolean;
  openOnYouTubeUrl: string | null;
  playTrack: (track: MusicTrack, playlist?: MusicPlaylist) => void;
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
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedRestricted, setIsEmbedRestricted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const pendingTrackRef = useRef<MusicTrack | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* --- Automatic-skip bookkeeping -----------------------------------------
     `onError` is handed to the YouTube player once, when the player is built,
     and lives for the whole session. Calling React callbacks from there means
     reading state through refs: the closure it captured at build time is the
     first render's, where `activePlaylist` is still null. That is what made
     "Skipping to next rehearsal track…" a message with nothing behind it. */
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const skipInFlightRef = useRef(false);
  /** Ids that failed during the current automatic-skip run. */
  const skipAttemptsRef = useRef<Set<string>>(new Set());
  const handlePlayerErrorRef = useRef<(code: unknown) => void>(() => {});

  /**
   * Music belongs to the Community Showcase only. Derived from the pathname
   * rather than stored, so there is no window in which the two can disagree.
   */
  const pathname = usePathname();
  const isActive = useMemo(() => isMusicRoute(pathname), [pathname]);

  /**
   * Leaving the Showcase stops playback immediately and releases the YouTube
   * resource. `stopVideo()` unloads the clip, so the network and the decoder are
   * free rather than a silent stream lingering off-screen.
   *
   * `currentTrack` and `activePlaylist` are deliberately KEPT: they are the state
   * the hub restores from when the member comes back. `startPlayback` below
   * checks the player's real state, so it reloads rather than assuming a video is
   * still loaded.
   *
   * No setState here — `stopVideo()` fires `onStateChange`, whose handler clears
   * the flags, which keeps this out of the set-state-in-effect trap.
   */
  useEffect(() => {
    if (isActive) return;
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    skipInFlightRef.current = false;
    try {
      playerRef.current?.pauseVideo();
      playerRef.current?.stopVideo?.();
    } catch {
      // The player may not exist yet on a cold route transition.
    }
  }, [isActive]);

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

  const playTrackInternal = useCallback((track: MusicTrack) => {
    if (!playerRef.current || !playerReadyRef.current) {
      pendingTrackRef.current = track;
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      playerRef.current.loadVideoById({
        videoId: track.youtubeId,
        startSeconds: 0,
      });
      playerRef.current.playVideo();
      setIsPlaying(true);
    } catch (e) {
      console.error('Error playing track on YouTube Player:', e);
      setIsLoading(false);
    }
  }, []);

  const playTrack = useCallback(
    (track: MusicTrack, playlist?: MusicPlaylist) => {
      // Off the Showcase, nothing loads. This is the single choke point for
      // starting a track, so it covers every entry path.
      if (!isActive) return;
      // A deliberate choice by the user ends the current automatic-skip run:
      // clear the timer and forget which tracks failed, so pressing play on a
      // previously-failed track gives it a genuine fresh attempt.
      cancelPendingSkip();
      skipAttemptsRef.current = new Set();
      setIsEmbedRestricted(false);
      setCurrentTrack(track);
      if (playlist) {
        setActivePlaylist(playlist);
      }
      playTrackInternal(track);
    },
    [cancelPendingSkip, playTrackInternal, isActive]
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
        videoId: pendingTrackRef.current?.youtubeId || 'wkJF_L6fG0M',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            if (pendingTrackRef.current) {
              const trk = pendingTrackRef.current;
              pendingTrackRef.current = null;
              playTrackInternal(trk);
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
    setRepeatMode((prev) => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'none';
      return 'all';
    });
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

  // Update current time & duration timer while playing
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current && playerReadyRef.current) {
          try {
            const cur = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            if (typeof cur === 'number' && !isNaN(cur)) setCurrentTime(cur);
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
  }, [isPlaying]);

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
        // Only surfaced when the owner disabled embedding — a deleted or
        // private video (code 100) has nothing useful to open.
        openOnYouTubeUrl:
          isEmbedRestricted && currentTrack
            ? `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`
            : null,
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
