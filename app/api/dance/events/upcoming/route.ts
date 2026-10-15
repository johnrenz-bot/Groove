import { NextResponse } from 'next/server';
import { getUpcomingDanceEvents } from '@/features/dance/services/danceService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getUpcomingDanceEvents();

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
