import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';
import { authorizeIngestRequest } from '@/lib/ingest/auth';
import { ingestBodySchema } from '@/lib/dance/schema';
import { ingestDanceUpdates, logAgentRun } from '@/features/dance/services/danceService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startedAt = new Date().toISOString();

  try {
    // 1. Authenticate with INGEST_API_KEY (constant-time digest compare)
    const ingestAuth = authorizeIngestRequest(request, 'API /api/dance/ingest');
    if (!ingestAuth.ok) {
      return NextResponse.json(ingestAuth.body, { status: ingestAuth.status });
    }

    // 2. Parse and validate payload
    const body = await request.json();
    const parseResult = ingestBodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { updates } = parseResult.data;

    // 3. Ingest into database
    const { inserted, updated, total } = await ingestDanceUpdates(updates);

    const finishedAt = new Date().toISOString();

    // 4. Log run
    await logAgentRun({
      status: 'success',
      items_found: total,
      items_inserted: inserted,
      started_at: startedAt,
      finished_at: finishedAt,
    });

    return NextResponse.json({
      success: true,
      total,
      inserted,
      updated,
      timestamp: finishedAt,
    });
  } catch (error: any) {
    console.error('[API /api/dance/ingest] Ingestion failed:', error);

    await logAgentRun({
      status: 'failure',
      items_found: 0,
      items_inserted: 0,
      error: error?.message || 'Ingestion failed',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return errorResponse(error, 'POST /api/dance/ingest');
  }
}
