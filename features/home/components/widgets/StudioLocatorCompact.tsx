'use client';

/**
 * Studio Locator — compact widget.
 *
 * Shows the three nearest studios in the SJDM radius with their distances and
 * sources, plus a "radius" chip. "Open full map" scrolls to the full locator
 * rendered below this widget on the same page (it keeps its #studios anchor).
 */

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Loader2, Map as MapIcon } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DEFAULT_CENTER } from '@/lib/geo';

interface StudioBrief {
  name: string;
  address: string | null;
  distanceKm: number | null;
  mapsUrl: string | null;
  source: 'curated' | 'supabase' | 'google' | null;
}

type LoadState = { status: 'loading' } | { status: 'ok'; studios: StudioBrief[] } | { status: 'error' };

export function StudioLocatorCompact() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const params = new URLSearchParams({
      scope: 'nearby',
      lat: String(DEFAULT_CENTER.lat),
      lng: String(DEFAULT_CENTER.lng),
      radius: '10',
    });

    fetch(`/api/studios?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { places?: Array<Record<string, unknown>> }
          | null;
        if (!res.ok || !Array.isArray(body?.places)) {
          if (!cancelled) setState({ status: 'error' });
          return;
        }
        const studios: StudioBrief[] = body.places
          .slice(0, 3)
          .map((place) => ({
            name: String(place.name ?? 'Studio'),
            address: typeof place.address === 'string' ? place.address : null,
            distanceKm: typeof place.distanceKm === 'number' ? place.distanceKm : null,
            mapsUrl: typeof place.mapsUrl === 'string' ? place.mapsUrl : null,
            source:
              place.source === 'curated' || place.source === 'supabase' || place.source === 'google'
                ? place.source
                : null,
          }));
        if (!cancelled) setState({ status: 'ok', studios });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <PanelCard
      icon={<MapPin className="h-4 w-4" />}
      title="Studio Locator"
      viewAllHref="#studios"
      viewAllLabel="Open full map"
    >
      <div className="flex items-center justify-between gap-2 pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          10 km radius · SJDM
        </span>
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Finding studios near you…
        </div>
      )}

      {state.status === 'error' && (
        <EmptyState
          compact
          icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
          title="Studio search is unavailable"
          description="The studio directory or discovery service did not respond. You can still open the full map."
          actionHref="#studios"
          action="Open full map"
        />
      )}

      {state.status === 'ok' && state.studios.length === 0 && (
        <EmptyState
          compact
          icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
          title="No studios in this radius yet"
          description="Widen the radius in the full map to discover more spaces across Bulacan."
          actionHref="#studios"
          action="Open full map"
        />
      )}

      {state.status === 'ok' && state.studios.length > 0 && (
        <ul className="space-y-2.5">
          {state.studios.map((studio) => (
            <li
              key={`${studio.name}-${studio.address ?? ''}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3"
            >
              <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{studio.name}</p>
                {studio.address && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{studio.address}</p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {typeof studio.distanceKm === 'number' && (
                    <span className="tabular-nums">{studio.distanceKm.toFixed(1)} km</span>
                  )}
                  {studio.source === 'supabase' && (
                    <span className="rounded-full border border-success/40 px-1.5 text-[9px] font-bold uppercase tracking-wider text-success">
                      Directory
                    </span>
                  )}
                  {studio.source === 'google' && (
                    <span className="rounded-full border border-info/40 px-1.5 text-[9px] font-bold uppercase tracking-wider text-info">
                      Discovered
                    </span>
                  )}
                  {studio.source === 'curated' && (
                    <span className="rounded-full border border-border px-1.5 text-[9px] font-bold uppercase tracking-wider">
                      Curated
                    </span>
                  )}
                </div>
              </div>
              {studio.mapsUrl && (
                <a
                  href={studio.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${studio.name} in Google Maps (new tab)`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MapIcon className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

export default StudioLocatorCompact;

