'use client';

/**
 * The Studio Locator — used by the Coach and Client dashboards.
 *
 * Layout: a map that fills the card with one floating panel over it. On
 * desktop the panel is docked to the left and the search controls can be folded
 * away so the results list gets the height. Below `lg` it becomes a bottom
 * sheet: collapsed it shows the current result count, expanded it splits search
 * and results into two independently scrolling tabs. The map stays interactive
 * in every state, and the zoom control is nudged above the collapsed sheet.
 *
 * Discovery: `/api/studios` owns Supabase, curated, and Google Places discovery.
 * Nearby mode searches a radius around a Philippine centre. Nationwide mode
 * shows the GroovePH directory across the country plus a rotating Google Places
 * city sweep. Coverage is described honestly in the UI.
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Globe2,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  DEFAULT_CENTER,
  formatDistance,
  haversineKm,
  isWithinPhilippines,
  sameCenter,
  type LatLng,
} from '@/lib/geo';
import { searchAddressWithNominatim } from '@/lib/nominatim';
import {
  LOCAL_PHILIPPINE_CITIES,
  PHILIPPINE_CITIES,
  POPULAR_PHILIPPINE_CITIES,
  type PhilippineCity,
} from '@/lib/studios/philippineCities';
import { cn } from '@/components/shared/cn';
import StudioLocatorMap, { type MapStudio } from './StudioLocatorMap';

const RADII = [1, 5, 10, 25, 50] as const;
const DEFAULT_CENTER_LABEL = 'San Jose del Monte, Bulacan';
const MAX_CUSTOM_RADIUS = 200;
/** A directory hit this close to a sweep city is labelled as part of that page. */
const NATIONWIDE_PAGE_CITY_RADIUS_KM = 30;

const DESCRIPTION =
  'Find dance studios, schools, academies, and performing-arts spaces across the Philippines. Search any city, municipality, province, or address, then choose a radius. GroovePH directory listings and Google Places discovery are labelled separately.';

type StudioScope = 'nearby' | 'nationwide';

type GoogleStatus =
  | 'ok'
  | 'partial'
  | 'quota'
  | 'not-configured'
  | 'configuration'
  | 'unavailable';

type GoogleMethod = 'text' | 'nearby' | 'autocomplete';

type SourceFilter = 'all' | 'directory' | 'google';

interface StudioPlace extends MapStudio {
  source: 'curated' | 'supabase' | 'google';
  mapsUrl: string;
  distanceKm: number;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string | null;
  placeId?: string | null;
  discoveryMethod?: GoogleMethod | null;
}

interface StudiosPayload {
  places: unknown[];
  warning?: string | null;
  query?: string | null;
  googleStatus?: GoogleStatus;
  googleMethod?: GoogleMethod | null;
  googleMessage?: string | null;
  googleRetryAt?: string | null;
  googleAttemptedQueries?: number;
  googleSucceededQueries?: number;
  googlePagesFetched?: number;
  googleHasMore?: boolean;
  googleDailyQuotaExhausted?: boolean;
  coverage?: string | null;
  directoryCount?: number;
  googleCount?: number;
  truncated?: number;
  page?: number | null;
  totalPages?: number | null;
  nextPage?: number | null;
  coverageCities?: string[];
  coveredCities?: string[];
  failedCities?: string[];
}

type StudiosOutcome =
  | {
      ok: true;
      places: unknown[];
      warning: string | null;
      query: string | null;
      googleStatus: GoogleStatus;
      googleMethod: GoogleMethod | null;
      googleMessage: string | null;
      googleRetryAt: string | null;
      googleAttemptedQueries: number;
      googleSucceededQueries: number;
      googlePagesFetched: number;
      googleHasMore: boolean;
      googleDailyQuotaExhausted: boolean;
      coverage: string | null;
      directoryCount: number;
      googleCount: number;
      truncated: number;
      page: number;
      totalPages: number;
      nextPage: number | null;
      coverageCities: string[];
      coveredCities: string[];
      failedCities: string[];
    }
  | { ok: false; message: string };

type GeocodeOutcome =
  | { ok: true; center: LatLng; label: string }
  | { ok: false; message: string };

async function fetchStudios(
  options: {
    scope: StudioScope;
    center: LatLng;
    radiusKm: number;
    page: number;
    query: string;
  },
  signal: AbortSignal
): Promise<StudiosOutcome> {
  try {
    const params = new URLSearchParams({
      scope: options.scope,
      radius: String(options.radiusKm),
    });
    if (options.scope === 'nearby') {
      params.set('lat', String(options.center.lat));
      params.set('lng', String(options.center.lng));
    } else {
      params.set('page', String(options.page));
    }
    if (options.query) params.set('q', options.query);

    const res = await fetch(`/api/studios?${params.toString()}`, {
      signal,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as
      | (StudiosPayload & { error?: string })
      | null;

    if (!res.ok || !Array.isArray(body?.places)) {
      return {
        ok: false,
        message:
          body?.error ??
          'Studio search is unavailable right now. Please try again in a moment.',
      };
    }

    return {
      ok: true,
      places: body.places,
      warning: body.warning ?? null,
      query: body.query ?? null,
      googleStatus: body.googleStatus ?? 'ok',
      googleMethod: body.googleMethod ?? null,
      googleMessage: body.googleMessage ?? null,
      googleRetryAt: body.googleRetryAt ?? null,
      googleAttemptedQueries: body.googleAttemptedQueries ?? 0,
      googleSucceededQueries: body.googleSucceededQueries ?? 0,
      googlePagesFetched: body.googlePagesFetched ?? 0,
      googleHasMore: body.googleHasMore ?? false,
      googleDailyQuotaExhausted: body.googleDailyQuotaExhausted ?? false,
      coverage: body.coverage ?? null,
      directoryCount: body.directoryCount ?? 0,
      googleCount: body.googleCount ?? 0,
      truncated: body.truncated ?? 0,
      page: body.page ?? 0,
      totalPages: body.totalPages ?? 0,
      nextPage: body.nextPage ?? null,
      coverageCities: Array.isArray(body.coverageCities) ? body.coverageCities : [],
      coveredCities: Array.isArray(body.coveredCities) ? body.coveredCities : [],
      failedCities: Array.isArray(body.failedCities) ? body.failedCities : [],
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Search cancelled.' };
    }
    return {
      ok: false,
      message: 'Studio search could not be reached. Please try again.',
    };
  }
}

async function geocodeWithGoogle(query: string): Promise<GeocodeOutcome> {
  try {
    const params = new URLSearchParams({ scope: 'geocode', q: query });
    const res = await fetch(`/api/studios?${params.toString()}`, {
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as
      | {
          center?: { lat?: number; lng?: number };
          label?: string;
          error?: string;
        }
      | null;

    if (
      !res.ok ||
      typeof body?.center?.lat !== 'number' ||
      typeof body.center.lng !== 'number'
    ) {
      return {
        ok: false,
        message:
          body?.error ??
          'No matching Philippine city, municipality, province, or address was found. Try a broader search.',
      };
    }

    return {
      ok: true,
      center: { lat: body.center.lat, lng: body.center.lng },
      label: body.label?.trim() || query,
    };
  } catch {
    return {
      ok: false,
      message: 'Address search could not be completed. Please try again in a moment.',
    };
  }
}

/** Gate against a malformed row putting a pin in the wrong place. */
function isUsablePlace(value: unknown): value is StudioPlace {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<StudioPlace>;

  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return false;

  const { latitude, longitude } = row;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (!isWithinPhilippines(latitude, longitude)) return false;
  if (typeof row.id !== 'string' || !row.id) return false;
  if (typeof row.mapsUrl !== 'string' || !row.mapsUrl) return false;
  if (
    row.source !== 'curated' &&
    row.source !== 'supabase' &&
    row.source !== 'google'
  ) {
    return false;
  }

  return true;
}

function sourceName(source: StudioPlace['source']): string {
  if (source === 'supabase') return 'GroovePH verified';
  if (source === 'google') return 'Google Places';
  return 'Curated listing';
}

function sourceDescription(source: StudioPlace['source']): string {
  if (source === 'google') return 'Business data from Google Places';
  if (source === 'supabase') return 'Verified GroovePH directory entry';
  return 'Reviewed GroovePH listing';
}

function humanizeType(value: string | null | undefined): string | null {
  if (!value) return null;
  const label = value.replace(/_/g, ' ').trim();
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function googleMethodLabel(method: GoogleMethod | null): string | null {
  if (method === 'nearby') return 'Nearby Search';
  if (method === 'text') return 'Text Search';
  if (method === 'autocomplete') return 'Autocomplete';
  return null;
}

/** Precise coordinates, surfaced inside a result's on-demand details. */
function coordinateLabel(point: LatLng): string {
  const lat = `${Math.abs(point.lat).toFixed(4)}° ${point.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(point.lng).toFixed(4)}° ${point.lng >= 0 ? 'E' : 'W'}`;
  return `${lat} · ${lng}`;
}

function googleStatusCopy(
  status: GoogleStatus,
  message: string | null,
  retryAt: string | null
): string | null {
  if (status === 'quota') {
    const reset = retryAt
      ? new Date(retryAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;
    return (
      message ??
      `Google Places quota is exhausted${
        reset ? ` until ${reset}` : ''
      }. GroovePH directory results are still available and are not Google results.`
    );
  }
  if (status === 'partial') {
    return (
      message ??
      'Some Google Places searches did not complete, so Google coverage may be incomplete.'
    );
  }
  if (status === 'configuration') {
    return (
      message ??
      'Google Places is not configured correctly. Only GroovePH directory studios are shown.'
    );
  }
  if (status === 'not-configured') {
    return 'Google Places discovery is not configured. Only GroovePH directory studios are shown.';
  }
  if (status === 'unavailable') {
    return (
      message ??
      'Google Places is temporarily unavailable. Only GroovePH directory studios are shown.'
    );
  }
  return null;
}

/** Drop a stale "Search cancelled." fragment without discarding other warning text. */
function stripCancellationNotice(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/Search cancelled\.?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

export function StudioLocator({
  id,
  title = 'Studio Locator',
  subtitle = DESCRIPTION,
  className = '',
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'md';
  className?: string;
}) {
  const searchId = useId();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [scope, setScope] = useState<StudioScope>('nearby');
  const [studios, setStudios] = useState<StudioPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>('ok');
  const [googleMethod, setGoogleMethod] = useState<GoogleMethod | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const [googleRetryAt, setGoogleRetryAt] = useState<string | null>(null);
  const [googlePagesFetched, setGooglePagesFetched] = useState(0);
  const [coverage, setCoverage] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(0);
  const [coveragePage, setCoveragePage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [coverageCities, setCoverageCities] = useState<string[]>([]);
  const [coveredCities, setCoveredCities] = useState<string[]>([]);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState(DEFAULT_CENTER_LABEL);
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const topSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [businessQuery, setBusinessQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  const [customRadius, setCustomRadius] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Mobile (< lg) the results live in a bottom sheet; the left filters live
  // in a drawer. Desktop (lg+) both panels dock over the full-size map, so
  // `filtersOpen` / `sheetOpen` only have visible effect below lg.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetDragRef = useRef<{ startY: number; startH: number } | null>(null);

  // ---- data fetch ---------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // Clearing first prevents a new city from briefly showing the previous
    // city's studios, which was the most misleading part of the old UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    setWarning(null);
    setGoogleStatus('ok');
    setGoogleMethod(null);
    setGoogleMessage(null);
    setGoogleRetryAt(null);
    setGooglePagesFetched(0);
    setCoverage(null);
    setTruncated(0);
    setCoveredCities([]);
    setSourceFilter('all');
    setCategoryFilter('all');
    setStudios([]);
    setSelectedId(null);

    const run = async () => {
      const outcome = await fetchStudios(
        {
          scope,
          center,
          radiusKm,
          page: scope === 'nationwide' ? coveragePage : 0,
          query: activeQuery,
        },
        controller.signal
      );
      if (cancelled || controller.signal.aborted) return;

      if (!outcome.ok) {
        setLoadError(outcome.message);
        setLoading(false);
        return;
      }

      const places = outcome.places.filter(isUsablePlace);
      setStudios(places);
      setWarning(outcome.warning);
      setGoogleStatus(outcome.googleStatus);
      setGoogleMethod(outcome.googleMethod);
      setGoogleMessage(outcome.googleMessage);
      setGoogleRetryAt(outcome.googleRetryAt);
      setGooglePagesFetched(outcome.googlePagesFetched);
      setCoverage(outcome.coverage);
      setTruncated(outcome.truncated);
      setCoveragePage(outcome.page);
      setTotalPages(outcome.totalPages);
      setCoverageCities(outcome.coverageCities);
      setCoveredCities(outcome.coveredCities);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [scope, center, radiusKm, coveragePage, reloadToken, activeQuery]);

  // ---- derived list -------------------------------------------------------
  const scopedStudios = useMemo(() => {
    const list = studios.filter(
      (studio) =>
        scope === 'nationwide' ||
        haversineKm(center, {
          lat: studio.latitude,
          lng: studio.longitude,
        }) <= radiusKm
    );

    if (scope === 'nationwide') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [studios, scope, center, radiusKm]);

  // Counts describe the full result set for this search, so the source filter
  // chips keep showing how much of each source exists while one is hidden.
  const directoryCount = useMemo(
    () => scopedStudios.filter((studio) => studio.source !== 'google').length,
    [scopedStudios]
  );
  const googleCount = useMemo(
    () => scopedStudios.filter((studio) => studio.source === 'google').length,
    [scopedStudios]
  );

  // Category chips are derived from the Google `primaryType` values that are
  // actually present in this result set — nothing is invented, and directory
  // rows without a category only appear under "All categories".
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const studio of scopedStudios) {
      const value = (studio.primaryType ?? '').trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: humanizeType(value) ?? value,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [scopedStudios]);

  const visibleStudios = useMemo(() => {
    let list = scopedStudios;
    if (sourceFilter === 'directory') {
      list = list.filter((studio) => studio.source !== 'google');
    } else if (sourceFilter === 'google') {
      list = list.filter((studio) => studio.source === 'google');
    }
    if (categoryFilter !== 'all') {
      list = list.filter(
        (studio) => (studio.primaryType ?? '').trim() === categoryFilter
      );
    }
    return list;
  }, [scopedStudios, sourceFilter, categoryFilter]);

  const selectedStudio = useMemo(
    () => visibleStudios.find((studio) => studio.id === selectedId) ?? null,
    [visibleStudios, selectedId]
  );

  const pageCityAnchors = useMemo(() => {
    const byName = new Map(PHILIPPINE_CITIES.map((city) => [city.name, city]));
    return coverageCities
      .map((name) => byName.get(name))
      .filter((city): city is PhilippineCity => Boolean(city));
  }, [coverageCities]);

  /**
   * Nationwide results mix the national directory with a regional Google
   * sample. Grouping them is the honest presentation: a studio in Davao is not
   * "near Marilao" just because both appear on the same page.
   */
  const nationwideGroups = useMemo(() => {
    if (scope !== 'nationwide') return null;

    const near: { studio: StudioPlace; cityName: string }[] = [];
    const elsewhere: StudioPlace[] = [];

    for (const studio of visibleStudios) {
      let nearestCity: { name: string; distanceKm: number } | null = null;

      for (const city of pageCityAnchors) {
        const distanceKm = haversineKm(
          { lat: studio.latitude, lng: studio.longitude },
          { lat: city.latitude, lng: city.longitude }
        );
        if (!nearestCity || distanceKm < nearestCity.distanceKm) {
          nearestCity = { name: city.name, distanceKm };
        }
      }

      if (nearestCity && nearestCity.distanceKm <= NATIONWIDE_PAGE_CITY_RADIUS_KM) {
        near.push({ studio, cityName: nearestCity.name });
      } else {
        elsewhere.push(studio);
      }
    }

    return { near, elsewhere };
  }, [scope, visibleStudios, pageCityAnchors]);

  const locationLabel = scope === 'nationwide' ? 'Philippines' : centerLabel;
  const statusCopy = googleStatusCopy(googleStatus, googleMessage, googleRetryAt);
  const googleMethodName = googleMethodLabel(googleMethod);
  // A superseded request can leave Google's "Search cancelled." message in the
  // response. It says nothing about the search now on screen, so drop it while
  // keeping any real coverage warning that shares the same string.
  const noticeCopy =
    stripCancellationNotice(warning) ?? stripCancellationNotice(statusCopy);

  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    itemRefs.current
      .get(selectedId)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  // ---- location changes ---------------------------------------------------
  const applyLocation = useCallback(
    (next: LatLng, label: string, options?: { myLocation?: boolean }) => {
      setScope('nearby');
      setPicking(false);
      setIsMyLocation(Boolean(options?.myLocation));
      setCenter((previous) => (sameCenter(previous, next) ? previous : next));
      setCenterLabel(label);
      setSelectedId(null);
      setSearchError(null);
      setGeoError(null);
      setCoveragePage(0);
      // Clear synchronously, not just in the fetch effect: a new city must not
      // paint the previous city's studios for even one frame.
      setStudios([]);
      setLoading(true);
      setWarning(null);
      setRecenterToken((value) => value + 1);
      setReloadToken((value) => value + 1);
    },
    []
  );

  const useMyLocation = useCallback(() => {
    setGeoError(null);
    setSearchError(null);

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
        if (!isWithinPhilippines(next.lat, next.lng)) {
          setGeoError(
            'Your device location is outside the Philippines. Search for a Philippine city instead.'
          );
          return;
        }
        setDeviceLocation(next);
        applyLocation(next, 'Your location', { myLocation: true });
        setSheetOpen(false);
        setFiltersOpen(false);
      },
      (error) => {
        setLocating(false);
        setIsMyLocation(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser, or search for a city or pick a centre on the map.'
            : 'Your location could not be determined. Search for a city or pick a centre on the map instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [applyLocation]);

  const pickCenter = useCallback(
    (next: LatLng) => {
      if (!picking) return;
      applyLocation(next, 'Selected location on map');
    },
    [picking, applyLocation]
  );

  const resetSearch = useCallback(() => {
    setScope('nearby');
    setCoveragePage(0);
    setRadiusKm(10);
    setSearchQuery('');
    setSearchError(null);
    setGeoError(null);
    setCustomError(null);
    setShowCustom(false);
    setPicking(false);
    setSelectedId(null);
    setIsMyLocation(false);
    setBusinessQuery('');
    setActiveQuery('');
    setBusinessError(null);
    setSourceFilter('all');
    setCategoryFilter('all');
    setFiltersOpen(true);
    setCenterLabel(DEFAULT_CENTER_LABEL);
    setCenter((previous) =>
      sameCenter(previous, DEFAULT_CENTER) ? previous : DEFAULT_CENTER
    );
    setRecenterToken((value) => value + 1);
    setReloadToken((value) => value + 1);
  }, []);

  const changeScope = useCallback((next: StudioScope) => {
    setScope(next);
    setCoveragePage(0);
    setSelectedId(null);
    setPicking(false);
    setSearchError(null);
    setGeoError(null);
    setStudios([]);
    setLoading(true);
    setWarning(null);
    setRecenterToken((value) => value + 1);
  }, []);

  const goToCoveragePage = useCallback(
    (next: number) => {
      const target = Math.max(0, next);
      if (target === coveragePage) return;
      setSelectedId(null);
      setStudios([]);
      setLoading(true);
      setWarning(null);
      setCoveragePage(target);
    },
    [coveragePage]
  );

  const chooseCity = useCallback(
    (city: PhilippineCity) => {
      const label = `${city.name}, ${city.region}`;
      setSearchQuery(label);
      applyLocation({ lat: city.latitude, lng: city.longitude }, label);
      setSuggestionsOpen(false);
      setSheetOpen(true);
      setFiltersOpen(false);
    },
    [applyLocation]
  );

  // ---- address search -----------------------------------------------------
  const searchAddress = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = searchQuery.trim();
      if (!query) {
        setSearchError('Enter a Philippine city, municipality, province, or address.');
        searchInputRef.current?.focus();
        return;
      }

      setSearching(true);
      setSearchError(null);
      setGeoError(null);

      try {
        const nominatimOutcome = await searchAddressWithNominatim(query);

        if (nominatimOutcome.ok) {
          const { place } = nominatimOutcome;
          applyLocation(
            { lat: place.lat, lng: place.lng },
            place.displayName || query
          );
          setSearchQuery(query);
          setSuggestionsOpen(false);
          setSheetOpen(true);
          setFiltersOpen(false);
          return;
        }

        // Nominatim is the primary geocoder. If it is rate-limited or cannot
        // resolve the address, try the server-side Places fallback once.
        const fallback = await geocodeWithGoogle(query);
        if (fallback.ok) {
          applyLocation(fallback.center, fallback.label);
          setSearchQuery(query);
          setSuggestionsOpen(false);
          setSheetOpen(true);
          setFiltersOpen(false);
          return;
        }

        setSearchError(
          nominatimOutcome.error === 'rate-limited'
            ? 'Address search is temporarily rate-limited. Please pick a location on the map or try again shortly.'
            : fallback.message
        );
      } catch {
        setSearchError('Address search could not be completed. Please try again in a moment.');
      } finally {
        setSearching(false);
      }
    },
    [searchQuery, applyLocation]
  );

  // ---- business-name search ----------------------------------------------
  const searchBusiness = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = businessQuery.trim();
      if (!query) {
        setBusinessError('Enter a business or studio name, for example “Kidlat Dance Studio”.');
        return;
      }

      setBusinessError(null);
      setCoveragePage(0);
      setSelectedId(null);
      setSourceFilter('all');
      setCategoryFilter('all');
      setStudios([]);
      setLoading(true);
      setWarning(null);
      setActiveQuery(query);
      setSheetOpen(true);
      setFiltersOpen(false);
      // Also bump the reload token so retrying the same name re-queries.
      setReloadToken((value) => value + 1);
    },
    [businessQuery]
  );

  const clearBusinessQuery = useCallback(() => {
    setBusinessQuery('');
    setActiveQuery('');
    setBusinessError(null);
    setCoveragePage(0);
    setSelectedId(null);
    setSourceFilter('all');
    setStudios([]);
    setLoading(true);
    setWarning(null);
    setReloadToken((value) => value + 1);
  }, []);

  const selectRadius = useCallback(
    (next: number) => {
      setRadiusKm(next);
      setShowCustom(false);
      setCoveragePage(0);
      setPicking(false);
      setSearchError(null);
      setGeoError(null);
      setSheetOpen(true);
      setFiltersOpen(false);
      if (scope !== 'nearby') setScope('nearby');
      // A radius change re-fetches. Clear the previous radius's rows in the
      // same render, otherwise the old list briefly renders under the new
      // radius label and looks like a wrong "N studios within X km" count.
      setStudios([]);
      setSelectedId(null);
      setLoading(true);
      setWarning(null);
    },
    [scope]
  );

  const applyCustomRadius = useCallback(() => {
    const value = Number(customRadius);
    if (!Number.isFinite(value) || value <= 0) {
      setCustomError('Enter a radius greater than 0 km.');
      return;
    }
    if (value > MAX_CUSTOM_RADIUS) {
      setCustomError(`The maximum radius is ${MAX_CUSTOM_RADIUS} km.`);
      return;
    }
    setCustomError(null);
    selectRadius(value);
    setShowCustom(false);
  }, [customRadius, selectRadius]);

  const openStudio = useCallback((studio: StudioPlace) => {
    setSelectedId(studio.id);
    // On phones/tablets, collapse the sheet so the focused marker is visible.
    setSheetOpen(false);
    setSheetHeight(null);
  }, []);

  const focusSearch = useCallback(() => {
    // The top search bar is the primary entry point at every width.
    if (topSearchInputRef.current) {
      topSearchInputRef.current.focus();
      return;
    }
    searchInputRef.current?.focus();
  }, []);

  /** City shortcuts for the top-bar autocomplete (existing static list only). */
  const topSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return PHILIPPINE_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.region.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  /** Drag-to-resize for the mobile results sheet (ignored on desktop). */
  const sheetOnPointerDown = (event: React.PointerEvent) => {
    if (window.innerWidth >= 1024) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0;
    sheetDragRef.current = { startY: event.clientY, startH: height };
    setSheetDragging(true);
  };

  const sheetOnPointerMove = (event: React.PointerEvent) => {
    const drag = sheetDragRef.current;
    if (!drag) return;
    const container = sheetRef.current?.parentElement;
    const max = container ? Math.round(container.clientHeight * 0.85) : 600;
    const next = Math.min(max, Math.max(84, drag.startH + (drag.startY - event.clientY)));
    setSheetHeight(next);
  };

  const sheetOnPointerUp = () => {
    if (!sheetDragRef.current) return;
    sheetDragRef.current = null;
    setSheetDragging(false);
    if (sheetHeight !== null && sheetHeight < 160) {
      setSheetHeight(null);
      setSheetOpen(false);
    } else {
      setSheetOpen(true);
    }
  };

  // ---- result card --------------------------------------------------------
  const renderStudioCard = (
    studio: StudioPlace,
    index: number,
    regionLabel?: string
  ) => {
    const selected = studio.id === selectedId;
    const typeLabel = humanizeType(studio.primaryType);
    const reviewCount =
      typeof studio.userRatingCount === 'number' ? studio.userRatingCount : 0;
    const SourceIcon =
      studio.source === 'supabase'
        ? BadgeCheck
        : studio.source === 'google'
          ? Globe2
          : MapPin;
    const sourceIconClass =
      studio.source === 'supabase'
        ? 'text-success'
        : studio.source === 'google'
          ? 'text-info'
          : 'g-gold-text';

    return (
      <article
        key={studio.id}
        ref={(node) => {
          if (node) itemRefs.current.set(studio.id, node);
          else itemRefs.current.delete(studio.id);
        }}
        style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
        className={cn(
          'g-studio-card group relative overflow-hidden rounded-2xl  transition-[background-color,-color,box-shadow] duration-200',
          selected
            ? ' bg-brand-sunburst-soft/20 shadow-[var(--shadow-sm)]'
            : ' bg-background/45 hover: hover:bg-muted/30'
        )}
      >
        {selected && (
          <span
            className="absolute inset-y-0 left-0 w-[3px] bg-brand-sunburst"
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          onClick={() => openStudio(studio)}
          aria-pressed={selected}
          aria-label={`Show ${studio.name} on the map`}
          className="w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
        >
          <span className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums transition-colors',
                selected
                  ? 'bg-brand-sunburst text-brand-sunburst-fg'
                  : 'bg-muted text-muted-foreground group-hover:bg-brand-sunburst-soft group-hover:text-foreground'
              )}
              aria-hidden="true"
            >
              {index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-foreground">
                  {studio.name}
                </span>
                {typeof studio.rating === 'number' && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full   bg-brand-sunburst-soft/60 px-2 py-0.5 text-[11px] font-bold g-gold-text"
                    title={
                      reviewCount > 0
                        ? `${studio.rating.toFixed(1)} from ${reviewCount.toLocaleString()} reviews`
                        : `${studio.rating.toFixed(1)} rating`
                    }
                  >
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    {studio.rating.toFixed(1)}
                  </span>
                )}
              </span>

              <span className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2 break-words">
                  {studio.address ?? 'Address not published'}
                </span>
              </span>

              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                {scope === 'nearby' && (
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Navigation className="h-3 w-3 g-gold-text" aria-hidden="true" />
                    {formatDistance(studio.distanceKm)}
                  </span>
                )}
                <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                  <SourceIcon
                    className={cn('h-3.5 w-3.5 shrink-0', sourceIconClass)}
                    aria-hidden="true"
                  />
                  <span className="truncate">{sourceName(studio.source)}</span>
                </span>
                {regionLabel && (
                  <span className="text-muted-foreground">Near {regionLabel}</span>
                )}
              </span>
            </span>
          </span>
        </button>

        <div className="  px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <details className="group/details min-w-0 flex-1">
              <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-full text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                Details
                <ChevronDown
                  className="h-3 w-3 transition-transform group-open/details:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-relaxed">
                {typeLabel && (
                  <>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="min-w-0 break-words text-foreground">{typeLabel}</dd>
                  </>
                )}
                {reviewCount > 0 && (
                  <>
                    <dt className="text-muted-foreground">Reviews</dt>
                    <dd className="tabular-nums text-foreground">
                      {reviewCount.toLocaleString()}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">Source</dt>
                <dd className="min-w-0 break-words text-foreground">
                  {sourceDescription(studio.source)}
                </dd>
                <dt className="text-muted-foreground">Coordinates</dt>
                <dd className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {coordinateLabel({ lat: studio.latitude, lng: studio.longitude })}
                </dd>
                {studio.placeId && (
                  <>
                    <dt className="text-muted-foreground">Google ID</dt>
                    <dd className="break-all font-mono text-[10px] leading-relaxed text-subtle-foreground">
                      {studio.placeId}
                    </dd>
                  </>
                )}
              </dl>
            </details>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => openStudio(studio)}
                aria-pressed={selected}
                className="inline-flex h-8 items-center rounded-full px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
              >
                {selected ? 'On map' : 'Show on map'}
              </button>
              <a
                href={studio.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-full   bg-brand-sunburst-soft/50 px-2.5 text-[11px] font-semibold g-gold-text transition-colors hover:bg-brand-sunburst-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
              >
                Directions
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const pickCentre = () => {
    setPicking((value) => !value);
    setIsMyLocation(false);
    setSearchError(null);
    // Picking happens on the map, so get the panels out of the way first.
    if (!picking) {
      setSheetOpen(false);
      setFiltersOpen(true);
    }
  };

  const resultsSummary = activeQuery
    ? scope === 'nationwide'
      ? `“${activeQuery}” · nationwide`
      : `“${activeQuery}” · within ${radiusKm} km`
    : scope === 'nationwide'
      ? 'Across the Philippines'
      : `${radiusKm} km around ${centerLabel}`;

  const sourceFilters = [
    { value: 'all' as const, label: 'All', count: scopedStudios.length },
    { value: 'directory' as const, label: 'Directory', count: directoryCount },
    { value: 'google' as const, label: 'Google', count: googleCount },
  ];

  return (
    <section id={id} className={cn('g-studio-locator isolate w-full', className)}>
      <div className="relative h-[84svh] min-h-[560px] max-h-[900px] w-full overflow-hidden rounded-3xl   bg-card shadow-[var(--shadow-md)]">
        {/* Map surface ------------------------------------------------------ */}
        <div className="absolute inset-0 bg-muted/30">
          <StudioLocatorMap
            center={center}
            radiusKm={radiusKm}
            studios={visibleStudios}
            scope={scope}
            isMyLocation={isMyLocation}
            deviceLocation={deviceLocation}
            focusId={selectedStudio?.id ?? null}
            picking={picking}
            recenterToken={recenterToken}
            onPickStudio={(studioId) => setSelectedId(studioId)}
            onPickCenter={pickCenter}
          />
        </div>

        {/* Floating map chrome (desktop recentres from the left panel) */}
        <div className="pointer-events-none absolute right-3 top-24 z-[420] flex flex-col items-end gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setRecenterToken((value) => value + 1)}
            className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full   bg-card/95 px-3.5 text-xs font-semibold text-foreground shadow-[var(--shadow-sm)] backdrop-blur transition-colors hover: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
            aria-label={
              scope === 'nationwide'
                ? 'Fit the Philippines in view'
                : 'Recentre the map on the search area'
            }
            title={
              scope === 'nationwide'
                ? 'Fit the Philippines in view'
                : 'Recentre the map on the search area'
            }
          >
            <LocateFixed className="h-4 w-4 g-gold-text" aria-hidden="true" />
            {scope === 'nationwide' ? 'Fit PH' : 'Recentre'}
          </button>
        </div>

        {picking && (
          <div className="pointer-events-auto absolute left-1/2 top-24 z-[430] flex w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full   bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[var(--shadow-md)] backdrop-blur lg:left-[calc(50%+164px)]">
            <Navigation className="h-3.5 w-3.5 shrink-0 g-gold-text" aria-hidden="true" />
            <span>Tap the map to set the search centre</span>
            <button
              type="button"
              onClick={() => setPicking(false)}
              aria-label="Cancel picking a centre"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Top floating search bar ---------------------------------------- */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[520] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="g-locator-panel pointer-events-auto flex w-full max-w-[720px] flex-wrap items-center gap-2 rounded-2xl bg-card/95 px-3 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <form onSubmit={searchAddress} className="relative min-w-0 flex-1 basis-[220px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={topSearchInputRef}
                id={`${searchId}-top`}
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (searchError) setSearchError(null);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => {
                  if (topSuggestions.length > 0) setSuggestionsOpen(true);
                }}
                onBlur={() =>
                  window.setTimeout(() => setSuggestionsOpen(false), 140)
                }
                placeholder="Search city, province, or address"
                aria-label="Search by city, province, or address"
                autoComplete="off"
                className="h-10 w-full rounded-xl border border-transparent bg-background/70 pl-9 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:outline-none"
              />
              <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  aria-label="Use my current location"
                  title="Use my current location"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:bg-muted"
                >
                  <LocateFixed
                    className={cn('h-4 w-4', locating && 'animate-pulse')}
                    aria-hidden="true"
                  />
                </button>
                <Button
                  type="submit"
                  size="sm"
                  pill={false}
                  loading={searching}
                  className="rounded-lg px-3"
                >
                  Search
                </Button>
              </span>
              {suggestionsOpen && topSuggestions.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-[var(--shadow-lg)]"
                  role="listbox"
                  aria-label="City suggestions"
                >
                  {topSuggestions.map((city) => (
                    <li key={city.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          chooseCity(city);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 g-gold-text" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {city.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {city.region}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Filter results by source"
            >
              {sourceFilters.map((option) => {
                const active = sourceFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSourceFilter(option.value)}
                    title={
                      option.value === 'directory'
                        ? 'GroovePH directory entries'
                        : option.value === 'google'
                          ? 'Google Places results'
                          : 'All sources'
                    }
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none',
                      active
                        ? 'bg-brand-sunburst-soft text-foreground'
                        : 'bg-background/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                    <span className="tabular-nums">{option.count}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-background/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 g-gold-text" aria-hidden="true" />
              Filters
            </button>
          </div>
        </div>

        {/* Mobile filter drawer backdrop */}
        {filtersOpen && (
          <button
            type="button"
            aria-label="Close search filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 z-[550] bg-black/45 lg:hidden"
          >
            <span className="sr-only">Close search filters</span>
          </button>
        )}

        {/* Left floating Search Parameters panel / mobile drawer ---------- */}
        <aside
          role="region"
          aria-label="Search parameters"
          className={cn(
            'g-locator-panel absolute inset-y-0 left-0 z-[600] flex w-[min(320px,86vw)] flex-col overflow-hidden rounded-r-3xl bg-card/95 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none',
            filtersOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0 lg:inset-y-auto lg:left-4 lg:top-24 lg:bottom-4 lg:h-auto lg:w-[320px] lg:rounded-2xl'
          )}
        >
          <header className="relative shrink-0 border-b border-border/50">
            <span
              className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-sunburst/70 to-transparent"
              aria-hidden="true"
            />
            <div className="flex items-center gap-3 px-4 pb-3 pt-3 lg:px-5 lg:py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-sunburst-soft g-gold-text">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-serif text-base font-bold leading-tight tracking-tight text-foreground">
                  {title}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      loading
                        ? 'bg-muted-foreground/60'
                        : 'bg-success shadow-[0_0_0_3px_var(--success-soft)]'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {loading
                      ? 'Updating studios…'
                      : `${visibleStudios.length} ${
                          visibleStudios.length === 1 ? 'studio' : 'studios'
                        } ${
                          scope === 'nearby'
                            ? `within ${radiusKm} km`
                            : 'nationwide'
                        }`}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close search filters"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none lg:hidden"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
              {/* Search Parameters (scrolls independently) --------------- */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
                <div className="space-y-5">
                  {/* 1. Search area */}
                  <section aria-labelledby={`${searchId}-scope`} className="pb-4 border-b border-border/30">
                    <h3
                      id={`${searchId}-scope`}
                      className="text-xs font-semibold text-foreground mb-3"
                    >
                      Search area
                    </h3>
                    <SegmentedControl
                      options={[
                        { value: 'nearby', label: 'Nearby', ariaLabel: 'Search near a centre' },
                        { value: 'nationwide', label: 'Nationwide', ariaLabel: 'Browse nationwide' },
                      ]}
                      value={scope}
                      onChange={changeScope}
                      ariaLabel="Studio search area"
                      size="md"
                      className="flex w-full [&>button]:flex-1"
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {scope === 'nearby'
                        ? 'Studios around a centre you choose.'
                        : 'The GroovePH directory across the Philippines.'}
                    </p>
                  </section>

                  {/* 2. Location search */}
                  <section className="pb-4 border-b border-border/30">
                    <form onSubmit={searchAddress} className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={searchId}
                          className="text-xs font-semibold text-foreground"
                        >
                          Location
                        </label>
                        <button
                          type="button"
                          onClick={resetSearch}
                          title="Reset search"
                          className="inline-flex h-7 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          Reset
                        </button>
                      </div>

                      <div className="flex items-stretch gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <input
                            ref={searchInputRef}
                            id={searchId}
                            type="search"
                            value={searchQuery}
                            onChange={(event) => {
                              setSearchQuery(event.target.value);
                              if (searchError) setSearchError(null);
                            }}
                            placeholder="City, province, or address"
                            autoComplete="off"
                            aria-describedby={`${searchId}-location-help`}
                            className="h-10 w-full rounded-xl   bg-background/70 pl-9 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                          />
                          <button
                            type="button"
                            onClick={useMyLocation}
                            disabled={locating}
                            aria-label="Use my current location"
                            title="Use my current location"
                            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                          >
                            <LocateFixed
                              className={cn('h-4 w-4', locating && 'animate-pulse')}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                        <Button
                          type="submit"
                          size="md"
                          pill={false}
                          loading={searching}
                          className="shrink-0 rounded-xl px-4"
                        >
                          Search
                        </Button>
                      </div>

                      <p
                        id={`${searchId}-location-help`}
                        className="sr-only"
                      >
                        Search any Philippine city, province, or address.
                      </p>

                      {searchError && (
                        <p
                          role="alert"
                          className="rounded-xl bg-danger-soft px-3 py-2 text-[11px] leading-relaxed text-danger"
                        >
                          {searchError}
                        </p>
                      )}
                      {geoError && (
                        <p
                          role="status"
                          className="rounded-xl bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning"
                        >
                          {geoError}
                        </p>
                      )}
                    </form>
                  </section>

                  {/* 3. Search centre */}
                  <section className="pb-4 border-b border-border/30">
                    <div className="flex items-center gap-3 rounded-xl   bg-muted/25 px-3 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg   bg-brand-sunburst-soft g-gold-text">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          id={`${searchId}-centre`}
                          className="text-[11px] font-medium text-muted-foreground"
                        >
                          Search centre
                        </p>
                        <p
                          className="truncate text-xs font-semibold text-foreground"
                          title={locationLabel}
                        >
                          {locationLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecenterToken((value) => value + 1)}
                        aria-label="Recentre the map on the search centre"
                        title="Recentre map"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                      >
                        <Crosshair className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant={picking ? 'primary' : 'outline'}
                      size="sm"
                      pill={false}
                      onClick={pickCentre}
                      icon={<Navigation className="h-3.5 w-3.5" />}
                      className="mt-2 w-full rounded-xl"
                    >
                      {picking ? 'Cancel picking' : 'Pick centre on map'}
                    </Button>
                  </section>

                  {/* 4. Radius */}
                  {scope === 'nearby' ? (
                    <section aria-labelledby={`${searchId}-radius`} className="pb-4 border-b border-border/30">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          id={`${searchId}-radius`}
                          className="text-xs font-semibold text-foreground"
                        >
                          Radius
                        </h3>
                        <span className="rounded-full bg-brand-sunburst-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums g-gold-text">
                          {radiusKm} km
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                        {RADII.map((km) => {
                          const active = radiusKm === km && !showCustom;
                          return (
                            <button
                              key={km}
                              type="button"
                              aria-pressed={active}
                              onClick={() => selectRadius(km)}
                              className={cn(
                                'h-10 rounded-lg  text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ',
                                active
                                  ? ' bg-brand-sunburst text-brand-sunburst-fg'
                                  : ' bg-background/60 text-foreground hover: hover:bg-muted'
                              )}
                            >
                              {km} km
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          aria-pressed={
                            showCustom ||
                            !RADII.includes(radiusKm as (typeof RADII)[number])
                          }
                          onClick={() => {
                            setShowCustom((value) => !value);
                            setCustomError(null);
                          }}
                          className={cn(
                            'h-10 rounded-lg  text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ',
                            showCustom ||
                              !RADII.includes(radiusKm as (typeof RADII)[number])
                              ? ' bg-brand-sunburst text-brand-sunburst-fg'
                              : ' bg-background/60 text-foreground hover: hover:bg-muted'
                          )}
                        >
                          Custom
                        </button>
                      </div>

                      {showCustom && (
                        <div className="mt-2 flex items-center gap-2">
                          <label htmlFor="studio-custom-radius" className="sr-only">
                            Custom radius in kilometres
                          </label>
                          <input
                            id="studio-custom-radius"
                            type="number"
                            min="1"
                            max={MAX_CUSTOM_RADIUS}
                            inputMode="numeric"
                            value={customRadius}
                            onChange={(event) => {
                              setCustomRadius(event.target.value);
                              if (customError) setCustomError(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                applyCustomRadius();
                              }
                            }}
                            placeholder="15"
                            className="h-10 w-24 rounded-lg   bg-background/70 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                          />
                          <span className="text-xs text-muted-foreground">km</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={applyCustomRadius}
                            className="ml-auto"
                          >
                            Apply
                          </Button>
                        </div>
                      )}

                      {customError && (
                        <p className="mt-1.5 text-[11px] text-danger">{customError}</p>
                      )}
                    </section>
                  ) : (
                    totalPages > 1 && (
                      <section aria-labelledby={`${searchId}-regions`} className="pb-4 border-b border-border/30">
                        <h3
                          id={`${searchId}-regions`}
                          className="text-xs font-semibold text-foreground"
                        >
                          Region page
                        </h3>
                        <div className="mt-2 rounded-xl   bg-muted/25 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">
                                Page {coveragePage + 1} of {totalPages}
                              </p>
                              <p
                                className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground"
                                title={coverageCities.join(' · ')}
                              >
                                {coverageCities.length > 0
                                  ? coverageCities.join(' · ')
                                  : loading
                                    ? 'Loading regions…'
                                    : 'No region page loaded'}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => goToCoveragePage(coveragePage - 1)}
                                disabled={loading || coveragePage <= 0}
                                aria-label="Previous region page"
                                className="grid h-9 w-9 place-items-center rounded-lg   bg-background/70 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                              >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => goToCoveragePage(coveragePage + 1)}
                                disabled={loading || coveragePage >= totalPages - 1}
                                aria-label="Next region page"
                                className="grid h-9 w-9 place-items-center rounded-lg   bg-background/70 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                              >
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    )
                  )}

                  {/* 5. Studio name — optional, kept below the core filters */}
                  <section>
                    <form onSubmit={searchBusiness} className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`${searchId}-business`}
                          className="text-xs font-semibold text-foreground"
                        >
                          Studio name
                        </label>
                        <span className="text-[11px] text-muted-foreground">Optional</span>
                      </div>

                      <div className="flex items-stretch gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Globe2
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <input
                            id={`${searchId}-business`}
                            type="search"
                            value={businessQuery}
                            onChange={(event) => {
                              setBusinessQuery(event.target.value);
                              if (businessError) setBusinessError(null);
                            }}
                            placeholder="e.g. Kidlat Dance Studio"
                            autoComplete="off"
                            className="h-10 w-full rounded-lg   bg-background/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="secondary"
                          size="md"
                          pill={false}
                          className="shrink-0 rounded-lg px-4"
                        >
                          Find
                        </Button>
                      </div>

                      {businessError && (
                        <p
                          role="alert"
                          className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] leading-relaxed text-danger"
                        >
                          {businessError}
                        </p>
                      )}

                      {activeQuery && (
                        <div className="flex items-center gap-2 rounded-lg   bg-brand-sunburst-soft/35 px-2.5 py-1.5">
                          <span
                            className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground"
                            title={activeQuery}
                          >
                            Showing “{activeQuery}”
                          </span>
                          <button
                            type="button"
                            onClick={clearBusinessQuery}
                            aria-label="Clear studio name search"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </form>
                  </section>

                  {/* 6. Category — derived from real Google types in results */}
                  <section aria-labelledby={`${searchId}-category`} className="pb-4 border-b border-border/30">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        id={`${searchId}-category`}
                        className="text-xs font-semibold text-foreground"
                      >
                        Category
                      </h3>
                      {categoryFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setCategoryFilter('all')}
                          className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {categoryOptions.length === 0 ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {loading
                          ? 'Loading categories…'
                          : 'Categories appear here when the current results include Google categories.'}
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter results by category">
                        <button
                          type="button"
                          aria-pressed={categoryFilter === 'all'}
                          onClick={() => setCategoryFilter('all')}
                          className={cn(
                            'inline-flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none',
                            categoryFilter === 'all'
                              ? 'bg-brand-sunburst text-brand-sunburst-fg'
                              : 'bg-background/60 text-foreground hover:bg-muted'
                          )}
                        >
                          All categories
                          <span className="tabular-nums">{scopedStudios.length}</span>
                        </button>
                        {categoryOptions.map((option) => {
                          const active = categoryFilter === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setCategoryFilter(active ? 'all' : option.value)
                              }
                              className={cn(
                                'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none',
                                active
                                  ? 'bg-brand-sunburst text-brand-sunburst-fg'
                                  : 'bg-background/60 text-foreground hover:bg-muted'
                              )}
                            >
                              {option.label}
                              <span className="tabular-nums">{option.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {categoryFilter !== 'all' && (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        Directory listings without a category show under All categories.
                      </p>
                    )}
                  </section>

                  {/* Jump to a city */}
                  <details className="group rounded-xl   bg-background/40">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                      <MapPin className="h-4 w-4 shrink-0 g-gold-text" aria-hidden="true" />
                      Jump to a city
                      <ChevronDown
                        className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>

                    <div className="space-y-3   px-3 py-3">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Bulacan &amp; nearby
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {LOCAL_PHILIPPINE_CITIES.map((city) => (
                            <button
                              key={city.id}
                              type="button"
                              onClick={(event) => {
                                chooseCity(city);
                                const details = event.currentTarget.closest(
                                  'details'
                                ) as HTMLDetailsElement | null;
                                if (details) details.open = false;
                              }}
                              className="inline-flex h-8 items-center rounded-full   bg-background/60 px-3 text-[11px] font-medium text-foreground transition-colors hover: hover:bg-brand-sunburst-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                              title={`${city.name}, ${city.region}`}
                            >
                              {city.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Major cities
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {POPULAR_PHILIPPINE_CITIES.map((city) => (
                            <button
                              key={city.id}
                              type="button"
                              onClick={(event) => {
                                chooseCity(city);
                                const details = event.currentTarget.closest(
                                  'details'
                                ) as HTMLDetailsElement | null;
                                if (details) details.open = false;
                              }}
                              className="inline-flex h-8 items-center rounded-full   bg-background/60 px-3 text-[11px] font-medium text-foreground transition-colors hover: hover:bg-brand-sunburst-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
                              title={`${city.name}, ${city.region}`}
                            >
                              {city.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Coverage & sources — moved off the primary view. */}
                  <details className="group rounded-xl   bg-background/40">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                      <Globe2 className="h-4 w-4 shrink-0 g-gold-text" aria-hidden="true" />
                      Coverage &amp; sources
                      <ChevronDown
                        className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="space-y-2   px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p>{subtitle}</p>
                      <p>
                        GroovePH directory listings and Google Places results are always
                        labelled separately. Google radius discovery is capped at 50 km per
                        centre.
                      </p>
                      {coverage && <p className="text-subtle-foreground">{coverage}</p>}
                      {scope === 'nationwide' && totalPages > 1 && (
                        <p>
                          {coveredCities.length > 0
                            ? `Google completed ${coveredCities.length} of ${coverageCities.length} city searches on this page.`
                            : 'Google results for this page are unavailable; directory entries are unaffected.'}
                        </p>
                      )}
                      {googleMethodName && (
                        <p>
                          Google method: {googleMethodName}
                          {googlePagesFetched > 0
                            ? ` · ${googlePagesFetched} ${
                                googlePagesFetched === 1 ? 'page' : 'pages'
                              } fetched`
                            : ''}
                          {truncated > 0 ? ` · ${truncated} more not shown` : ''}.
                        </p>
                      )}
                    </div>
                  </details>
                </div>

              </div>
              </div>
            </aside>

            {/* Right floating results panel / draggable bottom sheet ------- */}
            <aside
              role="region"
              aria-label="Studio results"
              ref={sheetRef}
              style={sheetHeight !== null ? { height: sheetHeight } : undefined}
              className={cn(
                'g-locator-panel absolute inset-x-0 bottom-0 z-[500] flex flex-col overflow-hidden rounded-t-3xl bg-card/95 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[height] duration-300 ease-out motion-reduce:transition-none',
                sheetDragging && 'transition-none',
                sheetOpen ? 'h-[82%]' : 'h-[84px]',
                'lg:inset-y-auto lg:bottom-4 lg:left-auto lg:right-4 lg:top-24 lg:h-auto lg:min-h-0 lg:w-[380px] lg:rounded-2xl lg:shadow-[var(--shadow-lg)] lg:transition-none'
              )}
            >
              <header
                className="relative shrink-0 select-none border-b border-border/50"
                onPointerDown={sheetOnPointerDown}
                onPointerMove={sheetOnPointerMove}
                onPointerUp={sheetOnPointerUp}
                onPointerCancel={sheetOnPointerUp}
              >
                <span
                  className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-sunburst/70 to-transparent"
                  aria-hidden="true"
                />
                <span
                  className="mx-auto mt-1.5 block h-1 w-10 cursor-grab rounded-full bg-muted-foreground/40 active:cursor-grabbing lg:hidden"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3 px-4 pb-3 pt-3 lg:px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Studio results
                      </h3>
                      <span className="rounded-full bg-brand-sunburst-soft px-2 py-0.5 text-[11px] font-bold tabular-nums g-gold-text">
                        {visibleStudios.length}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground"
                      aria-live="polite"
                      title={loading ? undefined : resultsSummary}
                    >
                      {loading ? 'Updating studios…' : resultsSummary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetHeight(null);
                      setSheetOpen((value) => !value);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    aria-expanded={sheetOpen}
                    aria-label={sheetOpen ? 'Collapse results' : 'Expand results'}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none lg:hidden"
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-300',
                        sheetOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
                  aria-busy={loading}
                >
                  {loading && (
                    <div className="space-y-2" role="status" aria-label="Loading studios">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="animate-pulse rounded-2xl   bg-background/40 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <span className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="h-3.5 w-3/4 rounded bg-muted" />
                              <div className="h-3 w-full rounded bg-muted" />
                              <div className="flex gap-2 pt-0.5">
                                <span className="h-3 w-16 rounded-full bg-muted" />
                                <span className="h-3 w-20 rounded-full bg-muted" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!loading && loadError && (
                    <div className="rounded-2xl   bg-danger-soft/50 px-4 py-6 text-center">
                      <AlertCircle className="mx-auto h-5 w-5 text-danger" aria-hidden="true" />
                      <p className="mt-2 text-xs leading-relaxed text-danger">{loadError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setReloadToken((value) => value + 1)}
                      >
                        Try again
                      </Button>
                    </div>
                  )}

                  {!loading && !loadError && noticeCopy && (
                    <div
                      role="status"
                      className={cn(
                        'mb-2 flex items-start gap-2 rounded-xl  px-3 py-2 text-[11px] leading-relaxed',
                        googleStatus === 'quota' || googleStatus === 'configuration'
                          ? ' bg-warning-soft text-warning'
                          : ' bg-muted/45 text-muted-foreground'
                      )}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-3" title={noticeCopy}>
                        {noticeCopy}
                      </span>
                    </div>
                  )}

                  {!loading && !loadError && visibleStudios.length === 0 && (
                    <div className="rounded-2xl   bg-background/40 px-4 py-6 text-center">
                      <MapPin
                        className="mx-auto h-6 w-6 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {scopedStudios.length > 0 && sourceFilter !== 'all'
                          ? `No results from ${
                              sourceFilter === 'google' ? 'Google Places' : 'the GroovePH directory'
                            }`
                          : activeQuery
                            ? `No business matched “${activeQuery}”`
                            : scope === 'nationwide'
                              ? 'No studios in the nationwide sample yet'
                              : `No studios found within ${radiusKm} km`}
                      </p>
                      <p className="mx-auto mt-1 max-w-[19rem] text-[11px] leading-relaxed text-muted-foreground">
                        {scopedStudios.length > 0 && sourceFilter !== 'all'
                          ? `This search has ${scopedStudios.length} result${
                              scopedStudios.length === 1 ? '' : 's'
                            } in the other source. Show all sources to see them.`
                          : activeQuery
                            ? scope === 'nearby'
                              ? `Google Places has no business with that name inside ${radiusKm} km, and no directory row matches locally. Try a wider radius, another centre, or Nationwide.`
                              : 'Google Places has no business with that name in this Philippine sample, and no directory row matches locally. Try a different spelling or search by city.'
                            : scope === 'nationwide'
                              ? 'Try a city search for a denser nearby result set. Google coverage depends on available business data.'
                              : statusCopy ??
                                'Try a wider radius, another city, or pick a different centre on the map.'}
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {scopedStudios.length > 0 && sourceFilter !== 'all' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setSourceFilter('all')}
                          >
                            Show all sources
                          </Button>
                        ) : (
                          <>
                            {scope === 'nearby' && radiusKm < 50 && (
                              <Button size="sm" variant="primary" onClick={() => selectRadius(50)}>
                                Widen to 50 km
                              </Button>
                            )}
                            {activeQuery && (
                              <Button size="sm" variant="outline" onClick={clearBusinessQuery}>
                                Clear name
                              </Button>
                            )}
                            {scope === 'nearby' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => changeScope('nationwide')}
                              >
                                Nationwide
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={focusSearch}>
                                Search a city
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReloadToken((value) => value + 1)}
                            >
                              Retry
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!loading &&
                    !loadError &&
                    (scope === 'nearby' || !nationwideGroups
                      ? visibleStudios.map((studio, index) => renderStudioCard(studio, index))
                      : (
                          <>
                            {nationwideGroups.near.length > 0 && (
                              <div className="pb-2">
                                <div className="mb-1.5 flex items-center justify-between gap-2 px-1 pt-0.5">
                                  <p className="text-[11px] font-semibold text-foreground">
                                    Near this region
                                  </p>
                                  <span
                                    className="truncate text-[11px] text-muted-foreground"
                                    title={coverageCities.join(' · ')}
                                  >
                                    {coverageCities.join(' · ')}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {nationwideGroups.near.map(({ studio, cityName }, index) =>
                                    renderStudioCard(studio, index, cityName)
                                  )}
                                </div>
                              </div>
                            )}

                            {nationwideGroups.elsewhere.length > 0 && (
                              <div className="pb-1 pt-1">
                                <div className="mb-1.5 flex items-center gap-2 px-1">
                                  <p className="text-[11px] font-semibold text-foreground">
                                    Elsewhere in the Philippines
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {nationwideGroups.elsewhere.map((studio, index) =>
                                    renderStudioCard(
                                      studio,
                                      nationwideGroups.near.length + index
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ))}
                </div>
              </div>
            </aside>
        </div>
    </section>
  );
}

export default StudioLocator;
