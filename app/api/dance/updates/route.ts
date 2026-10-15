import { NextRequest, NextResponse } from 'next/server';
import { updatesQuerySchema } from '@/lib/dance/schema';
import { getPublishedDanceUpdates } from '@/features/dance/services/danceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const rawParams = {
      region: searchParams.get('region') || undefined,
      category: searchParams.get('category') || undefined,
      org: searchParams.get('org') || undefined,
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

    const { region, category, org, q, page, limit } = parseResult.data;

    const result = await getPublishedDanceUpdates({
      region,
      category,
      org,
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
  } catch (error: any) {
    console.error('[API /api/dance/updates] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve dance updates',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
