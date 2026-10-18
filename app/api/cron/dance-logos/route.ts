import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron/auth';
// Relative import (no @/ alias): the sync script is also run directly via
// `node --experimental-strip-types`, which cannot resolve the webpack alias.
// Four levels up from app/api/cron/dance-logos/ reaches the repo-root scripts/.
import { runDanceLogoSync } from '../../../../scripts/sync-dance-logos.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // logo sync performs many network fetches (may require Vercel Pro)

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize (mirrors /api/cron/dance-agent). Fails CLOSED in production
    //    when CRON_SECRET is unset: an anonymous GET would otherwise trigger a
    //    300-second outbound crawl that writes to the database through the
    //    service-role client. See lib/cron/auth.ts.
    const auth = authorizeCronRequest(request, 'API /api/cron/dance-logos');
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
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
