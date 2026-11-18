import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Shared factory for the service-role (or anon fallback) Supabase client used by
 * the performing-arts update services. Centralised so the four services do not
 * each carry an identical copy of the construction logic.
 */
export function createPerformingArtsServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}