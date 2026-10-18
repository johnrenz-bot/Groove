import { NextRequest, NextResponse } from 'next/server';
import { runDanceBeatAgent } from '@/features/dance/services/danceBeatAgent';
import { authorizeCronRequest } from '@/lib/cron/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds execution for AI agent discovery

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize. Fails CLOSED in production when CRON_SECRET is unset —
    //    see lib/cron/auth.ts for why the old "warn and carry on" was a hole.
    const auth = authorizeCronRequest(request, 'API /api/cron/dance-agent');
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
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
  } catch (error) {
    console.error('[API /api/cron/dance-agent] Cron execution failed:', error);
    return NextResponse.json(
      {
        status: 'failure',
        error: error instanceof Error ? error.message : 'Agent cron execution failed',
      },
      { status: 500 }
    );
  }
}
