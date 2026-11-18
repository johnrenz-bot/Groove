import {
  Drama,
  Mic,
  Sparkles,
  Theater,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * THE ONE DISCIPLINE LIST.
 *
 * Sidebar, showcase, directory filters and the quick-filter chips all read
 * from this single source, so the four disciplines and their icons can never
 * drift between surfaces. Icons are the same lucide glyphs the sidebar uses
 * (Dance = Sparkles, Singing = Mic, Acting = Drama, Theater = Theater).
 */
export interface DisciplineOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const DISCIPLINE_OPTIONS: readonly DisciplineOption[] = [
  { id: 'All', label: 'All Coaches', icon: Users },
  { id: 'Dance', label: 'Dance & Choreography', icon: Sparkles },
  { id: 'Singing', label: 'Singing & Vocal', icon: Mic },
  { id: 'Acting', label: 'Acting & Theater', icon: Drama },
  { id: 'Theater', label: 'Musical Theater', icon: Theater },
] as const;

export const DEFAULT_MAX_FEE = 3000;
export const MIN_FEE = 300;
export const MAX_FEE = 5000;

export const LOCATION_OPTIONS: readonly { id: string; label: string }[] = [
  { id: 'All', label: 'All Locations in Bulacan' },
  { id: 'San Jose del Monte', label: 'San Jose del Monte (Primary)' },
  { id: 'Tungkong Mangga', label: 'Tungkong Mangga' },
  { id: 'Muzon', label: 'Muzon' },
  { id: 'Kaypian', label: 'Kaypian' },
  { id: 'Graceville', label: 'Graceville' },
] as const;

export type DirectoryTab = 'coaches' | 'community';

export interface DirectoryFilterState {
  /** The immediate (un-debounced) search text. Sync target for the input. */
  queryInput: string;
  /** The debounced value used for filtering. */
  searchQuery: string;
  discipline: string;
  location: string;
  maxFee: number;
}
