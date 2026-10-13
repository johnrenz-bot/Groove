'use client';

/**
 * The music hub's inline panel — expands BENEATH the bar. Never a modal.
 *
 * Reuses `<CommunityShowcasePlaylists />` for the playlist browsing, search,
 * add / remove / reorder and create logic, so none of that is rebuilt here. What
 * this adds is the genre tab strip and the transport controls that do not fit in
 * the 64px bar on a phone.
 *
 * GENRES
 *   The tabs come from `features/music/config/genres`. They are a browsing
 *   taxonomy matched against the curated catalogue and used to pre-fill the
 *   existing `/api/music/search` query — no schema change, because
 *   `music_playlists.tracks` is a JSONB array with no genre field and adding one
 *   would mean a migration and rewriting every stored playlist.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { CommunityShowcasePlaylists } from '@/features/music/components/CommunityShowcasePlaylists';
import {
  DEFAULT_GENRE_ID,
  MUSIC_GENRES,
  getGenre,
  matchGenre,
} from '@/features/music/config/genres';
import { CURATED_DANCE_TRACKS } from '@/features/music/data/curatedTracks';
import type { MusicSearchResult } from '@/features/music/types';
import type { Profile } from '@/lib/types';
import type { Community } from '@/features/community/utils/community';
import type { BackgroundMusic } from '../hooks/useBackgroundMusic';
import { cn } from '@/components/shared/cn';

export interface MusicHubPanelProps {
  open: boolean;
  onClose: () => void;
  music: BackgroundMusic;
  currentUser: Profile | null | undefined;
  community: Community | null;
  /** Open straight into the playlist-creation form. */
  startInCreateMode?: boolean;
}

export function MusicHubPanel({
  open,
  onClose,
  music,
  currentUser,
  community,
  startInCreateMode = false,
}: MusicHubPanelProps) {
  const [genreId, setGenreId] = useState(DEFAULT_GENRE_ID);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expandedHub, setExpandedHub] = useState(startInCreateMode);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The playlist manager owns the ONLY writer for `music_playlists`. Rather than
   * duplicating its upsert-and-reorder logic here, the panel registers that
   * writer once and calls it, so there is a single place a track can be added.
   */
  const addTrackRef = useRef<((item: MusicSearchResult) => void) | null>(null);
  const registerAddTrack = useCallback((fn: (item: MusicSearchResult) => void) => {
    addTrackRef.current = fn;
  }, []);

  const genre = getGenre(genreId);

  // Clear the flash timer on unmount so it cannot setState after teardown.
  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  /* --- Search: reuses the existing API, which also resolves pasted URLs ---- */
  const runSearch = useCallback(async (term: string) => {
    setSearching(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setResults(data.results || []);
      if (data.notice) setNotice(data.notice);
    } catch (err) {
      console.error('Showcase music search failed:', err);
      setNotice('Search is unavailable right now. You can still paste a track URL.');
    } finally {
      setSearching(false);
    }
  }, []);

  // Switching tab pre-fills the search, so each genre is browsable immediately.
  const handleGenreChange = (id: string) => {
    setGenreId(id);
    const next = getGenre(id);
    setQuery(next.searchTerm);
    void runSearch(next.searchTerm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  /* --- Curated matches for the active genre -------------------------------- */
  const curated = matchGenre(
    genre,
    CURATED_DANCE_TRACKS.map((t) => ({
      youtubeId: t.youtubeId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      duration: t.duration,
    }))
  );

  const alreadyInPlaylist = useMemo(
    () => new Set((music.playlist?.tracks ?? []).map((t) => t.youtubeId)),
    [music.playlist]
  );

  /**
   * Adds a track to the active playlist by handing it to the playlist manager,
   * which persists through the existing `upsertPlaylist` service.
   */
  const handleAdd = useCallback(
    (item: MusicSearchResult) => {
      if (alreadyInPlaylist.has(item.youtubeId)) return;
      addTrackRef.current?.(item);

      setAddedId(item.youtubeId);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setAddedId(null), 2000);
    },
    [alreadyInPlaylist]
  );

  if (!open) return null;

  const transportBtn =
    'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted';

  return (
    <div
      id="showcase-music-hub-panel"
      className="mt-2 overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-sm)]"
    >
      {/* Transport — the controls that do not fit the bar on a phone. */}
      <div className="flex items-center gap-2 border-b border-divider px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={music.prev}
          aria-label="Previous track"
          className={cn(transportBtn, 'h-9 w-9')}
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={music.togglePlaying}
          aria-label={music.isAudible || music.currentTrackTitle ? 'Pause music' : 'Play music'}
          className={cn(transportBtn, 'h-9 w-9 bg-accent text-accent-foreground hover:bg-accent-hover')}
        >
          {music.isAudible ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={music.next}
          aria-label="Next track"
          className={cn(transportBtn, 'h-9 w-9')}
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={music.toggleMuted}
          aria-label={music.isMuted ? 'Unmute music' : 'Mute music'}
          aria-pressed={music.isMuted}
          className={cn(transportBtn, 'h-9 w-9')}
        >
          {music.isMuted || music.volume === 0 ? (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <label htmlFor="panel-music-volume" className="sr-only">
          Music volume
        </label>
        <input
          id="panel-music-volume"
          type="range"
          min={0}
          max={100}
          value={music.isMuted ? 0 : music.volume}
          onChange={(e) => music.changeVolume(Number(e.target.value))}
          aria-label="Music volume"
          className="h-1 w-24 cursor-pointer rounded-full bg-muted accent-[var(--accent)]"
        />

        {music.currentTrackTitle && (
          <p className="ml-1 hidden min-w-0 flex-1 truncate text-[11px] text-muted-foreground sm:block">
            <span className="font-semibold text-foreground">{music.currentTrackTitle}</span>
            {music.currentTrackArtist ? ` · ${music.currentTrackArtist}` : ''}
          </p>
        )}

        <button
          type="button"
          onClick={() => setExpandedHub((v) => !v)}
          aria-expanded={expandedHub}
          aria-controls="showcase-playlist-manager"
          className="ml-auto inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold text-foreground transition hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Playlists</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', expandedHub && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Genre tabs */}
      <div
        role="tablist"
        aria-label="Music genres"
        className="g-scroll flex gap-1.5 overflow-x-auto border-b border-divider px-3 py-2 sm:px-4"
      >
        {MUSIC_GENRES.map((g) => {
          const active = g.id === genreId;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleGenreChange(g.id)}
              className={cn(
                'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                active
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Search + paste */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-3 pt-3 sm:px-4">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="showcase-music-search" className="sr-only">
            Search for a track, or paste a YouTube URL
          </label>
          <input
            id="showcase-music-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube or paste a track URL…"
            className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[11px] font-bold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
        >
          {searching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Search</span>
        </button>
      </form>

      {notice && (
        <p className="mx-3 mt-2 rounded-lg border border-accent-border/40 bg-accent-soft px-2.5 py-1.5 text-[11px] text-accent-text sm:mx-4">
          {notice}
        </p>
      )}

      {/* Results */}
      <div className="px-3 py-3 sm:px-4">
        {curated.length > 0 && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Curated {genre.label}
          </p>
        )}

        {results.length === 0 && curated.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{genre.hint}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...curated, ...results]
              .filter(
                (item, i, all) =>
                  all.findIndex((o) => o.youtubeId === item.youtubeId) === i
              )
              .slice(0, 12)
              .map((item) => {
                const isAdded = alreadyInPlaylist.has(item.youtubeId);
                return (
                  <li
                    key={item.youtubeId}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.artist}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      disabled={isAdded}
                      aria-label={`Add ${item.title} to playlist`}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-[10px] font-bold transition',
                        isAdded
                          ? 'border border-success/40 bg-success-soft text-success'
                          : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                      )}
                    >
                      {addedId === item.youtubeId ? 'Added' : isAdded ? 'Added' : 'Add'}
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* The existing playlist manager, re-homed here rather than rebuilt. */}
      {expandedHub && (
        <div id="showcase-playlist-manager" className="border-t border-divider p-3 sm:p-4">
          <CommunityShowcasePlaylists
            currentUser={currentUser}
            community={community}
            startInCreateMode={startInCreateMode}
            onRegisterAddTrack={registerAddTrack}
            embedded
          />
        </div>
      )}

      <div className="flex justify-end border-t border-divider px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default MusicHubPanel;