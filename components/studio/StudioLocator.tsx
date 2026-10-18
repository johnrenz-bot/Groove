'use client';

/**
 * The Studio Locator — one component, used by both the Coach and Client
 * dashboards.
 *
 * It replaces a hardcoded Google Maps *embed* iframe, which was a static image
 * of a pre-baked search: it could not draw a radius, could not hold markers, and
 * could not be filtered. The replacement is Leaflet + OpenStreetMap fed by
 * live Google Places results.
 *
 * The previous markup — a titled card containing a 21:9 map — is preserved. The
 * controls sit in a bar directly above the map, inside the same card, so the
 * section reads the same as before at a glance.
 *
 * WHERE THE DATA COMES FROM
 *   The server route /api/studios merges two sources, and each row carries a
 *   `source` tag so the UI can label them honestly:
 *
 *   - Curated listings (lib/studios/curatedStudios.ts): the six SJDM venues in
 *     the Groove PH Google Maps reference, transcribed by hand from that
 *     user-provided source. Free, no API key.
 *   - Community listings: OpenStreetMap, queried through the Overpass API by
 *     the server route. Free, no API key, no billing account.
 *
 *   Nothing is written back to either source, and nothing is fabricated: a
 *   curated row either exists in the reference or not, and an OSM row comes
 *   from OpenStreetMap moments ago. With no places in range the locator shows
 *   an explicit empty state rather than an invented marker, because a
 *   fabricated studio on a map is worse than no map.
 *
 * RADIUS ACCURACY
 *   The route returns everything inside its own generous search circle (12 km),
 *   measured with the project's own haversine from the search centre. The
 *   1/3/5/10 km selector then filters that list locally against the same centre,
 *   which is what makes the selector exact rather than approximate. Only moving
 *   the centre refetches; changing the radius re-filters locally, which keeps
 *   requests off the shared public Overpass instance.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Navigation, Search } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistance, haversineKm, sameCenter, type LatLng } from '@/lib/geo';
import StudioLocatorMap, { DEFAULT_CENTER, type MapStudio } from './StudioLocatorMap';

/** The radii the locator offers, in km. */
const RADII = [1, 3, 5, 10] as const;
type RadiusKm = (typeof RADII)[number];

/** SJDM city code, used as the fallback centre label. */
const DEFAULT_CENTER_LABEL = 'San Jose del Monte, Bulacan';

/**
 * A studio as returned by /api/studios — either a curated listing from the
 * Groove PH reference or a live OpenStreetMap element.
 *
 * No rating field: neither source records review scores, and inventing a
 * neutral or zero rating would be worse than showing nothing. There is
 * therefore nothing to render where a star used to be.
 */
interface StudioPlace extends MapStudio {
  /** 'curated' or 'openstreetmap' — drives the source label in the list. */
  source: 'curated' | 'openstreetmap';
  mapsUrl: string;
  distanceKm: number;
}

/** Counts the route reports for entries it deliberately did not render. */
interface SkippedCounts {
  unnamed: number;
  withoutLocation: number;
  beyondLimit: number;
}

/**
 * What one `/api/studios` call settled as. Never rejects: a transport error and
 * a 5xx are both just `{ ok: false }`, so a caller cannot forget to handle one.
 */
type StudiosOutcome =
  | { ok: true; places: unknown[]; warning: string | null }
  | { ok: false; message: string };

/**
 * One call to the server route. Discovery comes from `/api/studios`, which
 * merges the curated dataset (lib/studios/curatedStudios.ts) with live
 * OpenStreetMap results; each row carries a `source` so the list can
 * distinguish curated listings from community-sourced rows.
 *
 * The centre is part of the request so that "My Location" and a picked map
 * centre search around where the user is actually looking. The radius is NOT
 * sent: the route returns everything within its own generous search circle,
 * and the 1/3/5/10 km selector filters that locally against the same centre,
 * which is what makes the selector exact rather than approximate.
 */
async function fetchStudios(center: LatLng): Promise<StudiosOutcome> {
  try {
    const params = new URLSearchParams({
      lat: String(center.lat),
      lng: String(center.lng),
    });
    const res = await fetch(`/api/studios?${params.toString()}`);

    const body = (await res.json().catch(() => null)) as {
      places?: unknown[];
      error?: string;
      warning?: string | null;
      skipped?: SkippedCounts;
    } | null;

    if (!res.ok || !Array.isArray(body?.places)) {
      return {
        ok: false,
        message:
          body?.error ?? 'Studio search is unavailable right now. Please try again in a moment.',
      };
    }

    return { ok: true, places: body.places, warning: body.warning ?? null };
  } catch {
    return { ok: false, message: 'Studio search could not be reached. Please try again.' };
  }
}

/**
 * CLIENT-SIDE VALIDATION OF A DISCOVERY ROW.
 *
 * `/api/studios` already refuses to emit a nameless or coordinate-less OSM
 * element — it counts them and moves on, so one bad entry never fails the
 * search. This is the second gate, and it is here for a specific reason: this
 * component renders whatever the response contains, and a row with a missing
 * name or a `NaN` coordinate does not fail quietly — it becomes a nameless pin
 * in the wrong place, or a card that reads "NaN km away", or a marker Leaflet
 * throws on while adding it to the layer.
 *
 * It is deliberately the SAME rule the route applies, not a looser one, and it
 * never repairs a row: a bad row is dropped, never filled in. Inventing a name
 * or snapping a coordinate to the search centre would put a fabricated studio on
 * a map, which is worse than showing one fewer.
 */
function isUsablePlace(value: unknown): value is StudioPlace {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<StudioPlace>;

  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return false;

  const { latitude, longitude } = row;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;

  if (typeof row.id !== 'string' || !row.id) return false;
  if (typeof row.mapsUrl !== 'string' || !row.mapsUrl) return false;

  return true;
}

/**
 * The locator no longer reads `public.studios`, so `region_code`/`city_code` are
 * gone. Kept as a local alias so every existing consumer below is unchanged.
 */
type Studio = StudioPlace;

interface Nearby extends Studio {
  distanceKm: number;
}

export function StudioLocator({
  id,
  title = 'Rehearsal Studios Locator',
  subtitle = 'Verified performing arts spaces and rehearsal facilities in San Jose del Monte and Bulacan',
  padding = 'md',
  className = '',
}: {
  /** Preserves the `#studios` anchor the client home hero already links to. */
  id?: string;
  title?: string;
  subtitle?: string;
  /** `none` matches the coach dashboard's edge-to-edge map card. */
  padding?: 'none' | 'md';
  className?: string;
}) {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState(DEFAULT_CENTER_LABEL);
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(3);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // ---- data --------------------------------------------------------------
  /**
   * ONE IN-FLIGHT REQUEST PER CENTRE, SHARED ACROSS EFFECT RUNS.
   *
   * Strict Mode is `true` by default with the App Router, and it deliberately
   * runs every effect twice on mount: setup, CLEANUP, setup. A guard that only
   * remembered "which centre have I already asked for" deadlocked against that
   * sequence — the first run started the fetch, the cleanup aborted it, and the
   * second run saw the key and returned early, so the spinner never stopped.
   *
   * The ref therefore holds the REQUEST ITSELF, not a memory of one. The
   * cleanup marks this effect run as cancelled but does NOT abort the shared
   * fetch, so the second Strict Mode run attaches to the same promise and gets
   * the same answer. One network request is dispatched, the result still
   * lands, and moving the map centre replaces the entry and fetches normally.
   *
   * A FAILED entry is evicted as soon as the failure is known, so the next
   * effect run is a genuine retry rather than a replay of the error.
   */
  const inflightRef = useRef<{ key: string; promise: Promise<StudiosOutcome> } | null>(null);

  useEffect(() => {
    const centerKey = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
    let cancelled = false;

    const entry = inflightRef.current;
    let outcomePromise = entry?.promise;
    if (!outcomePromise || entry?.key !== centerKey) {
      outcomePromise = fetchStudios(center);
      const mine = outcomePromise;
      inflightRef.current = { key: centerKey, promise: mine };
      void mine.then((outcome) => {
        // Evict a failure so the same centre can be retried on the next run.
        if (!outcome.ok && inflightRef.current?.promise === mine) {
          inflightRef.current = null;
        }
      });
    }

    setLoading(true);
    setLoadError(null);

    void outcomePromise.then((outcome) => {
      if (cancelled) return;
      setLoading(false);

      if (!outcome.ok) {
        setStudios([]);
        setLoadError(outcome.message);
        return;
      }

      /**
       * VALIDATE BEFORE RENDERING.
       *
       * `filter` rather than a throw: one malformed row must not discard the
       * good ones alongside it. `isUsablePlace` is the same rule
       * `/api/studios` applies, so in practice this rejects nothing — which is
       * the point. It is the guard that means a future change to the route, a
       * cached response from an older deploy, or a partially malformed
       * upstream payload cannot put a nameless marker or a NaN coordinate on
       * the map.
       */
      const usable = outcome.places.filter(isUsablePlace);
      const rejected = outcome.places.length - usable.length;

      if (rejected > 0) {
        console.warn(
          `[studio-locator] dropped ${rejected} malformed ${rejected === 1 ? 'entry' : 'entries'} from the response; the rest were kept.`
        );
      }

      /**
       * ROUTINE COUNTS ARE NOT WARNINGS.
       *
       * The route reports how many OpenStreetMap elements it skipped —
       * unnamed buildings, elements with no usable coordinate, results
       * beyond the top N. That is what filtering discovery data IS, and it
       * happens on essentially every real search. It is reported under
       * `skipped`, not `warning`, precisely so this component does not
       * `console.warn` a complete and correct result set on every page load.
       */
      if (outcome.warning) {
        // Now only: Overpass could not be reached, or answered with a
        // remark. That IS degraded and does deserve to be noticed.
        console.warn('[studio-locator] studio search is degraded:', outcome.warning);
      }

      setStudios(usable);
    });

    return () => {
      cancelled = true;
    };
    // `center` intentionally drives the refetch: moving the map centre should
    // search around the new place. `inflightRef` is a ref, so it is stable and
    // does not belong in this list.
  }, [center]);

  // ---- filtering ---------------------------------------------------------
  const nearby = useMemo<Nearby[]>(() => {
    return studios
      .map((studio) => ({
        ...studio,
        distanceKm: haversineKm(center, {
          lat: studio.latitude,
          lng: studio.longitude,
        }),
      }))
      .filter((studio) => studio.distanceKm <= radiusKm)
      // Nearest first: the list is a distance ranking, so sorting by name would
      // defeat the reason the user narrowed the radius.
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [studios, center, radiusKm]);

  const nearestKm = useMemo(() => {
    if (studios.length === 0) return null;
    return Math.min(
      ...studios.map((s) => haversineKm(center, { lat: s.latitude, lng: s.longitude }))
    );
  }, [studios, center]);

  // ---- "My Location" -----------------------------------------------------
  const useMyLocation = useCallback(() => {
    setGeoError(null);

    // Not supported at all (insecure origin, or an old browser).
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser cannot share your location.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // Guard against re-setting an identical centre, which would make the map
        // effect re-run for no reason.
        if (!sameCenter(next, center)) setCenter(next);
        setCenterLabel('Your location');
        setIsMyLocation(true);
        setPicking(false);
        setGeoError(null);
      },
      (error) => {
        setLocating(false);
        setIsMyLocation(false);
        // PERMISSION_DENIED is the one the user can actually act on, so it gets
        // an instruction rather than a raw browser string.
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser settings, or pick a centre on the map.'
            : 'Your location could not be determined. Pick a centre on the map instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [center]);

  // ---- centre selection --------------------------------------------------
  /**
   * Choosing a centre by clicking the map.
   *
   * `picking` is the armed state: one click on the map picks, then disarms. A
   * permanently armed map would make every pan look like a selection and fight
   * the user's own navigation.
   */
  const pickCenter = useCallback(
    (next: LatLng) => {
      if (!picking) return;
      if (!sameCenter(next, center)) setCenter(next);
      setPicking(false);
      setIsMyLocation(false);
      setCenterLabel('Selected location');
    },
    [picking, center]
  );

  return (
    <Card padding={padding} id={id} className={`overflow-hidden${className ? ` ${className}` : ''}`}>
      <CardHeader icon={<MapPin className="h-4 w-4" />} title={title} subtitle={subtitle} />

      {/* Controls. Above the map, inside the same card, so the section keeps the
          shape it had as a plain map panel. */}
      <div className="mb-3 mt-1 flex flex-wrap items-center gap-2 gap-y-2">
        {/* Radius */}
        <div
          className="flex items-center gap-1 rounded-full border border-border bg-muted p-1"
          role="radiogroup"
          aria-label="Search radius"
        >
          {RADII.map((km) => (
            <button
              key={km}
              type="button"
              role="radio"
              aria-checked={radiusKm === km}
              tabIndex={radiusKm === km ? 0 : -1}
              onClick={() => setRadiusKm(km)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-[var(--shadow-sm)]"
            >
              {km} km
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant={picking ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setPicking((v) => !v);
            setIsMyLocation(false);
          }}
          icon={<Navigation className="h-3.5 w-3.5" />}
          aria-pressed={picking}
        >
          {picking ? 'Click the map…' : 'Pick centre'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating}
          loading={locating}
          icon={<LocateFixed className="h-3.5 w-3.5" />}
        >
          My Location
        </Button>

        <p className="ml-auto w-full text-xs text-muted-foreground sm:w-auto" aria-live="polite">
          Centre: <span className="font-semibold text-foreground">{centerLabel}</span> ·{' '}
          {nearby.length} within {radiusKm} km
        </p>
      </div>

      {geoError && (
        <p role="status" className="mb-3 text-xs text-warning">
          {geoError}
        </p>
      )}

      {/* The map surface.

          Three things are deliberate here, and all three are containment rather
          than cosmetics:

          - An explicit height instead of `aspect-*`. An aspect ratio derives
            this box's height from the width, so the card's height was never
            known until the browser had resolved the whole grid — and in a grid
            row that feeds straight back into how tall the row is. Because the
            height is fixed from the first paint, the map, the "Loading
            studios…" overlay and the empty/error states all occupy the same box,
            so there is no layout shift to compensate for and no separate
            dynamic-import fallback height to keep in sync.
          - `isolate` creates a stacking context. Leaflet hard-codes its panes at
            z-index 200-1000; without a containing context those values compete
            with the sticky header, dropdowns and modals instead of with this
            card.
          - `overflow-hidden` clips the tile layer to the rounded box, so no map
            pixels can paint outside the card.
          */}
      <div className="relative z-0 isolate overflow-hidden rounded-xl h-[320px] md:h-[400px]">
        {/* Always mounted. An earlier version gated this on an `onReady` flag,
            which is a deadlock: the flag is only set by the map this condition
            decides whether to render. */}
        <StudioLocatorMap
          center={center}
          radiusKm={radiusKm}
          studios={nearby}
          isMyLocation={isMyLocation}
          focusId={selectedId}
          onPickStudio={setSelectedId}
          onPickCenter={pickCenter}
        />

        {loading && (
          <Overlay>
            <Loader2 className="g-spin h-5 w-5 text-accent-text" aria-hidden="true" />
            <span>Loading studios…</span>
          </Overlay>
        )}

        {!loading && loadError && (
          <Overlay>
            <MapPin className="h-5 w-5 text-danger" aria-hidden="true" />
            <span>{loadError}</span>
          </Overlay>
        )}

        {!loading && !loadError && studios.length === 0 && (
          <Overlay>
            <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-sm text-center">
              No studios are available around this centre. Try moving the centre
              or adjusting your location — the locator covers curated venues and
              OpenStreetMap listings.
            </span>
          </Overlay>
        )}

        {/* Radius applied but nothing inside it — distinct from "no studios at
            all", because the remedy is different: widen the radius. */}
        {!loading && !loadError && studios.length > 0 && nearby.length === 0 && (
          <Overlay>
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span>
              No studios within {radiusKm} km.{' '}
              {nearestKm !== null && (
                <>
                  The nearest is {formatDistance(nearestKm)} away — try a wider radius.
                </>
              )}
            </span>
          </Overlay>
        )}

        {picking && (
          <p className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-[var(--shadow-md)]">
            Click anywhere on the map to set the centre
          </p>
        )}
      </div>

      {/* Nearby list. Rendered below the map inside the card so the map keeps
          its original full-width 21:9 footprint. */}
      {!loading && !loadError && nearby.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map((studio) => {
            const selected = selectedId === studio.id;
            return (
              <li key={studio.id}>
                {/* A div with role=button rather than a <button>: the card now
                    contains a real <a> to Google Maps, and an interactive
                    control nested inside another is invalid HTML and breaks
                    keyboard activation. Enter/Space are wired explicitly so the
                    row stays operable. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(studio.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(studio.id);
                    }
                  }}
                  aria-current={selected ? 'true' : undefined}
                  className="flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-muted aria-[current]:border-accent-border aria-[current]:bg-accent-soft"
                >
                  <span className="truncate text-sm font-semibold text-foreground">
                    {studio.name}
                  </span>
                  {studio.address && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {studio.address}
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-accent-text">
                      {formatDistance(studio.distanceKm)} away
                    </span>
                    {/* Source label: curated listings vs community-sourced OSM
                        rows are kept visually distinct on purpose. */}
                    {studio.source === 'curated' ? (
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-text">
                        Curated
                      </span>
                    ) : (
                      <span
                        className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                        title="Community-sourced from OpenStreetMap"
                      >
                        OSM
                      </span>
                    )}
                  </span>
                </div>

                <a
                  href={studio.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text underline-offset-2 hover:underline"
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {studio.source === 'curated' ? 'Get directions' : 'View on OpenStreetMap'}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {/* Data-source attribution. The OSM credit is a licence condition of using
          OSM data, so it is rendered wherever results are shown — not only on
          the Leaflet attribution control, which can be collapsed. The curated
          and community rows are also labelled individually in the list. */}
      {!loading && !loadError && (
        <p className="mt-4 border-t border-divider pt-3 text-[11px] text-subtle-foreground">
          Studio details from curated listings (coordinates from the Groove PH
          Google Maps reference) and{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            © OpenStreetMap contributors
          </a>
          . No ratings, phone numbers or opening hours are shown for either
          source — confirm details with the venue before booking.
        </p>
      )}
    </Card>
  );
}

/**
 * Centred message shown above the map.
 *
 * `pointer-events-none` is essential, not cosmetic. An earlier version was a
 * full-bleed opaque layer with a backdrop blur, which sat on top of the map and
 * swallowed every pointer event — with the studio table missing, the user could
 * not zoom, pan, or pick a centre, because the overlay owned the whole surface.
 * The map stays interactive in every state; this only reports what is going on.
 */
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] -translate-y-1/2 px-6">
      <div className="mx-auto flex w-fit max-w-md flex-col items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-4 text-center text-xs text-muted-foreground shadow-[var(--shadow-lg)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export default StudioLocator;