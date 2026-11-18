import type { Playlist, Track } from '../types/track';

/**
 * GroovePH music seed.
 *
 * TRACK CATALOG: each unique audio source exists exactly once (keyed by id).
 * Playlists reference tracks by id — they never re-declare the same track.
 *
 * YouTube IDs from the earlier resolver run are applied below. When duration
 * was not measured, it stays undefined and is filled on first load from
 * player.getDuration().
 */

// ───────────────────── catalog ─────────────────────
const CATALOG: Track[] = [
  // 2020s catalogue (resolver + verified oEmbed)
  { id: 'pop-levitating', title: 'Dua Lipa — Levitating', artist: 'Dua Lipa', source: 'youtube', youtubeId: 'TUVcZfQe-Kw', artwork: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg', durationSec: 231, tags: ['dance-practice', 'pop'], year: 2020, addedBy: 'system', status: 'ok' },
  { id: 'pop-dont-start-now', title: 'Dua Lipa — Don\'t Start Now', artist: 'Dua Lipa', source: 'youtube', youtubeId: 'oygrmJFKYZY', artwork: 'https://i.ytimg.com/vi/oygrmJFKYZY/hqdefault.jpg', durationSec: 182, tags: ['dance-practice', 'pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-houdini', title: 'Dua Lipa — Houdini', artist: 'Dua Lipa', source: 'youtube', youtubeId: 'suAR1PYFNYA', artwork: 'https://i.ytimg.com/vi/suAR1PYFNYA/hqdefault.jpg', durationSec: 189, tags: ['dance-practice', 'pop'], year: 2023, addedBy: 'system', status: 'ok' },
  { id: 'pop-blinding-lights', title: 'The Weeknd — Blinding Lights', artist: 'The Weeknd', source: 'youtube', youtubeId: '4NRXx6U8ABQ', artwork: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', durationSec: 263, tags: ['dance-practice', 'synth-pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-save-your-tears', title: 'The Weeknd — Save Your Tears', artist: 'The Weeknd', source: 'youtube', youtubeId: 'XXYlFuWEuKI', artwork: 'https://i.ytimg.com/vi/XXYlFuWEuKI/hqdefault.jpg', durationSec: 249, tags: ['dance-practice', 'synth-pop'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'pop-drivers-license', title: 'Olivia Rodrigo — Drivers License', artist: 'Olivia Rodrigo', source: 'youtube', youtubeId: 'ZmDBbnmKpqQ', artwork: 'https://i.ytimg.com/vi/ZmDBbnmKpqQ/hqdefault.jpg', durationSec: 247, tags: ['vocal-warmup', 'ballad'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'pop-good-4-u', title: 'Olivia Rodrigo — Good 4 U', artist: 'Olivia Rodrigo', source: 'youtube', youtubeId: 'gNi_6U5Pm_o', artwork: 'https://i.ytimg.com/vi/gNi_6U5Pm_o/hqdefault.jpg', durationSec: 199, tags: ['dance-practice', 'alt-pop'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'pop-as-it-was', title: 'Harry Styles — As It Was', artist: 'Harry Styles', source: 'youtube', youtubeId: 'H5v3kku4y6Q', artwork: 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg', durationSec: 166, tags: ['dance-practice', 'pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'pop-watermelon-sugar', title: 'Harry Styles — Watermelon Sugar', artist: 'Harry Styles', source: 'youtube', youtubeId: 'E07s5ZYygMg', artwork: 'https://i.ytimg.com/vi/E07s5ZYygMg/hqdefault.jpg', durationSec: 189, tags: ['dance-practice', 'pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-say-so', title: 'Doja Cat — Say So', artist: 'Doja Cat', source: 'youtube', youtubeId: 'pok8H_KF1FA', artwork: 'https://i.ytimg.com/vi/pok8H_KF1FA/hqdefault.jpg', durationSec: 236, tags: ['dance-practice', 'pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-leave-the-door-open', title: 'Silk Sonic — Leave the Door Open', artist: 'Bruno Mars & Anderson .Paak (Silk Sonic)', source: 'youtube', youtubeId: 'adLGHcj_fmA', artwork: 'https://i.ytimg.com/vi/adLGHcj_fmA/hqdefault.jpg', durationSec: 249, tags: ['vocal-warmup', 'r&b', 'soul'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'pop-about-damn-time', title: 'Lizzo — About Damn Time', artist: 'Lizzo', source: 'youtube', youtubeId: 'IXXxciRUMzE', artwork: 'https://i.ytimg.com/vi/IXXxciRUMzE/hqdefault.jpg', tags: ['dance-practice', 'pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'pop-anti-hero', title: 'Taylor Swift — Anti-Hero', artist: 'Taylor Swift', source: 'youtube', youtubeId: 'b1kbLwvqugk', artwork: 'https://i.ytimg.com/vi/b1kbLwvqugk/hqdefault.jpg', tags: ['dance-practice', 'pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'pop-cruel-summer', title: 'Taylor Swift — Cruel Summer', artist: 'Taylor Swift', source: 'youtube', youtubeId: 'ic8j13piAhQ', artwork: 'https://i.ytimg.com/vi/ic8j13piAhQ/hqdefault.jpg', tags: ['dance-practice', 'pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-bad-guy', title: 'Billie Eilish — Bad Guy', artist: 'Billie Eilish', source: 'youtube', youtubeId: 'DyDfgMOUjCI', artwork: 'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg', durationSec: 206, tags: ['chill', 'alt-pop'], year: 2019, addedBy: 'system', status: 'ok' },
  { id: 'pop-happier-than-ever', title: 'Billie Eilish — Happier Than Ever', artist: 'Billie Eilish', source: 'youtube', youtubeId: '5GJWxDKyk3A', artwork: 'https://i.ytimg.com/vi/5GJWxDKyk3A/hqdefault.jpg', tags: ['vocal-warmup', 'alt-pop'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'pop-flowers', title: 'Miley Cyrus — Flowers', artist: 'Miley Cyrus', source: 'youtube', youtubeId: 'G7KNmW9a75Y', artwork: 'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg', tags: ['dance-practice', 'pop'], year: 2023, addedBy: 'system', status: 'ok' },
  { id: 'pop-kill-bill', title: 'SZA — Kill Bill', artist: 'SZA', source: 'youtube', youtubeId: 'MSRcC626prw', artwork: 'https://i.ytimg.com/vi/MSRcC626prw/hqdefault.jpg', durationSec: 276, tags: ['chill', 'r&b'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'pop-espresso', title: 'Sabrina Carpenter — Espresso', artist: 'Sabrina Carpenter', source: 'youtube', youtubeId: 'eVli-tstM5E', artwork: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg', tags: ['dance-practice', 'pop'], year: 2024, addedBy: 'system', status: 'ok' },

  // K-pop
  { id: 'kpop-dynamite', title: 'BTS — Dynamite', artist: 'BTS', source: 'youtube', youtubeId: 'gdZLi9oWNZg', artwork: 'https://i.ytimg.com/vi/gdZLi9oWNZg/hqdefault.jpg', durationSec: 224, tags: ['dance-practice', 'k-pop'], year: 2020, addedBy: 'system', status: 'ok' },
  { id: 'kpop-butter', title: 'BTS — Butter', artist: 'BTS', source: 'youtube', youtubeId: 'WMweEpGlu_U', artwork: 'https://i.ytimg.com/vi/WMweEpGlu_U/hqdefault.jpg', tags: ['dance-practice', 'k-pop'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'kpop-hype-boy', title: 'NewJeans — Hype Boy', artist: 'NewJeans', source: 'youtube', youtubeId: '11cta61wi0g', artwork: 'https://i.ytimg.com/vi/11cta61wi0g/hqdefault.jpg', tags: ['dance-practice', 'k-pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'kpop-ditto', title: 'NewJeans — Ditto', artist: 'NewJeans', source: 'youtube', youtubeId: 'pSUydWEqKwE', artwork: 'https://i.ytimg.com/vi/pSUydWEqKwE/hqdefault.jpg', tags: ['dance-practice', 'k-pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'kpop-how-you-like-that', title: 'BLACKPINK — How You Like That', artist: 'BLACKPINK', source: 'youtube', youtubeId: 'ioNng23DkIM', artwork: 'https://i.ytimg.com/vi/ioNng23DkIM/hqdefault.jpg', durationSec: 184, tags: ['dance-practice', 'k-pop'], year: 2020, addedBy: 'system', status: 'ok' },

  // OPM
  { id: 'opm-gento', title: 'SB19 — Gento', artist: 'SB19', source: 'youtube', youtubeId: 'VZZA_38RUBI', artwork: 'https://i.ytimg.com/vi/VZZA_38RUBI/hqdefault.jpg', durationSec: 245, tags: ['dance-practice', 'opm'], year: 2023, addedBy: 'system', status: 'ok' },
  { id: 'opm-mapa', title: 'SB19 — MAPA', artist: 'SB19', source: 'youtube', youtubeId: 'DDyr3DbTPtk', artwork: 'https://i.ytimg.com/vi/DDyr3DbTPtk/hqdefault.jpg', durationSec: 300, tags: ['chill', 'opm'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'opm-leaves', title: 'Ben&Ben — Leaves', artist: 'Ben&Ben', source: 'youtube', youtubeId: '5oxxi0d7AQI', artwork: 'https://i.ytimg.com/vi/5oxxi0d7AQI/hqdefault.jpg', tags: ['vocal-warmup', 'opm', 'folk-pop'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'opm-paubaya', title: 'Moira Dela Torre — Paubaya', artist: 'Moira Dela Torre', source: 'youtube', youtubeId: '25Cs__vdmII', artwork: 'https://i.ytimg.com/vi/25Cs__vdmII/hqdefault.jpg', tags: ['vocal-warmup', 'opm', 'ballad'], year: 2022, addedBy: 'system', status: 'ok' },
  { id: 'opm-binibini', title: 'Zack Tabudlo — Binibini', artist: 'Zack Tabudlo', source: 'youtube', youtubeId: 'DhzDmhytrTI', artwork: 'https://i.ytimg.com/vi/DhzDmhytrTI/hqdefault.jpg', durationSec: 315, tags: ['vocal-warmup', 'opm', 'r&b'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'opm-mahika', title: 'Adie — Mahika', artist: 'Adie', source: 'youtube', youtubeId: '9tLglpFAyIg', artwork: 'https://i.ytimg.com/vi/9tLglpFAyIg/hqdefault.jpg', tags: ['chill', 'opm'], year: 2021, addedBy: 'system', status: 'ok' },
  { id: 'opm-pantropiko', title: 'BINI — Pantropiko', artist: 'BINI', source: 'youtube', youtubeId: 'uIt9-k3Fc5M', artwork: 'https://i.ytimg.com/vi/uIt9-k3Fc5M/hqdefault.jpg', tags: ['dance-practice', 'opm', 'p-pop'], year: 2024, addedBy: 'system', status: 'ok' },

  // Rehearsal / verified library
  { id: 'sys-believer', title: 'Imagine Dragons — Believer', artist: 'Imagine Dragons', source: 'youtube', youtubeId: '7wtfhZwyrcc', artwork: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg', durationSec: 217, tags: ['rehearsal', 'energy'], year: 2017, addedBy: 'system', status: 'ok' },
  { id: 'sys-bohemian-rhapsody', title: 'Queen — Bohemian Rhapsody', artist: 'Queen', source: 'youtube', youtubeId: 'fJ9rUzIMcZQ', artwork: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg', durationSec: 360, tags: ['rehearsal', 'vocal', 'theater'], year: 2011, addedBy: 'system', status: 'ok' },
  { id: 'sys-counting-stars', title: 'OneRepublic — Counting Stars', artist: 'OneRepublic', source: 'youtube', youtubeId: 'hT_nvWreIhg', artwork: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg', durationSec: 284, tags: ['rehearsal', 'acoustic'], year: 2013, addedBy: 'system', status: 'ok' },
  { id: 'sys-shape-of-you', title: 'Ed Sheeran — Shape of You', artist: 'Ed Sheeran', source: 'youtube', youtubeId: 'JGwWNGJdvx8', artwork: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', durationSec: 264, tags: ['rehearsal', 'pop'], year: 2017, addedBy: 'system', status: 'ok' },
  { id: 'sys-perfect', title: 'Ed Sheeran — Perfect', artist: 'Ed Sheeran', source: 'youtube', youtubeId: '2Vv-BfVoq4g', artwork: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg', durationSec: 282, tags: ['rehearsal', 'lyrical', 'contemporary'], year: 2017, addedBy: 'system', status: 'ok' },
  { id: 'sys-uptown-funk', title: 'Mark Ronson — Uptown Funk (ft. Bruno Mars)', artist: 'Mark Ronson ft. Bruno Mars', source: 'youtube', youtubeId: 'OPf0YbXqDm0', artwork: 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg', durationSec: 271, tags: ['rehearsal', 'high-energy', 'funk'], year: 2014, addedBy: 'system', status: 'ok' },
  { id: 'sys-happy', title: 'Pharrell Williams — Happy', artist: 'Pharrell Williams', source: 'youtube', youtubeId: 'ZbZSe6N_BXs', artwork: 'https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg', durationSec: 241, tags: ['rehearsal', 'upbeat'], year: 2013, addedBy: 'system', status: 'ok' },

  // needs-id — cannot be verified or quota-exhausted
  { id: 'pop-kiss-me-more', title: 'Doja Cat — Kiss Me More', artist: 'Doja Cat ft. SZA', source: 'youtube', youtubeId: '', tags: ['dance-practice', 'pop'], year: 2021, addedBy: 'system', status: 'needs-id' },
  { id: 'kpop-pink-venom', title: 'BLACKPINK — Pink Venom', artist: 'BLACKPINK', source: 'youtube', youtubeId: '', tags: ['dance-practice', 'k-pop'], year: 2022, addedBy: 'system', status: 'needs-id' },
];

const BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

/** @internal */
function pick(...ids: string[]): Track[] {
  return ids.map((id) => BY_ID.get(id)!).filter(Boolean);
}

// ───────────────────── playlists ────────────────────
export const GROOVEPH_HITS_2020S: Playlist = {
  id: 'grooveph-hits-2020s',
  name: 'GroovePH Hits 2020s',
  category: 'rehearsal',
  tracks: pick(
    'pop-levitating',
    'pop-dont-start-now',
    'pop-houdini',
    'pop-blinding-lights',
    'pop-save-your-tears',
    'pop-drivers-license',
    'pop-good-4-u',
    'pop-as-it-was',
    'pop-watermelon-sugar',
    'pop-say-so',
    'pop-leave-the-door-open',
    'pop-about-damn-time',
    'pop-anti-hero',
    'pop-cruel-summer',
    'pop-bad-guy',
    'pop-happier-than-ever',
    'pop-flowers',
    'pop-kill-bill',
    'pop-espresso',
    'kpop-dynamite',
    'kpop-butter',
    'kpop-hype-boy',
    'kpop-ditto',
    'kpop-how-you-like-that',
    'opm-gento',
    'opm-mapa',
    'opm-leaves',
    'opm-paubaya',
    'opm-binibini',
    'opm-mahika',
    'opm-pantropiko',
    'sys-believer',
    'sys-bohemian-rhapsody',
    'sys-uptown-funk',
    'sys-happy',
  ),
};

export const DANCE_PRACTICE: Playlist = {
  id: 'dance-practice',
  name: 'Dance Practice',
  category: 'dance',
  tracks: pick(
    'sys-believer',
    'sys-uptown-funk',
    'sys-happy',
    'sys-shape-of-you',
    'sys-perfect',
    'pop-levitating',
    'pop-dont-start-now',
    'pop-houdini',
    'pop-blinding-lights',
    'pop-save-your-tears',
    'pop-as-it-was',
    'pop-watermelon-sugar',
    'pop-say-so',
    'pop-about-damn-time',
    'pop-anti-hero',
    'pop-cruel-summer',
    'pop-flowers',
    'pop-espresso',
    'kpop-dynamite',
    'kpop-butter',
    'kpop-hype-boy',
    'kpop-ditto',
    'kpop-how-you-like-that',
    'opm-gento',
    'opm-pantropiko',
  ),
};

export const VOCAL_WARMUP: Playlist = {
  id: 'vocal-warmup',
  name: 'Vocal Warm-up',
  category: 'vocal',
  tracks: pick(
    'sys-bohemian-rhapsody',
    'sys-counting-stars',
    'sys-perfect',
    'pop-drivers-license',
    'pop-leave-the-door-open',
    'opm-binibini',
    'pop-happier-than-ever',
    'pop-bad-guy',
    'opm-leaves',
    'opm-paubaya',
  ),
};

export const CHILL_REHEARSAL: Playlist = {
  id: 'chill-rehearsal',
  name: 'Chill Rehearsal',
  category: 'chill',
  tracks: pick(
    'pop-bad-guy',
    'pop-kill-bill',
    'opm-mapa',
    'opm-mahika',
    'sys-counting-stars',
  ),
};

export const OPM: Playlist = {
  id: 'opm',
  name: 'OPM',
  category: 'opm',
  tracks: pick(
    'opm-gento',
    'opm-mapa',
    'opm-leaves',
    'opm-paubaya',
    'opm-binibini',
    'opm-mahika',
    'opm-pantropiko',
  ),
};

/** All public playlists. needs-id tracks are NOT listed here. */
export const SEED_PLAYLISTS: Playlist[] = [
  GROOVEPH_HITS_2020S,
  DANCE_PRACTICE,
  VOCAL_WARMUP,
  CHILL_REHEARSAL,
  OPM,
];

/** @internal */
export const SEED_TRACKS_MAP: Record<string, Track> = Object.fromEntries(
  CATALOG.map((t) => [t.id, t]),
);

/** Default queue — purely playable. */
export const DEFAULT_QUEUE: Track[] = pick(
  'sys-believer',
  'sys-bohemian-rhapsody',
  'sys-uptown-funk',
  'sys-happy',
);
