import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * The request boundary in front of the app.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy` (v16.0.0;
 * `middleware` is deprecated and every build printed a warning). The behaviour
 * is identical — this still refreshes the Supabase session cookie and applies
 * the route rules in `lib/supabase/middleware.ts`, which is where the logic
 * lives and where any change belongs. This file is only the hook.
 *
 * `next.config.ts` needs no change: the convention is picked up from the root.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts, image, media (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|fonts|image|media|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};