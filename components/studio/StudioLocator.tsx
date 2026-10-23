'use client';

/**
 * The Studio Locator — one component, used by both the Coach and Client
 * dashboards.
 *
 * The map is the feature, so it is now the hero: a full-bleed 420px+ surface,
 * a floating glass toolbar for radius/centre controls, and a floating results
 * drawer instead of a list printed underneath. Marker selection opens a studio
 * preview (name, distance, source, directions) without leaving the map.
 *
 * Data still comes from `/api/studios`, which merges hand-curated SJDM listings
 * with live OpenStreetMap results. The radius selector filters locally against
 * the current centre; only moving the centre refetches.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InfoTip } from '@/components/ui/InfoTip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatDistance, haversineKm, sameCenter, type LatLng } from '@/lib/geo';
import { cn } from '@/components/shared/cn';
import StudioLocatorMap, { DEFAULT_CENTER, type MapStudio } from './StudioLocatorMap';

const RADII = [1, 3, 5, 10] as const;
type RadiusKm = (typeof RADII)[number];

const RADIUS_OPTIONS = RADII.map((km) => ({ value: km, label: `${km} km` }));

const DEFAULT_CENTER_LABEL = 'San Jose del Monte, Bulacan';

interface StudioPlace extends MapStudio {
  source: 'curated' | 'openstreetmap';
  mapsUrl: string;
  distanceKm: number;
}

interface SkippedCounts {
  unnamed: number;
  withoutLocation: number;
  beyondLimit: number;
}

type StudiosOutcome =
  | { ok: true; places: unknown[]; warning: string | null }
  | { ok: false; message: string };

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

/** Second gate against a malformed upstream row putting a pin in the wrong place. */
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

type Studio = StudioPlace;
interface Nearby extends Studio {
  distanceKm: number;
}

export function StudioLocator({
  id,
  title = 'Rehearsal Studios Locator',
  subtitle = 'Curated performing arts spaces and live OpenStreetMap results around San Jose del Monte.',
  padding = 'none',
  className = '',
}: {
  /** Preserves the `#studios` anchor the client home hero already links to. */
  id?: string;
  title?: string;
  subtitle?: string;
  /** `none` matches the edge-to-edge map card. */
  padding?: 'none' | 'md';
  className?: string;
}) {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState(DEFAULT_CENTER_LABEL);
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(3);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // Open the drawer by default only where there is room for it beside the map.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setListOpen(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  // ---- data --------------------------------------------------------------
  const inflightRef = useRef<{ key: string; promise: Promise<StudiosOutcome> } | null>(null);

  useEffect(() => {
    const centerKey = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}:${reloadToken}`;
    let cancelled = false;

    const entry = inflightRef.current;
    let outcomePromise = entry?.promise;
    if (!outcomePromise || entry?.key !== centerKey) {
      outcomePromise = fetchStudios(center);
      const mine = outcomePromise;
      inflightRef.current = { key: centerKey, promise: mine };
      void mine.then((outcome) => {
        if (!outcome.ok && inflightRef.current?.promise === mine) {
          inflightRef.current = null;
        }
      });
    }

    // `setLoading` is the fetch lifecycle for this effect: the request below is
    // the external system being synchronized, so the synchronous loading flip is
    // intentional rather than a cascading render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      const usable = outcome.places.filter(isUsablePlace);
      if (outcome.warning) {
        console.warn('[studio-locator] studio search is degraded:', outcome.warning);
      }
      setStudios(usable);
    });

    return () => {
      cancelled = true;
    };
  }, [center, reloadToken]);

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
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [studios, center, radiusKm]);

  const nearestKm = useMemo(() => {
    if (studios.length === 0) return null;
    return Math.min(
      ...studios.map((studio) => haversineKm(center, { lat: studio.latitude, lng: studio.longitude }))
    );
  }, [studios, center]);

  const selectedStudio = useMemo(
    () => nearby.find((studio) => studio.id === selectedId) ?? null,
    [nearby, selectedId]
  );

  // ---- "My Location" -----------------------------------------------------
  const useMyLocation = useCallback(() => {
    setGeoError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser cannot share your location.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!sameCenter(next, center)) setCenter(next);
        setCenterLabel('Your location');
        setIsMyLocation(true);
        setPicking(false);
        setGeoError(null);
      },
      (error) => {
        setLocating(false);
        setIsMyLocation(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser, or pick a centre on the map.'
            : 'Your location could not be determined. Pick a centre on the map instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [center]);

  // ---- centre selection --------------------------------------------------
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

  const openStudio = useCallback((studio: Studio) => {
    setSelectedId(studio.id);
    setListOpen(true);
  }, []);

  const dataSources = (
    <div className="space-y-3">
      <p>{subtitle}</p>
      <p>
        <span className="font-semibold text-foreground">Current centre:</span> {centerLabel}
        {isMyLocation ? ' (your device location)' : ''}.
      </p>
      <p>
        Results merge hand-curated SJDM listings (coordinates from the Groove PH Google Maps
        reference) with community listings from OpenStreetMap. Curated and OSM rows are labelled
        separately.
      </p>
      <p>
        Ratings, phone numbers and opening hours are not shown for either source because neither
        records them. Confirm details with the venue before booking.
      </p>
      <p>
        OpenStreetMap data is ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent-text underline underline-offset-2"
        >
          OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  );

  const countLabel = loading
    ? 'Searching…'
    : `${nearby.length} within ${radiusKm} km`;

  return (
    <Card
      padding={padding === 'none' ? 'none' : 'md'}
      id={id}
      className={cn('overflow-hidden', className)}
    >
      <CardHeader
        className="mb-0 border-b border-divider px-5 py-4 pb-4 sm:px-6"
        icon={<MapPin className="h-4 w-4" />}
        title={title}
        info={dataSources}
        infoShort={subtitle}
        infoTitle={title}
        action={
          <span className="hidden text-xs text-muted-foreground sm:inline">{countLabel}</span>
        }
      />

      <div className="relative isolate h-[420px] min-h-[420px] sm:h-[480px] lg:h-[560px]">
        <StudioLocatorMap
          center={center}
          radiusKm={radiusKm}
          studios={nearby}
          isMyLocation={isMyLocation}
          focusId={selectedStudio?.id ?? null}
          onPickStudio={(studioId) => {
            setSelectedId(studioId);
            setListOpen(true);
          }}
          onPickCenter={pickCenter}
        />

        {/* Floating glass toolbar. Everything here is an action; the centre
            name and data sources live in the header's info trigger. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex justify-center">
          <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 shadow-[var(--shadow-md)] backdrop-blur-xl">
            <SegmentedControl
              options={RADIUS_OPTIONS}
              value={radiusKm}
              onChange={(next) => setRadiusKm(next as RadiusKm)}
              ariaLabel="Search radius"
            />

            <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

            <Button
              type="button"
              variant={picking ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setPicking((value) => !value);
                setIsMyLocation(false);
              }}
              icon={<Navigation className="h-3.5 w-3.5" />}
              aria-pressed={picking}
              className="bg-card/60 backdrop-blur-sm"
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
              className="bg-card/60 backdrop-blur-sm"
            >
              My Location
            </Button>

            <span
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-text"
              aria-live="polite"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <MapPin className="h-3 w-3" aria-hidden="true" />}
              {countLabel}
            </span>
          </div>
        </div>

        {picking && (
          <p className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-[500] mx-auto w-fit rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-[var(--shadow-md)] sm:top-20">
            Click anywhere on the map to set the centre
          </p>
        )}

        {geoError && (
          <div
            role="status"
            className="absolute inset-x-3 bottom-3 z-[500] mx-auto flex max-w-md items-start gap-2 rounded-xl border border-warning/30 bg-card/95 px-3 py-2 text-xs text-warning shadow-[var(--shadow-md)] backdrop-blur-sm"
          >
            <span className="min-w-0 flex-1">{geoError}</span>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              aria-label="Dismiss location message"
              className="shrink-0 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {loading && (
          <MapNotice>
            <Loader2 className="g-spin h-5 w-5 text-accent-text" aria-hidden="true" />
            <span>Loading studios…</span>
          </MapNotice>
        )}

        {!loading && loadError && (
          <MapNotice>
            <MapPin className="h-5 w-5 text-danger" aria-hidden="true" />
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={() => setReloadToken((value) => value + 1)}>
              Retry
            </Button>
          </MapNotice>
        )}

        {!loading && !loadError && studios.length === 0 && (
          <MapNotice>
            <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span>No studios are available around this centre.</span>
            <Button size="sm" variant="outline" onClick={() => setReloadToken((value) => value + 1)}>
              Try again
            </Button>
          </MapNotice>
        )}

        {!loading && !loadError && studios.length > 0 && nearby.length === 0 && (
          <MapNotice>
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span>
              No studios within {radiusKm} km
              {nearestKm !== null ? ` — nearest is ${formatDistance(nearestKm)} away.` : '.'}
            </span>
            <Button size="sm" variant="outline" onClick={() => setRadiusKm(10)}>
              Widen to 10 km
            </Button>
          </MapNotice>
        )}

        {/* Results drawer: floating over the map, not printed underneath it. */}
        {!loading && !loadError && nearby.length > 0 && (
          <>
            {!listOpen && (
              <button
                type="button"
                onClick={() => setListOpen(true)}
                className="absolute bottom-3 left-3 z-[500] inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-md)] backdrop-blur-xl transition hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Layers className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                Studios
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {nearby.length}
                </span>
              </button>
            )}

            {listOpen && (
              <div className="absolute inset-x-3 bottom-3 z-[500] flex max-h-[52%] flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[var(--shadow-lg)] backdrop-blur-xl lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-24 lg:max-h-none lg:w-[336px]">
                <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Nearby studios</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {centerLabel} · {nearby.length} within {radiusKm} km
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setListOpen(false)}
                    aria-label="Hide studio list"
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="g-scroll flex-1 space-y-2 overflow-y-auto p-3">
                  {selectedStudio && (
                    <div className="rounded-xl border border-accent-border bg-card p-3 shadow-[var(--shadow-sm)]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-bold text-foreground">
                          {selectedStudio.name}
                        </p>
                        <span className="shrink-0 text-[11px] font-semibold text-accent-text">
                          {formatDistance(selectedStudio.distanceKm)}
                        </span>
                      </div>
                      {selectedStudio.address && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {selectedStudio.address}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            selectedStudio.source === 'curated'
                              ? 'bg-accent-soft text-accent-text'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {selectedStudio.source === 'curated' ? 'Curated' : 'OpenStreetMap'}
                        </span>
                        <a
                          href={selectedStudio.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground transition hover:bg-accent-hover"
                        >
                          Get directions
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {nearby.map((studio) => {
                      const selected = studio.id === selectedId;
                      return (
                        <li key={studio.id}>
                          <button
                            type="button"
                            onClick={() => openStudio(studio)}
                            aria-current={selected ? 'true' : undefined}
                            className={cn(
                              'group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors',
                              'hover:border-border hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                              selected && 'border-accent-border bg-card/80'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                                selected ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent-text'
                              )}
                              aria-hidden="true"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-foreground">
                                {studio.name}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {formatDistance(studio.distanceKm)} away
                                {studio.source === 'curated' && (
                                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 font-semibold text-accent-text">
                                    Curated
                                  </span>
                                )}
                              </span>
                            </span>
                            <ArrowUpRight
                              className="h-3.5 w-3.5 shrink-0 text-subtle-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text motion-reduce:transform-none"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-divider px-4 py-2.5 text-[10px] text-subtle-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    Data sources
                    <InfoTip
                      title="Studio data sources"
                      short="Curated listings plus live OpenStreetMap results."
                      details={dataSources}
                    />
                  </span>
                  <span className="tabular-nums">{formatDistance(radiusKm)} radius</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function MapNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] -translate-y-1/2 px-4">
      <div className="pointer-events-auto mx-auto flex w-fit max-w-md flex-col items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-4 text-center text-xs text-muted-foreground shadow-[var(--shadow-lg)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export default StudioLocator;
