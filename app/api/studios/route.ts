import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_CENTER,
  PHILIPPINES_BOUNDS,
  boundsAround,
  boundsCenter,
  haversineKm,
  isWithinPhilippines,
  type GeoBounds,
  type LatLng,
} from '@/lib/geo';
import { CURATED_STUDIOS } from '@/lib/studios/curatedStudios';
import {
  discoverDanceStudios,
  discoverDanceStudiosInCities,
  searchDancePlacesByName,
  searchGooglePlacesAutocomplete,
  searchNearbyDancePlaces,
  type CitySweepOutcome,
  type GooglePlacesDiscoveryMethod,
  type GooglePlacesOutcome,
  type GooglePlacesStatus,
} from '@/lib/googlePlaces';
import {
  NATIONWIDE_CITY_QUERIES,
  NEARBY_DISCOVERY_QUERIES,
  NEARBY_MAX_PAGES_PER_QUERY,
  NEARBY_MAX_QUERIES,
  NEARBY_MAX_REQUESTS,
} from '@/lib/studios/discoveryQueries';
import { getNationwideSweepPage } from '@/lib/studios/nationwideSweep';
import { isDuplicatePlace, normalizePlaceName } from '@/lib/studios/dedupe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Studio discovery for the Google Maps locator.
 *
 * SCOPES
 *   nearby     Radius search around a selected Philippine centre. Nearby Search
 *              (New) is the primary method and exact circle membership is
 *              enforced server-side. Business-name queries use Text Search first
 *              and fall back to Autocomplete + Place Details.
 *   nationwide The GroovePH directory across the Philippines plus one page of
 *              a Google Places city sweep. Each page is four cities, so the
 *              response never implies that one query covered the country.
 *   geocode    City/address fallback used only when Nominatim cannot resolve a
 *              search. Never used for every keystroke.
 *
 * SOURCES
 *   1. `public.studios` — admin-managed GroovePH directory (primary/verified).
 *   2. `lib/studios/curatedStudios.ts` — reviewed fallback rows.
 *   3. Google Places API (New) — real businesses, discovery-only, cached.
 *
 * COVERAGE IS NOT COMPLETENESS
 *   Google Nearby Search returns at most 20 places per request; Text Search
 *   returns at most 20 per page. Nearby discovery is a single type-based radius
 *   query, with bounded category keyword searches as a supplement. Nationwide
 *   discovery rotates city anchors. Provider data still does not include every
 *   dance business, so the response is an honest directory plus a discovery
 *   sample, never a claim that every studio in the Philippines is indexed.
 *
 * QUOTA HONESTY
 *   When Google reports a quota or billing problem, its results are zero. The
 *   API returns that status and the directory rows separately; directory rows
 *   are never relabelled as Google results and no business is invented.
 */

export const dynamic = 'force-dynamic';

/**
 * A nationwide city sweep runs up to four Google requests at a bounded
 * concurrency. Thirty seconds leaves room for a slow provider while staying
 * inside a standard Vercel Node function limit.
 */
export const maxDuration = 30;

const DEFAULT_RADIUS_KM = 50;
const MAX_RADIUS_KM = 200;
/** Places Text Search accepts at most a 50 km circle / comparable rectangle. */
const GOOGLE_MAX_RADIUS_KM = 50;
const NATIONWIDE_CITY_RADIUS_KM = 20;
const MAX_RESULTS = 300;

/** Supabase pagination constants. */
const SUPABASE_PAGE_SIZE = 500;
const SUPABASE_MAX_ROWS = 5000;

export type StudioSource = 'curated' | 'supabase' | 'google';
export type StudioScope = 'nearby' | 'nationwide';

export interface NormalisedPlace {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  source: StudioSource;
  mapsUrl: string;
  distanceKm: number;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string | null;
  /** Raw Google Place ID, when the row came from Google. */
  placeId?: string | null;
  /** Places API (New) method that actually returned this Google row. */
  discoveryMethod?: GooglePlacesDiscoveryMethod;
}

type StudioRow = {
  id?: string | null;
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function normaliseRow(
  row: StudioRow,
  center: LatLng
): { place: NormalisedPlace | null; reason?: 'unnamed' | 'location' } {
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return { place: null, reason: 'unnamed' };

  const id = typeof row.id === 'string' && row.id ? row.id : null;
  if (!id) return { place: null, reason: 'location' };

  const latitude = typeof row.latitude === 'number' ? row.latitude : Number.NaN;
  const longitude = typeof row.longitude === 'number' ? row.longitude : Number.NaN;

  if (!isValidLatLng(latitude, longitude)) {
    return { place: null, reason: 'location' };
  }

  if (!isWithinPhilippines(latitude, longitude)) {
    return { place: null, reason: 'location' };
  }

  return {
    place: {
      id: `supabase/${id}`,
      name,
      address:
        typeof row.address === 'string' && row.address.trim()
          ? row.address.trim()
          : null,
      latitude,
      longitude,
      source: 'supabase',
      mapsUrl: googleMapsDirectionsUrl(latitude, longitude),
      distanceKm: haversineKm(center, { lat: latitude, lng: longitude }),
      placeId: null,
    },
  };
}

/** Read Supabase studios within the query bounds. */
async function loadSupabaseStudios(
  center: LatLng,
  bounds: GeoBounds
): Promise<{
  places: NormalisedPlace[];
  warning: string | null;
}> {
  const degraded = {
    places: [] as NormalisedPlace[],
    warning:
      'Verified Supabase studios could not be loaded, so curated listings are shown.',
  };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      return degraded;
    }
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const rows: StudioRow[] = [];

    for (let from = 0; from < SUPABASE_MAX_ROWS; from += SUPABASE_PAGE_SIZE) {
      const query = supabase
        .from('studios')
        .select('id,name,address,latitude,longitude')
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east)
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) {
        console.warn(
          '[studio-locator] public.studios could not be read:',
          error.message
        );
        return degraded;
      }

      const page = Array.isArray(data) ? (data as StudioRow[]) : [];
      rows.push(...page);
      if (page.length < SUPABASE_PAGE_SIZE) break;
    }

    const places: NormalisedPlace[] = [];
    for (const row of rows) {
      const result = normaliseRow(row, center);
      if (result.place) places.push(result.place);
    }

    return { places, warning: null };
  } catch (error) {
    console.warn('[studio-locator] Supabase studio lookup failed:', error);
    return degraded;
  }
}

function curatedPlaces(center: LatLng): NormalisedPlace[] {
  return CURATED_STUDIOS.map((studio) => ({
    id: `curated/${studio.id}`,
    name: studio.name,
    address: studio.address,
    latitude: studio.latitude,
    longitude: studio.longitude,
    source: 'curated' as const,
    mapsUrl: googleMapsDirectionsUrl(studio.latitude, studio.longitude),
    distanceKm: haversineKm(center, {
      lat: studio.latitude,
      lng: studio.longitude,
    }),
    placeId: null,
  }));
}

/** Parse a query parameter without treating a missing value as zero. */
function numberParam(raw: string | null): number {
  return raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
}

function integerParam(raw: string | null, fallback = 0): number {
  const value = numberParam(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function mergePlaces(
  directory: NormalisedPlace[],
  google: NormalisedPlace[],
  scope: StudioScope,
  radiusKm: number
): NormalisedPlace[] {
  const seenIds = new Set<string>();
  const accepted: NormalisedPlace[] = [];

  // Directory first: when the same business appears in both sources, the
  // reviewed GroovePH row wins and the Google duplicate is dropped. That keeps
  // the source labels truthful.
  for (const place of [...directory, ...google]) {
    if (seenIds.has(place.id)) continue;
    if (accepted.some((other) => isDuplicatePlace(other, place))) continue;

    if (
      !isWithinPhilippines(place.latitude, place.longitude) ||
      (scope === 'nearby' && place.distanceKm > radiusKm)
    ) {
      continue;
    }

    seenIds.add(place.id);
    accepted.push(place);
  }

  if (scope === 'nearby') {
    accepted.sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    accepted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return accepted;
}

function googlePlacesToNormalised(
  results: GooglePlacesOutcome['results'],
  center: LatLng
): NormalisedPlace[] {
  return results.map((place) => ({
    id: place.id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    source: 'google' as const,
    mapsUrl: place.mapsUrl,
    distanceKm: haversineKm(center, {
      lat: place.latitude,
      lng: place.longitude,
    }),
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    primaryType: place.primaryType,
    placeId: place.placeId,
    discoveryMethod: place.discoveryMethod,
  }));
}

/**
 * Filter GroovePH directory rows for a business-name search. This is a plain
 * local string match on names we already loaded — it never invents a studio and
 * never labels a directory row as a Google result.
 */
function matchesBusinessQuery(name: string, query: string): boolean {
  const target = normalizePlaceName(query);
  if (!target) return true;
  const candidate = normalizePlaceName(name);
  if (!candidate) return false;
  if (candidate.includes(target)) return true;
  const tokens = target.split(' ').filter((token) => token.length >= 3);
  return tokens.length > 0 && tokens.every((token) => candidate.includes(token));
}

function responseWarning(
  directoryWarning: string | null,
  googleStatus: GooglePlacesStatus,
  googleMessage: string | null
): string | null {
  const parts: string[] = [];
  if (directoryWarning) parts.push(directoryWarning);
  if (googleStatus !== 'ok' && googleMessage) parts.push(googleMessage);
  return parts.length > 0 ? parts.join(' ') : null;
}

function coverageMethodCopy(
  method: GooglePlacesDiscoveryMethod | undefined,
  what: string
): string {
  if (method === 'nearby') {
    return `using Google Places Nearby Search over dance-related business types ${what}`;
  }
  if (method === 'autocomplete') {
    return `using Google Places Autocomplete + Place Details ${what} because keyword search was unavailable`;
  }
  return `using dance-category Google Places Text Search ${what} with up to two result pages per category`;
}

function nearbyCoverage(
  radiusKm: number,
  googleRadiusKm: number,
  method: GooglePlacesDiscoveryMethod | undefined
): string {
  const base = `GroovePH directory results cover the full ${radiusKm} km radius. Google Places results cover the inner ${googleRadiusKm} km ${coverageMethodCopy(
    method,
    'around the search centre'
  )}. Coverage depends on Google's business data and is not a complete list of every studio in the area.`;
  return radiusKm > googleRadiusKm
    ? `${base} For studios farther away, browse the nationwide region pages or search that city directly.`
    : base;
}

function nationwideCoverage(
  page: number,
  totalPages: number,
  cities: string[],
  method: GooglePlacesDiscoveryMethod | undefined
): string {
  return `GroovePH directory entries are shown nationwide. Google Places results on this page come from ${
    cities.length
  } city search${cities.length === 1 ? '' : 'es'} (${cities.join(
    ', '
  )}) ${coverageMethodCopy(
    method,
    'around each city centre'
  )}. Region page ${page + 1} of ${totalPages}. Google caps Nearby Search at 20 results per request and Text Search at 20 per page, so this is a discovery sample, not a complete Philippine directory.`;
}

function methodLabel(method: GooglePlacesDiscoveryMethod | undefined): string {
  if (method === 'nearby') return 'Google Places Nearby Search';
  if (method === 'autocomplete') return 'Google Places Autocomplete + Place Details';
  if (method === 'text') return 'Google Places Text Search';
  return 'Google Places';
}

function businessQueryCoverage(
  query: string,
  scope: StudioScope,
  radiusKm: number,
  method: GooglePlacesDiscoveryMethod | undefined
): string {
  const where =
    scope === 'nationwide'
      ? 'across the Philippines'
      : `within ${radiusKm} km of the search centre`;
  return `Showing business-name matches for “${query}” ${where}. GroovePH directory rows are matched locally by name; Google rows come from ${methodLabel(
    method
  )}. Google coverage depends on available business data and is not a complete list.`;
}

async function handleGeocode(q: string, signal: AbortSignal) {
  // Autocomplete + Place Details has a separate quota metric from Text Search
  // and returns real city/address coordinates. It is the primary geocoder here
  // so a Text Search daily limit cannot break location search.
  const outcome = await searchGooglePlacesAutocomplete({
    textQuery: `${q}, Philippines`,
    maxDetails: 3,
    signal,
  });

  const first = outcome.results[0];
  if (!first) {
    if (outcome.status === 'quota') {
      return NextResponse.json(
        {
          error:
            'Location search is temporarily unavailable because the Google Places quota is exhausted. Pick a city from the list below, choose a centre on the map, or try again later.',
          googleStatus: outcome.status,
          googleRetryAt: outcome.retryAt ?? null,
        },
        { status: 503 }
      );
    }
    if (outcome.status !== 'ok') {
      return NextResponse.json(
        {
          error:
            outcome.message ??
            'Google Places could not resolve this location. Try another city or pick a centre on the map.',
          googleStatus: outcome.status,
          googleRetryAt: outcome.retryAt ?? null,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error:
          'No matching Philippine city, municipality, province, or address was found. Try a broader search.',
        googleStatus: outcome.status,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      center: { lat: first.latitude, lng: first.longitude },
      label: first.address ?? first.name,
      place: first,
      googleStatus: outcome.status,
      googleMessage: outcome.message,
      googleRetryAt: outcome.retryAt ?? null,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=300' },
    }
  );
}

const EMPTY_GOOGLE_OUTCOME: GooglePlacesOutcome = {
  results: [],
  status: 'ok',
  message: null,
  attemptedQueries: 0,
  succeededQueries: 0,
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scopeParam = params.get('scope');
  const scope: StudioScope = scopeParam === 'nationwide' ? 'nationwide' : 'nearby';

  if (scopeParam === 'geocode') {
    const q = params.get('q')?.trim() ?? '';
    if (!q) {
      return NextResponse.json(
        { error: 'Enter a Philippine city, municipality, province, or address.' },
        { status: 400 }
      );
    }
    return handleGeocode(q, request.signal);
  }

  const latParam = numberParam(params.get('lat'));
  const lngParam = numberParam(params.get('lng'));

  const requestedCenter: LatLng = isValidLatLng(latParam, lngParam)
    ? { lat: latParam, lng: lngParam }
    : DEFAULT_CENTER;

  const requestedRadius = numberParam(params.get('radius'));
  const effectiveRadiusKm =
    Number.isFinite(requestedRadius) && requestedRadius > 0
      ? Math.min(Math.max(requestedRadius, 1), MAX_RADIUS_KM)
      : DEFAULT_RADIUS_KM;

  if (scope === 'nearby' && !isWithinPhilippines(requestedCenter.lat, requestedCenter.lng)) {
    return NextResponse.json(
      {
        error:
          'Studio searches are limited to the Philippines. Pick a Philippine city, municipality, or province, or choose a centre on the map.',
      },
      { status: 400 }
    );
  }

  const center: LatLng =
    scope === 'nationwide' ? boundsCenter(PHILIPPINES_BOUNDS) : requestedCenter;
  const bounds =
    scope === 'nationwide'
      ? PHILIPPINES_BOUNDS
      : boundsAround(center, effectiveRadiusKm);

  const supabase = await loadSupabaseStudios(center, bounds);
  const curated = curatedPlaces(center);
  const sweep =
    scope === 'nationwide'
      ? getNationwideSweepPage(integerParam(params.get('page'), 0))
      : null;

  const discoveryEnabled = params.get('discovery') !== '0';
  const businessQuery = (params.get('q') ?? '').trim().slice(0, 120);
  const hasBusinessQuery = businessQuery.length > 0;
  let googleOutcome: GooglePlacesOutcome = EMPTY_GOOGLE_OUTCOME;
  let coveredCities: string[] = [];

  if (discoveryEnabled) {
    if (hasBusinessQuery) {
      /**
       * Explicit business-name search. Text Search handles keyword matching
       * best; when its quota is exhausted `searchDancePlacesByName` falls back
       * to Autocomplete + Place Details, which uses separate quota metrics.
       */
      googleOutcome = await searchDancePlacesByName({
        query: businessQuery,
        center: scope === 'nearby' ? center : null,
        radiusKm: scope === 'nearby' ? effectiveRadiusKm : null,
        bounds: scope === 'nationwide' ? PHILIPPINES_BOUNDS : undefined,
        signal: request.signal,
      });
    } else if (scope === 'nationwide' && sweep) {
      // Nearby Search is the primary nationwide sweep: it is a radius query
      // with its own quota metric, so an exhausted Text Search quota cannot
      // blank the map.
      const citySweep: CitySweepOutcome = await discoverDanceStudiosInCities({
        cities: sweep.cities,
        queries: NATIONWIDE_CITY_QUERIES,
        radiusKm: NATIONWIDE_CITY_RADIUS_KM,
        method: 'nearby',
        signal: request.signal,
      });
      googleOutcome = citySweep;
      coveredCities = citySweep.coveredCities;

      if (
        citySweep.results.length === 0 &&
        citySweep.status !== 'ok' &&
        citySweep.status !== 'partial'
      ) {
        const textSweep = await discoverDanceStudiosInCities({
          cities: sweep.cities,
          queries: NATIONWIDE_CITY_QUERIES,
          radiusKm: NATIONWIDE_CITY_RADIUS_KM,
          method: 'text',
          signal: request.signal,
        });
        if (textSweep.results.length > 0) {
          googleOutcome = {
            ...textSweep,
            status: 'partial',
            message: `Google Places Nearby Search was unavailable, so these city results come from Google Places Text Search. ${
              citySweep.message ?? ''
            }`.trim(),
            retryAt: citySweep.retryAt ?? textSweep.retryAt ?? null,
          };
          coveredCities = textSweep.coveredCities;
        }
      }
    } else {
      const googleRadiusKm = Math.min(effectiveRadiusKm, GOOGLE_MAX_RADIUS_KM);
      googleOutcome = await searchNearbyDancePlaces({
        center,
        radiusKm: googleRadiusKm,
        signal: request.signal,
      });

      // Nearby Search is type-based. If it is blocked or finds nothing, try the
      // category keyword searches as a supplement; a blocked Text Search quota
      // must not replace a legitimate empty Nearby result.
      if (googleOutcome.status !== 'ok' || googleOutcome.results.length === 0) {
        const fallback = await discoverDanceStudios({
          queries: NEARBY_DISCOVERY_QUERIES,
          maxQueries: NEARBY_MAX_QUERIES,
          maxPagesPerQuery: NEARBY_MAX_PAGES_PER_QUERY,
          maxRequests: NEARBY_MAX_REQUESTS,
          bounds: boundsAround(center, googleRadiusKm),
          center,
          radiusMeters: googleRadiusKm * 1000,
          rankPreference: 'DISTANCE',
          cacheTtlMs: 6 * 60 * 60 * 1000,
          signal: request.signal,
        });
        if (fallback.results.length > 0) {
          googleOutcome = {
            ...fallback,
            status: fallback.status === 'ok' ? 'partial' : fallback.status,
            message:
              googleOutcome.status === 'ok'
                ? 'Google Nearby Search found no dance businesses in this radius, so these additional matches come from Google Places keyword search. Coverage is a sample.'
                : `Google Nearby Search was unavailable, so these results come from Google Places keyword search. ${
                    googleOutcome.message ?? ''
                  }`.trim(),
            retryAt: googleOutcome.retryAt ?? fallback.retryAt ?? null,
          };
        }
      }
    }
  }

  const directoryRows = [...supabase.places, ...curated];
  const directory = hasBusinessQuery
    ? directoryRows.filter((place) => matchesBusinessQuery(place.name, businessQuery))
    : directoryRows;

  const google = googlePlacesToNormalised(googleOutcome.results, center);
  const merged = mergePlaces(directory, google, scope, effectiveRadiusKm);

  const places = merged.slice(0, MAX_RESULTS);
  const sources = Array.from(new Set(places.map((place) => place.source)));
  const directoryCount = places.filter((place) => place.source !== 'google').length;
  const googleCount = places.filter((place) => place.source === 'google').length;
  const googleRadiusKm =
    scope === 'nearby'
      ? Math.min(effectiveRadiusKm, GOOGLE_MAX_RADIUS_KM)
      : hasBusinessQuery
        ? null
        : NATIONWIDE_CITY_RADIUS_KM;

  return NextResponse.json(
    {
      places,
      center,
      scope,
      query: hasBusinessQuery ? businessQuery : null,
      radiusKm: effectiveRadiusKm,
      googleCoverageKm: googleRadiusKm,
      page: hasBusinessQuery ? null : (sweep?.page ?? null),
      totalPages: hasBusinessQuery ? null : (sweep?.totalPages ?? null),
      nextPage:
        hasBusinessQuery || !sweep?.hasNext ? null : sweep.page + 1,
      coverageCities: hasBusinessQuery
        ? []
        : (sweep?.cities.map((city) => city.name) ?? []),
      coveredCities,
      failedCities: sweep
        ? 'failedCities' in googleOutcome
          ? (googleOutcome as CitySweepOutcome).failedCities
          : []
        : [],
      sources,
      directoryCount,
      googleCount,
      googleStatus: googleOutcome.status,
      googleMethod: googleOutcome.method ?? null,
      googleMessage: googleOutcome.message,
      googleRetryAt: googleOutcome.retryAt ?? null,
      googleAttemptedQueries: googleOutcome.attemptedQueries ?? 0,
      googleSucceededQueries: googleOutcome.succeededQueries ?? 0,
      googlePagesFetched: googleOutcome.pagesFetched ?? 0,
      googleHasMore: googleOutcome.hasMore ?? false,
      googleDailyQuotaExhausted: googleOutcome.dailyQuotaExhausted ?? false,
      warning: responseWarning(
        supabase.warning,
        googleOutcome.status,
        googleOutcome.message
      ),
      attribution: 'Map data © Google. Business data may include Google Places results.',
      coverage: hasBusinessQuery
        ? businessQueryCoverage(
            businessQuery,
            scope,
            effectiveRadiusKm,
            googleOutcome.method
          )
        : scope === 'nationwide' && sweep
          ? nationwideCoverage(
              sweep.page,
              sweep.totalPages,
              sweep.cities.map((city) => city.name),
              googleOutcome.method
            )
          : nearbyCoverage(
              effectiveRadiusKm,
              googleRadiusKm ?? GOOGLE_MAX_RADIUS_KM,
              googleOutcome.method
            ),
      truncated: Math.max(0, merged.length - places.length),
    },
    {
      status: 200,
      headers: {
        // The locator clears its list on every centre/radius/style change. A
        // browser-cached response must not be able to repaint the old search.
        'Cache-Control': 'private, no-store',
        'X-Data-Source': sources.length ? sources.join('+') : 'empty',
      },
    }
  );
}
