/**
 * Cross-source place deduplication.
 *
 * Google returns the same business from several text queries, and the GroovePH
 * directory can describe the same business with a slightly different name or
 * coordinate. Deduping by id alone is not enough: a curated row has
 * `curated/…`, Supabase has `supabase/…`, and Google has `google/PLACE_ID`.
 *
 * The rules are deliberately conservative. Two rows are the same place when:
 *  - their identifiers match, or
 *  - their normalised names match (or one clearly contains the other) AND they
 *    are within 150 m of each other.
 *
 * A shared name 10 km apart is two branches, not a duplicate.
 */

import { haversineKm } from '@/lib/geo';

export interface PlaceIdentity {
  id?: string | null;
  placeId?: string | null;
  name: string;
  latitude: number;
  longitude: number;
}

/** Same-place radius when a name matches but identifiers do not. */
export const SAME_PLACE_KM = 0.15;

export function normalizePlaceName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(incorporated|inc|corp|corporation|company|co|ltd|llc)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sameBusinessName(a: string, b: string): boolean {
  const left = normalizePlaceName(a);
  const right = normalizePlaceName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  // "dojo" is too short to prove containment; "dojo dance studio" is not.
  return shorter.length >= 8 && longer.includes(shorter);
}

export function isDuplicatePlace(
  a: PlaceIdentity,
  b: PlaceIdentity,
  maxKm: number = SAME_PLACE_KM
): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;

  if (!sameBusinessName(a.name, b.name)) return false;

  const distance = haversineKm(
    { lat: a.latitude, lng: a.longitude },
    { lat: b.latitude, lng: b.longitude }
  );
  return distance <= maxKm;
}
