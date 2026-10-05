'use client';

/**
 * The Leaflet map surface for the Studio Locator.
 *
 * Split from <StudioLocator> so all Leaflet imperative code lives in one place
 * that owns exactly one map instance, one marker layer, and one circle. The
 * parent is plain React state and never touches Leaflet directly, which is what
 * keeps the effect dependencies honest.
 *
 * WHY PLAIN LEAFLET AND NOT REACT-LEAFLET
 *   React-Leaflet would add a second React renderer into the tree and a version
 *   coupling to React 19 for what is, here, four operations: add a tile layer,
 *   draw a circle, manage markers, and fly to a centre. Owning the map directly
 *   is less code than configuring a wrapper, and it makes teardown explicit —
 *   which is the part that actually leaks when it goes wrong.
 *
 * LIFECYCLE, AND WHY NOTHING LEAKS
 *   The map is created once in a mount effect and destroyed in its cleanup via
 *   map.remove(), which drops every layer, listener and DOM node Leaflet
 *   attached. That cleanup is keyed on nothing, because the container ref is
 *   stable for the life of the component — the map is created once and then
 *   *updated* by separate effects as props change. Nothing here re-creates the
 *   map, so nothing here can orphan one.
 *
 *   StrictMode's double-invoke in development is also covered: the mount effect
 *   creates, cleanup removes, the second invoke creates again on the same
 *   container.
 *
 * WHY THE MAP IS NOT GIVEN A KEY THAT CHANGES
 *   Remounting the map on every centre change would re-download tiles and lose
 *   the user's pan/zoom. Instead centre changes are pushed through the second
 *   effect with an equality guard in the parent, so the map is moved, not
 *   rebuilt.
 */

import React, { useEffect, useRef, useState } from 'react';
// Type-only: erased at compile time, so this never pulls Leaflet into SSR.
// The runtime import is dynamic — see the note above.
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CENTER, type LatLng } from '@/lib/geo';

export interface MapStudio {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

interface Props {
  center: LatLng;
  radiusKm: number;
  /** Studios inside the radius, already filtered and ordered by the parent. */
  studios: MapStudio[];
  /** Drawn in a contrasting colour so the chosen centre is never ambiguous. */
  isMyLocation: boolean;
  onPickStudio: (id: string) => void;
  /** Fires on every map click; the parent decides whether a click means anything. */
  onPickCenter?: (next: LatLng) => void;
  onReady?: () => void;
}

/**
 * Re-exported from lib/geo.ts so existing import sites
 * (`import StudioLocatorMap, { DEFAULT_CENTER }`) keep working unchanged. The
 * value itself moved so the server route can share it without importing a
 * 'use client' module.
 */
export { DEFAULT_CENTER } from '@/lib/geo';

/**
 * A circle of radius `radiusKm` drawn in metres, because Leaflet's Circle takes
 * a distance in the map's own units and its default CRS is EPSG3857 (metres).
 */
const KM_TO_M = 1000;

/**
 * A pin built as an inline SVG data URI.
 *
 * Leaflet's default marker icons resolve to PNG files referenced by relative
 * paths that break under a bundler, which is the classic "broken marker" bug.
 * An inline SVG has no network dependency, inherits no theme, and lets the
 * marker carry the accent colour so it matches the rest of the product.
 */
function pinIcon(L: typeof import('leaflet'), color: string): Leaflet.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.4 12 32 12 32s12-11.6 12-20.1C24 5.3 18.6 0 12 0z"
      fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'g-studio-pin',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -28],
  });
}

export function StudioLocatorMap({
  center,
  radiusKm,
  studios,
  isMyLocation,
  onPickStudio,
  onPickCenter,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const centerMarkerRef = useRef<Leaflet.Marker | null>(null);

  /**
   * Bumped once the map instance exists.
   *
   * The map is created inside an async dynamic import, so on the first render
   * `mapRef.current` is still null and the centre and marker effects below bail
   * out early. Without this counter nothing would ever re-run them and the map
   * would come up with no centre pin and no markers — the effects' own
   * dependencies have not changed, only the map's existence has.
   *
   * It is state, not a ref, precisely so it participates in dependency
   * comparison and re-runs those effects.
   */
  const [mapVersion, setMapVersion] = useState(0);

  // Keep the callbacks reachable from the map's long-lived listeners without
  // making the create-once effect depend on a prop identity that changes every
  // render.
  //
  // Assigned in an effect rather than during render: writing `ref.current`
  // while rendering is exactly the pattern react-hooks/refs rejects, and it is
  // unsafe anyway — React may discard a render, leaving the ref holding a
  // callback from a render that never committed. This effect is declared before
  // the map effects below, so the refs are always fresh by the time those run.
  const onPickRef = useRef(onPickStudio);
  const onPickCenterRef = useRef(onPickCenter);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onPickRef.current = onPickStudio;
    onPickCenterRef.current = onPickCenter;
    onReadyRef.current = onReady;
  });

  // ---- create once -------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let teardown: (() => void) | null = null;

    void (async () => {
      // Dynamic import: Leaflet touches `window` at module-evaluation time, so a
      // static import would throw during the server render that `next build`
      // performs for /client/home. This keeps it browser-only.
      const L = (await import('leaflet')).default;
      // The container may have unmounted while the chunk was in flight.
      if (cancelled) return;

      map = L.map(container, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: false, // a page-scroll trap is worse than a missing zoom
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        // Required by the OSM tile usage policy: credit OpenStreetMap contributors.
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      circleRef.current = L.circle([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
        radius: radiusKm * KM_TO_M,
        color: '#e8a93b',
        weight: 2,
        fillColor: '#e8a93b',
        fillOpacity: 0.12,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);

      // Centre selection. Leaflet's latlngclick fires only on the map itself, not
      // on a marker or control, so clicking a marker cannot move the centre.
      const onMapClick = (e: Leaflet.LeafletEvent) => {
        const { lat, lng } = (e as Leaflet.LeafletMouseEvent).latlng;
        onPickCenterRef.current?.({ lat, lng });
      };
      map.on('latlngclick', onMapClick);

      // The container is laid out by a CSS aspect ratio, so Leaflet can compute
      // its size before the first paint. invalidateSize() after mount makes the
      // tile grid correct when the element resizes (sidebar collapse, orientation).
      const invalidate = () => map?.invalidateSize();
      const timer = window.setTimeout(invalidate, 0);
      window.addEventListener('resize', invalidate);

      teardown = () => {
        window.clearTimeout(timer);
        window.removeEventListener('resize', invalidate);
        map?.off('latlngclick', onMapClick);
      };

      mapRef.current = map;
      // Announce the map so the centre and marker effects below re-run now that
      // there is something to draw into.
      setMapVersion((v) => v + 1);
      onReadyRef.current?.();
    })();

    return () => {
      // Covers both the normal path and the case where the chunk had not resolved
      // yet: `cancelled` stops a map being built onto a dead container, and
      // `teardown` / `map` are null-safe when they never got that far.
      cancelled = true;
      teardown?.();
      // remove() destroys every layer and listener this map owns, so nothing
      // survives to fire into an unmounted component.
      map?.remove();
      mapRef.current = null;
      circleRef.current = null;
      markerLayerRef.current = null;
      centerMarkerRef.current = null;
    };
    // Intentionally empty: the map is created once. Radius, centre and studios
    // are applied by the effects below so changing them never rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- centre + radius ---------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    void (async () => {
      const L = (await import('leaflet')).default;
      // Unmounted while the chunk was loading.
      if (!mapRef.current) return;

      // setView, not flyTo: the parent already de-duplicates identical centres, so
      // this runs only on a real change and a jump is the honest response to
      // "the user picked somewhere else".
      map.setView([center.lat, center.lng], map.getZoom(), { animate: false });

      circleRef.current?.setLatLng([center.lat, center.lng]);
      circleRef.current?.setRadius(radiusKm * KM_TO_M);

      const icon = pinIcon(L, isMyLocation ? '#34d399' : '#e8a93b');
      const title = isMyLocation ? 'Your location' : 'Search centre';
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLatLng([center.lat, center.lng]);
        centerMarkerRef.current.setIcon(icon);
        // The marker is created once, so its tooltip and accessible name would
        // otherwise keep saying "Search centre" after switching to My Location.
        // Leaflet 1.9 has no Marker.setTitle — it renders options.title onto the
        // icon element in _initIcon — so both halves are updated by hand.
        centerMarkerRef.current.options.title = title;
        centerMarkerRef.current.getElement()?.setAttribute('title', title);
      } else {
        centerMarkerRef.current = L.marker([center.lat, center.lng], {
          icon,
          interactive: false,
          zIndexOffset: 1000,
          title,
        }).addTo(map);
      }
    })();
  }, [mapVersion, center.lat, center.lng, radiusKm, isMyLocation]);

  // ---- studio markers ----------------------------------------------------
  useEffect(() => {
    if (!markerLayerRef.current) return;

    void (async () => {
      const L = (await import('leaflet')).default;
      const layer = markerLayerRef.current;
      if (!layer) return; // unmounted while loading

      // Clearing the group is what makes this idempotent: without it, every
      // radius change would add a second copy of every marker.
      layer.clearLayers();

      studios.forEach((studio) => {
        const marker = L.marker([studio.latitude, studio.longitude], {
          icon: pinIcon(L, '#e8a93b'),
          title: studio.name,
          alt: studio.name,
          keyboard: true,
        });

        const address = studio.address ? `<br><span>${escapeHtml(studio.address)}</span>` : '';
        marker.bindPopup(
          `<strong>${escapeHtml(studio.name)}</strong>${address}`,
          { closeButton: true, autoPan: true }
        );
        marker.on('click', () => onPickRef.current(studio.id));
        marker.addTo(layer);
      });
    })();
  }, [mapVersion, studios]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Studio map" />;
}

/**
 * Escape text interpolated into a Leaflet popup.
 *
 * `bindPopup` takes an HTML string, so a studio name containing an angle bracket
 * would inject markup into the page. Studio names come from an admin table, but
 * admin-authored content is still content.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default StudioLocatorMap;