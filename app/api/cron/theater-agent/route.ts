import { NextRequest, NextResponse } from 'next/server';
import { runTheaterBeatAgent } from '@/features/theater/services/theaterBeatAgent';
import { authorizeCronRequest } from '@/lib/cron/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const auth = authorizeCronRequest(request, 'API /api/cron/theater-agent');
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
    const result = await runTheaterBeatAgent();
    return NextResponse.json({ status: result.success ? 'success' : 'failure', agent: 'TheaterBeat Agent', itemsFound: result.itemsFound, itemsInserted: result.itemsInserted, itemsUpdated: result.itemsUpdated, durationMs: result.durationMs, error: result.error || null, timestamp: new Date().toISOString() }, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ status: 'failure', error: error instanceof Error ? error.message : 'Agent cron execution failed' }, { status: 500 });
  }
}
