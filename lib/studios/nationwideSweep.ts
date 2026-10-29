/**
 * Nationwide Google discovery is a regional sweep, not one enormous query.
 *
 * A single "dance studio" search with a Philippines-sized restriction returns a
 * relevance sample concentrated around Metro Manila, and the Text Search API
 * caps one query at 20 results per page. Instead the locator walks a stable,
 * geographically interleaved list of city anchors a few at a time. Each page is
 * a real batch of billable queries, and the UI labels it as such.
 *
 * The order deliberately alternates Luzon, Visayas, and Mindanao so the first
 * page is not another Metro Manila-only view.
 */

import { PHILIPPINE_CITIES, type PhilippineCity } from './philippineCities';

/** Cities per billed sweep page. Four keeps one request inside a normal API budget. */
export const NATIONWIDE_CITIES_PER_PAGE = 4;

/**
 * All anchors, interleaved by island group. Keep every id in sync with
 * `PHILIPPINE_CITIES`; the unit test asserts no missing or duplicate ids.
 */
export const NATIONWIDE_SWEEP_ORDER: readonly string[] = [
  'quezon-city',
  'bocaue',
  'cebu-city',
  'davao-city',
  'marilao',
  'baguio',
  'meycauayan',
  'iloilo-city',
  'santa-maria',
  'makati',
  'cagayan-de-oro',
  'malolos',
  'san-jose-del-monte',
  'manila',
  'bacolod',
  'general-santos',
  'angeles',
  'dagupan',
  'taguig',
  'tacloban',
  'zamboanga',
  'batangas-city',
  'pasig',
  'dumaguete',
  'butuan',
  'antipolo',
  'naga',
  'lapu-lapu',
  'vigan',
  'legazpi',
  'lucena',
  'olongapo',
  'laoag',
];

export interface NationwideSweepPage {
  /** Zero-based page index, clamped to the valid range. */
  page: number;
  totalPages: number;
  cities: PhilippineCity[];
  hasPrevious: boolean;
  hasNext: boolean;
}

function sweepCities(): PhilippineCity[] {
  const byId = new Map(PHILIPPINE_CITIES.map((city) => [city.id, city]));
  const ordered: PhilippineCity[] = [];
  for (const id of NATIONWIDE_SWEEP_ORDER) {
    const city = byId.get(id);
    if (city) {
      ordered.push(city);
      byId.delete(id);
    }
  }
  // Defensive: a newly added city must still be reachable.
  for (const city of byId.values()) ordered.push(city);
  return ordered;
}

export function getNationwideSweepPage(
  requestedPage: number,
  perPage: number = NATIONWIDE_CITIES_PER_PAGE
): NationwideSweepPage {
  const cities = sweepCities();
  const pageSize = Math.max(1, Math.floor(perPage));
  const totalPages = Math.max(1, Math.ceil(cities.length / pageSize));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(0, Math.floor(requestedPage)), totalPages - 1)
    : 0;
  const start = page * pageSize;
  const slice = cities.slice(start, start + pageSize);

  return {
    page,
    totalPages,
    cities: slice,
    hasPrevious: page > 0,
    hasNext: page < totalPages - 1,
  };
}
