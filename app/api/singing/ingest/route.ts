import { NextRequest, NextResponse } from 'next/server';
import { ingestBodySchema } from '@/lib/dance/schema';
import { ingestSingingUpdates, logAgentRun } from '@/features/singing/services/singingService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startedAt = new Date().toISOString();
  try {
    const expectedKey = process.env.INGEST_API_KEY;
    const providedKey =
      request.headers.get('x-api-key') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!expectedKey) {
      return NextResponse.json({ error: 'Server configuration error: INGEST_API_KEY is not configured.' }, { status: 500 });
    }
    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing INGEST_API_KEY.' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = ingestBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parseResult.error.flatten() }, { status: 400 });
    }

    const { updates } = parseResult.data;
    const { inserted, updated, total } = await ingestSingingUpdates(updates);

    const finishedAt = new Date().toISOString();
    await logAgentRun({ status: 'success', items_found: total, items_inserted: inserted, started_at: startedAt, finished_at: finishedAt });

    return NextResponse.json({ success: true, total, inserted, updated, timestamp: finishedAt });
  } catch (error: any) {
    await logAgentRun({ status: 'failure', items_found: 0, items_inserted: 0, error: error?.message || 'Ingestion failed', started_at: startedAt, finished_at: new Date().toISOString() });
    return NextResponse.json({ error: 'Ingestion failed', message: error?.message || 'Internal server error' }, { status: 500 });
  }
}
