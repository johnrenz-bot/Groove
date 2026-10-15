import { NextRequest, NextResponse } from 'next/server';
import { runDanceBeatAgent } from '@/features/dance/services/danceBeatAgent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds execution for AI agent discovery

export async function GET(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const expectedSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const queryKey = request.nextUrl.searchParams.get('key');
    const bearerSecret = authHeader?.replace(/^Bearer\s+/i, '');

    // Allow Vercel Cron header or authorization secret
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');

    if (expectedSecret) {
      const authorized =
        bearerSecret === expectedSecret ||
        queryKey === expectedSecret ||
        (isVercelCron && bearerSecret === expectedSecret);

      if (!authorized) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid CRON_SECRET token.' },
          { status: 401 }
        );
      }
    } else {
      console.warn(
        '[API /api/cron/dance-agent] CRON_SECRET is not configured in server environment. Request executed in development mode.'
      );
    }

    // 2. Trigger the automated agent
    const result = await runDanceBeatAgent();

    return NextResponse.json(
      {
        status: result.success ? 'success' : 'failure',
        agent: 'DanceBeat Agent',
        itemsFound: result.itemsFound,
        itemsInserted: result.itemsInserted,
        itemsUpdated: result.itemsUpdated,
        durationMs: result.durationMs,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (error: any) {
    console.error('[API /api/cron/dance-agent] Cron execution failed:', error);
    return NextResponse.json(
      {
        status: 'failure',
        error: error?.message || 'Agent cron execution failed',
      },
      { status: 500 }
    );
  }
}
