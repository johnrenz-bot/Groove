'use client';

/**
 * The Google Maps surface for the Studio Locator.
 *
 * This is the only file that talks to the Maps JavaScript API. It owns exactly
 * one map, one radius circle, one InfoWindow, and one marker per studio the
 * parent has in scope. The parent stays plain React state, which keeps the
 * effect dependencies honest and makes the map easy to replace in future.
 *
 * The map renders the search center, radius circle, and markers for studios
 * filtered by the parent within the selected radius.
 *
 * The component never renders a studio the parent has filtered out: `studios`
 * is already the distance-filtered list. That is deliberate — a pin outside
 * the radius would contradict the "nearby" count and the radius circle.
 *
 * The Maps API is loaded lazily from `lib/googleMaps.ts`, so server rendering
 * never touches `window`. If the script, key, or Cloud restrictions fail, the
 * map surface reports the problem and the surrounding studio list keeps
 * working.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import {
  DEFAULT_ZOOM,
  PHILIPPINES_BOUNDS,
  formatDistance,
  type LatLng,
} from '@/lib/geo';
import {
  GOOGLE_MAPS_MAP_ID,
  GoogleMapsLoadError,
  googleMapsErrorMessage,
  loadGoogleMaps,
  subscribeToGoogleMapsAuthFailure,
} from '@/lib/googleMaps';

export interface MapStudio {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  /** 'curated' | 'supabase' | 'google' - shown in the InfoWindow. */
  source?: 'curated' | 'supabase' | 'google';
  /** Directions deep link. Falls back to a coordinate link when absent. */
  mapsUrl?: string;
  /** Pre-computed Haversine distance from the current centre. */
  distanceKm?: number;
  /** Real Google Places rating, when supplied. Never invented. */
  rating?: number;
  /** Real Google Places review count, when supplied. */
  userRatingCount?: number;
  /** Google's place category, when supplied. */
  primaryType?: string | null;
}

interface Props {
  center: LatLng;
  radiusKm: number;
  /** 'nearby' draws the radius circle; 'nationwide' fits the Philippines. */
  scope?: 'nearby' | 'nationwide';
  /** Studios already filtered by the parent. */
  studios: MapStudio[];
  /** The searched centre is the device location. */
  isMyLocation: boolean;
  /** The device location, kept separately when the user searches elsewhere. */
  deviceLocation?: LatLng | null;
  /** When set, that marker is highlighted, panned to, and its InfoWindow opens. */
  focusId?: string | null;
  /** True while the parent is waiting for the next map click to move the centre. */
  picking?: boolean;
  /** Bumped when the parent wants the same centre re-fitted (e.g. repeated geolocation). */
  recenterToken?: number;
  onPickStudio: (id: string) => void;
  /** Fires on every map click; the parent decides whether a click means anything. */
  onPickCenter?: (next: LatLng) => void;
  onReady?: () => void;
  className?: string;
}

export { DEFAULT_CENTER } from '@/lib/geo';

const KM_TO_M = 1000;
const PIN_COLOR = '#f4be4d';
/** Deep enough to separate studios in the same district, but bounded. */
const SELECT_MAX_ZOOM = 17;

function currentColorScheme(): 'DARK' | 'LIGHT' {
  if (typeof document === 'undefined') return 'DARK';

  // The theme provider writes the resolved scheme to the root element's
  // `colorScheme` style. That is more reliable than the `light` class because
  // light seasonal themes (for example `classic`) do not set the class.
  const explicit = document.documentElement.style.colorScheme;
  if (explicit === 'light') return 'LIGHT';
  if (explicit === 'dark') return 'DARK';

  return document.documentElement.classList.contains('light') ? 'LIGHT' : 'DARK';
}

function svgPin(color: string, stroke = '#fff', dot = '#fff'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="26" height="34" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.4 12 32 12 32s12-11.6 12-20.1C24 5.3 18.6 0 12 0z"
      fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="${dot}"/>
  </svg>`;
}

function createStudioPin(active: boolean, name: string): HTMLDivElement {
  const pin = document.createElement('div');
  pin.className = `g-gmap-pin${active ? ' g-gmap-pin--active' : ''}`;
  pin.setAttribute('role', 'button');
  pin.setAttribute('tabindex', '0');
  pin.setAttribute('aria-label', `${name}${active ? ', selected' : ''}`);
  pin.setAttribute('aria-pressed', String(active));
  pin.dataset.studioName = name;
  pin.innerHTML = svgPin(PIN_COLOR);
  return pin;
}

function createClusterPin(count: number): HTMLDivElement {
  const cluster = document.createElement('div');
  cluster.className = 'g-gmap-cluster';
  cluster.textContent = String(count);
  cluster.setAttribute('role', 'button');
  cluster.setAttribute('tabindex', '0');
  cluster.setAttribute('aria-label', `${count} studios in this area. Zoom in.`);
  return cluster;
}

function createCenterPin(): HTMLDivElement {
  const pin = document.createElement('div');
  pin.className = 'g-gmap-pin g-gmap-pin--center';
  pin.setAttribute('aria-hidden', 'true');
  // Cream with a dark keyline so the search centre never reads as another
  // gold studio pin, even on a light basemap.
  pin.innerHTML = svgPin('#f7f0e1', '#262626', PIN_COLOR);
  return pin;
}

function createUserDot(): HTMLDivElement {
  const dot = document.createElement('div');
  dot.className = 'g-gmap-user-dot';
  dot.setAttribute('aria-hidden', 'true');

  const halo = document.createElement('span');
  halo.className = 'g-gmap-user-dot__halo';
  const core = document.createElement('span');
  core.className = 'g-gmap-user-dot__core';
  dot.append(halo, core);
  return dot;
}

function directionsUrl(studio: MapStudio): string {
  if (studio.mapsUrl) return studio.mapsUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude.toFixed(
    6
  )},${studio.longitude.toFixed(6)}`;
}

function sourceLabel(studio: MapStudio): string {
  if (studio.source === 'supabase') return 'GroovePH verified';
  if (studio.source === 'google') return 'Google Places';
  return 'Curated';
}

function humanizeType(value: string | null | undefined): string | null {
  if (!value) return null;
  const label = value.replace(/_/g, ' ').trim();
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Build the InfoWindow with DOM APIs rather than an HTML string: studio names
 * and addresses come from a database and must never be interpolated as markup.
 */
function buildInfoContent(studio: MapStudio, showDistance: boolean): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'g-gmap-info';

  const title = document.createElement('p');
  title.className = 'g-gmap-info__title';
  title.textContent = studio.name;
  wrapper.append(title);

  if (studio.address) {
    const address = document.createElement('p');
    address.className = 'g-gmap-info__address';
    address.textContent = studio.address;
    wrapper.append(address);
  }

  const meta = document.createElement('div');
  meta.className = 'g-gmap-info__meta';

  const badge = document.createElement('span');
  badge.className = `g-gmap-info__badge g-gmap-info__badge--${studio.source ?? 'curated'}`;
  badge.textContent = sourceLabel(studio);
  meta.append(badge);

  if (
    showDistance &&
    typeof studio.distanceKm === 'number' &&
    Number.isFinite(studio.distanceKm)
  ) {
    const distance = document.createElement('span');
    distance.className = 'g-gmap-info__distance';
    distance.textContent = `${formatDistance(studio.distanceKm)} away`;
    meta.append(distance);
  }

  if (typeof studio.rating === 'number' && Number.isFinite(studio.rating)) {
    const rating = document.createElement('span');
    rating.className = 'g-gmap-info__rating';
    rating.textContent =
      typeof studio.userRatingCount === 'number' && studio.userRatingCount > 0
        ? `★ ${studio.rating.toFixed(1)} (${studio.userRatingCount.toLocaleString()})`
        : `★ ${studio.rating.toFixed(1)}`;
    meta.append(rating);
  }

  wrapper.append(meta);

  const type = humanizeType(studio.primaryType);
  if (type) {
    const category = document.createElement('p');
    category.className = 'g-gmap-info__address';
    category.textContent = type;
    wrapper.append(category);
  }

  const link = document.createElement('a');
  link.className = 'g-gmap-info__link';
  link.href = directionsUrl(studio);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Directions';
  wrapper.append(link);

  return wrapper;
}

export function StudioLocatorMap({
  center,
  radiusKm,
  scope = 'nearby',
  studios,
  isMyLocation,
  deviceLocation = null,
  focusId,
  picking = false,
  recenterToken = 0,
  onPickStudio,
  onPickCenter,
  onReady,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const centerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markersRef = useRef<
    Map<
      string,
      {
        marker: google.maps.marker.AdvancedMarkerElement;
        studio: MapStudio;
        /** Present on clusters: every studio the cluster currently represents. */
        members?: MapStudio[];
      }
    >
  >(new Map());

  const focusIdRef = useRef<string | null>(focusId ?? null);
  const centeredFocusRef = useRef<string | null>(null);
  const pickingRef = useRef(picking);

  const onPickRef = useRef(onPickStudio);
  const onPickCenterRef = useRef(onPickCenter);
  const onReadyRef = useRef(onReady);

  const [mapVersion, setMapVersion] = useState(0);
  const [mapViewVersion, setMapViewVersion] = useState(0);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onPickRef.current = onPickStudio;
    onPickCenterRef.current = onPickCenter;
    onReadyRef.current = onReady;
    focusIdRef.current = focusId ?? null;
    pickingRef.current = picking;
  });

  /**
   * Open the single shared InfoWindow on a studio marker. Kept in a ref-like
   * callback so both the marker effect and the selection effect can use it
   * without recreating the map.
   */
  const showInfoWindow = useCallback(
    (
      studio: MapStudio,
      marker: google.maps.marker.AdvancedMarkerElement
    ) => {
      const map = mapRef.current;
      const infoWindow = infoWindowRef.current;
      if (!map || !infoWindow) return;

      infoWindow.setContent(buildInfoContent(studio, scope === 'nearby'));
      infoWindow.open({ map, anchor: marker, shouldFocus: false });
    },
    [scope]
  );

  // ---- create once (or again after a retry) ------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let map: google.maps.Map | null = null;
    let themeObserver: MutationObserver | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    const listeners: google.maps.MapsEventListener[] = [];

    setMapLoading(true);
    setMapError(null);

    unsubscribeAuth = subscribeToGoogleMapsAuthFailure(() => {
      if (cancelled) return;
      setMapLoading(false);
      setMapError(
        googleMapsErrorMessage(
          new GoogleMapsLoadError('auth-failure', 'Google Maps rejected this API key.')
        )
      );
    });

    void (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled) return;

        // Markers cannot be constructed until this library is registered.
        await google.maps.importLibrary('marker');
        if (cancelled) return;

        map = new google.maps.Map(container, {
          center: { lat: center.lat, lng: center.lng },
          zoom: DEFAULT_ZOOM,
          mapId: GOOGLE_MAPS_MAP_ID,
          colorScheme: currentColorScheme(),
          // Cooperative scrolling means the page keeps scrolling until the
          // user deliberately interacts with the map (Ctrl/⌘ + wheel or a
          // drag). A page-scroll trap is worse than a missing wheel zoom.
          gestureHandling: 'cooperative',
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        mapRef.current = map;

        circleRef.current = new google.maps.Circle({
          center: { lat: center.lat, lng: center.lng },
          radius: radiusKm * KM_TO_M,
          strokeColor: PIN_COLOR,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: PIN_COLOR,
          fillOpacity: 0.12,
          clickable: false,
          zIndex: 1,
        });

        infoWindowRef.current = new google.maps.InfoWindow({
          maxWidth: 300,
          pixelOffset: new google.maps.Size(0, -10),
        });

        listeners.push(
          map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (!pickingRef.current || !event.latLng) return;
            onPickCenterRef.current?.({
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            });
          })
        );

        // Marker clustering is zoom-dependent. Rebuilding after an idle keeps
        // clusters honest when the user zooms or pans instead of selecting a
        // list row. The marker effect never moves the map, so this cannot loop.
        listeners.push(
          map.addListener('idle', () => {
            if (!cancelled) setMapViewVersion((value) => value + 1);
          })
        );

        // Google's map chrome follows `colorScheme`, so switching the app
        // theme should switch the basemap too.
        themeObserver = new MutationObserver(() => {
          map?.setOptions({ colorScheme: currentColorScheme() });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'data-theme', 'data-theme-preview', 'style'],
        });

        setMapLoading(false);
        setMapVersion((value) => value + 1);
        onReadyRef.current?.();
      } catch (error) {
        if (cancelled) return;
        setMapLoading(false);
        setMapError(googleMapsErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
      themeObserver?.disconnect();
      listeners.forEach((listener) => listener.remove());

      markersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      markersRef.current = new Map();

      if (centerMarkerRef.current) {
        centerMarkerRef.current.map = null;
        centerMarkerRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }

      circleRef.current?.setMap(null);
      circleRef.current = null;

      infoWindowRef.current?.close();
      infoWindowRef.current = null;

      mapRef.current = null;
      map = null;

      // Google Maps has no `destroy()`. React owns the container, so clearing
      // the nodes it injected is the supported teardown for a remount.
      container.replaceChildren();
    };
    // `attempt` is the only intentional dependency: everything else is
    // synchronised by the effects below after `mapVersion` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ---- centre + radius circle -------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;

    if (scope === 'nationwide') {
      circle.setMap(null);
      map.fitBounds(PHILIPPINES_BOUNDS, {
        top: 48,
        right: 48,
        bottom: 48,
        left: 48,
      });
      return;
    }

    circle.setMap(map);

    const position = { lat: center.lat, lng: center.lng };
    circle.setCenter(position);
    circle.setRadius(radiusKm * KM_TO_M);

    // Fit the full radius rather than only its centre so the circle is visible
    // at every radius, including 50 km. The extra top padding leaves room for
    // the floating map controls.
    const bounds = circle.getBounds();
    if (!bounds) return;

    map.fitBounds(bounds, { top: 64, right: 48, bottom: 48, left: 48 });
  }, [mapVersion, scope, center.lat, center.lng, radiusKm, recenterToken]);

  // ---- centre marker + device location -----------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement;
    if (!AdvancedMarkerElement) return;

    const showCenterPin = scope === 'nearby' && (!isMyLocation || !deviceLocation);

    if (centerMarkerRef.current) {
      centerMarkerRef.current.position = { lat: center.lat, lng: center.lng };
      centerMarkerRef.current.map = showCenterPin ? map : null;
    } else {
      centerMarkerRef.current = new AdvancedMarkerElement({
        map: showCenterPin ? map : null,
        position: { lat: center.lat, lng: center.lng },
        content: createCenterPin(),
        title: 'Search centre',
        zIndex: 1000,
        gmpClickable: false,
      });
    }

    if (deviceLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.position = {
          lat: deviceLocation.lat,
          lng: deviceLocation.lng,
        };
        userMarkerRef.current.map = map;
      } else {
        userMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: { lat: deviceLocation.lat, lng: deviceLocation.lng },
          content: createUserDot(),
          title: 'Your location',
          zIndex: 1100,
          gmpClickable: false,
          anchorLeft: '-50%',
          anchorTop: '-50%',
        });
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }
  }, [mapVersion, scope, center.lat, center.lng, isMyLocation, deviceLocation]);

  // ---- studio markers ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement;
    if (!AdvancedMarkerElement) return;

    // Clearing first is what makes this idempotent: a radius change must not
    // leave a second copy of every pin behind.
    markersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    markersRef.current = new Map();
    infoWindowRef.current?.close();

    // Lightweight clustering so dense areas stay readable. Uses the map
    // projection when available; otherwise falls back to one pin per studio.
    // The selected studio is always rendered as its own pin: it must stay
    // visible and able to anchor the InfoWindow even when it shares a building
    // with another result.
    const focusedId = focusIdRef.current;
    const projection = map.getProjection();
    const zoom = map.getZoom() ?? DEFAULT_ZOOM;
    const scale = Math.pow(2, zoom);
    const clusters: {
      studios: MapStudio[];
      position: { lat: number; lng: number };
      x: number;
      y: number;
    }[] = [];

    if (projection) {
      studios.forEach((studio) => {
        const point = projection.fromLatLngToPoint(
          new google.maps.LatLng(studio.latitude, studio.longitude)
        );
        if (!point) {
          clusters.push({
            studios: [studio],
            position: { lat: studio.latitude, lng: studio.longitude },
            x: 0,
            y: 0,
          });
          return;
        }
        const x = point.x * scale;
        const y = point.y * scale;
        if (studio.id === focusedId) {
          clusters.push({
            studios: [studio],
            position: { lat: studio.latitude, lng: studio.longitude },
            x,
            y,
          });
          return;
        }
        const existing = clusters.find(
          (cluster) =>
            cluster.studios[0]?.id !== focusedId &&
            Math.hypot(cluster.x - x, cluster.y - y) < 60
        );
        if (existing) {
          existing.studios.push(studio);
          existing.x = (existing.x * (existing.studios.length - 1) + x) / existing.studios.length;
          existing.y = (existing.y * (existing.studios.length - 1) + y) / existing.studios.length;
          const ll = projection.fromPointToLatLng(
            new google.maps.Point(existing.x / scale, existing.y / scale)
          );
          if (ll) {
            existing.position = { lat: ll.lat(), lng: ll.lng() };
          }
        } else {
          clusters.push({
            studios: [studio],
            position: { lat: studio.latitude, lng: studio.longitude },
            x,
            y,
          });
        }
      });
    } else {
      studios.forEach((studio) => {
        clusters.push({
          studios: [studio],
          position: { lat: studio.latitude, lng: studio.longitude },
          x: 0,
          y: 0,
        });
      });
    }

    clusters.forEach((cluster) => {
      if (cluster.studios.length === 1) {
        const studio = cluster.studios[0];
        const active = focusIdRef.current === studio.id;
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: studio.latitude, lng: studio.longitude },
          content: createStudioPin(active, studio.name),
          title: studio.name,
          zIndex: active ? 900 : 0,
          gmpClickable: true,
        });

        const select = () => {
          onPickRef.current(studio.id);
          showInfoWindow(studio, marker);
        };
        marker.addEventListener('gmp-click', select);

        // Advanced markers are pointer-only by default. Mirror the click for
        // keyboard users, who can Tab onto every pin.
        (marker.content as HTMLElement | null)?.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          select();
        });

        markersRef.current.set(studio.id, { marker, studio });
      } else {
        const marker = new AdvancedMarkerElement({
          map,
          position: cluster.position,
          content: createClusterPin(cluster.studios.length),
          title: `${cluster.studios.length} studios`,
          zIndex: 500,
          gmpClickable: true,
        });

        const zoomIn = () => {
          map.setZoom((map.getZoom() ?? zoom) + 1);
          map.panTo(cluster.position);
        };
        marker.addEventListener('gmp-click', zoomIn);
        (marker.content as HTMLElement | null)?.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          zoomIn();
        });

        markersRef.current.set(`cluster-${cluster.position.lat}-${cluster.position.lng}`, {
          marker,
          studio: cluster.studios[0],
          members: cluster.studios,
        });
      }
    });

    // A marker layer was rebuilt. If a studio is still selected, re-anchor the
    // InfoWindow to its new marker instead of leaving it on a detached one.
    const focused = focusIdRef.current
      ? markersRef.current.get(focusIdRef.current)
      : null;
    if (focused) showInfoWindow(focused.studio, focused.marker);
  }, [mapVersion, mapViewVersion, studios, focusId, showInfoWindow]);

  // ---- selected marker ---------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }, id) => {
      if (id.startsWith('cluster-')) {
        marker.zIndex = 500;
        return;
      }
      const active = id === focusId;
      marker.zIndex = active ? 900 : 0;
      const pin = marker.content as HTMLElement | null;
      pin?.classList.toggle('g-gmap-pin--active', active);
      pin?.setAttribute('aria-pressed', String(active));
      const name = pin?.dataset.studioName;
      if (pin && name) {
        pin.setAttribute('aria-label', active ? `${name}, selected` : name);
      }
    });

    if (!focusId) {
      centeredFocusRef.current = null;
      infoWindowRef.current?.close();
      return;
    }

    // Centre once per selection. `mapViewVersion` changes on every idle event,
    // so re-centring unconditionally here would fight the user's own panning.
    const centreOnSelection = (position: { lat: number; lng: number }) => {
      if (centeredFocusRef.current === focusId) return;
      centeredFocusRef.current = focusId;
      map.panTo(position);
    };

    const focused = markersRef.current.get(focusId);
    if (focused) {
      centreOnSelection({
        lat: focused.studio.latitude,
        lng: focused.studio.longitude,
      });
      showInfoWindow(focused.studio, focused.marker);
      return;
    }

    const studio = studios.find((item) => item.id === focusId);
    if (!studio) {
      // The studio dropped out of the current result set; nothing to anchor.
      centeredFocusRef.current = null;
      infoWindowRef.current?.close();
      return;
    }

    // The studio is currently inside a cluster. Zoom in one step at a time;
    // each idle rebuild re-runs this effect, so the pin can separate.
    centreOnSelection({ lat: studio.latitude, lng: studio.longitude });

    const zoom = map.getZoom() ?? DEFAULT_ZOOM;
    if (zoom < SELECT_MAX_ZOOM) {
      map.setZoom(Math.min(zoom + 1, SELECT_MAX_ZOOM));
      return;
    }

    // Still clustered at the closest useful zoom. Anchor the details to the
    // cluster that contains the selection so it never dead-ends.
    for (const entry of markersRef.current.values()) {
      if (entry.members?.some((member) => member.id === focusId)) {
        showInfoWindow(studio, entry.marker);
        return;
      }
    }
  }, [mapVersion, mapViewVersion, focusId, studios, showInfoWindow]);

  // ---- cursor while picking ----------------------------------------------
  useEffect(() => {
    mapRef.current?.setOptions({
      draggableCursor: picking ? 'crosshair' : null,
    });
  }, [mapVersion, picking]);

  return (
    <div className={`relative h-full w-full ${className}`.trim()}>
      <div
        ref={containerRef}
        className="g-map h-full w-full"
        role="application"
        aria-label="Interactive Google Map showing rehearsal studios across the Philippines. Select a marker to see studio details."
      />
      <p className="sr-only">
        Use the map to pan and zoom. Studio markers can be selected for their
        name, address, distance, and directions. The studio list beside or below
        the map offers the same information in keyboard-accessible form.
      </p>

      {mapLoading && !mapError && (
        <div
          className="pointer-events-none absolute inset-0 z-[300] flex items-center justify-center bg-muted/45"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-sm)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Loading Google Map…
          </span>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-[350] flex items-center justify-center bg-muted/70 px-4">
          <div
            role="alert"
            className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-4 text-center text-xs text-muted-foreground shadow-[var(--shadow-lg)] backdrop-blur-sm"
          >
            <MapPin className="h-5 w-5 text-danger" aria-hidden="true" />
            <p className="font-semibold text-foreground">Google Map unavailable</p>
            <p>{mapError}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-brand-sunburst/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sunburst/50"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Try again
            </button>
            <p className="text-[10px] leading-relaxed text-subtle-foreground">
              Studio listings still work without the map.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudioLocatorMap;
