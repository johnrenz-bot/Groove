/**
 * scripts/verify-youtube-ids.ts
 *
 * Verifies every catalog track marked playable (status 'ok', source
 * 'youtube') through YouTube's oEmbed endpoint only — it costs no API
 * quota and calls no search.list.
 *
 * Usage:
 *   npx tsx scripts/verify-youtube-ids.ts
 *
 * Behaviour:
 *   - One request per track, sequential, 500ms apart.
 *   - On HTTP 429: retry with backoff (1s, 2s, 4s), up to 3 retries.
 *   - On network error: same backoff.
 *   - Reports a table; exits 1 if any track fails verification.
 *   - needs-id / unavailable tracks are listed but not verified.
 */

import { SEED_TRACKS_MAP } from '../features/music/data/seed';
import { setTimeout as delay } from 'node:timers/promises';

const OEMBED = 'https://www.youtube.com/oembed';
const GAP_MS = 500;
const BACKOFF_MS = [1000, 2000, 4000];

interface VerificationResult {
  id: string;
  youtubeId: string;
  ok: boolean;
  httpStatus: number | null;
  title: string | null;
  author: string | null;
  error: string | null;
}

async function verify(id: string, youtubeId: string): Promise<VerificationResult> {
  const url = `${OEMBED}?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
    let res: Response | null = null;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch (err) {
      const isLast = attempt === BACKOFF_MS.length;
      if (isLast) {
        return { id, youtubeId, ok: false, httpStatus: null, title: null, author: null, error: `network: ${err instanceof Error ? err.message : String(err)}` };
      }
      await delay(BACKOFF_MS[attempt]);
      continue;
    }

    if (res.status === 429) {
      const isLast = attempt === BACKOFF_MS.length;
      if (isLast) {
        return { id, youtubeId, ok: false, httpStatus: 429, title: null, author: null, error: 'oembed-429 (rate limited after retries)' };
      }
      await delay(BACKOFF_MS[attempt]);
      continue;
    }

    if (!res.ok) {
      return { id, youtubeId, ok: false, httpStatus: res.status, title: null, author: null, error: `oembed-${res.status}` };
    }

    try {
      const json = (await res.json()) as { title?: string; author_name?: string };
      return { id, youtubeId, ok: true, httpStatus: 200, title: json.title ?? null, author: json.author_name ?? null, error: null };
    } catch {
      return { id, youtubeId, ok: false, httpStatus: 200, title: null, author: null, error: 'oembed-invalid-json' };
    }
  }

  return { id, youtubeId, ok: false, httpStatus: null, title: null, author: null, error: 'unreachable' };
}

async function main() {
  const playable = Object.values(SEED_TRACKS_MAP).filter(
    (t) => t.source === 'youtube' && t.status === 'ok' && typeof t.youtubeId === 'string' && t.youtubeId.length > 0,
  );
  const needsId = Object.values(SEED_TRACKS_MAP).filter((t) => t.status !== 'ok');

  console.log(`Verifying ${playable.length} playable YouTube tracks via oEmbed…`);
  console.log('(500ms between calls, 429 → retry with backoff 1s/2s/4s)\n');

  const results: VerificationResult[] = [];
  for (const track of playable) {
    const result = await verify(track.id, track.youtubeId as string);
    results.push(result);
    const mark = result.ok ? 'O' : 'X';
    const detail = result.ok ? `${result.author ?? ''} — ${result.title ?? ''}` : result.error ?? 'failed';
    console.log(`${mark} ${result.id.padEnd(28)} ${(result.youtubeId).padEnd(14)} ${detail}`);
    await delay(GAP_MS);
  }

  const failures = results.filter((r) => !r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(`total playable: ${results.length} · ok: ${results.length - failures.length} · failed: ${failures.length}`);
  if (failures.length > 0) {
    console.log('\nFailed verification (kept status "ok"? no — set these to needs-id after review):');
    for (const f of failures) console.log(`- ${f.id} (${f.youtubeId}) — ${f.error ?? f.httpStatus}`);
  }
  console.log(`\nNot verified (status != ok, kept out of playable lists): ${needsId.map((t) => t.id).join(', ') || 'none'}`);

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Verification failed to run:', err);
  process.exit(2);
});
