/**
 * Geospatial helpers for the Studio Locator.
 *
 * Kept free of React and of Leaflet so the maths is testable on its own and can
 * be reused by anything that needs "how far is this".
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine. Chosen over Leaflet's own `map.distance()` for two reasons: it is
 * pure and callable outside a map instance (the list view needs distances for
 * studios it may not have rendered a marker for), and it does not depend on a
 * map having finished initialising.
 *
 * The `asin(sqrt(...))` form is used rather than `atan2(...)` because at the
 * short distances this tool deals with — up to 10 km — it stays well away from
 * the cancellation error the `acos` form suffers from for near-zero distances.
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
 * Guards `setCenter`, which recentres the map. Leaflet is happy to be told to
 * fly to a coordinate that differs from the current one by a rounding error,
 * and would still animate and fire a `moveend`, which in turn re-renders the
 * list. This stops that feedback loop at the source.
 */
export function sameCenter(a: LatLng | null, b: LatLng | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

/**
 * San Jose del Monte, Bulacan — the Studio Locator's fixed centre.
 *
 * Lives here, in the React-free module, rather than in the map component. The
 * server route /api/studios needs the same coordinate to bias its Places search,
 * and importing it from a 'use client' module works today only by luck: it would
 * risk dragging Leaflet into the server bundle. One definition, imported by the
 * map and by the route, so the search centre and the map centre cannot drift.
 *
 * Matches the SJDM Poblacion coordinate from the Groove PH Google Maps
 * reference. (An earlier value, 14.7607, 120.9941, sat ~7 km southwest in
 * Marilao/Bocaue and made every radius filter measure from the wrong spot.)
 */
export const DEFAULT_CENTER: LatLng = { lat: 14.8139, lng: 121.0453 };
