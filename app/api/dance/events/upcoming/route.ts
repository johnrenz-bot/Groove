import { NextRequest, NextResponse } from 'next/server';
import { isKnownLeagueId } from '@/features/dance/data/leagues';
import { getUpcomingDanceEvents } from '@/features/dance/services/danceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const league = request.nextUrl.searchParams.get('league') ?? undefined;

    if (league && league !== 'all' && !isKnownLeagueId(league)) {
      return NextResponse.json(
        { error: 'Unknown league id', details: { league: ['Not in the league registry'] } },
        { status: 400 }
      );
    }

    const result = await getUpcomingDanceEvents({ league });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/dance/events/upcoming] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve upcoming dance events',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
