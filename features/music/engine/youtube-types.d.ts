/**
 * Minimal ambient declarations for the YouTube IFrame Player API.
 * Just enough to type-check this project's player adapter; not exhaustive.
 */

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    playsinline?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    iv_load_policy?: 1 | 3;
    loop?: 0 | 1;
    playlist?: string;
    origin?: string;
    enablejsapi?: 0 | 1;
  }

  interface PlayerEvent {
    target: Player;
    data: number;
  }

  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    destroy(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getDuration(): number;
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    cueVideoById(videoId: string, startSeconds?: number): void;
    loadVideoById(videoId: string, startSeconds?: number): void;
    loadVideoById(args: { videoId: string; startSeconds?: number }): void;
  }

  interface PlayerOptions {
    height?: string;
    width?: string;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: PlayerEvent) => void;
      onError?: (event: PlayerEvent) => void;
    };
  }

  const Player: {
    new (id: string | HTMLElement, options: PlayerOptions): Player;
  };
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: () => void;
}
