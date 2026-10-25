'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Music,
  Plus,
  Play,
  Pause,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ListMusic,
  ExternalLink,
  Check,
  Loader2,
  Info,
  Share2,
} from 'lucide-react';
import { MusicPlaylist, MusicTrack, MusicSearchResult } from '../types';
import { fetchPlaylists, upsertPlaylist, deletePlaylist } from '../services/playlistService';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Profile } from '@/lib/types';
import { cn } from '@/components/shared/cn';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_BODY_CLASS,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';

interface CommunityShowcasePlaylistsProps {
  currentUser?: Profile | null;
  community?: string | null;
  /**
   * Drops the outer card chrome so the hub can live inside a dialog without a
   * border nested inside a border. Everything else is identical.
   */
  embedded?: boolean;
  /** Open straight into the playlist-creation form. */
  startInCreateMode?: boolean;
  /**
   * Reports whether the creation form is open, so a containing dialog knows not
   * to dismiss on a backdrop click while there is unsaved input.
   */
  onCreateModeChange?: (creating: boolean) => void;
  /**
   * Publishes this component's `handleAddTrack` so an enclosing surface — the
   * hub's inline panel — can add a track without becoming a second writer for
   * `music_playlists`. One writer means the panel and this list cannot drift.
   */
  onRegisterAddTrack?: (add: (item: MusicSearchResult) => void) => void;
}

export const CommunityShowcasePlaylists: React.FC<CommunityShowcasePlaylistsProps> = ({
  currentUser,
  community = 'General',
  embedded = false,
  startInCreateMode = false,
  onCreateModeChange,
  onRegisterAddTrack,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useMusicPlayer();

  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Tabs: 'browse' | 'search'
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);

  // Create Playlist Modal
  const [showCreateModal, setShowCreateModal] = useState(startInCreateMode);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const { backdropProps: createBackdropProps } = useModalDismiss({
    open: showCreateModal,
    onClose: () => setShowCreateModal(false),
    disabled: creating,
    dismissOnBackdrop: false,
  });

  // Tell the containing dialog that the form is open, so a stray backdrop click
  // cannot discard a half-written playlist.
  useEffect(() => {
    onCreateModeChange?.(showCreateModal);
  }, [showCreateModal, onCreateModeChange]);

  const loadAllPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const userName = currentUser
        ? `${currentUser.firstname || ''} ${currentUser.lastname || ''}`.trim() || undefined
        : undefined;
      const data = await fetchPlaylists(
        community || 'General',
        currentUser?.id,
        userName,
        currentUser?.role as any
      );
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(data[0].id);
      }
    } catch (e) {
      console.error('Error loading playlists', e);
    } finally {
      setLoading(false);
    }
  }, [community, currentUser, selectedPlaylistId]);

  useEffect(() => {
    loadAllPlaylists();
  }, [loadAllPlaylists]);

  // Handle Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      executeSearch('');
      return;
    }
    executeSearch(searchQuery);
  };

  const executeSearch = async (term: string) => {
    try {
      setIsSearching(true);
      setSearchNotice(null);
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        if (data.notice) {
          setSearchNotice(data.notice);
        }
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Initial load of curated search items
  useEffect(() => {
    executeSearch('');
  }, []);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];

  // Add track to playlist
  const handleAddTrack = useCallback(
    async (item: MusicSearchResult) => {
      if (!selectedPlaylist) return;
      const newTrack: MusicTrack = {
        id: `trk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        youtubeId: item.youtubeId,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration || 'Track',
        addedAt: new Date().toISOString(),
      };

      const updated: MusicPlaylist = {
        ...selectedPlaylist,
        tracks: [...selectedPlaylist.tracks, newTrack],
      };

      setAddedTrackId(item.youtubeId);
      setTimeout(() => setAddedTrackId(null), 2000);

      const res = await upsertPlaylist(updated);
      if (res.success) {
        setPlaylists((prev) => prev.map((p) => (p.id === res.playlist.id ? res.playlist : p)));
      }
    },
    [selectedPlaylist]
  );

  // Republish the current add handler whenever it changes, and hand the parent a
  // stable wrapper once. The parent stores it in a ref, so registration never
  // triggers a render.
  const handleAddTrackRef = useRef(handleAddTrack);
  useEffect(() => {
    handleAddTrackRef.current = handleAddTrack;
  }, [handleAddTrack]);

  useEffect(() => {
    if (!onRegisterAddTrack) return;
    onRegisterAddTrack((item) => handleAddTrackRef.current(item));
  }, [onRegisterAddTrack]);

  // Remove track
  const handleRemoveTrack = async (trackIndex: number) => {
    if (!selectedPlaylist) return;
    const nextTracks = [...selectedPlaylist.tracks];
    nextTracks.splice(trackIndex, 1);

    const updated: MusicPlaylist = {
      ...selectedPlaylist,
      tracks: nextTracks,
    };

    const res = await upsertPlaylist(updated);
    if (res.success) {
      setPlaylists((prev) => prev.map((p) => (p.id === res.playlist.id ? res.playlist : p)));
    }
  };

  // Reorder track
  const handleMoveTrack = async (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedPlaylist.tracks.length) return;

    const nextTracks = [...selectedPlaylist.tracks];
    const [moved] = nextTracks.splice(index, 1);
    nextTracks.splice(targetIndex, 0, moved);

    const updated: MusicPlaylist = {
      ...selectedPlaylist,
      tracks: nextTracks,
    };

    const res = await upsertPlaylist(updated);
    if (res.success) {
      setPlaylists((prev) => prev.map((p) => (p.id === res.playlist.id ? res.playlist : p)));
    }
  };

  // Create playlist
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;
    try {
      setCreating(true);
      const userName = `${currentUser.firstname || ''} ${currentUser.lastname || ''}`.trim() || 'Performer';
      const newPl: MusicPlaylist = {
        id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser.id,
        userName,
        userRole: currentUser.role as any,
        community: community || 'General',
        title: newTitle.trim(),
        description: newDescription.trim() || 'Custom rehearsal playlist.',
        tracks: [],
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await upsertPlaylist(newPl);
      if (res.success) {
        setPlaylists((prev) => [res.playlist, ...prev]);
        setSelectedPlaylistId(res.playlist.id);
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
      }
    } catch (e) {
      console.error('Error creating playlist', e);
    } finally {
      setCreating(false);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    if (!currentUser || !confirm('Are you sure you want to delete this playlist?')) return;
    const res = await deletePlaylist(playlistId, currentUser.id);
    if (res.success) {
      const remaining = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(remaining);
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId(remaining[0]?.id || null);
      }
    }
  };

  return (
    <div
      className={cn(
        'space-y-5',
        !embedded && 'rounded-3xl border border-border/80 bg-card/60 p-5 sm:p-7 backdrop-blur-sm shadow-sm transition-all'
      )}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-accent-soft text-accent">
              <Music className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-accent-text">
              Community Showcase Music Hub
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Rehearsal &amp; Performance Playlists
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Curate 8-count beats, vocal warmups, and choreography tracks for classes and live showcases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs sm:text-sm font-semibold hover:opacity-95 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors',
            activeTab === 'browse'
              ? 'bg-accent-soft text-accent-text font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <ListMusic className="h-4 w-4" />
          <span>My &amp; Community Playlists</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors',
            activeTab === 'search'
              ? 'bg-accent-soft text-accent-text font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Search className="h-4 w-4" />
          <span>Search &amp; Add Tracks</span>
        </button>
      </div>

      {/* Tab 1: Browse Playlists */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Playlist List */}
          <div className="lg:col-span-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Select Playlist
            </h3>
            {loading ? (
              <div className="space-y-2">
                <div className="g-skeleton h-14 rounded-2xl w-full" />
                <div className="g-skeleton h-14 rounded-2xl w-full" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="p-4 rounded-2xl border border-border/60 bg-muted/30 text-center text-xs text-muted-foreground">
                No playlists found. Click &quot;New Playlist&quot; to create your first rehearsal mix!
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((pl) => {
                  const isSelected = pl.id === selectedPlaylist?.id;
                  const isOwner = currentUser?.id === pl.userId;
                  return (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all',
                        isSelected
                          ? 'border-accent/50 bg-accent-soft/40 shadow-xs'
                          : 'border-border/60 bg-card hover:bg-muted/40 hover:border-border'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-xs',
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Music className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {pl.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pl.tracks.length} tracks • {pl.userName || 'Community'}
                          </p>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlaylist(pl.id);
                          }}
                          title="Delete playlist"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Playlist Details & Track List */}
          <div className="lg:col-span-8">
            {selectedPlaylist ? (
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4">
                {/* Playlist Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        {selectedPlaylist.title}
                      </h3>
                      {selectedPlaylist.userRole && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent-soft text-accent-text">
                          {selectedPlaylist.userRole}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedPlaylist.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedPlaylist.tracks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const first = selectedPlaylist.tracks[0];
                          if (first) playTrack(first, selectedPlaylist);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Play All</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Track</span>
                    </button>
                  </div>
                </div>

                {/* Track List */}
                <div className="space-y-2">
                  {selectedPlaylist.tracks.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                      <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                      <p className="text-sm font-medium text-foreground">
                        This playlist is empty
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Search and add rehearsal beats, vocal warmups, or paste any YouTube URL to build this tracklist.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('search')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Browse Tracks</span>
                      </button>
                    </div>
                  ) : (
                    selectedPlaylist.tracks.map((track, idx) => {
                      const isCurrentPlaying =
                        currentTrack?.youtubeId === track.youtubeId && isPlaying;
                      const isCurrentTrack = currentTrack?.youtubeId === track.youtubeId;

                      return (
                        <div
                          key={track.id || idx}
                          className={cn(
                            'group flex items-center justify-between p-2.5 rounded-xl border transition-all',
                            isCurrentTrack
                              ? 'border-accent bg-accent-soft/30'
                              : 'border-border/60 bg-card hover:bg-muted/40'
                          )}
                        >
                          {/* Track info & Play Button */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-5 text-center text-xs font-mono text-muted-foreground">
                              {idx + 1}
                            </span>

                            <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                              {track.thumbnail ? (
                                <Image
                                  src={track.thumbnail}
                                  alt={track.title}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Music className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isCurrentTrack) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, selectedPlaylist);
                                  }
                                }}
                                aria-label={isCurrentPlaying ? 'Pause track' : 'Play track'}
                                className={cn(
                                  'absolute inset-0 bg-black/50 text-white flex items-center justify-center transition-opacity',
                                  isCurrentPlaying
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100'
                                )}
                              >
                                {isCurrentPlaying ? (
                                  <Pause className="h-4 w-4 fill-current" />
                                ) : (
                                  <Play className="h-4 w-4 fill-current translate-x-0.5" />
                                )}
                              </button>
                            </div>

                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-xs sm:text-sm font-semibold truncate',
                                  isCurrentTrack ? 'text-accent' : 'text-foreground'
                                )}
                              >
                                {track.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          {/* Reorder and Delete Controls */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleMoveTrack(idx, 'up')}
                              disabled={idx === 0}
                              title="Move up"
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTrack(idx, 'down')}
                              disabled={idx === selectedPlaylist.tracks.length - 1}
                              title="Move down"
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTrack(idx)}
                              title="Remove from playlist"
                              className="p-1 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab 2: Search & Add Tracks */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search song, rehearsal beats, vocal warmups, or paste any YouTube URL / Video ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* API notice if running in curated fallback */}
          {searchNotice && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-soft/50 border border-accent/30 text-xs text-foreground">
              <Info className="h-4 w-4 text-accent flex-shrink-0" />
              <span>{searchNotice}</span>
            </div>
          )}

          {/* Destination Playlist Selector */}
          {playlists.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
              <span className="font-semibold text-foreground">Adding tracks to:</span>
              <select
                value={selectedPlaylist?.id}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="bg-card border border-border text-foreground rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-accent"
              >
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title} ({pl.tracks.length} tracks)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((result) => {
              const isAdded = addedTrackId === result.youtubeId;
              const isCurrentPlaying =
                currentTrack?.youtubeId === result.youtubeId && isPlaying;

              return (
                <div
                  key={result.youtubeId}
                  className="flex flex-col justify-between p-3 rounded-2xl border border-border/80 bg-card hover:border-accent/40 transition-all shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-muted group">
                      {result.thumbnail && (
                        <Image
                          src={result.thumbnail}
                          alt={result.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          playTrack({
                            id: `res-${result.youtubeId}`,
                            youtubeId: result.youtubeId,
                            title: result.title,
                            artist: result.artist,
                            thumbnail: result.thumbnail,
                          })
                        }
                        aria-label={isCurrentPlaying ? 'Pause preview' : 'Preview track'}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        {isCurrentPlaying ? (
                          <Pause className="h-6 w-6 fill-current" />
                        ) : (
                          <Play className="h-6 w-6 fill-current translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold line-clamp-2 text-foreground">
                        {result.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {result.artist}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        playTrack({
                          id: `res-${result.youtubeId}`,
                          youtubeId: result.youtubeId,
                          title: result.title,
                          artist: result.artist,
                          thumbnail: result.thumbnail,
                        })
                      }
                      className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddTrack(result)}
                      disabled={isAdded || !selectedPlaylist}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all',
                        isAdded
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-accent text-accent-foreground hover:opacity-90 active:scale-95'
                      )}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to Playlist</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div
          className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-playlist-title"
          {...createBackdropProps}
        >
          <div className={cn(MODAL_PANEL_CLASS, 'max-w-md animate-in fade-in zoom-in-95 duration-300')}>
            <div className={cn(MODAL_HEADER_CLASS, 'items-center')}>
              <div className="min-w-0">
                <h3 id="create-playlist-title" className="text-base font-bold tracking-[-0.02em] text-foreground">
                  Create New Playlist
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Organize rehearsal tracks, choreography counts, or audition routines.
                </p>
              </div>
              <ModalCloseButton onClose={() => setShowCreateModal(false)} label="Close create playlist" />
            </div>

            <form onSubmit={handleCreatePlaylist} className="flex min-h-0 flex-1 flex-col">
              <div className={cn(MODAL_BODY_CLASS, 'space-y-4')}>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Playlist Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hip Hop 8-Count Training"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="g-input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="e.g. High energy tracks for weekly choreography drills"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    className="g-input w-full text-sm"
                  />
                </div>
              </div>

              <div className={MODAL_FOOTER_CLASS}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={creating || !newTitle.trim()}
                >
                  {creating ? 'Creating…' : 'Create Playlist'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
