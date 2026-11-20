import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';
import { updatesQuerySchema } from '@/lib/dance/schema';
import { isKnownLeagueId } from '@/features/dance/data/leagues';
import { getPublishedDanceUpdates } from '@/features/dance/services/danceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const rawParams = {
      region: searchParams.get('region') || undefined,
      category: searchParams.get('category') || undefined,
      org: searchParams.get('org') || undefined,
      league: searchParams.get('league') || undefined,
      q: searchParams.get('q') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    };

    const parseResult = updatesQuerySchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { region, category, org, league, q, page, limit } = parseResult.data;

    if (league && league !== 'all' && !isKnownLeagueId(league)) {
      return NextResponse.json(
        { error: 'Unknown league id', details: { league: ['Not in the league registry'] } },
        { status: 400 }
      );
    }

    const result = await getPublishedDanceUpdates({
      region,
      category,
      org,
      league,
      q,
      page,
      limit,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: unknown) {
    return errorResponse(error, 'GET /api/dance/updates');
  }
}
