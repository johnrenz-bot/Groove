import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminIdentity, roleHome } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';

type RouteKind = 'auth' | 'admin' | 'coach' | 'client' | 'shared' | 'public';

/**
 * Classifies a pathname into the area it belongs to. Anything not matched here
 * is public and falls through untouched.
 */
function classify(path: string): RouteKind {
  if (
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/auth')
  ) {
    return 'auth';
  }
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/coach')) return 'coach';
  if (path.startsWith('/client')) return 'client';
  if (
    path.startsWith('/messages') ||
    path.startsWith('/contracts') ||
    path.startsWith('/userprofile')
  ) {
    return 'shared';
  }
  return 'public';
}

/** The portal a role belongs in. Only a full admin identity lands on the admin
 *  console; an account whose `profiles.role` is 'admin' but which is not the
 *  pinned admin address is treated as a member and sent to the client portal.
 *  Keeping this here (rather than in `roleHome`, which only knows the role)
 *  is what prevents a redirect loop between `/admin/*` and `/client/*` for
 *  such an account. */
function homeFor(role: UserRole | string | undefined, isAdmin: boolean = false): string {
  if (role === 'admin') return isAdmin ? '/admin/dashboard' : '/client/home';
  return roleHome(role);
}

/**
 * OPTIMISTIC SESSION CHECK (Next.js 16 guidance: Proxy should read the cookie,
 * not hit the network, on the fast path).
 *
 * Supabase stores the session under `sb-<project-ref>-auth-token` (chunked as
 * `.0`, `.1`, … when large). Presence of that cookie is a cheap necessary
 * condition for "probably signed in":
 *   - No cookie  → no session can possibly be loaded. Protected routes bounce
 *                  to /login without a single network call; guests on public
 *                  and auth pages are let straight through.
 *   - Cookie     → fall through to the authoritative `auth.getUser()` +
 *                  `profiles` check below, so role-based redirects stay as
 *                  strict as ever. A garbage cookie just costs one failed
 *                  lookup, exactly as before.
 *
 * This is the difference between every navigation paying 1–2 Supabase round
 * trips and paying them ONLY when a session actually exists.
 */
const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

function hasAuthCookie(request: NextRequest): boolean {
  try {
    return request.cookies.getAll().some((cookie) => SUPABASE_AUTH_COOKIE.test(cookie.name));
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const kind = classify(path);

  let supabaseResponse = NextResponse.next({
    request,
  });

  // API routes authenticate themselves (each handler calls getUser / requireAdmin
  // on its own). Running the page-oriented checks here only paid a wasted auth
  // round trip on every API call and every API prefetch.
  if (path.startsWith('/api')) {
    return supabaseResponse;
  }

  // Public pages other than `/` never redirect based on the session (the
  // member-redirect below is only for the front door), so there is nothing to
  // learn from a network call here. Skip it entirely — guests and members alike
  // get the page immediately and the client chrome resolves the session.
  if (kind === 'public' && path !== '/') {
    return supabaseResponse;
  }

  const cookiePresent = hasAuthCookie(request);

  // No auth cookie at all: everything the authoritative path would conclude is
  // already known. Guests may see `/` and the auth pages; everyone else bounces.
  if (!cookiePresent) {
    if (kind === 'public' || kind === 'auth') {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirectTo=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // A stale/invalid session must not be treated as an account-readiness problem.
  // Supabase reports it through `authError` with no `user`; fall through as an
  // unauthenticated visitor rather than redirecting into the account_not_ready
  // flow. The cookie refresh above is what keeps a valid session alive.
  //
  // "Database error loading user" specifically means Supabase Auth could not load
  // the account behind this session (typically an orphaned/stale session after a
  // data clear). Clearing the stale cookies is justified in that case; a generic
  // transient network error is not, so we only sign out for that message.
  if (authError && !user) {
    const message = (authError.message || '').toLowerCase();
    if (message.includes('database error loading user')) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Best-effort cleanup; the redirect below still handles the visit.
      }
    }
  }

  const isProtected = kind !== 'public' && kind !== 'auth';

  // Unauthenticated user attempting to access a protected route
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // Authenticated user
  if (user) {
    // The profiles row is authoritative. `user_metadata.role` is supplied by the
    // client at signup, so it is not a trustworthy authorization claim.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();

    /**
     * A SESSION WITH NO PROFILES ROW HAS NO PORTAL.
     *
     * This used to read `profile?.role ?? 'client'`, which quietly handed the
     * whole `/client/**` tree — appointments, calendar, bookings, messages —
     * to any account whose `profiles` row was missing. That row is created by
     * the `handle_new_user` trigger, so "missing" means the signup transaction
     * did not finish; it does not mean "client". Defaulting it is the exact
     * hardcoded-role-as-hiding-place the brief warns about.
     *
     * `account_not_ready` is what breaks what would otherwise be a redirect
     * loop: `/login` is an `auth` route and an authenticated visitor is
     * normally bounced off it, so this one case is allowed to land there with a
     * reason the login page renders instead of being thrown straight back.
     */
    const role = profile?.role as UserRole | undefined;

    if (!role) {
      // The public landing page stays reachable for a half-created account so a
      // user who lands on /login?error=account_not_ready can still navigate back
      // to '/' instead of being trapped. Protected routes below still redirect.
      if (path === '/') {
        return supabaseResponse;
      }

      // Already on the not-ready login URL: do not redirect again (this was the
      // source of ERR_TOO_MANY_REDIRECTS).
      const alreadyNotReady =
        path === '/login' &&
        request.nextUrl.searchParams.get('error') === 'account_not_ready';

      if (alreadyNotReady) {
        return supabaseResponse;
      }

      // A read error is not a missing profile. Do not label it account_not_ready;
      // send the visitor to /login without that reason (and never self-redirect).
      if (profileError) {
        if (path !== '/login') {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.search = '';
          return NextResponse.redirect(url);
        }
        return supabaseResponse;
      }

      // Genuinely missing profile: account not ready.
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=account_not_ready';
      return NextResponse.redirect(url);
    }

    const isAdmin = isAdminIdentity({ role, email: profile?.email });

    /**
     * `/` IS THE FRONT DOOR, AND A MEMBER'S FRONT DOOR IS THEIR PORTAL.
     *
     * `/` is classified `public` so it falls through for guests — the marketing
     * page. For a signed-in member it is a redirect to their own dashboard.
     *
     * Only the root path. `/about`, `/faq`, `/users`, `/community/*`,
     * `/performing-arts-philippines`, `/terms` and `/privacy` stay public for
     * members too, and render the signed-in header from `SessionProvider` —
     * bouncing a member away from every public page would be the same class of
     * bug as refusing them the ones they are entitled to.
     *
     * This is the edge copy of the same rule `app/(public)/page.tsx` enforces
     * during SSR; the page remains the authority, this one saves a render.
     */
    if (kind === 'public' && path === '/') {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role, isAdmin);
      url.search = '';
      return NextResponse.redirect(url);
    }

    // If on an auth page, redirect to the role home.
    //
    // Exception: `/reset-password` must render for an authenticated visitor.
    // The recovery flow sends the user through /auth/callback, which first
    // ESTABLISHES A SESSION and then forwards to /reset-password — bouncing
    // authenticated visitors off auth pages would strand them on their role
    // home with a recovery link that can never be used. A signed-in member
    // setting a new password is harmless (they can also do it from Settings).
    if (kind === 'auth') {
      if (path === '/reset-password') {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role, isAdmin);
      url.search = '';
      return NextResponse.redirect(url);
    }

    // Only a full admin identity — role 'admin' AND the pinned admin email —
    // reaches /admin. Everything else is bounced to its own portal.
    if (kind === 'admin' && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role === 'coach' ? 'coach' : 'client');
      return NextResponse.redirect(url);
    }

    if (kind === 'coach' && role !== 'coach' && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role, isAdmin);
      return NextResponse.redirect(url);
    }

    if (kind === 'client' && role !== 'client' && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role, isAdmin);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
