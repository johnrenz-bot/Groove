/**
 * Google Places API (New) discovery, server-side.
 *
 * Discovery used to run in the browser against the Maps JavaScript Places
 * library. Moving it behind `/api/studios` gives us one quota state, one cache,
 * one place to deduplicate query variants, and no Places billing calls from
 * every visitor's browser. The public Maps key is still used for the map
 * itself; Google Places is never asked to expose a private key.
 *
 * Important limits:
 * - Nearby Search (New) returns at most 20 places per request and has no
 *   pagination token. It is the primary radius method and uses the
 *   `dance_hall` type, which is the type that actually returns dance businesses.
 * - Text Search (New) returns at most 20 places per page and 60 per query. It is
 *   used for business-name searches and as a radius supplement.
 * - Autocomplete (New) + Place Details (New) take over when Text Search is out
 *   of quota; each of these methods has a separate quota metric.
 * - A nationwide text query is a relevance sample, not a complete directory.
 * - Coverage depends on Google's business data and the project's quota/billing.
 * - The default pre-billing project quota can be as low as 100 SearchText
 *   requests per day, so a per-method breaker stops calls that Google has
 *   already refused and reports the reset time instead of retrying blindly.
 *
 * The API key is read from the server environment only. It is never returned in
 * a response, logged, or sent to the browser by this module.
 */

import {
  PHILIPPINES_BOUNDS,
  boundsAround,
  haversineKm,
  isWithinPhilippines,
  type GeoBounds,
  type LatLng,
} from '@/lib/geo';
import { isDuplicatePlace } from '@/lib/studios/dedupe';

/** Which Places API (New) method produced a result. */
export type GooglePlacesDiscoveryMethod = 'text' | 'nearby' | 'autocomplete';

export interface GooglePlaceResult {
  /** Namespaced key so Google results can never collide with GroovePH ids. */
  id: string;
  /** The raw Google Place ID, useful for deduplication. */
  placeId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string | null;
  /** Real method that returned this business; never inferred. */
  discoveryMethod?: GooglePlacesDiscoveryMethod;
}

export type GooglePlacesStatus =
  | 'ok'
  | 'partial'
  | 'quota'
  | 'not-configured'
  | 'configuration'
  | 'unavailable';

export interface GooglePlacesOutcome {
  results: GooglePlaceResult[];
  status: GooglePlacesStatus;
  message: string | null;
  /** ISO timestamp when a quota or configuration block is expected to lift. */
  retryAt?: string | null;
  /** Billable page requests planned for this outcome (cached ones included). */
  attemptedQueries?: number;
  /** Page requests that returned a usable response. */
  succeededQueries?: number;
  /** True when Google reported a per-day (not per-minute) quota limit. */
  dailyQuotaExhausted?: boolean;
  /** Successful result pages merged into this outcome. */
  pagesFetched?: number;
  /** True when a next-page token existed but the request budget stopped there. */
  hasMore?: boolean;
  /** Internal cursor for the next page of one Text Search query. */
  nextPageToken?: string | null;
  /** Places API (New) method that produced the outcome. */
  method?: GooglePlacesDiscoveryMethod;
}

export interface DanceCityAnchor {
  name: string;
  latitude: number;
  longitude: number;
}

export interface CitySweepOutcome extends GooglePlacesOutcome {
  /** Cities whose query completed (even if Google returned zero places). */
  coveredCities: string[];
  /** Cities whose query failed or was skipped after a quota block. */
  failedCities: string[];
}

const PLACE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.businessStatus',
].join(',');

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const REQUEST_TIMEOUT_MS = 10_000;
/**
 * Discovery results change slowly. A six-hour cache keeps the public landing
 * page from spending the project's small daily Places quota on every visit
 * while still refreshing the map several times a day. Cache keys are the exact
 * request body (query, page token, centre, radius), so a new search is never
 * served another search's results.
 */
const NEARBY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CITY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const TRANSIENT_FAILURE_CACHE_TTL_MS = 60 * 1000;
const MAX_RESULTS_PER_PAGE = 20;
const MAX_CACHE_ENTRIES = 250;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
const CONFIGURATION_COOLDOWN_MS = 5 * 60 * 1000;

/** Cooldown duration used when the reset time is unknown (default 10 minutes). */
let quotaCooldownMs = DEFAULT_QUOTA_COOLDOWN_MS;

/**
 * Each Places API (New) method has its own quota metric:
 * `SearchTextRequest`, `NearbySearchRequest`, `AutocompletePlacesRequest`,
 * and `PlaceDetailsRequest`. A per-day SearchText block must not disable
 * Nearby Search or Autocomplete, which may still have quota available.
 */
export type GooglePlacesMethod = 'text' | 'nearby' | 'autocomplete' | 'details';

interface MethodState {
  quotaUntil: number;
  quotaRetryAt: string | null;
  quotaDaily: boolean;
  quotaLogged: boolean;
  configurationUntil: number;
  configurationMessage: string | null;
  configurationLogged: boolean;
}

function initialState(): MethodState {
  return {
    quotaUntil: 0,
    quotaRetryAt: null,
    quotaDaily: false,
    quotaLogged: false,
    configurationUntil: 0,
    configurationMessage: null,
    configurationLogged: false,
  };
}

const methodStates: Record<GooglePlacesMethod, MethodState> = {
  text: initialState(),
  nearby: initialState(),
  autocomplete: initialState(),
  details: initialState(),
};

const METHOD_LABELS: Record<GooglePlacesMethod, string> = {
  text: 'Google Places Text Search',
  nearby: 'Google Places Nearby Search',
  autocomplete: 'Google Places Autocomplete',
  details: 'Google Places Place Details',
};

function methodLabel(method: GooglePlacesMethod): string {
  return METHOD_LABELS[method];
}

/** Details are part of the autocomplete flow; the public outcome names that flow. */
function publicMethod(method: GooglePlacesMethod): GooglePlacesDiscoveryMethod {
  return method === 'details' ? 'autocomplete' : method;
}

export function setGooglePlacesQuotaCooldown(ms: number): void {
  quotaCooldownMs = Math.max(0, ms);
}

/** Backwards-compatible: the locator's keyword search is Text Search. */
export function isGooglePlacesQuotaExhausted(): boolean {
  return isGooglePlacesQuotaExhaustedFor('text');
}

export function isGooglePlacesQuotaExhaustedFor(method: GooglePlacesMethod): boolean {
  return Date.now() < methodStates[method].quotaUntil;
}

/** Backwards-compatible: the locator's keyword search is Text Search. */
export function getGooglePlacesQuotaState(): {
  exhausted: boolean;
  retryAt: string | null;
  daily: boolean;
} {
  return getGooglePlacesQuotaStateFor('text');
}

export function getGooglePlacesQuotaStateFor(method: GooglePlacesMethod): {
  exhausted: boolean;
  retryAt: string | null;
  daily: boolean;
} {
  const state = methodStates[method];
  const exhausted = Date.now() < state.quotaUntil;
  return {
    exhausted,
    retryAt: exhausted ? state.quotaRetryAt : null,
    daily: exhausted ? state.quotaDaily : false,
  };
}

export function resetGooglePlacesQuotaCooldown(): void {
  for (const method of Object.keys(methodStates) as GooglePlacesMethod[]) {
    methodStates[method] = initialState();
  }
}

function isConfigurationBlockedFor(method: GooglePlacesMethod): boolean {
  return Date.now() < methodStates[method].configurationUntil;
}

function markQuotaExhaustedFor(
  method: GooglePlacesMethod,
  retryAtMs: number,
  daily: boolean,
  cooldownMs: number = DEFAULT_QUOTA_COOLDOWN_MS
): void {
  const state = methodStates[method];
  const wasExhausted = Date.now() < state.quotaUntil;
  const until = Math.max(
    Date.now() + 1_000,
    Math.min(retryAtMs || Date.now() + cooldownMs, Date.now() + DAY_MS)
  );

  // Do not shorten a block that is already longer.
  if (until > state.quotaUntil) {
    state.quotaUntil = until;
    state.quotaRetryAt = new Date(until).toISOString();
    state.quotaDaily = daily;
  }

  if (!wasExhausted || !state.quotaLogged) {
    state.quotaLogged = true;
    console.warn(
      `[google-places] ${methodLabel(method)} quota exhausted (${
        daily ? 'daily' : 'rate limit'
      }); pausing that method until ${state.quotaRetryAt}.`
    );
  }
}

function markConfigurationBlockedFor(method: GooglePlacesMethod, message: string): void {
  const state = methodStates[method];
  state.configurationUntil = Date.now() + CONFIGURATION_COOLDOWN_MS;
  state.configurationMessage = message;
  if (!state.configurationLogged) {
    state.configurationLogged = true;
    console.warn(`[google-places] ${methodLabel(method)} configuration problem: ${message}`);
  }
}

export function isQuotaExhaustionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|quota|429|rate[\s_-]?limit/i.test(msg);
}

function apiKey(): string {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(apiKey());
}

interface CacheEntry {
  timestamp: number;
  ttl: number;
  outcome: GooglePlacesOutcome;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<GooglePlacesOutcome>>();

export function clearGooglePlacesCache(): void {
  cache.clear();
  inFlight.clear();
}

function rememberOutcome(key: string, outcome: GooglePlacesOutcome, ttl: number): void {
  cache.set(key, { timestamp: Date.now(), ttl, outcome });
  if (cache.size <= MAX_CACHE_ENTRIES) return;

  // Map iteration is insertion ordered, so the first key is the oldest entry.
  const oldest = cache.keys().next().value;
  if (typeof oldest === 'string') cache.delete(oldest);
}

function nextUtcMidnight(now: number = Date.now()): number {
  const date = new Date(now);
  date.setUTCHours(24, 0, 0, 0);
  return date.getTime();
}

interface SearchRequest {
  textQuery: string;
  pageSize?: number;
  pageToken?: string;
  bounds?: GeoBounds | null;
  center?: LatLng | null;
  radiusMeters?: number;
  /** Text Search restriction for categorical searches, bias for geocoding. */
  mode?: 'restrict' | 'bias';
  rankPreference?: 'RELEVANCE' | 'DISTANCE';
  cacheTtlMs?: number;
  signal?: AbortSignal;
}

function clampBoundsToPhilippines(bounds: GeoBounds): GeoBounds | null {
  const north = Math.min(bounds.north, PHILIPPINES_BOUNDS.north);
  const south = Math.max(bounds.south, PHILIPPINES_BOUNDS.south);
  const east = Math.min(bounds.east, PHILIPPINES_BOUNDS.east);
  const west = Math.max(bounds.west, PHILIPPINES_BOUNDS.west);
  if (north <= south || east <= west) return null;
  return { north, south, east, west };
}

/**
 * Build the Text Search (New) request body. Exported for tests: this is where
 * the radius, Philippine restriction, page size, and response fields are
 * decided, and a regression here is invisible until Google returns nothing.
 */
export function buildSearchRequestBody(
  request: SearchRequest
): Record<string, unknown> | null {
  const textQuery = request.textQuery.trim();
  if (!textQuery) return null;

  const bounds = request.bounds ? clampBoundsToPhilippines(request.bounds) : null;
  const hasCenter =
    request.center &&
    Number.isFinite(request.center.lat) &&
    Number.isFinite(request.center.lng) &&
    isWithinPhilippines(request.center.lat, request.center.lng);

  // A rectangle is the only shape Text Search accepts for a restriction. Fall
  // back to the circle's bounding box when the caller supplied only a centre.
  const areaBounds =
    bounds ??
    (hasCenter
      ? clampBoundsToPhilippines(
          boundsAround(request.center as LatLng, (request.radiusMeters ?? 50_000) / 1000)
        )
      : null);

  if (!areaBounds) return null;

  const mode = request.mode ?? 'restrict';
  const rectangle = {
    low: { latitude: areaBounds.south, longitude: areaBounds.west },
    high: { latitude: areaBounds.north, longitude: areaBounds.east },
  };

  const body: Record<string, unknown> = {
    textQuery,
    pageSize: Math.min(
      Math.max(request.pageSize ?? MAX_RESULTS_PER_PAGE, 1),
      MAX_RESULTS_PER_PAGE
    ),
    regionCode: 'PH',
    languageCode: 'en',
    [mode === 'bias' ? 'locationBias' : 'locationRestriction']: { rectangle },
  };

  if (request.pageToken) body.pageToken = request.pageToken;
  if (request.rankPreference) body.rankPreference = request.rankPreference;

  return body;
}

interface GooglePlacePayload {
  id?: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  businessStatus?: string;
}

function toResult(
  place: GooglePlacePayload,
  discoveryMethod: GooglePlacesDiscoveryMethod = 'text'
): GooglePlaceResult | null {
  const placeId = typeof place.id === 'string' ? place.id : '';
  const displayName = place.displayName;
  const name =
    typeof displayName === 'string'
      ? displayName.trim()
      : typeof displayName?.text === 'string'
        ? displayName.text.trim()
        : '';
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;

  if (!placeId || !name) return null;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!isWithinPhilippines(latitude, longitude)) return null;
  if (place.businessStatus === 'CLOSED_PERMANENTLY') return null;

  const mapsUrl =
    typeof place.googleMapsUri === 'string' && place.googleMapsUri
      ? place.googleMapsUri
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude.toFixed(
          6
        )},${longitude.toFixed(6)}`;

  return {
    id: `google/${placeId}`,
    placeId,
    name,
    address:
      typeof place.formattedAddress === 'string' && place.formattedAddress.trim()
        ? place.formattedAddress.trim()
        : null,
    latitude,
    longitude,
    mapsUrl,
    rating:
      typeof place.rating === 'number' && Number.isFinite(place.rating)
        ? place.rating
        : undefined,
    userRatingCount:
      typeof place.userRatingCount === 'number' && Number.isFinite(place.userRatingCount)
        ? place.userRatingCount
        : undefined,
    primaryType:
      typeof place.primaryType === 'string' && place.primaryType
        ? place.primaryType
        : null,
    discoveryMethod,
  };
}

interface GoogleErrorDetail {
  '@type'?: string;
  reason?: string;
  metadata?: Record<string, string>;
  retryDelay?: string;
}

interface GoogleErrorPayload {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GoogleErrorDetail[];
  };
}

export interface GooglePlacesFailure {
  status: GooglePlacesStatus;
  message: string;
  retryAt: string | null;
  dailyQuota: boolean;
  errorCode: string | null;
}

function parseRetryDelaySeconds(details: GoogleErrorDetail[]): number | null {
  for (const detail of details) {
    const raw = detail.retryDelay;
    if (typeof raw !== 'string') continue;
    const match = raw.match(/^([0-9.]+)s$/);
    if (!match) continue;
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  }
  return null;
}

/**
 * Turn Google's error envelope into a status the UI can state honestly.
 * Exported so the classification rules are unit-testable without quota calls.
 */
export function interpretGooglePlacesError(
  httpStatus: number,
  payload: unknown
): GooglePlacesFailure {
  const body = (payload ?? {}) as GoogleErrorPayload;
  const error = body.error;
  const rawMessage = typeof error?.message === 'string' ? error.message : '';
  const reason = error?.details?.find((detail) => detail.reason)?.reason ?? null;
  const metadata =
    error?.details?.find((detail) => detail.metadata)?.metadata ?? {};
  const errorCode = reason ?? error?.status ?? `HTTP_${httpStatus}`;
  const now = Date.now();

  if (httpStatus === 429 || error?.status === 'RESOURCE_EXHAUSTED') {
    const quotaLimit = metadata.quota_limit ?? '';
    const quotaValue = metadata.quota_limit_value ?? '';
    const daily = /per\s*day|perday|daily/i.test(quotaLimit) || /per day|daily/i.test(rawMessage);

    if (daily) {
      const windowStartSeconds = Number(metadata.window_start_time);
      const windowStartMs =
        Number.isFinite(windowStartSeconds) && windowStartSeconds > 0
          ? windowStartSeconds * 1000
          : 0;
      const candidate = windowStartMs ? windowStartMs + DAY_MS : 0;
      const resetAt = candidate > now + 30_000 ? candidate : nextUtcMidnight(now);
      return {
        status: 'quota',
        message: `Google Places daily search quota is exhausted${
          quotaValue ? ` (${quotaValue} requests/day for this Google Cloud project)` : ''
        }. Google results return after ${new Date(resetAt).toUTCString()}. GroovePH directory studios are still shown and are not Google results.`,
        retryAt: new Date(resetAt).toISOString(),
        dailyQuota: true,
        errorCode,
      };
    }

    const retrySeconds = parseRetryDelaySeconds(error?.details ?? []) ?? 60;
    const retryAt = now + retrySeconds * 1000;
    return {
      status: 'quota',
      message: `Google Places is rate-limiting searches right now. Try again in about ${retrySeconds}s; GroovePH directory studios are still shown.`,
      retryAt: new Date(retryAt).toISOString(),
      dailyQuota: false,
      errorCode,
    };
  }

  if (httpStatus === 401 || httpStatus === 403) {
    let message =
      'Google Places rejected the request. Check that Places API (New) is enabled for the project, that billing is active, and that the API key allows this API and server IP.';
    if (/billing/i.test(rawMessage) || reason === 'BILLING_DISABLED') {
      message =
        'Google Places requires billing on the Google Cloud project. Enable billing, then retry; GroovePH directory studios are still shown.';
    } else if (
      /not enabled|has not been used|service.*disabled|SERVICE_DISABLED/i.test(
        `${reason ?? ''} ${rawMessage}`
      )
    ) {
      message =
        'Places API (New) is not enabled for this Google Cloud project. Enable it in APIs & Services, then retry; GroovePH directory studios are still shown.';
    } else if (
      /api key|referer|restricted|blocked|PERMISSION_DENIED/i.test(
        `${reason ?? ''} ${rawMessage}`
      )
    ) {
      message =
        'The Google Maps API key cannot call Places API (New) from the server. Allow Places API (New) on the key and remove server-side restrictions; GroovePH directory studios are still shown.';
    }
    return {
      status: 'configuration',
      message,
      retryAt: null,
      dailyQuota: false,
      errorCode,
    };
  }

  if (httpStatus === 400) {
    return {
      status: 'unavailable',
      message:
        'Google Places rejected the search parameters. The request was not billed successfully; GroovePH directory studios are still shown.',
      retryAt: null,
      dailyQuota: false,
      errorCode,
    };
  }

  return {
    status: 'unavailable',
    message:
      'Google Places is unavailable right now. GroovePH directory studios are still shown.',
    retryAt: null,
    dailyQuota: false,
    errorCode,
  };
}

function quotaOutcome(method: GooglePlacesMethod = 'text'): GooglePlacesOutcome {
  const state = getGooglePlacesQuotaStateFor(method);
  const label = methodLabel(method);
  return {
    results: [],
    status: 'quota',
    message: state.daily
      ? `${label} daily quota is exhausted${
          state.retryAt ? `; it resets at ${new Date(state.retryAt).toUTCString()}` : ''
        }. GroovePH directory studios are still shown and are not Google results.`
      : `${label} is rate-limiting requests right now. GroovePH directory studios are still shown.`,
    retryAt: state.retryAt,
    dailyQuotaExhausted: state.daily,
    attemptedQueries: 0,
    succeededQueries: 0,
    pagesFetched: 0,
    hasMore: false,
    nextPageToken: null,
    method: publicMethod(method),
  };
}

function configurationOutcome(method: GooglePlacesMethod = 'text'): GooglePlacesOutcome {
  return {
    results: [],
    status: 'configuration',
    message:
      methodStates[method].configurationMessage ??
      'Google Places is not configured correctly. GroovePH directory studios are still shown.',
    retryAt: new Date(methodStates[method].configurationUntil).toISOString(),
    attemptedQueries: 0,
    succeededQueries: 0,
    pagesFetched: 0,
    hasMore: false,
    nextPageToken: null,
    method: publicMethod(method),
  };
}

function notConfiguredOutcome(): GooglePlacesOutcome {
  return {
    results: [],
    status: 'not-configured',
    message:
      'Google Places discovery is not configured, so only GroovePH directory studios are shown.',
    attemptedQueries: 0,
    succeededQueries: 0,
    pagesFetched: 0,
    hasMore: false,
    nextPageToken: null,
  };
}

function failureOutcome(
  failure: GooglePlacesFailure,
  method: GooglePlacesMethod
): GooglePlacesOutcome {
  return {
    results: [],
    status: failure.status,
    message: failure.message,
    retryAt:
      failure.retryAt ??
      (failure.status === 'configuration'
        ? new Date(methodStates[method].configurationUntil).toISOString()
        : null),
    dailyQuotaExhausted: failure.dailyQuota,
    attemptedQueries: 1,
    succeededQueries: 0,
    pagesFetched: 0,
    hasMore: false,
    nextPageToken: null,
    method: publicMethod(method),
  };
}

async function searchOne(request: SearchRequest): Promise<GooglePlacesOutcome> {
  const key = apiKey();
  if (!key) return notConfiguredOutcome();

  const body = buildSearchRequestBody(request);
  if (!body) {
    return { results: [], status: 'ok', message: null, attemptedQueries: 0, succeededQueries: 0 };
  }

  const cacheKey = JSON.stringify(body);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.outcome;
  }
  if (cached) cache.delete(cacheKey);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  // Serve cached successes even while the quota breaker is open. Only a cache
  // miss reaches the paid API.
  if (isGooglePlacesQuotaExhaustedFor('text')) return quotaOutcome('text');
  if (isConfigurationBlockedFor('text')) return configurationOutcome('text');

  const promise = (async (): Promise<GooglePlacesOutcome> => {
    const controller = new AbortController();
    let abortListener: (() => void) | null = null;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    if (request.signal) {
      if (request.signal.aborted) {
        clearTimeout(timer);
        return {
          results: [],
          status: 'unavailable',
          message: 'Search cancelled.',
          attemptedQueries: 0,
          succeededQueries: 0,
        };
      }
      abortListener = () => controller.abort();
      request.signal.addEventListener('abort', abortListener, { once: true });
    }

    try {
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': PLACE_FIELDS,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store',
      });

      const payload = (await res.json().catch(() => null)) as
        | ({
            places?: GooglePlacePayload[];
            nextPageToken?: string;
            error?: GoogleErrorPayload['error'];
          } & GoogleErrorPayload)
        | null;

      if (!res.ok) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(
            '[google-places] request failed:',
            res.status,
            payload?.error?.status ?? 'unknown',
            payload?.error?.message ?? 'no error message'
          );
        }

        const failure = interpretGooglePlacesError(res.status, payload);
        if (failure.status === 'quota') {
          const retryAtMs = failure.retryAt
            ? new Date(failure.retryAt).getTime()
            : Date.now() + quotaCooldownMs;
          markQuotaExhaustedFor('text', retryAtMs, failure.dailyQuota, quotaCooldownMs);
        } else if (failure.status === 'configuration') {
          markConfigurationBlockedFor('text', failure.message);
        }

        const outcome = failureOutcome(failure, 'text');

        if (failure.status !== 'quota' && failure.status !== 'configuration') {
          rememberOutcome(cacheKey, outcome, TRANSIENT_FAILURE_CACHE_TTL_MS);
        }
        return outcome;
      }

      const results: GooglePlaceResult[] = [];
      for (const place of payload?.places ?? []) {
        const result = toResult(place);
        if (!result) continue;
        if (results.some((existing) => isDuplicatePlace(existing, result))) continue;
        results.push(result);
      }

      const nextPageToken =
        typeof payload?.nextPageToken === 'string' && payload.nextPageToken
          ? payload.nextPageToken
          : null;

      const outcome: GooglePlacesOutcome = {
        results,
        status: 'ok',
        message: null,
        attemptedQueries: 1,
        succeededQueries: 1,
        pagesFetched: 1,
        hasMore: Boolean(nextPageToken),
        nextPageToken,
        method: 'text',
      };
      rememberOutcome(cacheKey, outcome, request.cacheTtlMs ?? NEARBY_CACHE_TTL_MS);
      return outcome;
    } catch (error) {
      if (request.signal?.aborted) {
        return {
          results: [],
          status: 'unavailable',
          message: 'Search cancelled.',
          attemptedQueries: 1,
          succeededQueries: 0,
          method: 'text',
        };
      }

      const isAbort = error instanceof Error && error.name === 'AbortError';
      const outcome: GooglePlacesOutcome = {
        results: [],
        status: 'unavailable',
        message: isAbort
          ? 'Google Places took too long to respond. GroovePH directory studios are still shown.'
          : 'Google Places could not be reached. GroovePH directory studios are still shown.',
        attemptedQueries: 1,
        succeededQueries: 0,
        method: 'text',
      };
      rememberOutcome(cacheKey, outcome, TRANSIENT_FAILURE_CACHE_TTL_MS);
      return outcome;
    } finally {
      clearTimeout(timer);
      if (abortListener && request.signal) {
        request.signal.removeEventListener('abort', abortListener);
      }
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}

interface AutocompleteSuggestion {
  placePrediction?: {
    placeId?: string;
    place?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    types?: string[];
  };
}

interface GoogleJsonPayload {
  places?: GooglePlacePayload[];
  suggestions?: AutocompleteSuggestion[];
  nextPageToken?: string;
  error?: GoogleErrorPayload['error'];
}

interface AutocompletePrediction {
  placeId: string;
  name: string;
  address: string | null;
  types: string[];
}

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'googleMapsUri',
  'rating',
  'userRatingCount',
  'primaryType',
  'businessStatus',
].join(',');

/**
 * Places API (New) type used for radius discovery. `dance_hall` is the precise
 * dance type and returns real dance studios, schools, and crews. Broader types
 * such as `performing_arts_theater` and `art_studio` were tested and return
 * mostly theatres, pottery studios, and craft shops, so they are not requested:
 * a 20-result cap filled with those would crowd out actual dance businesses.
 * Results are still filtered by `isDanceRelevantGooglePlace` so a dance-typed
 * venue with an unrelated name (for example a party place) is not presented as
 * a studio.
 */
const DANCE_NEARBY_TYPES = ['dance_hall'] as const;

/** Names that are unambiguously dance / performing-arts businesses. */
const STRONG_DANCE_NAME =
  /\b(dance|dancing|ballet|ballroom|hip[\s-]?hop|k[\s-]?pop|contemporary|jazz|salsa|tango|cheer|cheerleading|gymnastics|pole|aerial|zumba|performing[\s-]?arts|movement|choreograph\w*|dancehall)\b/i;

/** "Academy"/"school"/"studio" only counts for an organization category. */
const WEAK_DANCE_NAME = /\b(academy|school|studio)\b/i;

/** Non-business predictions returned by Autocomplete for geocoding. */
const GEOCODE_TYPES = new Set([
  'geocode',
  'locality',
  'political',
  'route',
  'sublocality',
  'sublocality_level_1',
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
]);

export function isDanceRelevantGooglePlace(
  place: Pick<GooglePlaceResult, 'name' | 'primaryType'>
): boolean {
  if (!place.name.trim()) return false;
  if (place.primaryType === 'dance_hall') return true;
  if (STRONG_DANCE_NAME.test(place.name)) return true;
  return (
    place.primaryType === 'association_or_organization' &&
    WEAK_DANCE_NAME.test(place.name)
  );
}

function emptyOutcome(
  method?: GooglePlacesDiscoveryMethod
): GooglePlacesOutcome {
  return {
    results: [],
    status: 'ok',
    message: null,
    attemptedQueries: 0,
    succeededQueries: 0,
    pagesFetched: 0,
    hasMore: false,
    nextPageToken: null,
    ...(method ? { method } : {}),
  };
}

/**
 * Shared Places API (New) request helper. It is deliberately per-method:
 * Google tracks a separate quota for Text Search, Nearby Search, Autocomplete,
 * and Place Details, and one exhausted metric must not block the others.
 */
async function requestGoogleJson(options: {
  url: string;
  method: GooglePlacesMethod;
  fieldMask?: string;
  body?: unknown;
  httpMethod?: 'GET' | 'POST';
  signal?: AbortSignal;
}): Promise<
  | { ok: true; payload: GoogleJsonPayload | null }
  | { ok: false; outcome: GooglePlacesOutcome }
> {
  const key = apiKey();
  if (!key) return { ok: false, outcome: notConfiguredOutcome() };

  if (isGooglePlacesQuotaExhaustedFor(options.method)) {
    return { ok: false, outcome: quotaOutcome(options.method) };
  }
  if (isConfigurationBlockedFor(options.method)) {
    return { ok: false, outcome: configurationOutcome(options.method) };
  }

  const controller = new AbortController();
  let abortListener: (() => void) | null = null;
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      return {
        ok: false,
        outcome: {
          results: [],
          status: 'unavailable',
          message: 'Search cancelled.',
          attemptedQueries: 0,
          succeededQueries: 0,
          method: publicMethod(options.method),
        },
      };
    }
    abortListener = () => controller.abort();
    options.signal.addEventListener('abort', abortListener, { once: true });
  }

  try {
    const headers: Record<string, string> = {
      'X-Goog-Api-Key': key,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.fieldMask) headers['X-Goog-FieldMask'] = options.fieldMask;

    const res = await fetch(options.url, {
      method: options.httpMethod ?? 'POST',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload = (await res.json().catch(() => null)) as GoogleJsonPayload | null;

    if (!res.ok) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          '[google-places] request failed:',
          options.method,
          res.status,
          payload?.error?.status ?? 'unknown',
          payload?.error?.message ?? 'no error message'
        );
      }

      const failure = interpretGooglePlacesError(res.status, payload);
      if (failure.status === 'quota') {
        const retryAtMs = failure.retryAt
          ? new Date(failure.retryAt).getTime()
          : Date.now() + DEFAULT_QUOTA_COOLDOWN_MS;
        markQuotaExhaustedFor(options.method, retryAtMs, failure.dailyQuota);
      } else if (failure.status === 'configuration') {
        markConfigurationBlockedFor(options.method, failure.message);
      }
      return { ok: false, outcome: failureOutcome(failure, options.method) };
    }

    return { ok: true, payload };
  } catch (error) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        outcome: {
          results: [],
          status: 'unavailable',
          message: 'Search cancelled.',
          attemptedQueries: 1,
          succeededQueries: 0,
          method: publicMethod(options.method),
        },
      };
    }

    const isAbort = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      outcome: {
        results: [],
        status: 'unavailable',
        message: isAbort
          ? `${methodLabel(options.method)} took too long to respond. GroovePH directory studios are still shown.`
          : `${methodLabel(options.method)} could not be reached. GroovePH directory studios are still shown.`,
        attemptedQueries: 1,
        succeededQueries: 0,
        method: publicMethod(options.method),
      },
    };
  } finally {
    clearTimeout(timer);
    if (abortListener && options.signal) {
      options.signal.removeEventListener('abort', abortListener);
    }
  }
}

/**
 * Discover real dance businesses around a coordinate with Nearby Search (New).
 *
 * Nearby Search has its own quota metric (`NearbySearchRequest`) and is the
 * correct method for a radius query. It returns up to 20 places per request and
 * has no next-page token, unlike Text Search. Google's place types are broader
 * than "dance studio", so `isDanceRelevantGooglePlace` removes theatres, tattoo
 * studios, and other non-dance businesses before they reach the map.
 */
export async function searchNearbyDancePlaces(options: {
  center: LatLng;
  radiusKm: number;
  pageSize?: number;
  cacheTtlMs?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  if (!isGooglePlacesConfigured()) return notConfiguredOutcome();

  const center = options.center;
  if (!isWithinPhilippines(center.lat, center.lng)) {
    return emptyOutcome('nearby');
  }

  const radiusKm = Math.min(Math.max(options.radiusKm, 1), 50);
  const body = {
    includedTypes: [...DANCE_NEARBY_TYPES],
    locationRestriction: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: radiusKm * 1000,
      },
    },
    maxResultCount: Math.min(Math.max(options.pageSize ?? 20, 1), 20),
    rankPreference: 'DISTANCE',
    regionCode: 'PH',
    languageCode: 'en',
  };

  const cacheKey = JSON.stringify({ method: 'nearby', body });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) return cached.outcome;
  if (cached) cache.delete(cacheKey);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<GooglePlacesOutcome> => {
    const request = await requestGoogleJson({
      url: NEARBY_SEARCH_URL,
      method: 'nearby',
      fieldMask: PLACE_FIELDS,
      body,
      signal: options.signal,
    });

    if (!request.ok) {
      if (request.outcome.status === 'unavailable') {
        rememberOutcome(cacheKey, request.outcome, TRANSIENT_FAILURE_CACHE_TTL_MS);
      }
      return request.outcome;
    }

    const results: GooglePlaceResult[] = [];
    for (const place of request.payload?.places ?? []) {
      const result = toResult(place, 'nearby');
      if (!result) continue;
      if (!isDanceRelevantGooglePlace(result)) continue;
      if (results.some((other) => isDuplicatePlace(other, result))) continue;
      results.push(result);
    }

    const outcome: GooglePlacesOutcome = {
      results,
      status: 'ok',
      message: null,
      attemptedQueries: 1,
      succeededQueries: 1,
      pagesFetched: 1,
      hasMore: false,
      nextPageToken: null,
      method: 'nearby',
    };
    rememberOutcome(cacheKey, outcome, options.cacheTtlMs ?? NEARBY_CACHE_TTL_MS);
    return outcome;
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

async function getPlaceDetails(
  placeId: string,
  signal?: AbortSignal
): Promise<
  | { ok: true; result: GooglePlaceResult | null }
  | { ok: false; outcome: GooglePlacesOutcome }
> {
  const cacheKey = `details:${placeId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return { ok: true, result: cached.outcome.results[0] ?? null };
  }
  if (cached) cache.delete(cacheKey);

  const request = await requestGoogleJson({
    url: `${PLACE_DETAILS_URL}/${encodeURIComponent(
      placeId
    )}?languageCode=en&regionCode=PH`,
    method: 'details',
    fieldMask: DETAIL_FIELDS,
    httpMethod: 'GET',
    signal,
  });

  if (!request.ok) return { ok: false, outcome: request.outcome };

  const place = request.payload as GooglePlacePayload | null;
  const result = place ? toResult(place, 'autocomplete') : null;
  const outcome: GooglePlacesOutcome = {
    results: result ? [result] : [],
    status: 'ok',
    message: null,
    attemptedQueries: 1,
    succeededQueries: 1,
    pagesFetched: 1,
    hasMore: false,
    nextPageToken: null,
    method: 'autocomplete',
  };
  rememberOutcome(cacheKey, outcome, NEARBY_CACHE_TTL_MS);
  return { ok: true, result };
}

/**
 * Autocomplete (New) followed by Place Details (New). Autocomplete finds real
 * businesses by name and returns a Place ID; Place Details supplies the actual
 * coordinates and address. Both have separate quota metrics from Text Search,
 * which is why this still works when `SearchTextRequest` is exhausted.
 */
async function autocompletePlaces(options: {
  query: string;
  center?: LatLng | null;
  radiusKm?: number | null;
  maxDetails?: number;
  businessOnly?: boolean;
  cacheTtlMs?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  const query = options.query.trim().slice(0, 120);
  if (!query) return emptyOutcome('autocomplete');
  if (!isGooglePlacesConfigured()) return notConfiguredOutcome();

  const center =
    options.center && isWithinPhilippines(options.center.lat, options.center.lng)
      ? options.center
      : null;
  const radiusKm = center
    ? Math.min(Math.max(options.radiusKm ?? 50, 1), 50)
    : null;
  const maxDetails = Math.min(Math.max(options.maxDetails ?? 6, 1), 10);

  const body = {
    input: query,
    includedRegionCodes: ['ph'],
    languageCode: 'en',
    ...(center && radiusKm
      ? {
          locationBias: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: radiusKm * 1000,
            },
          },
        }
      : {}),
  };

  const cacheKey = JSON.stringify({
    method: 'autocomplete',
    body,
    maxDetails,
    businessOnly: Boolean(options.businessOnly),
  });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) return cached.outcome;
  if (cached) cache.delete(cacheKey);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<GooglePlacesOutcome> => {
    const autocomplete = await requestGoogleJson({
      url: AUTOCOMPLETE_URL,
      method: 'autocomplete',
      body,
      signal: options.signal,
    });

    if (!autocomplete.ok) {
      if (autocomplete.outcome.status === 'unavailable') {
        rememberOutcome(cacheKey, autocomplete.outcome, TRANSIENT_FAILURE_CACHE_TTL_MS);
      }
      return autocomplete.outcome;
    }

    const predictions: AutocompletePrediction[] = [];
    for (const suggestion of autocomplete.payload?.suggestions ?? []) {
      const prediction = suggestion.placePrediction;
      if (!prediction) continue;

      const rawPlaceId =
        typeof prediction.placeId === 'string'
          ? prediction.placeId
          : typeof prediction.place === 'string'
            ? prediction.place.replace(/^places\//, '')
            : '';
      if (!rawPlaceId) continue;

      const types = Array.isArray(prediction.types) ? prediction.types : [];
      if (
        options.businessOnly &&
        types.some((type) => GEOCODE_TYPES.has(type))
      ) {
        continue;
      }

      const name =
        prediction.structuredFormat?.mainText?.text?.trim() ||
        prediction.text?.text?.trim() ||
        '';
      const address =
        prediction.structuredFormat?.secondaryText?.text?.trim() ||
        prediction.text?.text?.trim() ||
        null;

      predictions.push({
        placeId: rawPlaceId,
        name,
        address,
        types,
      });
    }

    if (predictions.length === 0) {
      const outcome = emptyOutcome('autocomplete');
      rememberOutcome(cacheKey, outcome, 10 * 60 * 1000);
      return outcome;
    }

    const selected = predictions.slice(0, maxDetails);
    const details = await Promise.all(
      selected.map((prediction) => getPlaceDetails(prediction.placeId, options.signal))
    );

    const results: GooglePlaceResult[] = [];
    let detailFailure: GooglePlacesOutcome | null = null;
    let detailSucceeded = 0;

    for (const detail of details) {
      if (!detail.ok) {
        detailFailure ??= detail.outcome;
        continue;
      }
      detailSucceeded += 1;
      const result = detail.result;
      if (!result) continue;

      if (center && radiusKm) {
        const distanceKm = haversineKm(center, {
          lat: result.latitude,
          lng: result.longitude,
        });
        if (distanceKm > radiusKm + 0.25) continue;
      }

      if (results.some((other) => isDuplicatePlace(other, result))) continue;
      results.push(result);
    }

    const status: GooglePlacesStatus =
      results.length > 0
        ? detailFailure
          ? 'partial'
          : 'ok'
        : detailFailure
          ? detailFailure.status
          : 'ok';

    const outcome: GooglePlacesOutcome = {
      results,
      status,
      message:
        results.length > 0 && detailFailure
          ? `Some Google Place Details lookups did not complete, so coverage is incomplete. ${
              detailFailure.message ?? ''
            }`.trim()
          : results.length === 0 && detailFailure
            ? detailFailure.message
            : null,
      retryAt: detailFailure?.retryAt ?? null,
      dailyQuotaExhausted: detailFailure?.dailyQuotaExhausted ?? false,
      attemptedQueries: 1 + selected.length,
      succeededQueries: 1 + detailSucceeded,
      pagesFetched: 1,
      hasMore: predictions.length > selected.length,
      nextPageToken: null,
      method: 'autocomplete',
    };

    if (status === 'ok' || status === 'partial') {
      rememberOutcome(cacheKey, outcome, options.cacheTtlMs ?? 10 * 60 * 1000);
    }
    return outcome;
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

/**
 * Business-name search. Text Search is tried first because it handles keyword
 * queries and pagination best. When its daily quota is exhausted, the locator
 * falls back to Autocomplete + Place Details, which use separate quota metrics.
 * The returned message says which method produced the data.
 */
export async function searchDancePlacesByName(options: {
  query: string;
  center?: LatLng | null;
  radiusKm?: number | null;
  bounds?: GeoBounds | null;
  maxDetails?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  const query = options.query.trim().slice(0, 120);
  if (!query) return emptyOutcome('text');
  if (!isGooglePlacesConfigured()) return notConfiguredOutcome();

  const center =
    options.center && isWithinPhilippines(options.center.lat, options.center.lng)
      ? options.center
      : null;
  const radiusKm = center
    ? Math.min(Math.max(options.radiusKm ?? 50, 1), 50)
    : null;
  const bounds =
    options.bounds ??
    (center && radiusKm ? boundsAround(center, radiusKm) : PHILIPPINES_BOUNDS);

  let textOutcome: GooglePlacesOutcome | null = null;
  const textAvailable =
    !isGooglePlacesQuotaExhaustedFor('text') &&
    !isConfigurationBlockedFor('text');

  if (textAvailable) {
    textOutcome = await discoverDanceStudios({
      queries: [query],
      maxQueries: 1,
      maxPagesPerQuery: 2,
      maxRequests: 2,
      bounds,
      center,
      radiusMeters: radiusKm ? radiusKm * 1000 : undefined,
      rankPreference: center ? 'DISTANCE' : 'RELEVANCE',
      cacheTtlMs: 10 * 60 * 1000,
      signal: options.signal,
    });
    if (textOutcome.results.length > 0) return textOutcome;
  }

  const autocomplete = await autocompletePlaces({
    query,
    center,
    radiusKm,
    maxDetails: options.maxDetails ?? 6,
    businessOnly: true,
    cacheTtlMs: 10 * 60 * 1000,
    signal: options.signal,
  });

  if (autocomplete.results.length > 0) {
    if (textOutcome && textOutcome.status !== 'ok') {
      return {
        ...autocomplete,
        status: 'partial',
        message: `Google keyword search is temporarily unavailable. These matches come from Google Places Autocomplete. ${
          textOutcome.message ?? ''
        }`.trim(),
        retryAt: textOutcome.retryAt ?? autocomplete.retryAt ?? null,
      };
    }
    return autocomplete;
  }

  if (textOutcome) {
    if (textOutcome.status !== 'ok') {
      if (autocomplete.status !== 'ok') {
        return {
          ...textOutcome,
          message: [textOutcome.message, autocomplete.message]
            .filter(Boolean)
            .join(' '),
        };
      }
      return textOutcome;
    }
    return textOutcome;
  }

  if (autocomplete.status === 'ok') {
    const blocked = quotaOutcome('text');
    return {
      ...autocomplete,
      status: 'partial',
      message: `Google keyword search is unavailable, so results come from Google Places Autocomplete. ${blocked.message}`,
      retryAt: getGooglePlacesQuotaStateFor('text').retryAt,
    };
  }

  return autocomplete;
}

/** Autocomplete-only lookup used by the city/address geocode fallback. */
export async function searchGooglePlacesAutocomplete(options: {
  textQuery: string;
  maxDetails?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  const query = options.textQuery.trim().slice(0, 160);
  if (!query) return emptyOutcome('autocomplete');
  return autocompletePlaces({
    query,
    maxDetails: options.maxDetails ?? 1,
    businessOnly: false,
    cacheTtlMs: 10 * 60 * 1000,
    signal: options.signal,
  });
}

function outcomeFromFailures(
  results: GooglePlaceResult[],
  failures: Set<GooglePlacesStatus>,
  messages: string[],
  requested: number,
  succeeded: number,
  pagesFetched = succeeded,
  hasMore = false,
  method: GooglePlacesMethod = 'text'
): GooglePlacesOutcome {
  const firstMessage = messages[0] ?? null;
  const quota = getGooglePlacesQuotaStateFor(method);
  const retryAt = quota.retryAt;

  if (results.length > 0) {
    return {
      results,
      status: failures.size > 0 ? 'partial' : 'ok',
      message:
        failures.size > 0
          ? `Some Google Places searches did not complete, so coverage is incomplete. ${firstMessage ?? ''}`.trim()
          : null,
      retryAt: failures.has('quota') ? retryAt : null,
      dailyQuotaExhausted: failures.has('quota') ? quota.daily : false,
      attemptedQueries: requested,
      succeededQueries: succeeded,
      pagesFetched,
      hasMore,
      nextPageToken: null,
      method: publicMethod(method),
    };
  }

  if (failures.has('quota')) {
    return {
      ...quotaOutcome(method),
      attemptedQueries: requested,
      succeededQueries: succeeded,
      pagesFetched,
      hasMore,
      nextPageToken: null,
    };
  }

  if (failures.has('configuration')) {
    return {
      ...configurationOutcome(method),
      attemptedQueries: requested,
      succeededQueries: succeeded,
      pagesFetched,
      hasMore,
      nextPageToken: null,
    };
  }

  if (failures.has('not-configured')) {
    return {
      results: [],
      status: 'not-configured',
      message:
        'Google Places discovery is not configured, so only GroovePH directory studios are shown.',
      attemptedQueries: requested,
      succeededQueries: succeeded,
      pagesFetched,
      hasMore,
      nextPageToken: null,
      method: publicMethod(method),
    };
  }

  if (failures.has('unavailable')) {
    return {
      results: [],
      status: 'unavailable',
      message:
        firstMessage ??
        'Google Places is unavailable right now. GroovePH directory studios are still shown.',
      attemptedQueries: requested,
      succeededQueries: succeeded,
      pagesFetched,
      hasMore,
      nextPageToken: null,
      method: publicMethod(method),
    };
  }

  return {
    results: [],
    status: 'ok',
    message: null,
    attemptedQueries: requested,
    succeededQueries: succeeded,
    pagesFetched,
    hasMore,
    nextPageToken: null,
    method: publicMethod(method),
  };
}

/**
 * Run a bounded set of dance text queries, following `nextPageToken` when the
 * budget allows, then merge and deduplicate every page.
 *
 * Pages are scheduled round-robin: every query gets its first page before any
 * query gets its second. That spreads a small request budget across studio,
 * school, academy, ballet, hip-hop, and performing-arts vocabulary instead of
 * spending the whole budget on one category.
 *
 * `maxRequests` is a hard cap on Text Search page requests for the call. Cached
 * pages still count toward the cap so a cache miss can never exceed it.
 */
export async function discoverDanceStudios(options: {
  queries: readonly string[];
  bounds?: GeoBounds | null;
  center?: LatLng | null;
  radiusMeters?: number;
  pageSize?: number;
  maxQueries?: number;
  maxPagesPerQuery?: number;
  maxRequests?: number;
  rankPreference?: 'RELEVANCE' | 'DISTANCE';
  cacheTtlMs?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  if (!isGooglePlacesConfigured()) {
    return {
      results: [],
      status: 'not-configured',
      message:
        'Google Places discovery is not configured, so only GroovePH directory studios are shown.',
      attemptedQueries: 0,
      succeededQueries: 0,
      pagesFetched: 0,
      hasMore: false,
      nextPageToken: null,
    };
  }

  if (isGooglePlacesQuotaExhausted()) return quotaOutcome();
  if (isConfigurationBlockedFor('text')) return configurationOutcome('text');

  const queries = Array.from(
    new Set(
      options.queries
        .map((query) => query.trim())
        .filter((query) => query.length > 0)
    )
  ).slice(0, Math.max(1, options.maxQueries ?? 6));

  if (queries.length === 0) {
    return {
      results: [],
      status: 'ok',
      message: null,
      attemptedQueries: 0,
      succeededQueries: 0,
      pagesFetched: 0,
      hasMore: false,
      nextPageToken: null,
    };
  }

  const maxPagesPerQuery = Math.max(1, options.maxPagesPerQuery ?? 2);
  const maxRequests = Math.max(
    1,
    options.maxRequests ?? Math.min(queries.length * maxPagesPerQuery, 8)
  );

  interface QueryState {
    textQuery: string;
    pageToken: string | null;
    pages: number;
    done: boolean;
  }

  const states: QueryState[] = queries.map((textQuery) => ({
    textQuery,
    pageToken: null,
    pages: 0,
    done: false,
  }));

  const merged: GooglePlaceResult[] = [];
  const failures = new Set<GooglePlacesStatus>();
  const messages: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  let pagesFetched = 0;

  const breakerOpen = () =>
    isGooglePlacesQuotaExhaustedFor('text') || isConfigurationBlockedFor('text');

  for (let round = 0; round < maxPagesPerQuery; round += 1) {
    for (const state of states) {
      if (state.done) continue;
      if (attempted >= maxRequests) break;
      if (breakerOpen()) break;
      if (options.signal?.aborted) break;

      const outcome = await searchOne({
        textQuery: state.textQuery,
        pageSize: options.pageSize,
        pageToken: state.pageToken ?? undefined,
        bounds: options.bounds,
        center: options.center,
        radiusMeters: options.radiusMeters,
        rankPreference: options.rankPreference,
        cacheTtlMs: options.cacheTtlMs,
        signal: options.signal,
      });

      attempted += outcome.attemptedQueries ?? 1;
      succeeded += outcome.succeededQueries ?? (outcome.status === 'ok' ? 1 : 0);
      pagesFetched += outcome.pagesFetched ?? 0;
      state.pages += 1;

      for (const place of outcome.results) {
        if (merged.some((existing) => isDuplicatePlace(existing, place))) continue;
        merged.push(place);
      }

      if (outcome.status !== 'ok') {
        failures.add(outcome.status);
        if (outcome.message) messages.push(outcome.message);
        // A quota or configuration block stops every remaining query. A
        // transient failure only stops this query; another category may work.
        if (outcome.status === 'quota' || outcome.status === 'configuration') {
          state.done = true;
          break;
        }
        state.done = true;
        continue;
      }

      state.pageToken = outcome.nextPageToken ?? null;
      if (!state.pageToken) state.done = true;
    }

    if (breakerOpen() || options.signal?.aborted) break;
  }

  const hasMore = states.some((state) => !state.done && Boolean(state.pageToken));
  return outcomeFromFailures(
    merged,
    failures,
    messages,
    attempted,
    succeeded,
    pagesFetched,
    hasMore
  );
}


/**
 * Sweep one page of Philippine cities with a single query each.
 *
 * This is the practical alternative to a single nationwide query: every city
 * gets a bounded box, results are cached per city for six hours, and the page
 * stops as soon as Google reports a quota block. Cities that did not run are
 * reported so the UI never implies nationwide completeness.
 */
export async function discoverDanceStudiosInCities(options: {
  cities: readonly DanceCityAnchor[];
  /** A single query, or a rotating vocabulary across cities. */
  query?: string;
  queries?: readonly string[];
  radiusKm?: number;
  pageSize?: number;
  /**
   * `nearby` ignores the query text and runs Nearby Search (New) around each
   * city. It has a separate quota metric from Text Search, which lets the
   * locator keep browsing by radius when `SearchTextRequest` is exhausted.
   */
  method?: 'text' | 'nearby';
  signal?: AbortSignal;
}): Promise<CitySweepOutcome> {
  const method = options.method ?? 'text';
  if (!isGooglePlacesConfigured()) {
    return {
      results: [],
      status: 'not-configured',
      message:
        'Google Places discovery is not configured, so only GroovePH directory studios are shown.',
      coveredCities: [],
      failedCities: options.cities.map((city) => city.name),
      attemptedQueries: 0,
      succeededQueries: 0,
      pagesFetched: 0,
    };
  }

  if (isGooglePlacesQuotaExhaustedFor(method)) {
    return {
      ...quotaOutcome(method),
      coveredCities: [],
      failedCities: options.cities.map((city) => city.name),
    };
  }
  if (isConfigurationBlockedFor(method)) {
    return {
      ...configurationOutcome(method),
      coveredCities: [],
      failedCities: options.cities.map((city) => city.name),
    };
  }

  const queryList = Array.from(
    new Set(
      (options.queries?.length ? options.queries : [options.query ?? 'dance studio'])
        .map((query) => query.trim())
        .filter((query) => query.length > 0)
    )
  );
  if (queryList.length === 0) queryList.push('dance studio');

  const radiusKm = Math.min(Math.max(options.radiusKm ?? 20, 1), 50);
  const merged: GooglePlaceResult[] = [];
  const failures = new Set<GooglePlacesStatus>();
  const messages: string[] = [];
  const coveredCities: string[] = [];
  const failedCities: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  let pagesFetched = 0;

  for (let index = 0; index < options.cities.length; index += 2) {
    const batch = options.cities.slice(index, index + 2);
    const outcomes = await Promise.all(
      batch.map((city, offset) => {
        const center = { lat: city.latitude, lng: city.longitude };
        if (method === 'nearby') {
          return searchNearbyDancePlaces({
            center,
            radiusKm,
            pageSize: options.pageSize,
            cacheTtlMs: CITY_CACHE_TTL_MS,
            signal: options.signal,
          });
        }
        const query = queryList[(index + offset) % queryList.length];
        return searchOne({
          textQuery: `${query} in ${city.name}, Philippines`,
          pageSize: options.pageSize,
          bounds: boundsAround(center, radiusKm),
          center,
          radiusMeters: radiusKm * 1000,
          cacheTtlMs: CITY_CACHE_TTL_MS,
          signal: options.signal,
        });
      })
    );

    for (let i = 0; i < outcomes.length; i += 1) {
      const outcome = outcomes[i];
      const city = batch[i];
      attempted += outcome.attemptedQueries ?? 1;
      succeeded += outcome.succeededQueries ?? (outcome.status === 'ok' ? 1 : 0);
      pagesFetched += outcome.pagesFetched ?? 0;

      if (outcome.status === 'ok' || outcome.status === 'partial') {
        coveredCities.push(city.name);
      } else {
        failedCities.push(city.name);
      }

      for (const place of outcome.results) {
        if (merged.some((existing) => isDuplicatePlace(existing, place))) continue;
        merged.push(place);
      }
      if (outcome.status !== 'ok') {
        failures.add(outcome.status);
        if (outcome.message) messages.push(outcome.message);
      }
    }

    if (
      isGooglePlacesQuotaExhaustedFor(method) ||
      isConfigurationBlockedFor(method)
    ) {
      break;
    }
    if (options.signal?.aborted) break;
  }

  // A city skipped after the breaker opened was never attempted.
  for (const city of options.cities) {
    if (!coveredCities.includes(city.name) && !failedCities.includes(city.name)) {
      failedCities.push(city.name);
    }
  }

  const summary = outcomeFromFailures(
    merged,
    failures,
    messages,
    attempted,
    succeeded,
    pagesFetched,
    false,
    method
  );
  return { ...summary, coveredCities, failedCities };
}

/** Single-query helper used by the city/address geocode fallback. */
export async function searchGooglePlacesByText(options: {
  textQuery: string;
  bounds?: GeoBounds | null;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<GooglePlacesOutcome> {
  const query = options.textQuery.trim();
  if (!query) return { results: [], status: 'ok', message: null };
  return searchOne({
    textQuery: query,
    bounds: options.bounds ?? PHILIPPINES_BOUNDS,
    mode: 'bias',
    pageSize: options.pageSize ?? 5,
    cacheTtlMs: 10 * 60 * 1000,
    signal: options.signal,
  });
}
