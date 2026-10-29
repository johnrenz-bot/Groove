/**
 * Geospatial helpers for the Studio Locator.
 *
 * Kept free of React and of Google Maps so the maths is testable on its own and
 * can be reused by anything that needs "how far is this".
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine. Chosen over a map-instance helper for two reasons: it is pure and
 * callable outside a map (the list view needs distances for studios it may not
 * have rendered a marker for), and it does not depend on a map having finished
 * initialising.
 *
 * The `asin(sqrt(...))` form is used rather than `atan2(...)` because near-zero
 * distances (two studios in the same building) stay well away from the
 * cancellation error the `acos` form suffers from. It remains accurate for the
 * inter-island distances a nationwide view can show.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance formatted for the list: metres below 1 km, otherwise km to 1dp. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * True when two coordinates are close enough to be the same place.
 *
 * Guards `setCenter`, which recentres the map. A map is happy to be told to
 * pan to a coordinate that differs from the current one by a rounding error,
 * and would still animate, which in turn can re-render the list. This stops
 * that feedback loop at the source.
 */
export function sameCenter(a: LatLng | null, b: LatLng | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

/** A north/south/east/west viewport, matching Google Maps' bounds literal. */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * San Jose del Monte, Bulacan — the Studio Locator's default centre.
 * Matches the SJDM Poblacion coordinate from the Groove PH reference.
 */
export const DEFAULT_CENTER: LatLng = { lat: 14.8139, lng: 121.0453 };

/** Default zoom when opening nearby radius around DEFAULT_CENTER. */
export const DEFAULT_ZOOM = 12;

/**
 * Approximate bounding box of the Philippines, including the waters between
 * the islands (Batanes in the north down to Tawi-Tawi in the south).
 *
 * Used to (a) keep a nationwide Supabase query inside the country, (b) reject
 * stray rows whose coordinates were entered in the wrong country, and (c) frame
 * the map when "Nationwide" is selected. It is intentionally generous so a
 * legitimate coastal or island venue is never dropped.
 */
export const PHILIPPINES_BOUNDS: GeoBounds = {
  north: 21.5,
  south: 4.2,
  east: 127.0,
  west: 114.0,
};

/** True when a coordinate falls inside the Philippines bounding box. */
export function isWithinPhilippines(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= PHILIPPINES_BOUNDS.south &&
    lat <= PHILIPPINES_BOUNDS.north &&
    lng >= PHILIPPINES_BOUNDS.west &&
    lng <= PHILIPPINES_BOUNDS.east
  );
}

/** Validate a viewport before it is trusted as a query bound. */
export function isValidBounds(
  value: Partial<GeoBounds> | null | undefined
): value is GeoBounds {
  if (!value) return false;
  const { north, south, east, west } = value;
  return (
    typeof north === 'number' &&
    typeof south === 'number' &&
    typeof east === 'number' &&
    typeof west === 'number' &&
    Number.isFinite(north) &&
    Number.isFinite(south) &&
    Number.isFinite(east) &&
    Number.isFinite(west) &&
    north > south &&
    east > west &&
    north <= 90 &&
    south >= -90 &&
    east <= 180 &&
    west >= -180
  );
}

/**
 * A viewport that encloses a radius around a centre.
 *
 * Used for Google Text Search, which accepts a rectangle for
 * `locationRestriction` but not a circle. The 10% margin covers the difference
 * between a square and a circle; exact circle membership is still enforced with
 * `haversineKm` after the response arrives.
 */
export function boundsAround(center: LatLng, radiusKm: number): GeoBounds {
  const margin = 1.1;
  const latDelta = (radiusKm / 111.32) * margin;
  const lngScale = Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  const lngDelta = (radiusKm / (111.32 * lngScale)) * margin;

  return {
    north: Math.min(90, center.lat + latDelta),
    south: Math.max(-90, center.lat - latDelta),
    east: Math.min(180, center.lng + lngDelta),
    west: Math.max(-180, center.lng - lngDelta),
  };
}

/** The point at the middle of a viewport. */
export function boundsCenter(bounds: GeoBounds): LatLng {
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };
}

/**
 * True when two viewports describe the same area, within a tolerance that
 * ignores sub-metre float jitter from Google Maps. Prevents an idle → fetch →
 * re-render → idle feedback loop.
 */
export function sameBounds(
  a: GeoBounds | null | undefined,
  b: GeoBounds | null | undefined
): boolean {
  if (!a || !b) return a === b;
  const tolerance = 1e-6;
  return (
    Math.abs(a.north - b.north) < tolerance &&
    Math.abs(a.south - b.south) < tolerance &&
    Math.abs(a.east - b.east) < tolerance &&
    Math.abs(a.west - b.west) < tolerance
  );
}
