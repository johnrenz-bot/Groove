import { NextRequest, NextResponse } from 'next/server';
import { runActingBeatAgent } from '@/features/acting/services/actingBeatAgent';
import { authorizeCronRequest } from '@/lib/cron/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const auth = authorizeCronRequest(request, 'API /api/cron/acting-agent');
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
    const result = await runActingBeatAgent();
    return NextResponse.json({ status: result.success ? 'success' : 'failure', agent: 'ActingBeat Agent', itemsFound: result.itemsFound, itemsInserted: result.itemsInserted, itemsUpdated: result.itemsUpdated, durationMs: result.durationMs, error: result.error || null, timestamp: new Date().toISOString() }, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ status: 'failure', error: error instanceof Error ? error.message : 'Agent cron execution failed' }, { status: 500 });
  }
}
