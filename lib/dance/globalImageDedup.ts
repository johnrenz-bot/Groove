import { createPerformingArtsServerClient } from '../supabase/serviceClient.ts';

const TABLES = ['dance_updates', 'singing_updates', 'acting_updates', 'theater_updates'];

function getClient() {
  return createPerformingArtsServerClient();
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
