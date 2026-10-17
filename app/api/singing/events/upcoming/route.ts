import { NextResponse } from 'next/server';
import { getUpcomingSingingEvents } from '@/features/singing/services/singingService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getUpcomingSingingEvents();

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/singing/events/upcoming] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve upcoming singing events',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
