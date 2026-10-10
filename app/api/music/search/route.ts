import { NextRequest, NextResponse } from 'next/server';
import { CURATED_DANCE_TRACKS } from '@/features/music/data/curatedTracks';
import { MusicSearchResult } from '@/features/music/types';

function extractYoutubeId(input: string): string | null {
  const clean = input.trim();
  // Direct 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  // Standard watch URL: youtube.com/watch?v=...
  const watchMatch = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return watchMatch[1];
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json({
        results: CURATED_DANCE_TRACKS.map((t) => ({
          youtubeId: t.youtubeId,
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail,
          duration: t.duration,
        })),
        source: 'curated',
        hasApiKey: Boolean(process.env.YOUTUBE_API_KEY),
      });
    }

    // 1. Check if the query is a direct YouTube URL or Video ID
    const directId = extractYoutubeId(query);
    if (directId) {
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`;
        const res = await fetch(oEmbedUrl, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          const directResult: MusicSearchResult = {
            youtubeId: directId,
            title: data.title || 'YouTube Track',
            artist: data.author_name || 'YouTube Artist',
            thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            duration: 'Track',
          };
          return NextResponse.json({
            results: [directResult],
            source: 'oembed',
            hasApiKey: Boolean(process.env.YOUTUBE_API_KEY),
          });
        }
      } catch (err) {
        console.warn('oEmbed fetch error for video id', directId, err);
      }

      // Fallback for valid ID even if oEmbed is unreachable
      return NextResponse.json({
        results: [
          {
            youtubeId: directId,
            title: `YouTube Video (${directId})`,
            artist: 'YouTube',
            thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            duration: 'Track',
          },
        ],
        source: 'direct_id',
        hasApiKey: Boolean(process.env.YOUTUBE_API_KEY),
      });
    }

    // 2. Query YouTube Data API v3 if API key is configured
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (apiKey && apiKey !== 'your-youtube-api-key') {
      try {
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=12&q=${encodeURIComponent(
          query
        )}&key=${apiKey}`;
        const ytRes = await fetch(ytUrl);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          const items: MusicSearchResult[] = (ytData.items || []).map((item: any) => ({
            youtubeId: item.id?.videoId,
            title: item.snippet?.title || 'Unknown Track',
            artist: item.snippet?.channelTitle || 'Artist',
            thumbnail:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
          })).filter((item: MusicSearchResult) => Boolean(item.youtubeId));

          if (items.length > 0) {
            return NextResponse.json({
              results: items,
              source: 'youtube_api',
              hasApiKey: true,
            });
          }
        } else {
          const errorText = await ytRes.text();
          console.warn('YouTube API search returned non-200:', ytRes.status, errorText);
        }
      } catch (err) {
        console.error('Error querying YouTube Data API:', err);
      }
    }

    // 3. Fallback: Search in curated rehearsal catalog
    const lowerQ = query.toLowerCase();
    const matched = CURATED_DANCE_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQ) ||
        t.artist.toLowerCase().includes(lowerQ)
    );

    const fallbackResults = (matched.length > 0 ? matched : CURATED_DANCE_TRACKS).map((t) => ({
      youtubeId: t.youtubeId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      duration: t.duration,
    }));

    return NextResponse.json({
      results: fallbackResults,
      source: 'curated',
      hasApiKey: Boolean(apiKey && apiKey !== 'your-youtube-api-key'),
      notice: !apiKey
        ? 'Showing rehearsal catalog. To search all of YouTube, configure YOUTUBE_API_KEY in .env.local, or paste any YouTube URL directly.'
        : undefined,
    });
  } catch (error: any) {
    console.error('Music search route error:', error);
    return NextResponse.json(
      { error: 'Failed to search music tracks', results: [] },
      { status: 500 }
    );
  }
}
