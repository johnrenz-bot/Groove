import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Placeholders that ship in `.env` / `.env.example`.
 *
 * `SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key` is TRUTHY, so the
 * old `process.env.SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * fallback never fired: every privileged route built a client with a literal
 * placeholder key and Supabase answered `401 Invalid API key` to all of them.
 * `/api/admin/users`, `/api/admin/audit`, `/api/tickets` and the dance
 * service-role reads therefore failed with an error that looked like a bug
 * somewhere else entirely. Detecting the placeholder lets those routes fall back
 * to the anon key, so they degrade to RLS-scoped behaviour and a clear 403/empty
 * result instead of an unexplained 401.
 */
function isUsableServiceKey(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 20) return false;
  if (/^your[-_]/i.test(trimmed)) return false;
  if (/^(changeme|placeholder|todo|xxx)/i.test(trimmed)) return false;
  return true;
}

/**
 * True when a real service-role key is configured.
 *
 * Callers that genuinely NEED to bypass Row Level Security — `/api/tickets`
 * writing an anonymous support request, for example — use this to tell "the
 * database refused this" apart from "this deployment is misconfigured", and to
 * say so instead of returning a generic failure.
 */
export function hasServiceRoleKey(): boolean {
  return isUsableServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createAdminClient() {
  const cookieStore = await cookies();
  const configured = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  /**
   * No real service key configured.
   *
   * Returned the anon client with a loud warning rather than a broken one.
   * Callers in this repo only use the privileged client for admin operations
   * that already re-check the caller's identity (`requireAdmin()`), so the
   * worst case is RLS refusing the write — a correct denial — rather than a 401
   * that looks like the application is broken.
   */
  if (!isUsableServiceKey(configured)) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[supabase] SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder — ' +
          'falling back to the anon key. Privileged server operations will be ' +
          'refused by Row Level Security until a real key is set.'
      );
    }
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
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
            // Ignored in server components
          }
        },
      },
    });
  }

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, configured, {
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
          // Ignored in server components
        }
      },
    },
  });
}
