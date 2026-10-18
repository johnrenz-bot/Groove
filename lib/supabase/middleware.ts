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

/** The portal a role belongs in. Admins land on the admin console. */
function homeFor(role: UserRole | string | undefined): string {
  if (role === 'admin') return '/admin/dashboard';
  return roleHome(role);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const kind = classify(path);

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
    const { data: profile } = await supabase
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
      url.pathname = homeFor(role);
      url.search = '';
      return NextResponse.redirect(url);
    }

    // If on an auth page, redirect to the role home
    if (kind === 'auth') {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role);
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
      url.pathname = homeFor(role);
      return NextResponse.redirect(url);
    }

    if (kind === 'client' && role !== 'client' && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(role);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
