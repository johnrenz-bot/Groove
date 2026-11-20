import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';
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
  } catch (error: unknown) {
    return errorResponse(error, 'GET /api/dance/events/upcoming');
  }
}
