import { NextRequest, NextResponse } from 'next/server';
// Relative import (no @/ alias): the sync script is also run directly via
// `node --experimental-strip-types`, which cannot resolve the webpack alias.
// Four levels up from app/api/cron/dance-logos/ reaches the repo-root scripts/.
import { runDanceLogoSync } from '../../../../scripts/sync-dance-logos.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // logo sync performs many network fetches (may require Vercel Pro)

export async function GET(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET (mirrors /api/cron/dance-agent)
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
        '[API /api/cron/dance-logos] CRON_SECRET is not configured in server environment. Request executed in development mode.'
      );
    }

    // 2. Run the logo sync. writeFiles=true attempts to persist downloaded logos
    //    to /public/logos; on the read-only Vercel runtime FS the write is
    //    skipped gracefully and existing committed logo_url assets are preserved.
    const report = await runDanceLogoSync({ writeFiles: true });

    return NextResponse.json(report, { status: report.ok ? 200 : 500 });
  } catch (error) {
    console.error('[API /api/cron/dance-logos] Cron execution failed:', error);
    const message = error instanceof Error ? error.message : 'Logo sync cron execution failed';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
