'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';
import { TEE_COLORWAYS } from '../constants';
import { isLightBackground, stageBackgroundStyle } from './stageBackground';
import type { TeeBackgroundId, TeeColorway, TeeDesign, TeeImage, TeeView } from '../types';
import { TeeSvg } from './TeeSvg';

interface PreviewStageProps {
  design: TeeDesign;
  interactive?: boolean;
  selectedImageId?: string | null;
  onSelectImage?: (id: string | null) => void;
  onUpdateImage?: (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => void;
  selectedTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  onTextDrag?: (id: string, patch: { x: number; y: number }, coalesceKey?: string) => void;
  onContextMenuImage?: (id: string, event: React.MouseEvent) => void;
  onViewChange?: (view: TeeView) => void;
  onBackgroundChange?: (background: TeeBackgroundId) => void;
  onColorwayChange?: (colorwayId: string) => void;
  stageApiRef?: React.Ref<PreviewStageApi>;
  className?: string;
}

export interface PreviewStageApi {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function isColorwayActive(design: TeeDesign, colorway: TeeColorway): boolean {
  const zones = design.zones as unknown as Record<string, string>;
  return Object.keys(colorway.zones).every(
    (zone) => colorway.zones[zone as keyof typeof colorway.zones]?.toLowerCase() === zones[zone]?.toLowerCase()
  );
}

/** Compact +/-/fit cluster, reused by the desktop pill and the phone overlay. */
function ZoomControls({
  zoom,
  onZoom,
  onFit,
  className,
}: {
  zoom: number;
  onZoom: (factor: number) => void;
  onFit: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-md)]',
        className
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => onZoom(1 / 1.25)}
        disabled={zoom <= ZOOM_MIN}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className="w-9 text-center text-[11px] font-semibold tabular-nums text-foreground sm:w-11"
        aria-live="polite"
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => onZoom(1.25)}
        disabled={zoom >= ZOOM_MAX}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Fit to view"
        title="Fit to view"
        onClick={onFit}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Product-mockup stage: neutral studio background, live SVG, front/back
 * toggle and zoom/pan controls. Artwork objects capture their own pointer
 * gestures, so dragging on the backdrop pans the canvas.
 */
export function PreviewStage({
  design,
  interactive = false,
  selectedImageId = null,
  onSelectImage,
  onUpdateImage,
  selectedTextId = null,
  onSelectText,
  onTextDrag,
  onContextMenuImage,
  onViewChange,
  onBackgroundChange,
  onColorwayChange,
  stageApiRef,
  className,
}: PreviewStageProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchState = useRef<{ distance: number; zoom: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useImperativeHandle(
    stageApiRef,
    () => ({
      zoomIn: () => setZoom((current) => clamp(current * 1.25, ZOOM_MIN, ZOOM_MAX)),
      zoomOut: () => setZoom((current) => clamp(current / 1.25, ZOOM_MIN, ZOOM_MAX)),
      resetView,
    }),
    [resetView]
  );

  const zoomBy = useCallback((factor: number) => {
    setZoom((current) => clamp(current * factor, ZOOM_MIN, ZOOM_MAX));
  }, []);

  // Reset the fitted view when the garment side changes — state adjusted
  // during render (React's sanctioned pattern), not in an effect.
  const [lastView, setLastView] = useState(design.view);
  if (lastView !== design.view) {
    setLastView(design.view);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Ctrl/Cmd + wheel zooms the stage only (plain wheel keeps scrolling the
  // page). Trackpad pinch also arrives as ctrlKey-wheel.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = -event.deltaY * 0.0016;
      setZoom((current) => clamp(current + delta * current, ZOOM_MIN, ZOOM_MAX));
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, []);

  const pinchDistance = (map: Map<number, { x: number; y: number }>): number => {
    const points = [...map.values()];
    const [first, second] = points;
    return second
      ? Math.hypot(second.x - first.x, second.y - first.y)
      : 0;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      pinchState.current = { distance: pinchDistance(pointers.current), zoom };
    }
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setPanning(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Best effort; panning still works with pointer capture unavailable.
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Two fingers: pinch-zoom the canvas instead of panning it.
    if (pointers.current.size === 2 && pinchState.current) {
      const distance = pinchDistance(pointers.current);
      if (distance > 1) {
        const factor = distance / pinchState.current.distance;
        setZoom((current) => clamp(pinchState.current!.zoom * factor, ZOOM_MIN, ZOOM_MAX));
        return;
      }
    }

    const state = panState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    setPan({
      x: state.originX + (event.clientX - state.startX),
      y: state.originY + (event.clientY - state.startY),
    });
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) pinchState.current = null;

    // Double-tap toggles between fitted and 1.8x — the keyboard path is +/+
    // and Esc.
    if (pointers.current.size === 0) {
      const now = performance.now();
      if (
        lastTap.current &&
        now - lastTap.current.time < 300 &&
        Math.hypot(event.clientX - lastTap.current.x, event.clientY - lastTap.current.y) < 12
      ) {
        lastTap.current = null;
        setZoom((current) => (current >= 1.8 ? 1 : current * 1.8));
      } else {
        lastTap.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }

    const state = panState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore browsers without pointer capture.
    }
    panState.current = null;
    setPanning(false);
  };

  return (
    <section
      className={cn('relative h-full w-full overflow-hidden', className)}
      aria-label="Shirt canvas"
    >
      <div
        ref={surfaceRef}
        className={cn(
          'relative isolate h-full w-full overflow-hidden',
          panning ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          touchAction: 'none',
          backgroundColor: 'var(--bg-canvas)',
          ...stageBackgroundStyle(
            design.presentation.background,
            design.presentation.customBackground
          ),
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        aria-label="Shirt canvas — drag to pan, Ctrl+scroll to zoom"
      >
        {/* Optional faint dot grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.035,
          }}
        />
        {/* Studio effects — presentation only, never exported */}
        {design.presentation.effects.spotlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 62% 55% at 50% 28%, rgba(255,255,255,${
                isLightBackground(
                  design.presentation.background,
                  design.presentation.customBackground
                )
                  ? 0.5
                  : 0.16
              }), transparent 70%)`,
            }}
          />
        )}
        {design.presentation.effects.glow && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 46% 42% at 50% 52%, rgba(245,201,123,0.17), transparent 70%)',
            }}
          />
        )}
        {design.presentation.effects.studioLight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.085) 46%, rgba(255,255,255,0.02) 52%, transparent 68%)',
            }}
          />
        )}
        {design.presentation.effects.floorShadow && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: '50%',
              bottom: '5%',
              width: '72%',
              height: 64,
              transform: 'translateX(-50%)',
              background: `radial-gradient(ellipse at center, rgba(0,0,0,${
                isLightBackground(
                  design.presentation.background,
                  design.presentation.customBackground
                )
                  ? 0.3
                  : 0.55
              }) 0%, transparent 70%)`,
              filter: 'blur(16px)',
            }}
          />
        )}
        {design.presentation.effects.vignette && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 150px 28px rgba(0,0,0,0.52)' }}
          />
        )}

        {/* Floating Front/Back toggle */}
        {onViewChange && (
          <div
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <SegmentedControl
              options={[
                { value: 'front' as const, label: 'Front' },
                { value: 'back' as const, label: 'Back' },
              ]}
              value={design.view}
              onChange={onViewChange}
              ariaLabel="Choose front or back view"
              size="sm"
            />
          </div>
        )}

        {/* Bottom-center strip: colourway swatches + desktop zoom controls */}
        <div
          className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-20 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 md:bottom-3"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-1.5 py-1 shadow-[var(--shadow-md)]">
            {TEE_COLORWAYS.map((colorway) => (
              <button
                key={colorway.id}
                type="button"
                aria-label={`Switch to ${colorway.label} colourway`}
                aria-pressed={isColorwayActive(design, colorway)}
                onClick={() => onColorwayChange?.(colorway.id)}
                className="flex h-2.5 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border/70 bg-center bg-cover transition-opacity hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundImage: `linear-gradient(150deg, ${colorway.gradient.from} 0%, ${colorway.gradient.to} 100%)` }}
              />
            ))}
            <span aria-hidden="true" className="h-2.5 w-px shrink-0 bg-border/70" />
            <ZoomControls zoom={zoom} onZoom={zoomBy} onFit={resetView} className="hidden md:flex" />
          </div>
        </div>

        {/* Phone zoom buttons — top-right, away from the Front/Back toggle */}
        <div className="absolute right-3 top-3 z-20 md:hidden" onPointerDown={(event) => event.stopPropagation()}>
          <ZoomControls zoom={zoom} onZoom={zoomBy} onFit={resetView} className="border border-border bg-surface shadow-[var(--shadow-md)]" />
        </div>

        <div className="mx-auto w-full max-w-[820px]">
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: panning ? 'none' : 'transform 160ms ease',
              transformOrigin: 'center center',
            }}
          >
            <TeeSvg
              design={design}
              interactive={interactive}
              selectedImageId={selectedImageId}
              onSelectImage={onSelectImage}
              onUpdateImage={onUpdateImage}
              selectedTextId={selectedTextId}
              onSelectText={onSelectText}
              onTextDrag={onTextDrag}
              onContextMenuImage={onContextMenuImage}
            />
          </div>
        </div>

      </div>

      {/* Fullscreen studio preview — presentation only, never exported */}
    </section>
  );
}

export default PreviewStage;
