import { createBrowserClient } from '@supabase/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;

/**
 * ONE browser Supabase client for the whole app.
 *
 * `createBrowserClient(...)` used to run at every call site — dozens of them:
 * effects, handlers, callbacks. Each allocation brought its own auth storage
 * adapter, its own `onAuthStateChange` fan-out and its own token auto-refresh
 * timer, all racing over the same localStorage session. They almost always
 * resolve to the same session anyway, so none of those duplicates bought
 * isolation — they just multiplied work and made token refresh emit from
 * everywhere.
 *
 * The browser client is designed to be shared; memoising it here keeps the
 * public `createClient()` shape every caller already uses. Server code never
 * imports this module (server code uses `lib/supabase/server.ts`), and the
 * construction itself is SSR-safe (cookie access is lazy and browser-gated
 * inside @supabase/ssr).
 */
let browserClient: BrowserClient | null = null;

export function createClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
