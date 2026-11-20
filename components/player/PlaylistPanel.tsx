'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ListMusic,
  Loader2,
  Music2,
  Play,
  Plus,
  Shuffle,
  Repeat,
  Repeat1,
  Trash2,
  X,
  AlertCircle,
  Check,
  ArrowDown,
  ArrowUp,
  ListPlus,
} from 'lucide-react';
import type { Track } from '@/features/music/types/track';
import { SEED_PLAYLISTS } from '@/features/music/data/seed';
import { useMyPlaylist } from '@/features/music/hooks/useMyPlaylist';
import { EqualizerBars } from '@/components/loading/GrooveSpinner';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/features/music/context/MusicPlayerContext';

const iconBtn =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none';

const tabBtn =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-transparent px-3 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function formatDuration(sec?: number) {
  if (!sec || !Number.isFinite(sec)) return '';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * The expanded panel — playlist selector, search, an editable "My Playlist"
 * (add by YouTube URL with inline validation and loading state on the button;
 * remove; reorder up/down; play next; enqueue), plus shuffle/repeat/clear.
 */
export function PlaylistPanel({ onClose }: { onClose: () => void }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    playNextInQueue,
    enqueue,
    setQueue,
    clearQueue,
    shuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    removeFromMyPlaylist,
  } = useMusicPlayer();

  const my = useMyPlaylist();
  const [activeTab, setActiveTab] = useState<string>('grooveph-hits-2020s');
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlState, setUrlState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [urlError, setUrlError] = useState<string | null>(null);

  const seed = useMemo(() => SEED_PLAYLISTS.find((p) => p.id === activeTab) ?? null, [activeTab]);
  const myTracks = my.tracks;

  const visibleTracks = useMemo(() => {
    const source: Track[] = activeTab === 'my-playlist' ? myTracks : (seed?.tracks ?? []);
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  }, [activeTab, seed, myTracks, query]);

  // Activate the seed playlist as the queue when switching tabs.
  useEffect(() => {
    if (activeTab === 'my-playlist') {
      setQueue(myTracks);
      return;
    }
    const s = SEED_PLAYLISTS.find((p) => p.id === activeTab);
    if (s) setQueue(s.tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed switching only
  }, [activeTab]);

  const handleAdd = async () => {
    const value = urlInput.trim();
    if (!value) return;
    setUrlState('loading');
    setUrlError(null);
    const result = await my.addFromYoutubeUrl(value);
    if (result.ok) {
      setUrlState('ok');
      setUrlInput('');
      window.setTimeout(() => setUrlState('idle'), 1200);
    } else {
      setUrlState('error');
      setUrlError(
        result.error === 'duplicate'
          ? 'Already in your playlist'
          : result.error === 'invalid-url'
            ? 'That is not a valid YouTube link'
            : result.error === 'embed-blocked'
              ? 'This video cannot be embedded'
              : 'Could not look up that video — check the link and try again'
      );
    }
  };

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-divider bg-card/95 shadow-[var(--shadow-lg)] backdrop-blur-xl backdrop-saturate-150 motion-reduce:transition-none sm:w-[420px] sm:max-w-[92vw]"
      role="dialog"
      aria-label="Playback queue"
    >
      {/* Tabs + close */}
      <div className="flex items-center justify-between gap-2 border-b border-divider px-3 py-2">
        <div className="flex h-8 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Playlists">
          {SEED_PLAYLISTS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activeTab === p.id}
              onClick={() => setActiveTab(p.id)}
              className={cn(tabBtn, activeTab === p.id && 'border-border bg-muted text-foreground')}
            >
              <ListMusic className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
              <span className="whitespace-nowrap">{p.name}</span>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'my-playlist'}
            onClick={() => setActiveTab('my-playlist')}
            className={cn(tabBtn, activeTab === 'my-playlist' && 'border-border bg-muted text-foreground')}
          >
            <Music2 className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
            <span>My Playlist</span>
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close queue" title="Close" className={iconBtn}>
          <X className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
        </button>
      </div>

      {/* Search + add */}
      <div className="flex flex-wrap items-center gap-2 border-b border-divider px-3 py-2">
        <label htmlFor="playlist-search" className="sr-only">Search tracks</label>
        <input
          id="playlist-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this playlist…"
          className="h-8 min-w-0 flex-1 rounded-lg border border-divider bg-muted px-2.5 text-[11px] text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/30"
        />
        {activeTab === 'my-playlist' ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <label htmlFor="add-song-url" className="sr-only">Paste a YouTube link to add a song</label>
            <input
              id="add-song-url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlState('idle');
                setUrlError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
              }}
              placeholder="Paste a YouTube link…"
              className="h-8 w-40 rounded-lg border border-divider bg-muted px-2 text-[11px] text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
              aria-invalid={urlState === 'error'}
              aria-describedby={urlError ? 'add-song-error' : undefined}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={urlState === 'loading' || !urlInput.trim()}
              aria-label="Add song from link"
              title="Add song"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              {urlState === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : urlState === 'ok' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4 stroke-[2]" aria-hidden="true" />
              )}
            </button>
          </div>
        ) : null}
      </div>
      {urlError && (
        <div id="add-song-error" role="alert" className="border-b border-danger/30 bg-danger-soft px-3 py-1.5 text-[10px] text-danger">
          {urlError}
        </div>
      )}

      {/* Subheader */}
      <div className="flex items-center justify-between border-b border-divider px-3 py-1.5 text-[10px] text-muted-foreground">
        <span aria-live="polite">{visibleTracks.length} track{visibleTracks.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
            className={cn(iconBtn, shuffle && 'text-accent-text')}
          >
            <Shuffle className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleRepeat}
            aria-pressed={repeatMode !== 'off'}
            title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
            className={cn(iconBtn, repeatMode !== 'off' && 'text-accent-text')}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
            ) : (
              <Repeat className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
            )}
          </button>
          <button type="button" onClick={clearQueue} title="Clear queue" aria-label="Clear queue" className={iconBtn}>
            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Queue list */}
      {visibleTracks.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          {query
            ? `No tracks match “${query}”.`
            : activeTab === 'my-playlist'
              ? 'No songs in your playlist yet. Paste a YouTube link above to add one.'
              : 'This playlist is empty.'}
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto p-1.5">
          {visibleTracks.map((track) => {
            const active = currentTrack?.id === track.id;
            const playable = track.status === 'ok' && (track.source === 'youtube' ? Boolean(track.youtubeId) : Boolean(track.url));
            return (
              <li
                key={track.id}
                className={cn(
                  'group flex items-center gap-2 rounded-xl px-1 py-1.5 transition-colors',
                  active && 'bg-accent-soft/15'
                )}
              >
                {active && isPlaying ? (
                  <EqualizerBars bars={4} height={14} className="shrink-0" />
                ) : (
                  <span className="flex h-3.5 w-4 shrink-0 items-center justify-center">
                    {playable ? null : (
                      <AlertCircle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                    )}
                  </span>
                )}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {track.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.artwork} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] text-accent-text">♪</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!playable}
                  onClick={() => playTrack(track)}
                  className="min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={playable ? `Play ${track.title}` : `${track.title} (unavailable)`}
                >
                  <span className="block truncate text-[11px] font-semibold text-foreground">{track.title}</span>
                  <span className="block truncate text-[9px] text-muted-foreground">{track.artist}</span>
                </button>
                {track.durationSec ? (
                  <span className="shrink-0 font-mono text-[9px] tabular-nums text-subtle-foreground">
                    {formatDuration(track.durationSec)}
                  </span>
                ) : null}

                {/* Per-row actions — always visible on touch, on hover elsewhere */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => playNextInQueue(track)}
                    title="Play next"
                    aria-label="Play next"
                    className={iconBtn}
                  >
                    <Play className="h-3.5 w-3.5 fill-current stroke-[1.5]" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => enqueue(track)}
                    title="Add to queue"
                    aria-label="Add to queue"
                    className={iconBtn}
                  >
                    <ListPlus className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
                  </button>
                  {activeTab === 'my-playlist' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => my.move(track.id, 'up')}
                        title="Move up"
                        aria-label="Move track up"
                        className={iconBtn}
                      >
                        <ArrowUp className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => my.move(track.id, 'down')}
                        title="Move down"
                        aria-label="Move track down"
                        className={iconBtn}
                      >
                        <ArrowDown className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromMyPlaylist(track.id)}
                        title="Remove from my playlist"
                        aria-label="Remove from my playlist"
                        className={iconBtn}
                      >
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PlaylistPanel;

