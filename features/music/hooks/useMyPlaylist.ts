'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Track } from '@/features/music/types/track';

const STORAGE_KEY = 'groove:my-playlist:v1';
const MAX_USER_TRACKS = 200;

function parse(): Track[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Track =>
      Boolean(item && typeof item === 'object' && 'id' in item && typeof (item as any).id === 'string' && 'title' in item)
    ).slice(0, MAX_USER_TRACKS);
  } catch {
    return [];
  }
}

function persist(tracks: Track[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {
    /* storage blocked */
  }
}

export interface OEmbedResult {
  ok: true;
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export interface OEmbedFailure {
  ok: false;
  error: string;
}

export type OEmbedResponse = OEmbedResult | OEmbedFailure;

/**
 * Owns the signed-in member's personal "My Playlist" (the editable list).
 * Persists to localStorage under a versioned key. Cross-device sync is
 * intentionally out of scope for now — adding a Supabase table requires
 * your sign-off first.
 */
export function useMyPlaylist() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTracks(parse());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const add = useCallback((track: Track): { ok: boolean; reason?: 'duplicate' | 'invalid' } => {
    let result: { ok: boolean; reason?: 'duplicate' | 'invalid' } = { ok: true };
    setTracks((prev) => {
      if (prev.some((t) => t.id === track.id || (track.youtubeId && t.youtubeId === track.youtubeId))) {
        result = { ok: false, reason: 'duplicate' };
        return prev;
      }
      if (prev.length >= MAX_USER_TRACKS) return prev;
      const next = [track, ...prev];
      persist(next);
      return next;
    });
    return result;
  }, []);

  const remove = useCallback((trackId: string) => {
    setTracks((prev) => {
      const next = prev.filter((t) => t.id !== trackId);
      persist(next);
      return next;
    });
  }, []);

  const move = useCallback((trackId: string, direction: 'up' | 'down') => {
    setTracks((prev) => {
      const index = prev.findIndex((t) => t.id === trackId);
      if (index === -1) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    persist([]);
    setTracks([]);
  }, []);

  const lookupOEmbed = useCallback(async (url: string): Promise<OEmbedResponse> => {
    try {
      const res = await fetch(`/api/music/oembed?url=${encodeURIComponent(url)}`);
      return (await res.json()) as OEmbedResponse;
    } catch {
      return { ok: false, error: 'network' };
    }
  }, []);

  const addFromYoutubeUrl = useCallback(
    async (url: string): Promise<{ ok: true; track: Track } | { ok: false; error: string }> => {
      const trimmed = url.trim();
      if (!trimmed) return { ok: false, error: 'empty-url' };

      const idMatch = trimmed.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
      const videoId = idMatch?.[1];
      if (!videoId) return { ok: false, error: 'invalid-url' };

      const meta = await lookupOEmbed(`https://www.youtube.com/watch?v=${videoId}`);
      if (!meta.ok) return { ok: false, error: meta.error };

      const track: Track = {
        id: `user-${videoId}`,
        title: meta.title || 'Untitled',
        artist: meta.author_name || 'YouTube',
        source: 'youtube',
        youtubeId: videoId,
        artwork: meta.thumbnail_url || undefined,
        tags: ['user'],
        addedBy: 'user',
        status: 'ok',
      };
      const result = add(track);
      if (!result.ok) return { ok: false, error: result.reason ?? 'add-failed' };
      return { ok: true, track };
    },
    [lookupOEmbed, add]
  );

  return useMemo(
    () => ({ hydrated, tracks, add, remove, move, clear, addFromYoutubeUrl }),
    [hydrated, tracks, add, remove, move, clear, addFromYoutubeUrl]
  );
}
