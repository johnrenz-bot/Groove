import { NextRequest, NextResponse } from 'next/server';
import { checkTruthfulHealth } from '@/features/groovey/server/gemini';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const forceFresh = searchParams.get('fresh') === 'true';

  const health = await checkTruthfulHealth(forceFresh);
  return NextResponse.json(health);
}
