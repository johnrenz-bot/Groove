/**
 * Google Maps JavaScript API loader.
 *
 * A single promise is shared by every map/geocoder on the page, because the
 * Maps JavaScript API may only be bootstrapped once per document. Loading it
 * twice logs a warning and can leave the second consumer without libraries.
 *
 * Nothing here runs at module-evaluation time. The script is only requested
 * from a client effect or a user event, so server rendering never depends on
 * `window` or on a network call.
 */

export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

/**
 * Advanced Markers require a Map ID. `DEMO_MAP_ID` is Google's documented
 * development Map ID; production deployments can set
 * `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to an ID created in the Google Cloud
 * console (which also enables Cloud-based map styling).
 */
export const GOOGLE_MAPS_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID';

export type GoogleMapsErrorCode = 'missing-key' | 'load-failed' | 'auth-failure';

export class GoogleMapsLoadError extends Error {
  readonly code: GoogleMapsErrorCode;

  constructor(code: GoogleMapsErrorCode, message: string) {
    super(message);
    this.name = 'GoogleMapsLoadError';
    this.code = code;
  }
}

type AuthFailureListener = () => void;

const authFailureListeners = new Set<AuthFailureListener>();
let loadPromise: Promise<typeof google.maps> | null = null;

declare global {
  interface Window {
    google?: typeof google;
    gm_authFailure?: () => void;
    __grooveGoogleMapsReady?: () => void;
  }
}

function notifyAuthFailure() {
  authFailureListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A listener must never stop the others from being told.
    }
  });
}

/**
 * Google calls `window.gm_authFailure` when the key is invalid, is not enabled
 * for Maps JavaScript API, or is blocked by its HTTP-referrer restriction.
 * Without this the failure is easy to miss because the script itself loads.
 */
function installAuthFailureHandler() {
  if (typeof window === 'undefined') return;
  if (window.gm_authFailure) return;

  window.gm_authFailure = () => {
    notifyAuthFailure();
  };
}

export function subscribeToGoogleMapsAuthFailure(
  listener: AuthFailureListener
): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

/**
 * Load the Maps JavaScript API once and resolve with `google.maps`.
 *
 * The callback bootstrap is used rather than an arbitrary polling loop: the
 * API calls the named global when its modules are ready, including when the
 * request is served from cache.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new GoogleMapsLoadError('load-failed', 'Google Maps can only load in the browser.')
    );
  }

  // Already bootstrapped (for example by a previous map mount).
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) return loadPromise;

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(
      new GoogleMapsLoadError(
        'missing-key',
        'Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and restart the app.'
      )
    );
  }

  installAuthFailureHandler();

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const callbackName = '__grooveGoogleMapsReady';
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-groove-google-maps="true"]'
    );

    let settled = false;
    let script: HTMLScriptElement | null = null;

    const cleanup = () => {
      window.clearTimeout(timer);
      delete window[callbackName];
      script?.remove();
    };

    const finish = (error?: GoogleMapsLoadError) => {
      if (settled) return;
      settled = true;
      if (error) {
        cleanup();
        loadPromise = null;
        reject(error);
      } else {
        window.clearTimeout(timer);
        delete window[callbackName];
        resolve(window.google.maps);
      }
    };

    // 20s is long enough for a cold API load on a slow connection and short
    // enough that a blocked/adblocked request does not leave a dead map.
    const timer = window.setTimeout(() => {
      finish(
        new GoogleMapsLoadError(
          'load-failed',
          'Google Maps took too long to load. Check your connection and try again.'
        )
      );
    }, 20_000);

    window[callbackName] = () => {
      if (window.google?.maps) finish();
      else
        finish(
          new GoogleMapsLoadError(
            'load-failed',
            'Google Maps loaded without its map modules. Please try again.'
          )
        );
    };

    // A previous attempt that failed left a script in the document. Remove it
    // so this attempt is not tied to a dead request.
    existing?.remove();

    script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}` +
      '&v=weekly' +
      '&loading=async' +
      `&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.dataset.grooveGoogleMaps = 'true';
    script.addEventListener('error', () => {
      finish(
        new GoogleMapsLoadError(
          'load-failed',
          'Google Maps could not load. Check your connection or disable any blocker, then try again.'
        )
      );
    });

    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Human-readable copy for every Google Maps failure the locator can hit. */
export function googleMapsErrorMessage(error: unknown): string {
  if (error instanceof GoogleMapsLoadError) {
    if (error.code === 'missing-key') return error.message;
    if (error.code === 'auth-failure') {
      return 'Google Maps rejected this API key. Check that billing is enabled, that Maps JavaScript API and Geocoding API are enabled, and that this website is allowed by the key restriction.';
    }
    return error.message;
  }
  return 'Google Maps is unavailable right now. Please try again.';
}
