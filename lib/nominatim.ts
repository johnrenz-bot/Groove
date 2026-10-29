/**
 * OpenStreetMap Nominatim geocoding client for Philippine addresses.
 *
 * Implements:
 * 1. Sequential request queue ensuring at least 1100ms between calls (respecting
 *    Nominatim's 1 req/sec usage policy).
 * 2. In-memory response caching to prevent duplicate lookups.
 * 3. Rate-limit (HTTP 429) cooldown handling without automated immediate retries.
 * 4. Strict country filtering (ph only) and Philippine bounding box validation.
 */

import { isWithinPhilippines } from '@/lib/geo';

export interface NominatimPlace {
  lat: number;
  lng: number;
  displayName: string;
}

export type NominatimOutcome =
  | { ok: true; place: NominatimPlace }
  | { ok: false; error: 'rate-limited' | 'not-found' | 'network-error' | 'out-of-country' };

const CACHE = new Map<string, NominatimPlace | null>();
const MIN_INTERVAL_MS = 1100;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown if 429 occurs

let lastRequestTimestamp = 0;
let rateLimitedUntil = 0;
let queuePromise: Promise<unknown> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isNominatimRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

export function clearNominatimCache(): void {
  CACHE.clear();
  rateLimitedUntil = 0;
}

export async function searchAddressWithNominatim(
  query: string
): Promise<NominatimOutcome> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: 'not-found' };
  }

  const cacheKey = trimmed.toLowerCase();
  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    return cached ? { ok: true, place: cached } : { ok: false, error: 'not-found' };
  }

  if (isNominatimRateLimited()) {
    return { ok: false, error: 'rate-limited' };
  }

  // Chain requests sequentially to satisfy Nominatim usage policy
  const execute = async (): Promise<NominatimOutcome> => {
    if (isNominatimRateLimited()) {
      return { ok: false, error: 'rate-limited' };
    }

    const elapsed = Date.now() - lastRequestTimestamp;
    if (elapsed < MIN_INTERVAL_MS) {
      await delay(MIN_INTERVAL_MS - elapsed);
    }

    lastRequestTimestamp = Date.now();

    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ph&limit=1&q=' +
        encodeURIComponent(trimmed);

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GroovePH-StudioLocator/1.0',
        },
      });

      if (res.status === 429) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        console.warn(
          '[nominatim] HTTP 429 received from Nominatim. Pausing geocoding for 60s.'
        );
        return { ok: false, error: 'rate-limited' };
      }

      if (!res.ok) {
        return { ok: false, error: 'network-error' };
      }

      const data = (await res.json().catch(() => null)) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
        address?: { country_code?: string };
      }> | null;

      const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!first || !first.lat || !first.lon) {
        CACHE.set(cacheKey, null);
        return { ok: false, error: 'not-found' };
      }

      const countryCode =
        typeof first.address?.country_code === 'string'
          ? first.address.country_code.toLowerCase()
          : 'ph';

      const lat = Number(first.lat);
      const lng = Number(first.lon);

      if (
        countryCode !== 'ph' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        !isWithinPhilippines(lat, lng)
      ) {
        CACHE.set(cacheKey, null);
        return { ok: false, error: 'out-of-country' };
      }

      const place: NominatimPlace = {
        lat,
        lng,
        displayName: first.display_name || trimmed,
      };

      CACHE.set(cacheKey, place);
      return { ok: true, place };
    } catch (error) {
      console.warn('[nominatim] Request failed:', error);
      return { ok: false, error: 'network-error' };
    }
  };

  const currentOp = queuePromise.then(execute, execute);
  queuePromise = currentOp;
  return currentOp;
}
