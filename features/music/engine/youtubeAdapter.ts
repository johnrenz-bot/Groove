import type { PlayerAdapter, AdapterEvent, AdapterSource } from './adapter';
import { loadYouTubeIframeAPI } from './youtubeLoader';

type AdapterEventHandlers = {
  ready: Array<(e: AdapterEvent) => void>;
  buffering: Array<(e: AdapterEvent) => void>;
  playing: Array<(e: AdapterEvent) => void>;
  ended: Array<(e: AdapterEvent) => void>;
  durationchange: Array<(e: AdapterEvent) => void>;
  timeupdate: Array<(e: AdapterEvent) => void>;
  error: Array<(e: AdapterEvent) => void>;
};

/**
 * YouTube adapter — wraps the singleton IFrame Player.
 *
 * The player is mounted once per adapter creation in a hidden-but-valid
 * container (NOT display:none, which the API refuses to initialize). The
 * previous `position:fixed; top:-9999px; opacity:0.01` approach is retained.
 *
 * Error codes follow the official spec:
 *   2   invalid parameter (video id wrong/removed)
 *   5   HTML5 player error
 *   100 video not found (private/removed)
 *   101 video owner does not allow embedded playback
 *   150 same as 101
 */
export class YouTubeAdapter implements PlayerAdapter {
  readonly source: AdapterSource = 'youtube';
  ready = false;

  private player: YT.Player | null = null;
  private handlers: AdapterEventHandlers = {
    ready: [],
    buffering: [],
    playing: [],
    ended: [],
    durationchange: [],
    timeupdate: [],
    error: [],
  };
  private pollTimer: number | null = null;
  private container: HTMLDivElement | null = null;
  private currentTrackId: string | undefined;

  private emit(type: AdapterEvent['type'], payload: Omit<AdapterEvent, 'type'>) {
    const handlers = (this.handlers as any)[type] as Array<(e: AdapterEvent) => void> | undefined;
    if (!handlers) return;
    const event = { type, ...payload } as AdapterEvent;
    for (const h of handlers) h(event);
  }

  on(event: AdapterEvent['type'], cb: (e: AdapterEvent) => void): () => void {
    (this.handlers as any)[event].push(cb);
    return () => {
      (this.handlers as any)[event] = (this.handlers as any)[event].filter(
        (h: (e: AdapterEvent) => void) => h !== cb
      );
    };
  }

  async load(track: { id?: string; youtubeId?: string; url?: string; title?: string }): Promise<void> {
    this.currentTrackId = track.id;
    const videoId = track.youtubeId?.trim();
    if (!videoId) {
      this.emit('error', { code: 'needs-id', message: 'This track has not been verified yet.' });
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // One hidden mount container per adapter instance.
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.player = null;
    }
    const mount = document.createElement('div');
    mount.id = `groove-yt-mount-${Math.random().toString(36).slice(2, 9)}`;
    mount.setAttribute('aria-hidden', 'true');
    Object.assign(mount.style, {
      // Place the embed inside the viewport but effectively invisible.
      // Some browsers throttle fully off-screen iframes.
      position: 'fixed',
      bottom: '0',
      right: '0',
      width: '1px',
      height: '1px',
      opacity: '0.01',
      pointerEvents: 'none',
    });
    document.body.appendChild(mount);
    this.container = mount;

    let YT: typeof window.YT;
    try {
      YT = await loadYouTubeIframeAPI();
    } catch (err) {
      this.emit('error', {
        code: 'api-load-failed',
        message: err instanceof Error ? err.message : 'YouTube player failed to load.',
      });
      mount.remove();
      this.container = null;
      return;
    }

    return new Promise<void>((resolve) => {
      try {
        this.player = new YT.Player(mount.id, {
          height: '200',
          width: '200',
          videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ready = true;
              this.emit('ready', {});
              resolve();
            },
            onStateChange: (event: any) => this.onStateChange(event),
            onError: (event: any) => this.onError(event),
          },
        });
      } catch (err) {
        this.emit('error', {
          code: 'init-failed',
          message: err instanceof Error ? err.message : 'Could not start the YouTube player.',
        });
        mount.remove();
        this.container = null;
        resolve();
      }
    });
  }

  private onStateChange(event: any) {
    const state = event?.data;
    // YT.PlayerState values
    const UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5;

    if (state === BUFFERING) {
      this.emit('buffering', { buffering: true });
      return;
    }
    this.emit('buffering', { buffering: false });

    if (state === PLAYING) {
      this.startPolling();
      this.emit('playing', { playing: true });
      const duration = this.safeCall(() => this.player?.getDuration?.());
      if (typeof duration === 'number' && isFinite(duration) && duration > 0) {
        this.emit('durationchange', { durationSec: duration });
      }
      return;
    }
    if (state === PAUSED || state === CUED || state === UNSTARTED) {
      this.stopPolling();
      this.emit('playing', { playing: false });
      return;
    }
    if (state === ENDED) {
      this.stopPolling();
      this.emit('playing', { playing: false });
      this.emit('ended', {});
      return;
    }
  }

  private startPolling() {
    this.stopPolling();
    if (typeof window === 'undefined') return;
    this.pollTimer = window.setInterval(() => {
      const cur = this.safeCall(() => this.player?.getCurrentTime?.());
      if (typeof cur === 'number' && isFinite(cur)) {
        this.emit('timeupdate', { seconds: cur });
      }
    }, 250);
  }

  private stopPolling() {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private safeCall<T>(fn: () => T | undefined): T | undefined {
    try {
      return fn();
    } catch {
      return undefined;
    }
  }

  private onError(event: any) {
    const code = event?.data;
    const map: Record<number, string> = {
      2: 'Invalid video id.',
      5: 'HTML5 player error.',
      100: 'Video not found (private or removed).',
      101: 'Embedding is disabled for this video.',
      150: 'Embedding is disabled for this video.',
    };

    // Dev-only diagnostics. Never log user data; log only media metadata.
    if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
      console.warn('[GroovePH music] onError', { trackId: this.currentTrackId, code, reason: map[code as number] ?? `Unknown code ${code}` });
    }

    this.stopPolling();
    this.emit('playing', { playing: false });
    this.emit('error', {
      code: code != null ? String(code) : 'unknown',
      message: map[code as number] ?? `YouTube player error (${code}).`,
    });
  }

  play(): void {
    this.safeCall(() => {
      try {
        this.player?.playVideo();
      } catch {
        /* player may be destroyed mid-flight */
      }
    });
  }

  pause(): void {
    this.stopPolling();
    this.emit('playing', { playing: false });
    this.safeCall(() => {
      try {
        this.player?.pauseVideo();
      } catch {
        /* ignore */
      }
    });
  }

  seekTo(seconds: number): void {
    this.safeCall(() => {
      try {
        this.player?.seekTo?.(seconds, true);
      } catch {
        /* ignore */
      }
    });
    this.emit('timeupdate', { seconds });
  }

  setVolume(percent: number): void {
    this.safeCall(() => {
      try {
        this.player?.setVolume?.(Math.max(0, Math.min(100, Math.round(percent))));
      } catch {
        /* ignore */
      }
    });
  }

  setMuted(muted: boolean): void {
    this.safeCall(() => {
      try {
        if (muted) this.player?.mute?.();
        else this.player?.unMute?.();
      } catch {
        /* ignore */
      }
    });
  }

  getDuration(): number {
    const d = this.safeCall(() => this.player?.getDuration?.());
    return typeof d === 'number' && isFinite(d) ? d : 0;
  }

  getCurrentTime(): number {
    const t = this.safeCall(() => this.player?.getCurrentTime?.());
    return typeof t === 'number' && isFinite(t) ? t : 0;
  }

  isPaused(): boolean {
    const s = this.safeCall(() => this.player?.getPlayerState?.());
    return s === 2 || s === 5 || s === -1 || s === 0;
  }

  isEnded(): boolean {
    const s = this.safeCall(() => this.player?.getPlayerState?.());
    return s === 0;
  }

  destroy(): void {
    this.stopPolling();
    this.safeCall(() => {
      try {
        this.player?.destroy?.();
      } catch {
        /* ignore */
      }
    });
    this.container?.remove();
    this.container = null;
    this.player = null;
    this.ready = false;
  }
}
