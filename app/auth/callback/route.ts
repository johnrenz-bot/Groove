import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const type = requestUrl.searchParams.get('type');
  // Google registration carries the chosen role through the OAuth round trip,
  // because supabase-js signInWithOAuth has no way to set user metadata (see
  // lib/googleRegistration.ts). Validated against an allowlist rather than
  // echoed, so this parameter cannot be used to inject anything into the
  // redirect target.
  const role = requestUrl.searchParams.get('role');
  const safeRole = role === 'client' || role === 'coach' ? role : null;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in server component / route context if cookies already committed
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url));
      }
      // Only an in-app path is followed. `next` arrives from the client, so a
      // leading // or a scheme would turn this into an open redirect.
      const target = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      if (safeRole) {
        const separator = target.includes('?') ? '&' : '?';
        return NextResponse.redirect(
          new URL(`${target}${separator}role=${safeRole}`, request.url)
        );
      }
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // If code exchange failed or wasn't provided, redirect to login
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}
