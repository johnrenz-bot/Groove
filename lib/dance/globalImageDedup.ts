import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const TABLES = ['dance_updates', 'singing_updates', 'acting_updates', 'theater_updates'];

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Returns true if the given image URL is already used by any row in any of the
 * four performing-arts update tables. Used to enforce GLOBAL image deduplication
 * across categories, not just within a single batch/table.
 */
export async function isImageUsedGlobally(imageUrl: string | null): Promise<boolean> {
  if (!imageUrl) return false;
  try {
    const supabase = getClient();
    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('image_url', imageUrl)
        .limit(1);
      if (!error && data && data.length > 0) return true;
    }
  } catch {
    // On failure, do not block ingestion; caller keeps existing behavior.
  }
  return false;
}
