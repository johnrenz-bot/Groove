import type { DanceUpdateInput } from '@/lib/dance/schema';

/** The four performing-arts discipline pages. */
export type DisciplineId = 'dance' | 'singing' | 'acting' | 'theater';

export const DISCIPLINE_IDS: readonly DisciplineId[] = ['dance', 'singing', 'acting', 'theater'];

/**
 * A stored update row — the DB shape of the verified feed, identical for the
 * `dance_updates`, `singing_updates`, `acting_updates` and `theater_updates`
 * tables. One type, one pipeline, four configurations.
 */
export interface DisciplineUpdateRecord extends DanceUpdateInput {
  id: string | number;
  created_at: string;
  updated_at?: string;
  image_credit?: string | null;
  image_verified?: boolean;
  /**
   * The first-party asset the image was taken from. Kept next to the local
   * path so an editor can always answer "where did this picture actually
   * come from?" without git archaeology.
   */
  image_source_url?: string | null;
  /**
   * Curated, human-written description of what the photograph actually shows.
   * Present on most rows, but deliberately optional.
   */
  image_alt?: string | null;
  /** Why this record has no image. Non-null implies `image_url` is null. */
  image_fallback_reason?: string | null;
}

export interface PublishedUpdatesPage {
  updates: DisciplineUpdateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: 'database' | 'fallback';
}

export interface UpcomingEventsResult {
  events: DisciplineUpdateRecord[];
  total: number;
  source: 'database' | 'fallback';
}

export interface IngestResult {
  inserted: number;
  updated: number;
  total: number;
}

export interface AgentRunResult {
  success: boolean;
  itemsFound: number;
  itemsInserted: number;
  itemsUpdated: number;
  durationMs: number;
  error?: string | null;
  updates: DanceUpdateInput[];
}

export interface LogAgentRunInput {
  status: 'success' | 'failure' | 'partial';
  items_found: number;
  items_inserted: number;
  error?: string | null;
  started_at: string;
  finished_at: string;
}
