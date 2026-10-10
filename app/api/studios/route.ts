import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CENTER, haversineKm, type LatLng } from '@/lib/geo';
import { CURATED_STUDIOS } from '@/lib/studios/curatedStudios';

/**
 * Rehearsal studio discovery — OpenStreetMap via the Overpass API, merged with
 * the curated dataset in lib/studios/curatedStudios.ts.
 *
 * CURATED LISTINGS
 * OpenStreetMap has no record of the six SJDM venues in that dataset, so they
 * could never appear through a tag query alone. Each response therefore merges
 * the curated rows (marked `source: "curated"`) with the community rows
 * (marked `source: "openstreetmap"`) and ranks both by distance from the
 * search centre. The dataset's provenance is documented in that file; nothing
 * here invents a studio.
 *
 * WHY OVERPASS
 * Discovery is free and needs no key or billing account. The previous
 * implementation used Google Places API (New), a paid product; this route
 * replaces it entirely, and GOOGLE_PLACES_API_KEY is no longer read anywhere in
 * the app.
 *
 * ONE REQUEST, NOT ONE PER TERM
 * The public Overpass instances are a shared, donated resource and rate-limit
 * aggressively. A parallel request per search phrase is exactly the pattern
 * that gets an IP throttled, so there is a single HTTP request here. It carries
 * a small number of statements inside one Overpass QL query, which the server
 * evaluates in one pass over the same bounding area — far cheaper than N round
 * trips.
 *
 * WHY NOT NOMINatim
 * Nominatim is a geocoder (address -> coordinate), not a POI search. Using it
 * to discover studios would mean guessing candidate names and geocoding them.
 * Overpass queries the actual POI tags, which is the right tool.
 *
 * WHAT IS QUERIED
 * Performing-arts and rehearsal venues carry their identity in OSM tags, so this
 * selects on real tag vocabulary rather than on a text search:
 *   amenity = dance / arts_centre / theatre / music_venue
 *   leisure = dance
 *   building / shop / craft / studio = dance
 *   any element carrying theatre:name
 *
 * `amenity=community_centre` and `leisure=sports_centre` were tried and REMOVED.
 * A live query over San Jose del Monte returned 20 results and not one was a
 * dance or performing-arts venue — they were "Phase 5 Homeowners Association",
 * "NC Power Bulacan", "Tierra Nova Main Clubhouse", "Villa Grande" and
 * "Caloocan City Sports Complex". Housing associations and electric companies
 * tag themselves community_centre; gyms tag themselves sports_centre. A
 * directory that offers a power office as a rehearsal studio is worse than an
 * empty one, so precision is preferred over recall here.
 *
 * CACHING
 * `revalidate` gives the framework-level cache, which is what keeps repeated
 * radius changes off the public instance: the client re-filters one already
 * fetched result set locally and only refetches when the CENTRE moves.
 *
 * DISTANCES
 * Computed with the project's own haversine (lib/geo.ts) from the search centre,
 * so the 1/3/5/10 km selector is exact rather than approximate.
 */

/**
 * Public Overpass instances, tried in order.
 *
 * A fallback list is not optional in practice: the main instance is frequently
 * saturated and answers 504, and during testing every public mirror was
 * unreachable from this host at the same time. Retrying the next one is what
 * turns a total outage into a slow response, and it also spreads load rather
 * than hammering whichever instance a user happens to hit first.
 *
 * All of these are donated, rate-limited services. `next: { revalidate }` below
 * is what keeps request volume low; do not shorten it without a reason.
 */
const OVERPASS_ENDPOINTS = [
  // Operator override, tried first. Recommended if this app ever grows heavy
  // usage: point it at your own Overpass instance rather than leaning on the
  // donated public ones. Unset in normal deployments.
  process.env.OVERPASS_API_URL,
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
].filter((u): u is string => Boolean(u));

/**
 * Give up on one instance quickly so the next gets a fair turn.
 *
 * 12s, not 30s. Measured: with a 30s per-attempt budget and three instances, a
 * total Overpass outage left the card showing "Loading studios..." for up to 90
 * seconds before any error appeared. The UI has no timeout of its own, so this
 * number IS the user's worst wait. Three instances x 12s caps it near 36s, and
 * a successful response is cached for 10 minutes, so this cost is paid rarely.
 */
const PER_ATTEMPT_TIMEOUT_S = 12;

/** Hard cap on what the UI renders, per the feature spec. */
const MAX_RESULTS = 20;

/** Upstream budget. Modest so we fail fast rather than sit in a queue. */
const QUERY_TIMEOUT_S = 25;

/** Widest search we ever ask for — the UI's maximum is 10 km. */
const MAX_RADIUS_M = 12_000;

/**
 * Overpass asks callers to identify themselves. A browser User-Agent is
 * unhelpful (and this runs server-side anyway), so the request names the
 * application and gives operators a contact point.
 */
const USER_AGENT =
  'GrooveSystem-StudioLocator/1.0 (rehearsal studio discovery; OpenStreetMap Overpass)';

export interface NormalisedPlace {
  /** "node/123", "way/456", or a curated dataset id ("curated/dojo-dance-studio"). */
  id: string;
  osmType: string;
  osmId: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  /** Where the row came from — drives the list label in the locator. */
  source: 'curated' | 'openstreetmap';
  /** Navigation link for the row. OSM rows point at the OSM element; curated
      rows point at a key-free Google Maps directions URL. */
  mapsUrl: string;
  distanceKm: number;
}

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

type Point = { lat: number; lng: number };

/** Narrow an untrusted pair into a usable coordinate, or null. */
function asPoint(lat: unknown, lng: unknown): Point | null {
  return isValidLatLng(lat, lng) ? { lat: lat as number, lng: lng as number } : null;
}

/**
 * The single Overpass query.
 *
 * `nwr` matches node, way and relation in one clause. `out center` is what lets
 * ways and relations — buildings, which is how most studios are mapped — yield a
 * usable coordinate. `tags` returns what the name and address are read from.
 */
function buildQuery(center: LatLng, radiusM: number): string {
  const around = `around:${radiusM},${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;

  return `[out:json][timeout:${QUERY_TIMEOUT_S}];
(
  nwr["amenity"~"^(dance|arts_centre|theatre|music_venue)$"](${around});
  nwr["leisure"="dance"](${around});
  nwr["building"="dance"](${around});
  nwr["shop"="dance"](${around});
  nwr["craft"="dance"](${around});
  nwr["studio"="dance"](${around});
  nwr["theatre:name"](${around});
);
out center tags;`;
}

/** Build a human-readable address from address tags, without inventing anything. */
function addressFromTags(tags: Record<string, string>): string | null {
  const full = tags['addr:full'];
  if (full) return full;

  const house = tags['addr:housenumber'];
  const street = tags['addr:street'];
  const streetLine = house && street ? `${house} ${street}` : street ?? null;
  const locality = [
    tags['addr:suburb'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:municipality'],
  ]
    .filter(Boolean)
    .join(', ');

  const parts = [streetLine, locality].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Fallback label when OSM has no street address but does record a locality. */
function localityFromTags(tags: Record<string, string>): string | null {
  return (
    tags['addr:city'] ??
    tags['addr:town'] ??
    tags['addr:municipality'] ??
    tags['addr:suburb'] ??
    tags['is_in:city'] ??
    null
  );
}

/**
 * Navigation link for curated listings.
 *
 * This is the documented, key-free Google Maps deep link (a plain web URL, not
 * the Google Maps JavaScript API and not Places API), so opening directions to
 * a curated coordinate costs nothing and needs no billing account.
 */
function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Dedupe distance for "same name effectively at the same position" checks. */
const SAME_PLACE_KM = 0.04;

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  // Optional overrides so "My Location" and a picked map centre search around
  // where the user is actually looking, not always around the default.
  const latParam = Number(request.nextUrl.searchParams.get('lat'));
  const lngParam = Number(request.nextUrl.searchParams.get('lng'));
  const center: LatLng = isValidLatLng(latParam, lngParam)
    ? { lat: latParam, lng: lngParam }
    : DEFAULT_CENTER;

  // Curated listings (lib/studios/curatedStudios.ts), included only when they
  // fall inside this route's generous 12 km search circle. The client is what
  // applies the exact 1/3/5/10 km radius; the route's wider circle is so a
  // radius change never needs a refetch.
  const curatedEntries: NormalisedPlace[] = CURATED_STUDIOS.map(
    (s): NormalisedPlace => ({
      id: `curated/${s.id}`,
      osmType: 'curated',
      osmId: 0,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      source: 'curated',
      mapsUrl: googleMapsDirectionsUrl(s.latitude, s.longitude),
      distanceKm: haversineKm(center, { lat: s.latitude, lng: s.longitude }),
    })
  )
    .filter((s) => s.distanceKm <= MAX_RADIUS_M / 1000)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const requestBody = new URLSearchParams({
    data: buildQuery(center, MAX_RADIUS_M),
  }).toString();

  let upstream: { elements?: OverpassElement[]; remark?: string } | null = null;
  let lastFailure: { busy: boolean; detail: string } | null = null;

  // Sequential on purpose: firing all mirrors at once would multiply the load on
  // already-struggling donated services instead of reducing it.
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_S * 1000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        body: requestBody,
        signal: controller.signal,
        // Ten minutes. Re-filtering by radius does not refetch; only moving the
        // centre does.
        next: { revalidate: 600 },
      });

      if (res.ok) {
        upstream = await res.json();
        break;
      }

      // 429 and 504 mean "busy", which is the shared-instance reality and is
      // worth retrying elsewhere rather than reporting as a hard failure.
      lastFailure = {
        busy: res.status === 429 || res.status === 504,
        detail: `HTTP ${res.status}`,
      };
    } catch {
      lastFailure = { busy: true, detail: 'unreachable' };
    } finally {
      clearTimeout(timer);
    }
  }

  if (!upstream) {
    const busy = lastFailure?.busy ?? true;
    // Curated listings do not depend on Overpass, so an OSM outage should not
    // blank the whole locator: return whatever curated rows are in range with a
    // warning, and only hard-fail when there is nothing at all to show.
    if (curatedEntries.length > 0) {
      return NextResponse.json(
        {
          places: curatedEntries,
          center,
          sources: ['curated'],
          attribution: '© OpenStreetMap contributors',
          warning: busy
            ? 'The OpenStreetMap community search is busy right now, so only curated listings are shown.'
            : 'OpenStreetMap community results could not be reached, so only curated listings are shown.',
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=60',
            'X-Data-Source': 'curated-fallback',
          },
        }
      );
    }
    return NextResponse.json(
      {
        error: busy
          ? 'The OpenStreetMap search service is busy. Please try again in a moment.'
          : 'Studio search could not reach OpenStreetMap. Please try again.',
        code: busy ? 'OVERPASS_RATE_LIMITED' : 'OVERPASS_UNREACHABLE',
        places: [],
      },
      { status: busy ? 429 : 502 }
    );
  }

  // Overpass reports a missing area or a geometry problem as a remark with an
  // empty element list, so an empty array is never by itself proof of failure.
  const byKey = new Map<string, NormalisedPlace>();
  // Second dedupe pass: the same venue is often mapped twice — a building as a
  // way and its entrance as a node — so an identical name at effectively the
  // same position is treated as one place. Seeded with the curated rows so an
  // OSM element that is the same venue cannot double-render a curated pin.
  const seenPositions: { name: string; lat: number; lng: number }[] =
    curatedEntries.map((s) => ({ name: s.name, lat: s.latitude, lng: s.longitude }));
  let skippedUnnamed = 0;
  let skippedNoCentre = 0;

  for (const el of upstream.elements ?? []) {
    if (!el?.type || typeof el.id !== 'number') continue;

    const tags = el.tags ?? {};
    // A rehearsal space with no name is not something a user can act on, and a
    // nameless pin is worse than an honest omission.
    const name = (tags['name'] ?? tags['official_name'] ?? tags['operator'] ?? '').trim();
    if (!name) {
      skippedUnnamed += 1;
      continue;
    }

    // Nodes carry lat/lon directly; ways and relations need `out center`.
    // asPoint returns an object rather than a pair of locals because a type
    // predicate over two arguments cannot narrow the ternary that uses it, and
    // `el.lat` is `number | undefined` regardless.
    const point = asPoint(el.lat, el.lon) ?? asPoint(el.center?.lat, el.center?.lon);
    if (!point) {
      skippedNoCentre += 1;
      continue;
    }
    const { lat, lng } = point;

    const key = `${el.type}/${el.id}`;
    if (byKey.has(key)) continue;

    // ~40 m: tight enough not to merge two neighbouring studios, loose enough to
    // catch a node pin sitting on the way that is the same building.
    if (
      seenPositions.some(
        (c) =>
          c.name.toLowerCase() === name.toLowerCase() &&
          haversineKm({ lat: c.lat, lng: c.lng }, { lat, lng }) < SAME_PLACE_KM
      )
    ) {
      continue;
    }

    byKey.set(key, {
      id: key,
      osmType: el.type,
      osmId: el.id,
      name,
      address: addressFromTags(tags) ?? localityFromTags(tags),
      latitude: lat,
      longitude: lng,
      source: 'openstreetmap',
      mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      distanceKm: haversineKm(center, { lat, lng }),
    });
    seenPositions.push({ name, lat, lng });
  }

  // Nearest first, THEN capped. Sorting before the cap is what guarantees a
  // 1 km filter still finds its results even though only 20 are sent. Curated
  // listings merge into the same ranking and are all within 12 km by the filter
  // above, so a narrowed radius never hides a curated studio from this route.
  const osmPlaces = [...byKey.values()].sort((a, b) => a.distanceKm - b.distanceKm);
  const places = [...curatedEntries, ...osmPlaces].slice(0, MAX_RESULTS);

  const truncated = curatedEntries.length + osmPlaces.length > places.length;
  const skipped = skippedUnnamed + skippedNoCentre + Number(truncated);

  return NextResponse.json(
    {
      places,
      center,
      // Per-row `source` distinguishes curated from community rows; this is the
      // summary for the footer note.
      sources:
        places.some((p) => p.source === 'curated') && places.some((p) => p.source === 'openstreetmap')
          ? ['curated', 'openstreetmap']
          : places.some((p) => p.source === 'curated')
            ? ['curated']
            : ['openstreetmap'],
      // Attribution is a licence condition of OpenStreetMap data, not a nicety.
      attribution: '© OpenStreetMap contributors',
      warning:
        skipped > 0
          ? `Some OpenStreetMap entries were skipped: ${skippedUnnamed} unnamed, ${skippedNoCentre} without a usable location, ${truncated} beyond the top ${MAX_RESULTS}.`
          : null,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=600',
        'X-Data-Source': 'curated+openstreetmap-overpass',
      },
    }
  );
}
