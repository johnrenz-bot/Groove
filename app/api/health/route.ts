import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEnv } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = getEnv();
  const checks: Record<string, 'ok' | 'degraded' | 'error'> = {
    env: env ? 'ok' : 'error',
  };

  let dbOk = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (!error) {
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }
  checks.database = dbOk ? 'ok' : 'error';

  const healthy = checks.env === 'ok' && checks.database === 'ok';
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}