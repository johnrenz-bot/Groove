/** The shared contract between the engine, its adapters and the UI. */

export type AdapterSource = 'youtube' | 'audio';

export type AdapterEvent =
  | { type: 'ready' }
  | { type: 'buffering'; buffering: boolean }
  | { type: 'playing'; playing: boolean }
  | { type: 'ended' }
  | { type: 'durationchange'; durationSec: number }
  | { type: 'timeupdate'; seconds: number }
  | { type: 'error'; code: string; message: string };

export interface PlayerAdapter {
  readonly source: AdapterSource;
  readonly ready: boolean;
  load(track: { youtubeId?: string; url?: string; title?: string }): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setVolume(percent: number): void; // 0-100
  setMuted(muted: boolean): void;
  getDuration(): number;
  getCurrentTime(): number;
  isPaused(): boolean;
  isEnded(): boolean;
  on(event: AdapterEvent['type'], cb: (e: AdapterEvent) => void): () => void;
  destroy(): void;
}
