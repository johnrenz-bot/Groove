'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import type { TeeImage } from '../types';
import { SHIRT_VIEWBOX } from '../mockupAssets';

interface ImageLayerProps {
  images: TeeImage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * `coalesceKey` keeps a drag or pinch in one undo step instead of flooding
   * history with one entry per pointer event.
   */
  onChange: (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** id of the printable-area mask: artwork is clipped to it. */
  maskId: string;
  /** Garment centre in viewBox units — drag snaps to it and shows guides. */
  garmentCenter?: Point;
  /** Right-click / long-press handler for an artwork layer. */
  onContextMenuImage?: (id: string, event: React.MouseEvent) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Gesture {
  id: string;
  mode: 'move' | 'resize' | 'rotate' | 'pinch';
  start: TeeImage;
  startPointer: Point;
  startCenter: Point;
  startDistance: number;
  startAngle: number;
  pointers: Map<number, Point>;
}

const HANDLE_SIZE = 26;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: Point, b: Point) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function centerOf(points: Point[]): Point {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

/**
 * Renders imported images inside the SVG and owns the pointer gestures.
 *
 * One finger/mouse drags. A corner handle resizes, the top handle rotates, and
 * two touch points pinch-to-resize and rotate together. The image data itself
 * stays in the design state; this component only emits normalized patches.
 */
export function ImageLayer({
  images,
  selectedId,
  onSelect,
  onChange,
  svgRef,
  maskId,
  garmentCenter,
  onContextMenuImage,
}: ImageLayerProps) {
  const gestureRef = useRef<Gesture | null>(null);
  const [guides, setGuides] = React.useState<{ v: number | null; h: number | null }>({
    v: null,
    h: null,
  });
  const snapTarget = useMemo(
    () =>
      garmentCenter ?? {
        x: SHIRT_VIEWBOX.width / 2,
        y: SHIRT_VIEWBOX.height / 2,
      },
    [garmentCenter]
  );

  const toViewBox = useCallback(
    (event: React.PointerEvent): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * SHIRT_VIEWBOX.width,
        y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * SHIRT_VIEWBOX.height,
      };
    },
    [svgRef]
  );

  const beginPointer = (
    event: React.PointerEvent,
    image: TeeImage,
    mode: Gesture['mode']
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(image.id);
    // Locked artwork can be selected (to inspect it) but never moved.
    if (image.locked) return;

    const element = event.currentTarget as Element;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; gestures still work inside the SVG.
    }

    const pointer = toViewBox(event);
    const center: Point = { x: image.x * SHIRT_VIEWBOX.width, y: image.y * SHIRT_VIEWBOX.height };

    // A second finger on the same image turns an in-progress drag into a pinch.
    // Replacing the gesture here would drop the first pointer and make the
    // image jump, so extend it instead.
    const existing = gestureRef.current;
    if (existing && existing.id === image.id && mode === 'move' && existing.mode === 'move') {
      existing.pointers.set(event.pointerId, pointer);
      if (existing.pointers.size >= 2) {
        const points = [...existing.pointers.values()];
        existing.mode = 'pinch';
        existing.start = { ...image };
        existing.startCenter = centerOf(points);
        existing.startDistance = distance(points[0], points[1]);
        existing.startAngle = angle(points[0], points[1]);
      }
      return;
    }

    const pointers = new Map<number, Point>([[event.pointerId, pointer]]);

    gestureRef.current = {
      id: image.id,
      mode,
      start: { ...image },
      startPointer: pointer,
      startCenter: center,
      startDistance: distance(pointer, center),
      startAngle: angle(center, pointer),
      pointers,
    };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const pointer = toViewBox(event);
    gesture.pointers.set(event.pointerId, pointer);

    if (gesture.pointers.size >= 2) {
      const points = [...gesture.pointers.values()];
      const center = centerOf(points);
      const currentDistance = distance(points[0], points[1]);
      const currentAngle = angle(points[0], points[1]);

      if (gesture.mode !== 'pinch') {
        gesture.mode = 'pinch';
        gesture.startDistance = currentDistance;
        gesture.startAngle = currentAngle;
        gesture.startCenter = center;
        gesture.startPointer = center;
        gesture.start = { ...gesture.start };
      }

      const scale = gesture.startDistance > 0 ? currentDistance / gesture.startDistance : 1;
      const rotation =
        gesture.start.rotation + (currentAngle - gesture.startAngle);

      onChange(
        gesture.id,
        {
          width: clamp(gesture.start.width * scale, 0.02, 2),
          height: clamp(gesture.start.height * scale, 0.02, 2),
          rotation,
          x: clamp(gesture.start.x + (center.x - gesture.startCenter.x) / SHIRT_VIEWBOX.width, -0.25, 1.25),
          y: clamp(gesture.start.y + (center.y - gesture.startCenter.y) / SHIRT_VIEWBOX.height, -0.25, 1.25),
        },
        `image-gesture-${gesture.id}`
      );
      return;
    }

    if (gesture.mode === 'pinch') return;

    if (gesture.mode === 'move') {
      const snapX = SHIRT_VIEWBOX.width * 0.012;
      const snapY = SHIRT_VIEWBOX.height * 0.018;
      let nextX = gesture.start.x + (pointer.x - gesture.startPointer.x) / SHIRT_VIEWBOX.width;
      let nextY = gesture.start.y + (pointer.y - gesture.startPointer.y) / SHIRT_VIEWBOX.height;

      // Snap the artwork centre onto the garment's centre lines.
      const centerPx = nextX * SHIRT_VIEWBOX.width;
      const centerPy = nextY * SHIRT_VIEWBOX.height;
      const snapV = Math.abs(centerPx - snapTarget.x) <= snapX ? snapTarget.x : null;
      const snapH = Math.abs(centerPy - snapTarget.y) <= snapY ? snapTarget.y : null;
      if (snapV !== null) nextX = snapV / SHIRT_VIEWBOX.width;
      if (snapH !== null) nextY = snapH / SHIRT_VIEWBOX.height;
      setGuides((current) =>
        current.v === snapV && current.h === snapH ? current : { v: snapV, h: snapH }
      );

      onChange(
        gesture.id,
        {
          x: clamp(nextX, -0.25, 1.25),
          y: clamp(nextY, -0.25, 1.25),
        },
        `image-move-${gesture.id}`
      );
      return;
    }

    if (gesture.mode === 'resize') {
      const center: Point = {
        x: gesture.start.x * SHIRT_VIEWBOX.width,
        y: gesture.start.y * SHIRT_VIEWBOX.height,
      };
      const currentDistance = distance(pointer, center);
      const scale = gesture.startDistance > 0 ? currentDistance / gesture.startDistance : 1;
      onChange(
        gesture.id,
        {
          width: clamp(gesture.start.width * scale, 0.02, 2),
          height: clamp(gesture.start.height * scale, 0.02, 2),
        },
        `image-resize-${gesture.id}`
      );
      return;
    }

    if (gesture.mode === 'rotate') {
      const center: Point = {
        x: gesture.start.x * SHIRT_VIEWBOX.width,
        y: gesture.start.y * SHIRT_VIEWBOX.height,
      };
      let rotation = gesture.start.rotation + (angle(center, pointer) - gesture.startAngle);
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      onChange(gesture.id, { rotation }, `image-rotate-${gesture.id}`);
    }
  };

  const endPointer = (event: React.PointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gesture.pointers.delete(event.pointerId);

    const element = event.currentTarget as Element;
    try {
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore browsers that do not support pointer capture.
    }

    if (gesture.pointers.size === 0) {
      gestureRef.current = null;
      setGuides({ v: null, h: null });
    }
  };

  const sorted = useMemo(() => [...images].sort((a, b) => a.z - b.z), [images]);
  const selected = sorted.find((image) => image.id === selectedId) ?? null;

  return (
    <>
      <g mask={`url(#${maskId})`}>
        {sorted.map((image) => {
          const cx = image.x * SHIRT_VIEWBOX.width;
          const cy = image.y * SHIRT_VIEWBOX.height;
          const width = image.width * SHIRT_VIEWBOX.width;
          const height = image.height * SHIRT_VIEWBOX.height;

          return (
            <g key={image.id} transform={`rotate(${image.rotation} ${cx} ${cy})`}>
              <image
                href={image.src}
                x={cx - width / 2}
                y={cy - height / 2}
                width={width}
                height={height}
                opacity={image.opacity}
                preserveAspectRatio="xMidYMid meet"
                transform={image.flipX ? `translate(${cx * 2} 0) scale(-1 1)` : undefined}
                style={{ cursor: image.locked ? 'not-allowed' : 'move' }}
                onPointerDown={(event) => beginPointer(event, image, 'move')}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onContextMenuImage?.(image.id, event);
                }}
              />
              {/* Invisible hit area keeps thin/transparent artwork easy to grab. */}
              <rect
                x={cx - width / 2}
                y={cy - height / 2}
                width={width}
                height={height}
                fill="transparent"
                style={{ cursor: image.locked ? 'not-allowed' : 'move' }}
                onPointerDown={(event) => beginPointer(event, image, 'move')}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onContextMenuImage?.(image.id, event);
                }}
              />
            </g>
          );
        })}
      </g>

      {selected && (
        <g
          transform={`rotate(${selected.rotation} ${selected.x * SHIRT_VIEWBOX.width} ${
            selected.y * SHIRT_VIEWBOX.height
          })`}
          aria-hidden="true"
          data-export-ignore="true"
        >
          <rect
            x={selected.x * SHIRT_VIEWBOX.width - (selected.width * SHIRT_VIEWBOX.width) / 2}
            y={selected.y * SHIRT_VIEWBOX.height - (selected.height * SHIRT_VIEWBOX.height) / 2}
            width={selected.width * SHIRT_VIEWBOX.width}
            height={selected.height * SHIRT_VIEWBOX.height}
            fill="none"
            stroke={selected.locked ? '#F5C97B' : '#F3E8D7'}
            strokeWidth={2}
            strokeDasharray="8 7"
            opacity={0.9}
            pointerEvents="none"
          />

          {selected.locked ? (
            /* Locked artwork: badge instead of transform handles. */
            <g
              transform={`translate(${selected.x * SHIRT_VIEWBOX.width} ${
                selected.y * SHIRT_VIEWBOX.height - (selected.height * SHIRT_VIEWBOX.height) / 2 - 22
              })`}
              pointerEvents="none"
            >
              <circle r={13} fill="#F5C97B" stroke="#111111" strokeWidth={2} />
              <rect x={-4.5} y={-1.5} width={9} height={7.5} rx={1.6} fill="#111111" />
              <path d="M -3 -1.5 V -4 a 3 3 0 0 1 6 0 V -1.5" fill="none" stroke="#111111" strokeWidth={2} />
            </g>
          ) : (
            <>
              <line
            x1={selected.x * SHIRT_VIEWBOX.width}
            y1={selected.y * SHIRT_VIEWBOX.height - (selected.height * SHIRT_VIEWBOX.height) / 2}
            x2={selected.x * SHIRT_VIEWBOX.width}
            y2={
              selected.y * SHIRT_VIEWBOX.height -
              (selected.height * SHIRT_VIEWBOX.height) / 2 -
              46
            }
            stroke="#F3E8D7"
            strokeWidth={2}
            opacity={0.7}
            pointerEvents="none"
          />
          <circle
            cx={selected.x * SHIRT_VIEWBOX.width}
            cy={
              selected.y * SHIRT_VIEWBOX.height -
              (selected.height * SHIRT_VIEWBOX.height) / 2 -
              46
            }
            r={HANDLE_SIZE / 2}
            fill="#F3E8D7"
            stroke="#111111"
            strokeWidth={2}
            style={{ cursor: 'grab' }}
            onPointerDown={(event) => beginPointer(event, selected, 'rotate')}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />

          <rect
            x={
              selected.x * SHIRT_VIEWBOX.width +
              (selected.width * SHIRT_VIEWBOX.width) / 2 -
              HANDLE_SIZE / 2
            }
            y={
              selected.y * SHIRT_VIEWBOX.height +
              (selected.height * SHIRT_VIEWBOX.height) / 2 -
              HANDLE_SIZE / 2
            }
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={4}
            fill="#F3E8D7"
            stroke="#111111"
            strokeWidth={2}
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(event) => beginPointer(event, selected, 'resize')}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />
            </>
          )}
        </g>
      )}

      {/* Alignment guides while snapping (never exported). */}
      {(guides.v !== null || guides.h !== null) && (
        <g pointerEvents="none" data-export-ignore="true" aria-hidden="true">
          {guides.v !== null && (
            <line
              x1={guides.v}
              y1={0}
              x2={guides.v}
              y2={SHIRT_VIEWBOX.height}
              stroke="#F5C97B"
              strokeWidth={2}
              strokeDasharray="10 8"
              opacity={0.85}
            />
          )}
          {guides.h !== null && (
            <line
              x1={0}
              y1={guides.h}
              x2={SHIRT_VIEWBOX.width}
              y2={guides.h}
              stroke="#F5C97B"
              strokeWidth={2}
              strokeDasharray="10 8"
              opacity={0.85}
            />
          )}
        </g>
      )}
    </>
  );
}

export default ImageLayer;
