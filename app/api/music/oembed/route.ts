import { NextResponse } from 'next/server';

/**
 * GET /api/music/oembed?url=<youtube-url>
 *
 * Server-side proxy for YouTube's oEmbed endpoint. The browser cannot call
 * it cross-origin; this route:
 *   1. allowlists the host (youtube.com, youtu.be, music.youtube.com only)
 *   2. rate-limits per IP (20 lookups / 10 minutes)
 *   3. returns a typed, sanitised payload for the client to consume
 *
 * Returns:
 *   200 { ok: true, title, author_name, thumbnail_url, html-embeddable:true }
 *   400 { ok: false, error: 'invalid-url' | 'unsupported-host' }
 *   429 { ok: false, error: 'rate-limited' }
 *   502 { ok: false, error: 'upstream' }
 */

export const runtime = 'nodejs';

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const bucket = new Map<string, { count: number; reset: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || entry.reset < now) {
    bucket.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count += 1;
  return true;
}

function parseTarget(raw: string): URL | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) return null;
    // Extract video id from common shapes
    let videoId: string | null = null;
    if (host === 'youtu.be') {
      videoId = url.pathname.replace(/^\//, '').split('/')[0];
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2];
    } else if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/live/')) {
      videoId = url.pathname.split('/')[2];
    }
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return new URL(`https://www.youtube.com/watch?v=${videoId}`);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const ip =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'anon';
  if (!allow(ip)) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('url') ?? '';
  if (!raw) {
    return NextResponse.json({ ok: false, error: 'missing-url' }, { status: 400 });
  }
  const target = parseTarget(decodeURIComponent(raw));
  if (!target) {
    return NextResponse.json({ ok: false, error: 'invalid-or-unsupported-url' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(target.toString())}&format=json`,
      {
        headers: { 'User-Agent': 'GroovePH/1.0 (+https://grooveph.app)' },
        // Short timeout; oEmbed is the hot path of the Add-Song flow
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: upstream.status === 401 || upstream.status === 403 ? 'embed-blocked' : 'upstream' },
        { status: upstream.status === 401 || upstream.status === 403 ? 422 : 502 }
      );
    }
    const data = (await upstream.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    return NextResponse.json({
      ok: true,
      title: data.title ?? '',
      author_name: data.author_name ?? '',
      thumbnail_url: data.thumbnail_url ?? '',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream-unreachable' }, { status: 502 });
  }
}
