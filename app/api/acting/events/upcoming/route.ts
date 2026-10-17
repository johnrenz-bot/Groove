import { NextResponse } from 'next/server';
import { getUpcomingActingEvents } from '@/features/acting/services/actingService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getUpcomingActingEvents();

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/acting/events/upcoming] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve upcoming acting events',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
