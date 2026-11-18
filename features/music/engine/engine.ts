import type { PlayerAdapter, AdapterEvent } from './adapter';
import { YouTubeAdapter } from './youtubeAdapter';
import { AudioAdapter } from './audioAdapter';
import { isPlayableTrack } from '../lib/playbackPolicy';
import type { Track } from '../types/track';

export interface EngineSnapshot {
  track: Track | null;
  source: 'youtube' | 'audio' | null;
  durationSec: number;
  currentTimeSec: number;
  buffering: boolean;
  playing: boolean;
  ended: boolean;
  error: string | null;
  /** True until the current track has been loaded once this session. */
  ready: boolean;
}

export type EngineEvent = AdapterEvent | { type: 'trackchange'; track: Track | null };

type Listener = (event: EngineEvent) => void;

/**
 * The one singleton playback engine.
 *
 * Responsibilities:
 *   - own the single adapter instance (YouTube or audio)
 *   - normalize adapter events into one event stream for React
 *   - manage the queue (current index, next/prev, repeat off/all/one, shuffle)
 *   - raise `trackchange` whenever the active track changes
 *
 * Adapter selection happens per-track: a track with source 'audio' and a
 * url gets the HTML5 adapter; everything else uses YouTube.
 */
export class PlayerEngine {
  private adapter: PlayerAdapter | null = null;
  private currentTrack: Track | null = null;
  private queue: Track[] = [];
  private currentIndex = -1;
  private repeat: 'off' | 'all' | 'one' = 'one';
  private shuffle = false;
  private listeners = new Set<Listener>();
  private unsubFromAdapter: (() => void) | null = null;
  private loadToken = 0;

  private snapshot: EngineSnapshot = {
    track: null,
    source: null,
    durationSec: 0,
    currentTimeSec: 0,
    buffering: false,
    playing: false,
    ended: false,
    error: null,
    ready: false,
  };

  /* ----------------- public API ----------------------------------------- */

  getSnapshot = (): EngineSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Load a specific track. Advances or replaces the active adapter.
   * Returns when the track has started buffering (not when it has finished
   * loading) — subscribe to `ready`/`error` for completion.
   */
  async load(track: Track | null): Promise<void> {
    const token = ++this.loadToken;
    this.unsubFromAdapter?.();
    this.unsubFromAdapter = null;

    if (!track) {
      this.adapter?.destroy();
      this.adapter = null;
      this.currentTrack = null;
      this.snapshot = {
        ...this.snapshot,
        track: null,
        source: null,
        durationSec: 0,
        currentTimeSec: 0,
        buffering: false,
        playing: false,
        ended: false,
        error: null,
        ready: false,
      };
      this.emit({ type: 'trackchange', track: null });
      return;
    }

    // Hard guard: never hand an unverifiable track to an adapter.
    // (Selection of what to play next lives in playFromIndex, which skips
    // unplayable entries outright.)
    if (!isPlayableTrack(track)) {
      this.adapter?.destroy();
      this.adapter = null;
      this.currentTrack = null;
      this.snapshot = {
        ...this.snapshot,
        track: null,
        source: null,
        durationSec: 0,
        currentTimeSec: 0,
        buffering: false,
        playing: false,
        ended: false,
        error: 'This track is unavailable.',
        ready: false,
      };
      this.emit({ type: 'trackchange', track: null });
      return;
    }

    const wantYouTube = track.source === 'youtube' || !track.url;
    const wantAudio = !wantYouTube && Boolean(track.url);

    // Tear down the previous adapter before constructing the next one.
    this.adapter?.destroy();

    const adapter: PlayerAdapter = wantAudio
      ? new AudioAdapter()
      : new YouTubeAdapter();

    this.adapter = adapter;
    this.currentTrack = track;
    this.snapshot = {
      ...this.snapshot,
      track,
      source: wantAudio ? 'audio' : 'youtube',
      durationSec: track.durationSec ?? 0,
      currentTimeSec: 0,
      buffering: true,
      playing: false,
      ended: false,
      error: null,
      ready: false,
    };
    this.emit({ type: 'trackchange', track });
    this.emit({ type: 'buffering', buffering: true });

    const handler = (event: AdapterEvent) => {
      if (token !== this.loadToken) return;
      this.onAdapterEvent(event);
    };
    const offs = [
      adapter.on('ready', handler),
      adapter.on('buffering', handler),
      adapter.on('playing', handler),
      adapter.on('ended', handler),
      adapter.on('durationchange', handler),
      adapter.on('timeupdate', handler),
      adapter.on('error', handler),
    ];
    this.unsubFromAdapter = () => offs.forEach((off) => off());

    await adapter.load(track);
  }

  play(): void {
    this.adapter?.play();
  }

  pause(): void {
    this.adapter?.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.snapshot.playing) {
      this.pause();
      return;
    }
    if (this.snapshot.ready && this.adapter) {
      this.play();
      return;
    }
    if (this.currentTrack) {
      this.play();
      return;
    }
    // Nothing loaded yet — start the first queued track.
    if (this.queue.length > 0) {
      await this.playAt(0);
    }
  }

  seekTo(seconds: number): void {
    if (!this.adapter) return;
    const clamped = Math.max(0, seconds);
    this.adapter.seekTo(clamped);
    this.snapshot = { ...this.snapshot, currentTimeSec: clamped };
    this.emit({ type: 'timeupdate', seconds: clamped });
  }

  setVolume(percent: number): void {
    this.adapter?.setVolume(percent);
  }

  setMuted(muted: boolean): void {
    this.adapter?.setMuted(muted);
  }

  setRepeat(mode: 'off' | 'all' | 'one'): void {
    this.repeat = mode;
  }

  setShuffle(on: boolean): void {
    this.shuffle = on;
  }

  getRepeat(): 'off' | 'all' | 'one' {
    return this.repeat;
  }

  getShuffle(): boolean {
    return this.shuffle;
  }

  setQueue(tracks: Track[]): void {
    this.queue = [...tracks];
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
    }
  }

  getQueue(): Track[] {
    return this.queue;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Replace the queue and, if `startIndex` is given, start playing it. */
  async playQueue(tracks: Track[], startIndex = 0): Promise<void> {
    this.queue = [...tracks];
    this.currentIndex = -1;
    if (this.queue.length === 0) return;
    const clamped = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    await this.playFromIndex(clamped);
  }

  async playAt(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) return;
    await this.playFromIndex(index);
  }

  /**
   * Select the first playable track at or after `index` (wrapping once
   * around the queue) and load it. Scan is bounded by the queue length —
   * unplayable entries are skipped immediately, never loaded.
   */
  private async playFromIndex(index: number): Promise<void> {
    const n = this.queue.length;
    if (n === 0) return;
    for (let step = 0; step < n; step += 1) {
      const candidate = (index + step) % n;
      const track = this.queue[candidate];
      if (!isPlayableTrack(track)) continue;
      this.currentIndex = candidate;
      await this.load(track);
      this.play();
      return;
    }
    // Nothing in the queue can be played: stop and report once.
    this.adapter?.destroy();
    this.adapter = null;
    this.currentIndex = -1;
    this.snapshot = {
      ...this.snapshot,
      track: null,
      source: null,
      durationSec: 0,
      currentTimeSec: 0,
      buffering: false,
      playing: false,
      ended: false,
      error: 'No playable tracks available.',
      ready: false,
    };
    this.emit({ type: 'trackchange', track: null });
  }

  async next(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.shuffle && this.queue.length > 1) {
      let candidate = this.currentIndex;
      while (candidate === this.currentIndex) {
        candidate = Math.floor(Math.random() * this.queue.length);
      }
      await this.playAt(candidate);
      return;
    }
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.queue.length) {
      await this.playAt(nextIndex);
      return;
    }
    if (this.repeat === 'all' && this.queue.length > 0) {
      await this.playAt(0);
      return;
    }
    // repeat=off, no next track: stop and rewind.
    this.pause();
    this.seekTo(0);
  }

  async prev(): Promise<void> {
    // 12s convention: back to start if more than 4s in.
    if (this.snapshot.currentTimeSec > 4) {
      this.seekTo(0);
      return;
    }
    if (this.queue.length === 0) return;
    const prevIndex = this.currentIndex <= 0 ? 0 : this.currentIndex - 1;
    await this.playAt(prevIndex);
  }

  /* ----------------- internals ----------------------------------------- */

  private onAdapterEvent(event: AdapterEvent) {
    const s = this.snapshot;
    switch (event.type) {
      case 'ready':
        this.snapshot = { ...s, ready: true, error: null, buffering: false };
        break;
      case 'buffering':
        this.snapshot = { ...s, buffering: event.buffering };
        break;
      case 'playing':
        this.snapshot = { ...s, playing: event.playing };
        break;
      case 'ended':
        this.snapshot = { ...s, playing: false, ended: true };
        if (this.repeat === 'one') {
          this.seekTo(0);
          this.play();
          return;
        }
        void this.next();
        return;
      case 'durationchange':
        this.snapshot = { ...s, durationSec: event.durationSec };
        break;
      case 'timeupdate':
        this.snapshot = { ...s, currentTimeSec: event.seconds };
        break;
      case 'error':
        this.snapshot = {
          ...s,
          error: event.message,
          playing: false,
          buffering: false,
          ready: false,
        };
        // Auto-skip after a beat, as required, but only if this wasn't
        // already a fallback to the next track (avoid cascades).
        if (this.currentIndex >= 0 && this.queue.length > 1) {
          if (typeof window !== 'undefined') {
            window.setTimeout(() => {
              void this.next();
            }, 2000);
          }
        }
        break;
    }
    this.emit(event);
  }

  private emit(event: EngineEvent) {
    for (const l of this.listeners) l(event);
  }
}

/** Singleton accessor. */
let engine: PlayerEngine | null = null;

export function getPlayerEngine(): PlayerEngine {
  if (!engine) engine = new PlayerEngine();
  return engine;
}
