import type { PlayerAdapter, AdapterEvent, AdapterSource } from './adapter';

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
 * HTML5 <audio> adapter for direct streams (CC-licensed / royalty-free /
 * self-hosted files). Simpler than the YouTube adapter — the browser does
 * the heavy lifting — but it shares the exact adapter contract so the
 * engine and UI are source-agnostic.
 */
export class AudioAdapter implements PlayerAdapter {
  readonly source: AdapterSource = 'audio';
  ready = false;

  private audio: HTMLAudioElement | null = null;
  private handlers: AdapterEventHandlers = {
    ready: [],
    buffering: [],
    playing: [],
    ended: [],
    durationchange: [],
    timeupdate: [],
    error: [],
  };

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

  async load(track: { youtubeId?: string; url?: string; title?: string }): Promise<void> {
    const url = track.url?.trim();
    if (!url) {
      this.emit('error', { code: 'needs-url', message: 'This audio track has no stream URL.' });
      return;
    }
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    this.destroy();

    const el = new Audio();
    el.preload = 'metadata';
    el.crossOrigin = 'anonymous';

    el.addEventListener('loadedmetadata', () => {
      this.ready = true;
      this.emit('ready', {});
      const d = el.duration;
      if (isFinite(d) && d > 0) this.emit('durationchange', { durationSec: d });
    });
    el.addEventListener('timeupdate', () => {
      this.emit('timeupdate', { seconds: el.currentTime });
    });
    el.addEventListener('ended', () => {
      this.emit('playing', { playing: false });
      this.emit('ended', {});
    });
    el.addEventListener('playing', () => {
      this.emit('buffering', { buffering: false });
      this.emit('playing', { playing: true });
    });
    el.addEventListener('waiting', () => {
      this.emit('buffering', { buffering: true });
    });
    el.addEventListener('error', () => {
      const mediaError = el.error;
      this.emit('playing', { playing: false });
      this.emit('error', {
        code: mediaError ? String(mediaError.code) : 'unknown',
        message: mediaError
          ? `Audio could not be loaded (${mediaError.message || 'network error'}).`
          : 'Audio could not be loaded.',
      });
    });

    el.src = url;
    this.audio = el;
  }

  play(): void {
    if (!this.audio) return;
    void this.audio.play().catch((err) => {
      this.emit('playing', { playing: false });
      this.emit('error', {
        code: 'play-blocked',
        message: err instanceof Error ? err.message : 'Playback was blocked by the browser.',
      });
    });
  }

  pause(): void {
    this.audio?.pause();
    this.emit('playing', { playing: false });
  }

  seekTo(seconds: number): void {
    if (!this.audio) return;
    try {
      this.audio.currentTime = Math.max(0, seconds);
    } catch {
      /* ignore */
    }
    this.emit('timeupdate', { seconds });
  }

  setVolume(percent: number): void {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, percent / 100));
  }

  setMuted(muted: boolean): void {
    if (!this.audio) return;
    this.audio.muted = muted;
  }

  getDuration(): number {
    return this.audio && isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  isPaused(): boolean {
    return this.audio ? this.audio.paused : true;
  }

  isEnded(): boolean {
    return this.audio ? this.audio.ended : false;
  }

  destroy(): void {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    } catch {
      /* ignore */
    }
    this.audio = null;
    this.ready = false;
  }
}
