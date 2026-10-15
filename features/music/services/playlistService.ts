import { createClient } from '@/lib/supabase/client';
import { MusicPlaylist, MusicTrack } from '../types';
import { CURATED_DANCE_TRACKS } from '../data/curatedTracks';

const LOCAL_STORAGE_KEY_PREFIX = 'groove_music_playlists_';

function getLocalPlaylists(userId: string): MusicPlaylist[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local music playlists', e);
  }
  return [];
}

function setLocalPlaylists(userId: string, playlists: MusicPlaylist[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(playlists));
  } catch (e) {
    console.warn('Failed to save local music playlists', e);
  }
}

export function createInitialPlaylist(
  userId: string,
  community: string,
  userName = 'My Rehearsals',
  userRole?: 'client' | 'coach' | 'admin'
): MusicPlaylist {
  return {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    userName,
    userRole,
    community: community || 'General',
    title: `${userName}'s Rehearsal Mix`,
    description: 'Curated 8-count beats, instrumentals and warm-up tracks for daily training.',
    tracks: [
      CURATED_DANCE_TRACKS[0],
      CURATED_DANCE_TRACKS[1],
      CURATED_DANCE_TRACKS[2],
      CURATED_DANCE_TRACKS[4],
    ],
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchPlaylists(
  community: string,
  userId?: string,
  userName?: string,
  userRole?: 'client' | 'coach' | 'admin'
): Promise<MusicPlaylist[]> {
  const supabase = createClient();

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Map database columns to MusicPlaylist interface
        const dbPlaylists: MusicPlaylist[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name || userName || 'Community Artist',
          userRole: row.user_role || userRole,
          community: row.community,
          title: row.title,
          description: row.description || '',
          tracks: Array.isArray(row.tracks) ? row.tracks : [],
          isPublic: row.is_public ?? true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        if (dbPlaylists.length > 0) {
          // Keep local mirror updated
          setLocalPlaylists(userId, dbPlaylists);
          return dbPlaylists;
        }
      }
    } catch (err) {
      console.warn('Supabase music_playlists query skipped or table not created yet:', err);
    }
  }

  // Fallback to local storage
  if (userId) {
    const local = getLocalPlaylists(userId);
    if (local && local.length > 0) {
      return local;
    }

    // Initialize first default playlist
    const initial = [createInitialPlaylist(userId, community, userName, userRole)];
    setLocalPlaylists(userId, initial);
    return initial;
  }

  return [createInitialPlaylist('guest', community, 'Showcase Playlist')];
}

export async function upsertPlaylist(
  playlist: MusicPlaylist
): Promise<{ success: boolean; playlist: MusicPlaylist; error?: string }> {
  const updatedPlaylist: MusicPlaylist = {
    ...playlist,
    updatedAt: new Date().toISOString(),
  };

  // 1. Always update local storage for instant optimistic UI
  if (playlist.userId) {
    const local = getLocalPlaylists(playlist.userId);
    const existingIndex = local.findIndex((p) => p.id === playlist.id);
    let nextList: MusicPlaylist[];
    if (existingIndex >= 0) {
      nextList = [...local];
      nextList[existingIndex] = updatedPlaylist;
    } else {
      nextList = [updatedPlaylist, ...local];
    }
    setLocalPlaylists(playlist.userId, nextList);
  }

  // 2. Persist to Supabase if available
  try {
    const supabase = createClient();
    const payload = {
      id: playlist.id.startsWith('pl-') ? undefined : playlist.id,
      user_id: playlist.userId,
      community: playlist.community || 'General',
      title: playlist.title,
      description: playlist.description || '',
      tracks: playlist.tracks,
      is_public: playlist.isPublic,
      updated_at: updatedPlaylist.updatedAt,
    };

    const { data, error } = await supabase
      .from('music_playlists')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (!error && data) {
      const persisted: MusicPlaylist = {
        ...updatedPlaylist,
        id: data.id,
      };
      if (playlist.userId) {
        const local = getLocalPlaylists(playlist.userId);
        const idx = local.findIndex((p) => p.id === playlist.id);
        if (idx >= 0) {
          local[idx] = persisted;
          setLocalPlaylists(playlist.userId, local);
        }
      }
      return { success: true, playlist: persisted };
    }
  } catch (err: any) {
    console.warn('Supabase playlist upsert fallback to localStorage:', err?.message);
  }

  return { success: true, playlist: updatedPlaylist };
}

export async function deletePlaylist(
  playlistId: string,
  userId: string
): Promise<{ success: boolean }> {
  // 1. Update local storage
  const local = getLocalPlaylists(userId);
  const nextList = local.filter((p) => p.id !== playlistId);
  setLocalPlaylists(userId, nextList);

  // 2. Delete from Supabase
  try {
    const supabase = createClient();
    await supabase.from('music_playlists').delete().eq('id', playlistId).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase playlist delete fallback to localStorage:', err);
  }

  return { success: true };
}
