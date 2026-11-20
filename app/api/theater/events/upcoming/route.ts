import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';
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
  } catch (error: unknown) {
    return errorResponse(error, 'GET /api/theater/events/upcoming');
  }
}
