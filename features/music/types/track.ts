/**
 * New track model — the single shape every player surface consumes.
 *
 * Replaces the old `MusicTrack` (`features/music/types.ts`), which required
 * `youtubeId` and had no concept of a source, a tags list, or an explicit
 * availability flag. Old consumers are migrated via `legacyTrackToTrack()`.
 */

export type TrackSource = 'youtube' | 'audio';
export type TrackStatus = 'ok' | 'needs-id' | 'unavailable';
export type TrackAddedBy = 'system' | 'user';

export interface Track {
  id: string;
  title: string;
  artist: string;
  source: TrackSource;
  /** YouTube video id (11 chars). Empty string when needs-id. */
  youtubeId?: string;
  /** Direct audio url (mp3/ogg) for the `audio` source. */
  url?: string;
  /** Cover URL — absolute (i.ytimg.com) or local path. */
  artwork?: string;
  /** Duration in seconds, if known. */
  durationSec?: number;
  tags: string[];
  year?: number;
  addedBy: TrackAddedBy;
  status: TrackStatus;
  /** Free-text attribution for CC/royalty-free audio; shown in expanded panel. */
  credits?: string;
}

export interface Playlist {
  id: string;
  name: string;
  /** Human category for the selector tabs. */
  category: 'rehearsal' | 'dance' | 'vocal' | 'chill' | 'opm' | 'user';
  tracks: Track[];
}

export interface PlaybackState {
  trackId: string | null;
  /** Seconds; 0 when unknown. */
  positionSec: number;
  durationSec: number;
  playing: boolean;
  buffering: boolean;
  /** True until first successful load of the current track. */
  ended: boolean;
  error: string | null;
}

/** localStorage persistence schema, versioned and manually guarded. */
export interface PersistedPlayerState {
  version: 3;
  queue: Track[];
  currentTrackId: string | null;
  positionSec: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  savedAt: string;
}
