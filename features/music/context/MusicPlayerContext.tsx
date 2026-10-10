'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { MusicPlaylist, MusicTrack } from '../types';

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

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const pendingTrackRef = useRef<MusicTrack | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame Player API
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
  }, []);

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
              setIsPlaying(true);
              setIsLoading(false);
              setError(null);
            } else if (state === 2) {
              setIsPlaying(false);
              setIsLoading(false);
            } else if (state === 3) {
              setIsLoading(true);
            } else if (state === 0) {
              handleTrackEnded();
            }
          },
          onError: (e: any) => {
            console.warn('YouTube Player error code:', e.data);
            setIsLoading(false);
            setIsPlaying(false);
            if (e.data === 150 || e.data === 101) {
              setError('Playback restricted by video owner. Skipping to next rehearsal track…');
              setTimeout(() => {
                playNext();
              }, 2000);
            } else {
              setError('Unable to load video stream. Retrying next track…');
            }
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize YouTube IFrame Player', e);
    }
  }, []);

  const playTrackInternal = (track: MusicTrack) => {
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
  };

  const playTrack = useCallback(
    (track: MusicTrack, playlist?: MusicPlaylist) => {
      setCurrentTrack(track);
      if (playlist) {
        setActivePlaylist(playlist);
      }
      playTrackInternal(track);
    },
    []
  );

  const togglePlay = useCallback(() => {
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
  }, [isPlaying, currentTrack]);

  const getCurrentIndex = useCallback(() => {
    if (!activePlaylist || !currentTrack) return -1;
    return activePlaylist.tracks.findIndex(
      (t) => t.youtubeId === currentTrack.youtubeId || t.id === currentTrack.id
    );
  }, [activePlaylist, currentTrack]);

  const playNext = useCallback(() => {
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
          return;
        }
        nextIndex = 0;
      }
    }

    const nextTrack = tracks[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack, activePlaylist);
    }
  }, [activePlaylist, getCurrentIndex, isShuffle, repeatMode, playTrack]);

  const playPrev = useCallback(() => {
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
  }, [activePlaylist, getCurrentIndex, playTrack]);

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
    } else {
      playNext();
    }
  }, [repeatMode, currentTrack, playNext]);

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
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {}
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

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
