import { NextResponse } from 'next/server';
import { getUpcomingTheaterEvents } from '@/features/theater/services/theaterService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getUpcomingTheaterEvents();

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/theater/events/upcoming] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve upcoming theater events',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
