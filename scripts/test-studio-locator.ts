/**
 * Studio Locator verification tests.
 *
 * These tests do not spend Google quota. They exercise the pure request
 * builder, error classification, deduplication, city sweep, and discovery
 * cache against a mocked fetch. A live quota failure is diagnosed separately
 * with a single request; the suite is not allowed to depend on it.
 */

import {
  DEFAULT_CENTER,
  boundsAround,
  haversineKm,
  isWithinPhilippines,
  type LatLng,
} from '../lib/geo.ts';
import { CURATED_STUDIOS } from '../lib/studios/curatedStudios.ts';
import { PHILIPPINE_CITIES } from '../lib/studios/philippineCities.ts';
import {
  DANCE_DISCOVERY_QUERIES,
  NATIONWIDE_CITY_QUERIES,
  NEARBY_DISCOVERY_QUERIES,
} from '../lib/studios/discoveryQueries.ts';
import {
  isDuplicatePlace,
  normalizePlaceName,
  sameBusinessName,
} from '../lib/studios/dedupe.ts';
import {
  NATIONWIDE_SWEEP_ORDER,
  getNationwideSweepPage,
} from '../lib/studios/nationwideSweep.ts';
import {
  buildSearchRequestBody,
  clearGooglePlacesCache,
  discoverDanceStudios,
  discoverDanceStudiosInCities,
  getGooglePlacesQuotaState,
  getGooglePlacesQuotaStateFor,
  interpretGooglePlacesError,
  isDanceRelevantGooglePlace,
  isGooglePlacesQuotaExhausted,
  isGooglePlacesQuotaExhaustedFor,
  isQuotaExhaustionError,
  resetGooglePlacesQuotaCooldown,
  searchDancePlacesByName,
  searchNearbyDancePlaces,
  setGooglePlacesQuotaCooldown,
} from '../lib/googlePlaces.ts';
import {
  clearNominatimCache,
  isNominatimRateLimited,
  searchAddressWithNominatim,
} from '../lib/nominatim.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`PASS  ${message}`);
    passedCount++;
  } else {
    console.error(`FAIL  ${message}`);
    failedCount++;
  }
}

// Mirror of StudioLocator's isUsablePlace
function isUsablePlace(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;

  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return false;

  const { latitude, longitude } = row;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (!isWithinPhilippines(latitude, longitude)) return false;
  if (typeof row.id !== 'string' || !row.id) return false;
  if (typeof row.mapsUrl !== 'string' || !row.mapsUrl) return false;
  if (
    row.source !== 'curated' &&
    row.source !== 'supabase' &&
    row.source !== 'google'
  )
    return false;

  return true;
}

const REAL_FETCH = globalThis.fetch;
const TEST_KEY_ENV = 'GOOGLE_PLACES_API_KEY';
const previousTestKey = process.env[TEST_KEY_ENV];
process.env[TEST_KEY_ENV] = 'unit-test-key';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(
  handler: (url: string, init: RequestInit) => Promise<Response>
): void {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof fetch;
}

function requestBodyOf(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string') return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function googlePlace(
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  extra: Record<string, unknown> = {}
) {
  return {
    id,
    displayName: { text: name },
    formattedAddress: `${name}, Philippines`,
    location: { latitude, longitude },
    googleMapsUri: `https://www.google.com/maps/place/${id}`,
    primaryType: 'dance_school',
    businessStatus: 'OPERATIONAL',
    ...extra,
  };
}

async function runTests() {
  console.log('--- TEST SUITE: Studio Locator Repair Verification ---\n');

  // 1. Valid API records reach the UI
  console.log('Checking valid records reaching UI...');
  assert(CURATED_STUDIOS.length > 0, 'Curated studios dataset is not empty');
  for (const studio of CURATED_STUDIOS) {
    const normalised = {
      id: `curated/${studio.id}`,
      name: studio.name,
      address: studio.address,
      latitude: studio.latitude,
      longitude: studio.longitude,
      source: 'curated',
      mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`,
      distanceKm: haversineKm(DEFAULT_CENTER, {
        lat: studio.latitude,
        lng: studio.longitude,
      }),
    };
    assert(
      isUsablePlace(normalised),
      `Curated studio "${studio.name}" passes isUsablePlace validation`
    );
  }

  const verifiedBulacanIds = [
    'curated-anima-dance-studio',
    'curated-stc-performing-arts-center',
    'curated-cuts-curves-movements',
    'curated-kidlat-dance-studio',
  ];
  for (const id of verifiedBulacanIds) {
    const row = CURATED_STUDIOS.find((studio) => studio.id === id);
    assert(Boolean(row), `Verified studio row "${id}" exists`);
    if (!row) continue;
    assert(
      Boolean(row.address) && isWithinPhilippines(row.latitude, row.longitude),
      `Verified studio row "${id}" has an address and Philippine coordinates`
    );
  }
  assert(
    CURATED_STUDIOS.every((studio) => isWithinPhilippines(studio.latitude, studio.longitude)),
    'Every curated studio coordinate is inside the Philippines'
  );

  // 2. Radius filtering works
  console.log('\nChecking radius filtering...');
  const center: LatLng = DEFAULT_CENTER; // SJDM Poblacion (14.8139, 121.0453)
  const distances = CURATED_STUDIOS.map((s) => ({
    name: s.name,
    dist: haversineKm(center, { lat: s.latitude, lng: s.longitude }),
  })).sort((a, b) => a.dist - b.dist);

  const within10Km = distances.filter((s) => s.dist <= 10);
  const within25Km = distances.filter((s) => s.dist <= 25);
  const within1Km = distances.filter((s) => s.dist <= 1);

  assert(within10Km.length > 0, 'At 10km radius from default center, studios are found');
  assert(
    within25Km.length === CURATED_STUDIOS.length,
    'At 25km radius from default center, all curated studios are included'
  );
  assert(
    within1Km.length <= within10Km.length,
    'Radius filtering strictly restricts by distance'
  );
  assert(Math.abs(haversineKm(center, center)) < 1e-9, 'Haversine distance from point to itself is 0');

  // 3. Automatic discovery vocabulary
  console.log('\nChecking automatic discovery vocabulary...');
  const discoveryTerms = [
    'dance studio',
    'dance school',
    'dance academy',
    'ballet',
    'hip hop',
    'k-pop',
    'ballroom',
    'performing arts',
  ];
  for (const term of discoveryTerms) {
    assert(
      DANCE_DISCOVERY_QUERIES.some((query) => query.toLowerCase().includes(term)),
      `Automatic discovery includes a "${term}" query`
    );
  }
  assert(
    NEARBY_DISCOVERY_QUERIES.length === 6 &&
      NATIONWIDE_CITY_QUERIES.length === DANCE_DISCOVERY_QUERIES.length,
    'Nearby searches use six categories while the city sweep rotates all categories'
  );
  assert(
    new Set(DANCE_DISCOVERY_QUERIES).size === DANCE_DISCOVERY_QUERIES.length,
    'Discovery query vocabulary contains no duplicates'
  );

  // 4. Deduplication across sources
  console.log('\nChecking deduplication...');
  assert(
    normalizePlaceName('Dojo  Dance Studio!') === normalizePlaceName('DOJO DANCE STUDIO'),
    'Place-name normalisation ignores case, punctuation, and extra spaces'
  );
  assert(
    sameBusinessName('Dojo Dance Studio', 'Dojo Dance Studio SJDM Branch'),
    'A branch suffix does not create a second business at the same point'
  );
  assert(
    !sameBusinessName('Dojo Dance Studio', 'ESR Dance Studio'),
    'Different studio names are not merged'
  );
  const dojo = {
    id: 'curated/dojo',
    name: 'Dojo Dance Studio',
    latitude: 14.7912125,
    longitude: 121.0744362,
  };
  const dojoGoogle = {
    id: 'google/abc',
    placeId: 'abc',
    name: 'Dojo Dance Studio',
    latitude: 14.7913,
    longitude: 121.0745,
  };
  assert(isDuplicatePlace(dojo, dojoGoogle), 'Same name within 150 m is a duplicate');
  assert(
    !isDuplicatePlace(dojo, { ...dojoGoogle, latitude: 14.85, longitude: 121.0745 }),
    'Same name kilometres apart is treated as a branch, not a duplicate'
  );
  assert(
    isDuplicatePlace(
      { ...dojo, id: 'google/a', placeId: 'a' },
      { ...dojo, id: 'google/b', placeId: 'a', latitude: 15.1 },
      0.15
    ),
    'A shared Google Place ID is always a duplicate'
  );

  // 5. Nationwide sweep coverage
  console.log('\nChecking nationwide region sweep...');
  assert(PHILIPPINE_CITIES.length >= 20, 'Nationwide city anchor list covers at least 20 cities');
  assert(
    new Set(PHILIPPINE_CITIES.map((city) => city.id)).size === PHILIPPINE_CITIES.length,
    'City anchor ids are unique'
  );
  assert(
    NATIONWIDE_SWEEP_ORDER.length === PHILIPPINE_CITIES.length &&
      new Set(NATIONWIDE_SWEEP_ORDER).size === NATIONWIDE_SWEEP_ORDER.length,
    'Sweep order includes every city exactly once'
  );
  const allSweepIds = new Set<string>();
  let sweepPages = 0;
  for (let page = 0; page < 20; page += 1) {
    const result = getNationwideSweepPage(page);
    if (page === 0) sweepPages = result.totalPages;
    if (page >= result.totalPages) break;
    for (const city of result.cities) allSweepIds.add(city.id);
  }
  assert(
    allSweepIds.size === PHILIPPINE_CITIES.length,
    'Iterating every sweep page visits every city anchor without gaps'
  );
  assert(
    getNationwideSweepPage(0).cities.length === 4 && sweepPages >= 7,
    'Each page covers four cities and the country needs at least seven pages'
  );
  const firstSweep = getNationwideSweepPage(0);
  assert(
    firstSweep.cities.some((city) => city.name === 'Quezon City') &&
      firstSweep.cities.some((city) => city.name === 'Cebu City') &&
      firstSweep.cities.some((city) => city.name === 'Davao City'),
    'First sweep page is geographically interleaved, not Metro Manila only'
  );
  const bulacanAnchorIds = ['bocaue', 'marilao', 'meycauayan', 'santa-maria', 'malolos'];
  assert(
    bulacanAnchorIds.every((id) => PHILIPPINE_CITIES.some((city) => city.id === id)),
    'Bulacan municipality anchors are available for direct searches'
  );
  const firstThreeSweepCities = [0, 1, 2].flatMap((page) =>
    getNationwideSweepPage(page).cities.map((city) => city.id)
  );
  assert(
    bulacanAnchorIds.every((id) => firstThreeSweepCities.includes(id)),
    'The first sweep pages prioritise Bocaue, Marilao, Meycauayan, Santa Maria, and Malolos'
  );
  assert(
    getNationwideSweepPage(999).page === getNationwideSweepPage(0).totalPages - 1,
    'An out-of-range page clamps to the last region page'
  );

  // 6. Request body construction
  console.log('\nChecking Google Text Search request construction...');
  const nearbyBody = buildSearchRequestBody({
    textQuery: 'dance studio',
    center,
    radiusMeters: 10_000,
  });
  assert(Boolean(nearbyBody), 'A nearby search produces a request body');
  const body = nearbyBody as Record<string, unknown>;
  assert(body.regionCode === 'PH', 'Search is restricted to the Philippines region code');
  assert(body.pageSize === 20, 'Request uses pageSize (not deprecated maxResultCount)');
  assert(!('maxResultCount' in body), 'Request does not send deprecated maxResultCount');
  assert(
    Boolean((body.locationRestriction as { rectangle?: unknown } | undefined)?.rectangle),
    'Nearby search uses a rectangle locationRestriction'
  );
  const rectangle = (
    body.locationRestriction as {
      rectangle: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } };
    }
  ).rectangle;
  assert(
    rectangle.low.latitude >= 4.2 &&
      rectangle.high.latitude <= 21.5 &&
      rectangle.low.longitude >= 114 &&
      rectangle.high.longitude <= 127,
    'Every search rectangle is clamped to Philippine bounds'
  );
  assert(
    Boolean(
      (buildSearchRequestBody({
        textQuery: 'Cebu City, Philippines',
        bounds: {
          north: 21.5,
          south: 4.2,
          east: 127,
          west: 114,
        },
        mode: 'bias',
      })?.locationBias as { rectangle?: unknown } | undefined)?.rectangle
    ),
    'Geocoding uses locationBias rather than a categorical restriction'
  );
  assert(
    buildSearchRequestBody({ textQuery: '   ' }) === null,
    'An empty query never spends a Google request'
  );
  assert(
    boundsAround(center, 10).north > center.lat &&
      boundsAround(center, 10).south < center.lat,
    'Radius bounds enclose the centre'
  );

  // 7. Error classification
  console.log('\nChecking Google error classification...');
  const dailyError = {
    error: {
      code: 429,
      message:
        "Quota exceeded for quota metric 'SearchTextRequest' and limit 'SearchTextRequest per day' of service 'places.googleapis.com'.",
      status: 'RESOURCE_EXHAUSTED',
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          reason: 'RATE_LIMIT_EXCEEDED',
          metadata: {
            window_start_time: '1793170800',
            quota_limit_value: '100',
            quota_limit: 'SearchTextRequestPerDayPerProject',
          },
        },
      ],
    },
  };
  const daily = interpretGooglePlacesError(429, dailyError);
  assert(daily.status === 'quota' && daily.dailyQuota, 'Per-day 429 is classified as a daily quota block');
  assert(
    daily.retryAt !== null &&
      new Date(daily.retryAt).getTime() === 1793170800 * 1000 + 24 * 60 * 60 * 1000,
    'Daily quota reset is read from Google’s window_start_time'
  );
  assert(/100 requests\/day/.test(daily.message), 'Daily quota message states the project limit');

  const minuteError = {
    error: {
      code: 429,
      message: "Quota exceeded for quota metric 'SearchTextRequest per minute'.",
      status: 'RESOURCE_EXHAUSTED',
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '30s',
        },
      ],
    },
  };
  const minute = interpretGooglePlacesError(429, minuteError);
  assert(minute.status === 'quota' && !minute.dailyQuota, 'Per-minute 429 is not treated as a daily block');
  assert(
    minute.retryAt !== null &&
      Math.abs(new Date(minute.retryAt).getTime() - (Date.now() + 30_000)) < 5_000,
    'Per-minute retry delay is honoured'
  );

  const disabled = interpretGooglePlacesError(403, {
    error: {
      code: 403,
      message: 'Places API (New) has not been used in project 123 before or it is disabled.',
      status: 'PERMISSION_DENIED',
      details: [{ reason: 'SERVICE_DISABLED' }],
    },
  });
  assert(
    disabled.status === 'configuration' && /not enabled/i.test(disabled.message),
    'A disabled Places API is reported as a configuration problem'
  );

  const billing = interpretGooglePlacesError(403, {
    error: {
      code: 403,
      message: 'This API project is not authorized because billing is disabled.',
      status: 'PERMISSION_DENIED',
    },
  });
  assert(
    billing.status === 'configuration' && /billing/i.test(billing.message),
    'A billing failure explains the required Google Cloud change'
  );

  const invalid = interpretGooglePlacesError(400, {
    error: { code: 400, message: 'Invalid rectangle.', status: 'INVALID_ARGUMENT' },
  });
  assert(invalid.status === 'unavailable', 'A rejected request is not reported as successful');

  assert(
    isQuotaExhaustionError(new Error('RESOURCE_EXHAUSTED: Quota exceeded')) &&
      isQuotaExhaustionError(new Error('429 Too Many Requests')) &&
      !isQuotaExhaustionError(new Error('Network timed out')),
    'Legacy quota-error helper still distinguishes quota from unrelated failures'
  );

  // 8. Mocked discovery: parsing, PH filtering, dedupe, caching
  console.log('\nChecking mocked Google discovery...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  let fetchCalls = 0;
  mockFetch(async (_url, init) => {
    fetchCalls += 1;
    const query = String(requestBodyOf(init).textQuery ?? '');
    if (query === 'dance studio') {
      return jsonResponse({
        places: [
          googlePlace('p1', 'Manila Dance Studio', 14.5995, 120.9842, {
            rating: 4.7,
            userRatingCount: 120,
          }),
          googlePlace('p1', 'Manila Dance Studio duplicate', 14.5995, 120.9842),
          googlePlace('p2', 'Cebu Ballet Academy', 10.3157, 123.8854),
          googlePlace('p3', 'Tokyo Dance Hub', 35.6762, 139.6503),
        ],
      });
    }
    return jsonResponse({
      places: [googlePlace('p4', 'Davao Dance School', 7.1907, 125.4553)],
    });
  });

  const discovered = await discoverDanceStudios({
    queries: ['dance studio'],
    maxQueries: 1,
    bounds: boundsAround(center, 50),
  });
  assert(discovered.status === 'ok' && discovered.results.length === 2, 'Duplicate Place IDs are collapsed');
  assert(
    discovered.results.every((place) => isWithinPhilippines(place.latitude, place.longitude)),
    'Out-of-country Google results are rejected'
  );
  assert(
    discovered.results.some((place) => place.rating === 4.7),
    'Rating and review fields survive normalisation'
  );
  assert(fetchCalls === 1, 'One bounded query costs one Google request');

  const cached = await discoverDanceStudios({
    queries: ['dance studio'],
    maxQueries: 1,
    bounds: boundsAround(center, 50),
  });
  assert(
    cached.results.length === 2 && fetchCalls === 1,
    'An identical search is served from cache without another Google request'
  );

  // 8b. nextPageToken pagination, aggregation, and the request cap
  console.log('\nChecking Google Text Search pagination...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  const requestedTokens: Array<string | undefined> = [];
  mockFetch(async (_url, init) => {
    fetchCalls += 1;
    const requestBody = requestBodyOf(init);
    const token =
      typeof requestBody.pageToken === 'string' ? requestBody.pageToken : undefined;
    requestedTokens.push(token);

    if (!token) {
      return jsonResponse({
        places: [
          googlePlace('page-1', 'Marilao Dance Studio', 14.7576, 120.9485),
        ],
        nextPageToken: 'page-2-token',
      });
    }

    return jsonResponse({
      places: [
        googlePlace('page-2', 'Bocaue Dance Academy', 14.7954, 120.9254),
      ],
      nextPageToken: 'page-3-token',
    });
  });

  const paged = await discoverDanceStudios({
    queries: ['dance studio'],
    maxQueries: 1,
    maxPagesPerQuery: 2,
    maxRequests: 2,
    bounds: boundsAround({ lat: 14.78, lng: 120.94 }, 12),
  });
  assert(
    paged.status === 'ok' && paged.results.length === 2,
    'Two result pages are merged without dropping either place'
  );
  assert(
    fetchCalls === 2 && requestedTokens[1] === 'page-2-token',
    'The second request sends Google’s nextPageToken with the same query'
  );
  assert(
    paged.pagesFetched === 2 && paged.hasMore === true,
    'Page metadata reports two fetched pages and an unspent third page'
  );

  const pagedCached = await discoverDanceStudios({
    queries: ['dance studio'],
    maxQueries: 1,
    maxPagesPerQuery: 2,
    maxRequests: 2,
    bounds: boundsAround({ lat: 14.78, lng: 120.94 }, 12),
  });
  assert(
    pagedCached.results.length === 2 && fetchCalls === 2,
    'Every page of a paginated search is cached, not just the first page'
  );

  clearGooglePlacesCache();
  fetchCalls = 0;
  mockFetch(async () => {
    fetchCalls += 1;
    const index = fetchCalls;
    return jsonResponse({
      places: [
        googlePlace(
          `cap-${index}`,
          `Capped Studio ${index}`,
          14.7 + index * 0.01,
          120.9 + index * 0.01
        ),
      ],
      nextPageToken: `more-${index}`,
    });
  });
  const capped = await discoverDanceStudios({
    queries: ['dance studio', 'dance school', 'dance academy'],
    maxQueries: 3,
    maxPagesPerQuery: 2,
    maxRequests: 3,
    bounds: boundsAround({ lat: 14.75, lng: 120.95 }, 12),
  });
  assert(
    fetchCalls === 3 && capped.attemptedQueries === 3,
    'maxRequests is a hard cap even when every query has another page'
  );
  assert(
    capped.results.length === 3 && capped.hasMore === true,
    'A capped paginated search keeps its results and reports that more pages exist'
  );

  clearGooglePlacesCache();
  fetchCalls = 0;
  const sweepQueries: string[] = [];
  mockFetch(async (_url, init) => {
    fetchCalls += 1;
    const requestBody = requestBodyOf(init);
    sweepQueries.push(String(requestBody.textQuery ?? ''));
    return jsonResponse({
      places: [
        googlePlace(
          `sweep-${fetchCalls}`,
          `Sweep Studio ${fetchCalls}`,
          14.75 + fetchCalls * 0.005,
          120.94 + fetchCalls * 0.005
        ),
      ],
    });
  });
  const citySweep = await discoverDanceStudiosInCities({
    cities: [
      { name: 'Marilao', latitude: 14.7576, longitude: 120.9485 },
      { name: 'Bocaue', latitude: 14.7954, longitude: 120.9254 },
    ],
    queries: ['dance studio', 'ballet studio'],
    radiusKm: 10,
  });
  assert(
    sweepQueries[0]?.includes('dance studio in Marilao') &&
      sweepQueries[1]?.includes('ballet studio in Bocaue'),
    'The city sweep rotates category queries instead of repeating one term'
  );
  assert(
    citySweep.results.length === 2 && citySweep.coveredCities.length === 2,
    'The city sweep aggregates both rotated searches and reports covered cities'
  );

  // 9. Quota breaker
  console.log('\nChecking quota circuit breaker...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  mockFetch(async () => jsonResponse(dailyError, 429));

  const quotaOutcome = await discoverDanceStudios({
    queries: ['dance studio', 'dance school'],
    maxQueries: 2,
    bounds: boundsAround({ lat: 14.676, lng: 121.0437 }, 10),
  });
  assert(
    quotaOutcome.status === 'quota' &&
      quotaOutcome.dailyQuotaExhausted === true &&
      quotaOutcome.results.length === 0,
    'A daily 429 returns a truthful quota outcome with zero Google results'
  );
  assert(isGooglePlacesQuotaExhausted(), 'The quota breaker opens after a daily 429');
  assert(
    getGooglePlacesQuotaState().retryAt !== null,
    'The breaker carries the reset timestamp for the UI'
  );

  const callsBeforeBlockedSearch = fetchCalls;
  const blocked = await discoverDanceStudios({
    queries: ['ballroom dance studio'],
    maxQueries: 1,
    bounds: boundsAround({ lat: 10.3157, lng: 123.8854 }, 10),
  });
  assert(
    blocked.status === 'quota' && fetchCalls === callsBeforeBlockedSearch,
    'A new search is not sent to Google while the quota breaker is open'
  );

  // 10. Partial failure handling
  console.log('\nChecking partial Google failure handling...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  setGooglePlacesQuotaCooldown(60_000);
  fetchCalls = 0;
  mockFetch(async (_url, init) => {
    fetchCalls += 1;
    const query = String(requestBodyOf(init).textQuery ?? '');
    if (query === 'dance studio') {
      return jsonResponse({ places: [googlePlace('partial-1', 'Pasig Dance Studio', 14.5764, 121.0851)] });
    }
    return jsonResponse(
      {
        error: {
          code: 429,
          message: 'Quota exceeded for quota metric SearchTextRequest per minute.',
          status: 'RESOURCE_EXHAUSTED',
          details: [{ retryDelay: '30s' }],
        },
      },
      429
    );
  });
  const partial = await discoverDanceStudios({
    queries: ['dance studio', 'dance school'],
    maxQueries: 2,
    bounds: boundsAround({ lat: 14.5764, lng: 121.0851 }, 10),
  });
  assert(
    partial.status === 'partial' && partial.results.length === 1,
    'A partial failure keeps successful Google results and reports partial coverage'
  );
  assert(
    (partial.message ?? '').includes('incomplete'),
    'Partial results carry an explicit coverage warning'
  );
  assert(fetchCalls === 2, 'A two-query partial search stops at two requests');

  // 10b. Nearby Search: request shape, dance relevance, radius clamp
  console.log('\nChecking Google Nearby Search discovery...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  let nearbyRequestBody: Record<string, unknown> = {};
  mockFetch(async (url, init) => {
    fetchCalls += 1;
    assert(url.endsWith('places:searchNearby'), 'Nearby discovery uses the searchNearby endpoint');
    nearbyRequestBody = requestBodyOf(init);
    return jsonResponse({
      places: [
        googlePlace('near-1', 'Indakan Dance Studio', 14.65, 121.05),
        googlePlace('near-2', 'a& Dance Studio', 14.655, 121.055),
        googlePlace('near-3', 'Quezon City Tattoo Parlour', 14.66, 121.06, {
          primaryType: 'tattoo_shop',
        }),
        googlePlace('near-4', 'Corner Cafe', 14.665, 121.065, {
          primaryType: 'cafe',
        }),
        googlePlace('near-5', 'Tokyo Dance Hub', 35.6762, 139.6503),
      ],
    });
  });

  const nearbyOutcome = await searchNearbyDancePlaces({
    center: { lat: 14.65, lng: 121.05 },
    radiusKm: 10,
  });
  const nearbyRestriction = nearbyRequestBody.locationRestriction as
    | { circle?: { radius?: number; center?: { latitude?: number } } }
    | undefined;
  assert(
    nearbyRestriction?.circle?.radius === 10_000,
    'Nearby Search sends the selected radius as a circle in metres'
  );
  assert(
    Array.isArray(nearbyRequestBody.includedTypes) &&
      (nearbyRequestBody.includedTypes as string[]).includes('dance_hall'),
    'Nearby Search requests the dance_hall type'
  );
  assert(
    nearbyRequestBody.regionCode === 'PH',
    'Nearby Search is restricted to the Philippine region code'
  );
  assert(
    nearbyOutcome.status === 'ok' && nearbyOutcome.method === 'nearby',
    'A Nearby Search success is labelled with its real method'
  );
  assert(
    nearbyOutcome.results.length === 2 &&
      nearbyOutcome.results.every((place) => place.discoveryMethod === 'nearby'),
    'Non-dance types and out-of-country places are removed from Nearby results'
  );
  assert(
    isDanceRelevantGooglePlace({ name: 'Kids Ballet Academy', primaryType: 'academy' }) &&
      isDanceRelevantGooglePlace({
        name: 'Movement Space',
        primaryType: 'association_or_organization',
      }) &&
      !isDanceRelevantGooglePlace({ name: 'Sunrise Cafe', primaryType: 'cafe' }) &&
      !isDanceRelevantGooglePlace({
        name: 'Random Hall',
        primaryType: 'performing_arts_theater',
      }),
    'Dance-relevance filter keeps dance names and rejects unrelated businesses'
  );

  clearGooglePlacesCache();
  fetchCalls = 0;
  await searchNearbyDancePlaces({
    center: { lat: 14.65, lng: 121.05 },
    radiusKm: 80,
  });
  const clampedRadius = (
    nearbyRequestBody.locationRestriction as { circle?: { radius?: number } } | undefined
  )?.circle?.radius;
  assert(clampedRadius === 50_000, 'A radius above Google’s 50 km cap is clamped, not sent as-is');

  // 10c. Per-method quota isolation
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  mockFetch(async (url) => {
    fetchCalls += 1;
    if (url.endsWith('places:searchText')) return jsonResponse(dailyError, 429);
    return jsonResponse({ places: [] });
  });
  await discoverDanceStudios({
    queries: ['dance studio'],
    maxQueries: 1,
    bounds: boundsAround(center, 10),
  });
  assert(
    isGooglePlacesQuotaExhaustedFor('text') && !isGooglePlacesQuotaExhaustedFor('nearby'),
    'A Text Search daily block leaves Nearby Search available'
  );
  assert(
    getGooglePlacesQuotaStateFor('nearby').exhausted === false,
    'The Nearby Search breaker stays closed after a Text Search 429'
  );

  // 10d. Business-name search: Text Search first, Autocomplete fallback
  console.log('\nChecking business-name search fallback...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  const nameCalls: string[] = [];
  mockFetch(async (url) => {
    fetchCalls += 1;
    nameCalls.push(url);
    if (url.endsWith('places:searchText')) return jsonResponse(dailyError, 429);
    if (url.endsWith('places:autocomplete')) {
      return jsonResponse({
        suggestions: [
          {
            placePrediction: {
              placeId: 'ac-kidlat',
              structuredFormat: {
                mainText: { text: 'Kidlat Dance Studio' },
                secondaryText: { text: 'Quezon City, Philippines' },
              },
              types: ['dance_school'],
            },
          },
          {
            placePrediction: {
              placeId: 'ac-tokyo',
              structuredFormat: {
                mainText: { text: 'Tokyo Dance Hub' },
                secondaryText: { text: 'Tokyo, Japan' },
              },
              types: ['dance_school'],
            },
          },
        ],
      });
    }
    if (url.includes('/v1/places/ac-kidlat')) {
      return jsonResponse(googlePlace('ac-kidlat', 'Kidlat Dance Studio', 14.676, 121.0437));
    }
    if (url.includes('/v1/places/ac-tokyo')) {
      return jsonResponse(googlePlace('ac-tokyo', 'Tokyo Dance Hub', 35.6762, 139.6503));
    }
    return jsonResponse({ error: { code: 404, message: 'unexpected URL' } }, 404);
  });

  const nameOutcome = await searchDancePlacesByName({
    query: 'Kidlat Dance Studio',
    center: { lat: 14.676, lng: 121.0437 },
    radiusKm: 10,
  });
  assert(
    nameOutcome.results.length === 1 &&
      nameOutcome.results[0].name === 'Kidlat Dance Studio',
    'Name search returns the real business from Autocomplete + Place Details'
  );
  assert(
    nameOutcome.results[0].discoveryMethod === 'autocomplete' &&
      nameOutcome.method === 'autocomplete',
    'Fallback results are labelled with the method that actually produced them'
  );
  assert(
    nameOutcome.status === 'partial' && /Autocomplete/i.test(nameOutcome.message ?? ''),
    'A Text Search block is reported as partial coverage, not as zero results'
  );
  assert(
    nameCalls.some((url) => url.endsWith('places:searchText')) &&
      nameCalls.some((url) => url.endsWith('places:autocomplete')) &&
      nameCalls.some((url) => url.includes('/v1/places/ac-kidlat')),
    'Fallback makes three real calls: Text Search, Autocomplete, Place Details'
  );
  assert(
    !nameOutcome.results.some((place) => place.name === 'Tokyo Dance Hub'),
    'Place Details results outside the selected radius are dropped'
  );

  // 10e. Nearby-based city sweep
  console.log('\nChecking Nearby-based city sweep...');
  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  fetchCalls = 0;
  mockFetch(async (url) => {
    fetchCalls += 1;
    assert(url.endsWith('places:searchNearby'), 'City sweep uses Nearby Search in nearby mode');
    return jsonResponse({
      places: [
        googlePlace(
          `city-nearby-${fetchCalls}`,
          `City Nearby Dance Studio ${fetchCalls}`,
          14.75 + fetchCalls * 0.005,
          120.94 + fetchCalls * 0.005
        ),
      ],
    });
  });
  const nearbyCitySweep = await discoverDanceStudiosInCities({
    cities: [
      { name: 'Marilao', latitude: 14.7576, longitude: 120.9485 },
      { name: 'Bocaue', latitude: 14.7954, longitude: 120.9254 },
    ],
    radiusKm: 10,
    method: 'nearby',
  });
  assert(
    nearbyCitySweep.results.length === 2 &&
      nearbyCitySweep.coveredCities.length === 2 &&
      nearbyCitySweep.method === 'nearby',
    'The city sweep aggregates one Nearby Search per city and labels the method'
  );

  resetGooglePlacesQuotaCooldown();
  clearGooglePlacesCache();
  globalThis.fetch = REAL_FETCH;
  if (previousTestKey === undefined) delete process.env[TEST_KEY_ENV];
  else process.env[TEST_KEY_ENV] = previousTestKey;

  // 11. Out-of-country rejection
  console.log('\nChecking out-of-country rejection...');
  assert(!isWithinPhilippines(35.6762, 139.6503), 'Rejects Tokyo coordinates');
  assert(!isWithinPhilippines(1.3521, 103.8198), 'Rejects Singapore coordinates');
  assert(!isWithinPhilippines(51.5074, -0.1278), 'Rejects London coordinates');
  assert(isWithinPhilippines(14.8139, 121.0453), 'Accepts Bulacan coordinates');
  assert(isWithinPhilippines(10.3157, 123.8854), 'Accepts Cebu coordinates');
  assert(isWithinPhilippines(7.1907, 125.4553), 'Accepts Davao coordinates');
  assert(
    !isUsablePlace({
      id: 'google/outside-ph',
      name: 'Tokyo Dance Hub',
      address: 'Tokyo, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      source: 'google',
      mapsUrl: 'https://maps.google.com',
      distanceKm: 3000,
    }),
    'isUsablePlace rejects a studio outside the Philippines'
  );

  // 12. Nominatim rate-limiting and caching
  console.log('\nChecking Nominatim rate limiting...');
  clearNominatimCache();
  assert(!isNominatimRateLimited(), 'Nominatim initially not rate limited');
  const emptyRes = await searchAddressWithNominatim('');
  assert(
    !emptyRes.ok && emptyRes.error === 'not-found',
    'searchAddressWithNominatim rejects empty query'
  );

  console.log(`\n========================================`);
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
  console.log(`========================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  globalThis.fetch = REAL_FETCH;
  console.error('Test execution failed:', err);
  process.exit(1);
});
