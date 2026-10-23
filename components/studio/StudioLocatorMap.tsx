'use client';

/**
 * The Leaflet map surface for the Studio Locator.
 *
 * Split from <StudioLocator> so all Leaflet imperative code lives in one place
 * that owns exactly one map instance, one marker layer, and one circle. The
 * parent is plain React state and never touches Leaflet directly, which keeps
 * the effect dependencies honest.
 *
 * The map is also the hero now: it fills a 420px+ frame, pins drop in, the
 * selected pin pulses, the centre change flies rather than jumps, and the
 * radius circle eases to its new size. Reduced-motion users get every final
 * state immediately.
 */

import React, { useEffect, useRef, useState } from 'react';
// Type-only: erased at compile time, so this never pulls Leaflet into SSR.
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CENTER, type LatLng } from '@/lib/geo';

export interface MapStudio {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  /** 'curated' | 'openstreetmap' — shown in the preview card. */
  source?: 'curated' | 'openstreetmap';
}

interface Props {
  center: LatLng;
  radiusKm: number;
  /** Studios inside the radius, already filtered and ordered by the parent. */
  studios: MapStudio[];
  /** Drawn in a contrasting colour so the chosen centre is never ambiguous. */
  isMyLocation: boolean;
  /** When set, that marker pulses and is brought forward. */
  focusId?: string | null;
  onPickStudio: (id: string) => void;
  /** Fires on every map click; the parent decides whether a click means anything. */
  onPickCenter?: (next: LatLng) => void;
  onReady?: () => void;
  className?: string;
}

export { DEFAULT_CENTER } from '@/lib/geo';

const KM_TO_M = 1000;
const PIN_COLOR = '#e8a93b';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * A pin built as an inline SVG data URI. Leaflet's default marker icons resolve
 * to PNGs by relative path, which breaks under a bundler; this has no network
 * dependency and can carry the app's accent colour.
 */
function pinIcon(
  L: typeof import('leaflet'),
  color: string,
  active = false
): Leaflet.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.4 12 32 12 32s12-11.6 12-20.1C24 5.3 18.6 0 12 0z"
      fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: `g-studio-pin${active ? ' g-studio-pin--active' : ''}`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
  });
}

export function StudioLocatorMap({
  center,
  radiusKm,
  studios,
  isMyLocation,
  focusId,
  onPickStudio,
  onPickCenter,
  onReady,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const centerMarkerRef = useRef<Leaflet.Marker | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker> | null>(null);
  const focusIdRef = useRef<string | null>(focusId ?? null);
  const radiusFrameRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);

  /** Bumped once the map instance exists, so the prop effects re-run. */
  const [mapVersion, setMapVersion] = useState(0);

  const onPickRef = useRef(onPickStudio);
  const onPickCenterRef = useRef(onPickCenter);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onPickRef.current = onPickStudio;
    onPickCenterRef.current = onPickCenter;
    onReadyRef.current = onReady;
    focusIdRef.current = focusId ?? null;
  });

  // ---- create once -------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let teardown: (() => void) | null = null;

    void (async () => {
      // Dynamic import: Leaflet touches `window` at module-evaluation time.
      const L = (await import('leaflet')).default;
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
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      circleRef.current = L.circle([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
        radius: radiusKm * KM_TO_M,
        color: PIN_COLOR,
        weight: 2,
        fillColor: PIN_COLOR,
        fillOpacity: 0.12,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);

      const onMapClick = (e: Leaflet.LeafletEvent) => {
        const { lat, lng } = (e as Leaflet.LeafletMouseEvent).latlng;
        onPickCenterRef.current?.({ lat, lng });
      };
      map.on('click', onMapClick);

      const invalidate = () => map?.invalidateSize();
      const timer = window.setTimeout(invalidate, 0);
      window.addEventListener('resize', invalidate);

      teardown = () => {
        window.clearTimeout(timer);
        window.removeEventListener('resize', invalidate);
        map?.off('click', onMapClick);
      };

      mapRef.current = map;
      setMapVersion((value) => value + 1);
      onReadyRef.current?.();
    })();

    return () => {
      cancelled = true;
      teardown?.();
      map?.remove();
      mapRef.current = null;
      circleRef.current = null;
      markerLayerRef.current = null;
      centerMarkerRef.current = null;
      markersRef.current = null;
      if (radiusFrameRef.current) cancelAnimationFrame(radiusFrameRef.current);
    };
    // Intentionally empty: the map is created once and updated by effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- centre + radius ---------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (!mapRef.current) return;

      const reduced = prefersReducedMotion();
      const latlng: [number, number] = [center.lat, center.lng];

      if (!hasCenteredRef.current || reduced) {
        map.setView(latlng, map.getZoom(), { animate: false });
      } else {
        map.flyTo(latlng, map.getZoom(), { duration: 0.65, easeLinearity: 0.25 });
      }
      hasCenteredRef.current = true;

      const circle = circleRef.current;
      if (circle) {
        circle.setLatLng(latlng);
        const target = radiusKm * KM_TO_M;
        const from = circle.getRadius();

        if (radiusFrameRef.current) cancelAnimationFrame(radiusFrameRef.current);
        if (reduced || Math.abs(target - from) < 1) {
          circle.setRadius(target);
        } else {
          const start = performance.now();
          const duration = 380;
          const step = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            circle.setRadius(from + (target - from) * eased);
            if (progress < 1) {
              radiusFrameRef.current = requestAnimationFrame(step);
            }
          };
          radiusFrameRef.current = requestAnimationFrame(step);
        }
      }

      const icon = pinIcon(L, isMyLocation ? '#34d399' : PIN_COLOR);
      const title = isMyLocation ? 'Your location' : 'Search centre';
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLatLng(latlng);
        centerMarkerRef.current.setIcon(icon);
        centerMarkerRef.current.options.title = title;
        centerMarkerRef.current.getElement()?.setAttribute('title', title);
      } else {
        centerMarkerRef.current = L.marker(latlng, {
          icon,
          interactive: false,
          zIndexOffset: 1000,
          title,
        }).addTo(map);
      }
    })();

    return () => {
      if (radiusFrameRef.current) {
        cancelAnimationFrame(radiusFrameRef.current);
        radiusFrameRef.current = null;
      }
    };
  }, [mapVersion, center.lat, center.lng, radiusKm, isMyLocation]);

  // ---- studio markers ----------------------------------------------------
  useEffect(() => {
    if (!markerLayerRef.current) return;

    void (async () => {
      const L = (await import('leaflet')).default;
      const layer = markerLayerRef.current;
      if (!layer) return;

      // Clearing is what makes this idempotent; without it a radius change adds
      // a second copy of every marker.
      layer.clearLayers();

      const markers = new Map<string, Leaflet.Marker>();
      studios.forEach((studio) => {
        const active = focusIdRef.current === studio.id;
        const marker = L.marker([studio.latitude, studio.longitude], {
          icon: pinIcon(L, PIN_COLOR, active),
          title: studio.name,
          alt: studio.name,
          keyboard: true,
          zIndexOffset: active ? 800 : 0,
        });

        marker.on('click', () => onPickRef.current(studio.id));
        marker.addTo(layer);
        markers.set(studio.id, marker);
      });
      markersRef.current = markers;
    })();
  }, [mapVersion, studios]);

  // ---- highlight the selected marker ------------------------------------
  useEffect(() => {
    if (!markerLayerRef.current) return;
    void (async () => {
      const L = (await import('leaflet')).default;
      markersRef.current?.forEach((marker, id) => {
        const active = id === focusId;
        if (marker.getElement()?.classList.contains('g-studio-pin--active') === active) return;
        marker.setIcon(pinIcon(L, PIN_COLOR, active));
        marker.setZIndexOffset(active ? 800 : 0);
      });
    })();
  }, [mapVersion, focusId]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${className}`.trim()}
      role="application"
      aria-label="Studio map. Select a marker to preview the studio."
    />
  );
}

export default StudioLocatorMap;
