import { NextRequest, NextResponse } from 'next/server';
import { getPublishedTheaterUpdates } from '@/features/theater/services/theaterService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const region = searchParams.get('region') || undefined;
    const category = searchParams.get('category') || undefined;
    const org = searchParams.get('org') || undefined;
    const q = searchParams.get('q') || undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const result = await getPublishedTheaterUpdates({
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
    console.error('[API /api/theater/updates] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve theater updates',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
