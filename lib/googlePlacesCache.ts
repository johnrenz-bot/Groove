import type { GooglePlacesOutcome } from './googlePlaces';

export const NEARBY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const CITY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const TRANSIENT_FAILURE_CACHE_TTL_MS = 60 * 1000;
export const MAX_CACHE_ENTRIES = 250;

export interface CacheEntry {
  timestamp: number;
  ttl: number;
  outcome: GooglePlacesOutcome;
}

export const cache = new Map<string, CacheEntry>();
export const inFlight = new Map<string, Promise<GooglePlacesOutcome>>();

export function clearGooglePlacesCache(): void {
  cache.clear();
  inFlight.clear();
}

export function rememberOutcome(key: string, outcome: GooglePlacesOutcome, ttl: number): void {
  cache.set(key, { timestamp: Date.now(), ttl, outcome });
  if (cache.size <= MAX_CACHE_ENTRIES) return;

  // Map iteration is insertion ordered, so the first key is the oldest entry.
  const oldest = cache.keys().next().value;
  if (typeof oldest === 'string') cache.delete(oldest);
}
