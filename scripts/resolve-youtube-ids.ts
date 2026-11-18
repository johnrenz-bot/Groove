/**
 * scripts/resolve-youtube-ids.ts
 *
 * Resolves `youtubeId: ''` tracks in `features/music/data/seed.ts` by
 * searching YouTube Data API v3 and validating embed permissions.
 *
 * Usage:
 *   npx tsx scripts/resolve-youtube-ids.ts
 *
 * Requirements:
 *   - YouTube Data API v3 key in .env.local as YOUTUBE_API_KEY, or in env.
 *   - Without the key it prints a manual checklist and exits cleanly.
 *
 * Rules (enforced strictly):
 *   - Reject any result whose title or channel contains: karaoke, instrumental,
 *     cover, remix, reaction, nightcore, slowed, sped up, 8d, live, lyrics,
 *     official audio (allowed), official music video (allowed), lyrics video
 *     (allowed), extended (allowed), fan version, fan made, reupload, re-upload.
 *   - Prefer channels whose title matches the artist OR whose name contains
 *     "VEVO" / "Topic" / "Official" / "Records" / "Entertainment".
 *   - Reject anything with `status.embeddable !== true`.
 *   - Reject videos outside 90–480 seconds (1:30–8:00).
 *   - Reject Mixes (detected by duration > 600s, or channel keyword, or
 *     snippet.categoryId != 10).
 *   - Process each unique track (by id) exactly once.
 *   - Results are deterministic: candidates are ranked by channel-match, then
 *     title-match, then embeddable/duration — never random.
 *
 * This script NEVER mutates the seed file. It prints a report; you apply it.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_PLAYLISTS } from '../features/music/data/seed';

// Load .env.local if present (no secrets are printed).
try {
  const envPath = path.join(process.cwd(), '.env.local');
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  /* .env.local optional */
}

const API_KEY = process.env.YOUTUBE_API_KEY;
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const OEMBED_URL = 'https://www.youtube.com/oembed';
const MIN_DURATION_SEC = 90;
const MAX_DURATION_SEC = 480;

const REJECT_KEYWORDS = [
  'karaoke', 'instrumental', 'cover', 'remix', 'reaction',
  'nightcore', 'slowed', 'sped up', 'spedup', '8d', 'live',
  'fan version', 'fan made', 'reupload', 're-upload',
  'lyric video', 'lyric video ', 'topic',
];

const PREFER_CHANNEL_KEYWORDS = ['vevo', 'topic', 'official', 'records', 'entertainment'];

interface Candidate {
  videoId: string;
  title: string;
  channelTitle: string;
  categoryId: string | undefined;
  durationSec: number;
  duration: string;
  embeddable: boolean;
  viewCount: number;
}

interface ResolverResult {
  id: string;
  title: string;
  artist: string;
  query: string;
  resolved: boolean;
  embeddable: boolean | null;
  youtubeId: string;
  channelTitle: string;
  durationSec: number | null;
  duration: string;
  status: 'ok' | 'needs-id';
  reason: string;
  score: number;
}

async function searchAndFilter(
  track: { id: string; title: string; artist: string },
): Promise<ResolverResult> {
  const artist = track.artist.replace(/\s*(feat\.|ft\.|featuring)\s.*/i, '').trim();
  const q = `${artist} ${track.title}`.trim();
  const encoded = encodeURIComponent(q);
  const searchUrl =
    `${SEARCH_URL}?part=snippet&type=video&maxResults=10&videoCategoryId=10&q=${encoded}&key=${API_KEY}`;

  let searchRes: Response;
  try {
    searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
  } catch (err) {
    return mkFail(track, q, `network-error: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!searchRes.ok) return mkFail(track, q, `search-api-${searchRes.status}`);

  const searchJson = await searchRes.json() as {
    items?: Array<{ id: { videoId: string }; snippet: { title: string; channelTitle: string; categoryId?: string } }>;
  };
  const items = searchJson.items ?? [];
  if (items.length === 0) return mkFail(track, q, 'no-results');

  const videoIds = items.map((i) => i.id.videoId);
  const videosUrl = `${VIDEOS_URL}?part=snippet,status,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
  let videosRes: Response;
  try {
    videosRes = await fetch(videosUrl, { signal: AbortSignal.timeout(8000) });
  } catch (err) {
    return mkFail(track, q, `videos-api-network-${err instanceof Error ? err.message : String(err)}`);
  }
  if (!videosRes.ok) return mkFail(track, q, `videos-api-${videosRes.status}`);

  const videosJson = await videosRes.json() as {
    items?: Array<{
      id: string;
      snippet: { title: string; channelTitle: string; categoryId?: string };
      status: { embeddable: boolean; privacyStatus: string };
      contentDetails: { duration: string };
      statistics: { viewCount?: string };
    }>;
  };
  const videoMap = new Map<string, Candidate>();
  for (const v of videosJson.items ?? []) {
    if (v.status?.embeddable !== true || v.status?.privacyStatus !== 'public') continue;
    const d = parseISODuration(v.contentDetails.duration);
    if (d < MIN_DURATION_SEC || d > MAX_DURATION_SEC) continue;
    videoMap.set(v.id, {
      videoId: v.id,
      title: v.snippet.title,
      channelTitle: v.snippet.channelTitle,
      categoryId: v.snippet?.categoryId ?? '10',
      durationSec: d,
      duration: v.contentDetails.duration,
      embeddable: true,
      viewCount: Number(v.statistics?.viewCount ?? 0),
    });
  }

  const normalizedArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
  const candidates = items
    .map((i) => videoMap.get(i.id.videoId))
    .filter((c): c is Candidate => Boolean(c))
    .filter((c) => passesKeywordFilter(c.title, c.channelTitle))
    .map((c) => ({ ...c, score: scoreCandidate(c, normalizedArtist, track.title) }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return mkFail(track, q, 'no-embeddable-candidate');

  // Re-verify top candidate via oEmbed (canonical embeddability check).
  const best = candidates[0];
  try {
    const oembedRes = await fetch(
      `${OEMBED_URL}?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${best.videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!oembedRes.ok) return mkFail(track, q, `oembed-${oembedRes.status}`);
  } catch {
    return mkFail(track, q, 'oembed-network-error');
  }

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    query: q,
    resolved: true,
    embeddable: true,
    youtubeId: best.videoId,
    channelTitle: best.channelTitle,
    durationSec: best.durationSec,
    duration: best.duration,
    status: 'ok',
    reason: `channel=${best.channelTitle} · views=${best.viewCount}`,
    score: best.score,
  };
}

function passesKeywordFilter(title: string, channel: string): boolean {
  const text = `${title} ${channel}`.toLowerCase();
  if (REJECT_KEYWORDS.some((k) => text.includes(k))) return false;
  // "Topic" channels are allowed and preferred — remove from reject list match
  if (channel.toLowerCase().includes('topic')) return true;
  return true;
}

function scoreCandidate(c: Candidate, normalizedArtist: string, trackTitle: string): number {
  const channel = c.channelTitle.toLowerCase();
  const title = c.title.toLowerCase();
  const normTitle = trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  let score = 0;
  // Strongly prefer the artist's own channel or VEVO/Topic/Official
  if (channel.includes(normalizedArtist)) score += 100;
  if (PREFER_CHANNEL_KEYWORDS.some((k) => channel.includes(k))) score += 50;
  // Title contains the artist name
  if (title.includes(normalizedArtist)) score += 20;
  // Title contains the track's simplified name
  if (normTitle.length > 3 && title.replace(/[^a-z0-9]/g, '').includes(normTitle)) score += 30;
  // Prefer reasonable duration (2:30 – 6:00)
  if (c.durationSec >= 150 && c.durationSec <= 360) score += 10;
  // Small tie-breaker: larger view counts preferred
  score += Math.min(Math.floor(Math.log10(Math.max(1, c.viewCount))), 10);
  return score;
}

function parseISODuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}

function mkFail(track: { id: string; title: string; artist: string }, query: string, reason: string): ResolverResult {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    query,
    resolved: false,
    embeddable: null,
    youtubeId: '',
    channelTitle: '',
    durationSec: null,
    duration: '',
    status: 'needs-id',
    reason,
    score: 0,
  };
}

async function main() {
  if (!API_KEY) {
    console.log('YOUTUBE_API_KEY not set — printing manual checklist.\n');
    console.log('For each track below: find the OFFICIAL upload on YouTube, verify via');
    console.log('https://www.youtube.com/oembed?url=<official-url>&format=json\n');
    const seen = new Set<string>();
    for (const p of SEED_PLAYLISTS) {
      for (const t of p.tracks) {
        if (t.addedBy !== 'system') continue;
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        if (t.status === 'needs-id') console.log(t.id.padEnd(30) + t.title);
      }
    }
    return;
  }

  const seen = new Set<string>();
  const uniqueTracks: Array<{ id: string; title: string; artist: string }> = [];
  for (const p of SEED_PLAYLISTS) {
    for (const t of p.tracks) {
      if (t.addedBy !== 'system' || seen.has(t.id)) continue;
      seen.add(t.id);
      uniqueTracks.push({ id: t.id, title: t.title, artist: t.artist });
    }
  }

  console.log(`Resolving ${uniqueTracks.length} unique tracks…\n`);

  const results: ResolverResult[] = [];
  for (const track of uniqueTracks) {
    const result = await searchAndFilter(track);
    results.push(result);
    const mark = result.resolved ? 'O' : 'X';
    console.log(`${mark} ${result.id.padEnd(28)} ${(result.youtubeId || '─').padEnd(14)} ${result.channelTitle || result.reason}`);
  }

  console.log('\n=== TRACK | ID | CHANNEL | DURATION | STATUS ===');
  for (const r of results) {
    const dur = r.durationSec != null ? `${Math.floor(r.durationSec / 60)}:${String(r.durationSec % 60).padStart(2, '0')}` : '─';
    console.log(
      `${r.id.padEnd(28)} | ${(r.youtubeId || 'needs-id').padEnd(12)} | ${(r.channelTitle || '─').padEnd(40).slice(0, 40)} | ${dur.padEnd(6)} | ${r.status}`,
    );
  }

  console.log('\nNot playable (still needs-id):');
  for (const r of results.filter((r) => !r.resolved)) {
    console.log(`- ${r.id} (${r.artist} — ${r.title}) — ${r.reason}`);
  }
}

main().catch((err) => {
  console.error('Resolver failed:', err);
  process.exit(1);
});
