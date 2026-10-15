/**
 * Music genre tabs for the Showcase hub.
 *
 * WHY THIS IS A CLIENT-SIDE TAXONOMY
 *   `music_playlists.tracks` is a JSONB array of
 *   `{ id, youtubeId, title, artist, thumbnail, duration }`. There is no genre
 *   column on the track and none on the playlist, so introducing one would mean a
 *   migration and a rewrite of every stored playlist. The brief asks not to touch
 *   the schema unless demonstrably necessary, and it is not: a genre is a way to
 *   *browse* tracks, not a property a track must carry.
 *
 *   So each genre carries the words used to match the curated catalogue
 *   client-side, plus a search term handed to the existing `/api/music/search`
 *   endpoint. The endpoint already resolves a pasted YouTube URL or bare video id
 *   through oEmbed, so "search" and "paste a URL" are the same code path.
 */

export interface MusicGenre {
  id: string;
  label: string;
  /**
   * Lower-cased words matched against a curated track's title and artist.
   * An empty list means the genre is a free-form search only.
   */
  keywords: string[];
  /** Pre-filled into the search field when this tab is active. */
  searchTerm: string;
  /** Short hint shown in the panel when the tab has no catalogue matches. */
  hint: string;
}

export const MUSIC_GENRES: readonly MusicGenre[] = [
  {
    id: 'hiphop',
    label: 'Hip Hop',
    keywords: ['hip hop', 'hip-hop', '8-count', '8 count', 'rap'],
    searchTerm: 'hip hop beat',
    hint: 'Search YouTube for hip hop beats, or paste a track URL.',
  },
  {
    id: 'lofi',
    label: 'Lo-fi',
    keywords: ['lofi', 'lo-fi', 'chill'],
    searchTerm: 'lofi chill beat',
    hint: 'Search YouTube for lo-fi beats, or paste a track URL.',
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    keywords: ['contemporary', 'piano', 'cello', 'instrumental'],
    searchTerm: 'contemporary instrumental',
    hint: 'Search YouTube for contemporary instrumental, or paste a track URL.',
  },
  {
    id: 'pop',
    label: 'Pop',
    keywords: ['perfect', 'uptown', 'despacito', 'high energy'],
    searchTerm: 'pop choreography song',
    hint: 'Search YouTube for pop tracks, or paste a track URL.',
  },
  {
    id: 'rnb',
    label: 'R&B',
    keywords: ['r&b', 'rnb', 'soul'],
    searchTerm: 'r&b song',
    hint: 'Search YouTube for R&B tracks, or paste a track URL.',
  },
  {
    id: 'acoustic',
    label: 'Acoustic',
    keywords: ['acoustic', 'rhythm', 'warm-up', 'warmup'],
    searchTerm: 'acoustic warm up',
    hint: 'Search YouTube for acoustic tracks, or paste a track URL.',
  },
  {
    id: 'instrumental',
    label: 'Instrumental',
    keywords: ['instrumental', 'karaoke', 'backing'],
    searchTerm: 'instrumental karaoke',
    hint: 'Search YouTube for instrumentals, or paste a track URL.',
  },
  {
    id: 'cinematic',
    label: 'Theater/Cinematic',
    keywords: ['bohemian', 'rhapsody', 'theater', 'theatre', 'soundtrack', 'cinematic'],
    searchTerm: 'cinematic theater soundtrack',
    hint: 'Search YouTube for cinematic tracks, or paste a track URL.',
  },
  {
    id: 'custom',
    label: '+ Custom',
    keywords: [],
    searchTerm: '',
    hint: 'Search YouTube or paste any track URL.',
  },
] as const;

export const DEFAULT_GENRE_ID = 'hiphop';

export function getGenre(id: string | null | undefined): MusicGenre {
  return MUSIC_GENRES.find((g) => g.id === id) ?? MUSIC_GENRES[0];
}

/**
 * Curated tracks that match a genre.
 *
 * Matched on title + artist so a track titled "Contemporary Instrumental Piano"
 * shows under both Contemporary and Instrumental — which is correct: these are
 * browsing facets, not exclusive buckets.
 */
export function matchGenre<T extends { title?: string; artist?: string }>(
  genre: MusicGenre,
  tracks: readonly T[]
): T[] {
  if (genre.keywords.length === 0) return [];
  return tracks.filter((t) => {
    const hay = `${t.title ?? ''} ${t.artist ?? ''}`.toLowerCase();
    return genre.keywords.some((k) => hay.includes(k));
  });
}