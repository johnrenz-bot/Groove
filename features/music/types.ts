export interface MusicTrack {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  addedAt?: string;
}

export interface MusicPlaylist {
  id: string;
  userId: string;
  userName?: string;
  userRole?: 'client' | 'coach' | 'admin';
  community: string;
  title: string;
  description?: string;
  tracks: MusicTrack[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MusicSearchResult {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
}

export interface MusicPlaybackSession {
  track: MusicTrack;
  position: number;
  duration?: number;
  volume: number;
  isMuted: boolean;
  updatedAt: string;
}
