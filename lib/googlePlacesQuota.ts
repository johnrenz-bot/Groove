export type GooglePlacesMethod = 'text' | 'nearby' | 'autocomplete' | 'details';

export type GooglePlacesDiscoveryMethod = 'text' | 'nearby' | 'autocomplete';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
export const CONFIGURATION_COOLDOWN_MS = 5 * 60 * 1000;
export let quotaCooldownMs = DEFAULT_QUOTA_COOLDOWN_MS;

export interface MethodState {
  quotaUntil: number;
  quotaRetryAt: string | null;
  quotaDaily: boolean;
  quotaLogged: boolean;
  configurationUntil: number;
  configurationMessage: string | null;
  configurationLogged: boolean;
}

export function initialState(): MethodState {
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

export const methodStates: Record<GooglePlacesMethod, MethodState> = {
  text: initialState(),
  nearby: initialState(),
  autocomplete: initialState(),
  details: initialState(),
};

export const METHOD_LABELS: Record<GooglePlacesMethod, string> = {
  text: 'Google Places Text Search',
  nearby: 'Google Places Nearby Search',
  autocomplete: 'Google Places Autocomplete',
  details: 'Google Places Place Details',
};

export function methodLabel(method: GooglePlacesMethod): string {
  return METHOD_LABELS[method];
}

/** Details are part of the autocomplete flow; the public outcome names that flow. */
export function publicMethod(method: GooglePlacesMethod): GooglePlacesDiscoveryMethod {
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

export function isConfigurationBlockedFor(method: GooglePlacesMethod): boolean {
  return Date.now() < methodStates[method].configurationUntil;
}

export function markQuotaExhaustedFor(
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

export function markConfigurationBlockedFor(method: GooglePlacesMethod, message: string): void {
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