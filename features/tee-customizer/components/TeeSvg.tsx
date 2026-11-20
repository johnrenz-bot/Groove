'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BRAND_EMBLEM_SRC,
  BRAND_PATCH_SRC,
  BRAND_WORDMARK_SRC,
  getFont,
} from '../constants';
import { getMockupAssets, SHIRT_VIEWBOX, validateMockupAssets } from '../mockupAssets';
import type { TeeDesign, TeeGradient, TeeImage } from '../types';
import { ImageLayer } from './ImageLayer';
import { PatternLayer } from './PatternLayer';

interface TeeSvgProps {
  design: TeeDesign;
  interactive?: boolean;
  selectedImageId?: string | null;
  onSelectImage?: (id: string | null) => void;
  onUpdateImage?: (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => void;
  /** Selects the chest/back text layer. */
  selectedTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  /** Live position updates while the user drags the text on the shirt. */
  onTextDrag?: (id: string, patch: { x: number; y: number }, coalesceKey?: string) => void;
  /** Right-click / long-press handler for an artwork layer. */
  onContextMenuImage?: (id: string, event: React.MouseEvent) => void;
  className?: string;
  /**
   * Renders only the printable artwork (images, texts, badge, back print) on a
   * transparent ground — no garment, no zone fills, no shading. Used for the
   * transparent artwork export; not for interactive editing.
   */
  artworkOnly?: boolean;
}

function gradientVector(angle: number) {
  const radians = (angle * Math.PI) / 180;
  // Match CSS `linear-gradient(<angle>deg, …)`: 0deg runs bottom → top.
  return {
    x1: 50 - Math.sin(radians) * 50,
    y1: 50 + Math.cos(radians) * 50,
    x2: 50 + Math.sin(radians) * 50,
    y2: 50 - Math.cos(radians) * 50,
  };
}

function GradientDefs({ id, gradient }: { id: string; gradient: TeeGradient }) {
  if (gradient.type === 'radial') {
    return (
      <radialGradient id={id} cx="50%" cy="38%" r="72%">
        <stop offset="0%" stopColor={gradient.from} />
        <stop offset="100%" stopColor={gradient.to} />
      </radialGradient>
    );
  }

  const vector = gradientVector(gradient.angle);
  return (
    <linearGradient id={id} x1={`${vector.x1}%`} y1={`${vector.y1}%`} x2={`${vector.x2}%`} y2={`${vector.y2}%`}>
      <stop offset="0%" stopColor={gradient.from} />
      <stop offset="100%" stopColor={gradient.to} />
    </linearGradient>
  );
}

interface GarmentBaseProps {
  view: TeeDesign['view'];
  zones: TeeDesign['zones'];
  gradients: TeeDesign['gradients'];
  prefix: string;
}

/**
 * The photographic garment itself: the actual mockup plus the multiply zone
 * colour fills clipped to the photo-derived masks. Memoised so the static
 * garment never re-renders while the user drags artwork around.
 */
const GarmentBase = React.memo(function GarmentBase({ view, zones, gradients, prefix }: GarmentBaseProps) {
  const assets = getMockupAssets(view);
  const { width: W, height: H } = SHIRT_VIEWBOX;
  const maskId = (zone: string) => `${prefix}-mask-${zone}`;

  const bodyFill = gradients.body.enabled ? `url(#${prefix}-body-gradient)` : zones.body;
  const sleeveFill = gradients.sleeves.enabled ? `url(#${prefix}-sleeve-gradient)` : zones.sleeves;
  const collarFill = gradients.collar.enabled ? `url(#${prefix}-collar-gradient)` : zones.collar;

  return (
    <g>
      {/* Base garment photograph (near-white base, native transparency) */}
      <image href={assets.mockup} x={0} y={0} width={W} height={H} />

      {/* Zone colours: multiply keeps the photograph's texture and shading intact */}
      <g style={{ mixBlendMode: 'multiply' }}>
        <rect x={0} y={0} width={W} height={H} fill={bodyFill} mask={`url(#${maskId('body')})`} />
        <rect x={0} y={0} width={W} height={H} fill={sleeveFill} mask={`url(#${maskId('left-sleeve')})`} />
        <rect x={0} y={0} width={W} height={H} fill={sleeveFill} mask={`url(#${maskId('right-sleeve')})`} />
        <rect x={0} y={0} width={W} height={H} fill={collarFill} mask={`url(#${maskId('cuffs')})`} />
        <rect x={0} y={0} width={W} height={H} fill={collarFill} mask={`url(#${maskId('collar')})`} />
      </g>
    </g>
  );
});

/**
 * Cardboard hang tag at the side neckline — a physical product tag, not a
 * print. Drawn above the shading so it sits on top of the fabric.
 */
const HangTag = React.memo(function HangTag({
  attachX,
  attachY,
  knotX,
  knotY,
  text = 'GROOVE',
}: {
  attachX: number;
  attachY: number;
  knotX: number;
  knotY: number;
  text?: string;
}) {
  const tagW = 100;
  const tagH = 132;
  const EMBLEM_ASPECT = 1278 / 1230;
  return (
    <g pointerEvents="none">
      <path
        d={`M ${attachX} ${attachY} C ${attachX + 55} ${attachY + 70}, ${knotX + 14} ${knotY - 44}, ${knotX} ${knotY}`}
        fill="none"
        stroke="#D8D2C4"
        strokeWidth={3.5}
      />
      <g transform={`translate(${knotX} ${knotY}) rotate(14)`}>
        <rect x={-tagW / 2 + 3.5} y={4} width={tagW} height={tagH} rx={10} fill="#000000" opacity={0.32} />
        <rect x={-tagW / 2} y={0} width={tagW} height={tagH} rx={10} fill="#F2EEE3" stroke="#D5CFC0" strokeWidth={1.5} />
        <rect x={-tagW / 2 + 6} y={6} width={tagW - 12} height={tagH - 12} rx={7} fill="none" stroke="#C9C3B4" strokeWidth={1.2} strokeDasharray="4 3" />
        <circle cx={0} cy={13} r={4.6} fill="#1a1a1e" />
        <image
          href={BRAND_EMBLEM_SRC}
          x={-24}
          y={25}
          width={48}
          height={48 / EMBLEM_ASPECT}
          preserveAspectRatio="xMidYMid meet"
        />
        <text x={0} y={101} textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize={13} fontWeight={900} letterSpacing={1.2} fill="#232327">
          {(text || 'GROOVE').trim().toUpperCase().slice(0, 14)}
        </text>
        <text x={0} y={116.5} textAnchor="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize={6.4} fontWeight={600} letterSpacing={2.3} fill="#6E6A5E">
          EST. 2026
        </text>
      </g>
    </g>
  );
});

/**
 * The complete live shirt artwork.
 *
 * Layers, bottom to top:
 *   1. photographic garment (memoised `GarmentBase`)
 *   2. pattern artwork, clipped to the silhouette mask
 *   3. imported artwork, clipped to the printable mask
 *   4. chest badge + chest wordmark (front) / back name & number (back)
 *   5. garment shading (multiply) and highlight (screen) derived from the
 *      photograph itself, so prints sit *in* the fabric instead of on top of it
 *
 * The same component drives the editor, the share page, PNG export and the
 * transparent artwork-only export, keeping all four pixel-identical.
 */
export function TeeSvg({
  design,
  interactive = false,
  selectedImageId = null,
  onSelectImage,
  onUpdateImage,
  selectedTextId = null,
  onSelectText,
  onTextDrag,
  onContextMenuImage,
  className,
  artworkOnly = false,
}: TeeSvgProps) {
  const rawId = useId();
  const prefix = useMemo(() => `tee-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const localRef = useRef<SVGSVGElement>(null);
  const resolvedRef = localRef;
  const textGestureRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    startPointerX: number;
    startPointerY: number;
  } | null>(null);
  const textElRef = useRef<SVGTextElement>(null);
  const [textBox, setTextBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const assets = getMockupAssets(design.view);
  const { width: W, height: H } = SHIRT_VIEWBOX;
  const garment = assets.garment;

  useEffect(() => {
    // Warn loudly if the asset pipeline ever drifts from the mockup.
    if (!artworkOnly) void validateMockupAssets();
  }, [artworkOnly]);

  const maskId = (zone: string) => `${prefix}-mask-${zone}`;
  const silhouetteMaskId = maskId('silhouette');
  const printableMaskId = maskId('printable');
  const bodyGradientId = `${prefix}-body-gradient`;
  const sleeveGradientId = `${prefix}-sleeve-gradient`;
  const collarGradientId = `${prefix}-collar-gradient`;
  const panelGradientId = `${prefix}-panel-gradient`;
  const accentsGradientId = `${prefix}-accents-gradient`;

  const chestText =
    design.texts.find((text) => text.surface === design.view && text.visible) ?? null;
  const selectedChestText = design.texts.find((text) => text.surface === design.view) ?? null;
  const chestFont = selectedChestText ? getFont(selectedChestText.font) : null;
  const backFont = getFont(design.back.font);

  const visibleImages = design.images.filter(
    (image) => image.view === design.view && !image.hidden
  );

  // Garment-aware layout anchors, derived from the actual photo bounding box.
  const garmentCx = garment.x + garment.width / 2;
  const garmentTop = garment.y;
  const garmentHeight = garment.height;
  const garmentWidth = garment.width;

  const badgeX = design.badge.placement === 'chest-center' ? garmentCx : garmentCx - garmentWidth * 0.245;
  const badgeY = garmentTop + garmentHeight * 0.31;
  const badgeScale = garmentWidth / 1536 / 1.1 + 0.28;

  const backNameY = garmentTop + garmentHeight * 0.235;
  const backNumberY = garmentTop + garmentHeight * 0.5;

  // Brand mark geometry (aspects match the actual files).
  const EMBLEM_ASPECT = 1278 / 1230;
  const WORDMARK_ASPECT = 2172 / 724;
  const PATCH_ASPECT = 1774 / 887;
  const emblemW = garmentWidth * 0.13;
  const emblemH = emblemW / EMBLEM_ASPECT;
  const wordmarkW = garmentWidth * 0.38;
  const wordmarkH = wordmarkW / WORDMARK_ASPECT;
  const patchW = garmentWidth * 0.17;
  const patchH = patchW / PATCH_ASPECT;
  const backGraphicW = garmentWidth * 0.47;
  const backGraphicH = backGraphicW / WORDMARK_ASPECT;

  // Pointer helpers for dragging the text directly on the shirt.
  const toViewBox = (event: React.PointerEvent): { x: number; y: number } => {
    const svg = resolvedRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * W,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * H,
    };
  };

  const beginTextDrag = (
    event: React.PointerEvent,
    text: NonNullable<typeof selectedChestText>
  ) => {
    if (!interactive) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectText?.(text.id);
    if (text.locked) return;
    const pointer = toViewBox(event);
    textGestureRef.current = {
      id: text.id,
      pointerId: event.pointerId,
      startX: text.x,
      startY: text.y,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
    };
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // Best effort; drag still works without capture.
    }
  };

  const handleTextPointerMove = (event: React.PointerEvent) => {
    const gesture = textGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const pointer = toViewBox(event);
    let nextX = gesture.startX + ((pointer.x - gesture.startPointerX) / W) * 100;
    let nextY = gesture.startY + ((pointer.y - gesture.startPointerY) / H) * 100;
    // Snap the anchor onto the garment's vertical centre line.
    const snapTolerance = W * 0.012;
    if (Math.abs((nextX / 100) * W - garmentCx) <= snapTolerance) nextX = (garmentCx / W) * 100;
    nextX = Math.min(100, Math.max(0, nextX));
    nextY = Math.min(100, Math.max(0, nextY));
    onTextDrag?.(gesture.id, { x: nextX, y: nextY }, `text-move-${gesture.id}`);
  };

  const endTextDrag = (event: React.PointerEvent) => {
    const gesture = textGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    try {
      if ((event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
        (event.currentTarget as Element).releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore browsers without pointer capture.
    }
    textGestureRef.current = null;
  };

  // Measure the rendered text block so the selection outline hugs the ink.
  const measuredKey = selectedChestText
    ? [
        selectedChestText.id,
        selectedChestText.text,
        selectedChestText.font,
        selectedChestText.weight,
        selectedChestText.size,
        selectedChestText.letterSpacing,
        selectedChestText.lineHeight,
        selectedChestText.italic,
        selectedChestText.align,
        selectedChestText.rotation,
        selectedChestText.x,
        selectedChestText.y,
      ].join('|')
    : '';
  useLayoutEffect(() => {
    if (!selectedChestText || selectedTextId !== selectedChestText.id || !textElRef.current) {
      setTextBox(null);
      return;
    }
    try {
      const box = textElRef.current.getBBox();
      const next = { x: box.x, y: box.y, width: box.width, height: box.height };
      setTextBox((previous) =>
        previous &&
        Math.abs(previous.x - next.x) < 0.5 &&
        Math.abs(previous.y - next.y) < 0.5 &&
        Math.abs(previous.width - next.width) < 0.5 &&
        Math.abs(previous.height - next.height) < 0.5
          ? previous
          : next
      );
    } catch {
      setTextBox(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey, selectedTextId]);

  const renderChestText = (text: NonNullable<typeof chestText>, font: NonNullable<typeof chestFont>) => {
    const anchorX = (text.x / 100) * W;
    const anchorY = (text.y / 100) * H;
    const anchor = text.align === 'left' ? 'start' : text.align === 'right' ? 'end' : 'middle';
    const lines = text.text.split('\n');
    const lineHeightPx = text.size * (text.lineHeight || 1.15);
    const totalHeight = lineHeightPx * (lines.length - 1);
    const isSelected = selectedTextId === text.id;

    return (
      <g key={text.id} pointerEvents={interactive ? 'auto' : 'none'}>
        <text
          ref={isSelected ? textElRef : undefined}
          x={anchorX}
          y={anchorY - totalHeight / 2}
          textAnchor={anchor}
          dominantBaseline="middle"
          fill={text.color}
          fillOpacity={text.opacity}
          fontFamily={font.family}
          fontWeight={text.weight}
          fontStyle={text.italic ? 'italic' : (font.style ?? 'normal')}
          fontSize={text.size}
          letterSpacing={text.letterSpacing}
          transform={text.rotation ? `rotate(${text.rotation} ${anchorX} ${anchorY})` : undefined}
          style={{
            paintOrder: 'stroke',
            stroke: interactive ? 'transparent' : 'none',
            strokeWidth: interactive ? Math.max(6, text.size * 0.35) : 0,
            cursor: interactive ? (text.locked ? 'not-allowed' : 'move') : 'default',
          }}
          onPointerDown={interactive ? (event) => beginTextDrag(event, text) : undefined}
          onPointerMove={interactive ? handleTextPointerMove : undefined}
          onPointerUp={interactive ? endTextDrag : undefined}
          onPointerCancel={interactive ? endTextDrag : undefined}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={anchorX} dy={index === 0 ? 0 : lineHeightPx}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <svg
      ref={resolvedRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${design.fit} fit photo tee, ${design.pattern} pattern, ${design.view} view`}
      className={cn('block h-auto w-full select-none', className)}
      style={{ touchAction: interactive ? 'none' : undefined }}
      onPointerDown={
        interactive
          ? () => {
              onSelectImage?.(null);
              onSelectText?.(null);
            }
          : undefined
      }
    >
      <defs>
        {design.gradients.body.enabled && (
          <GradientDefs id={bodyGradientId} gradient={design.gradients.body} />
        )}
        {design.gradients.sleeves.enabled && (
          <GradientDefs id={sleeveGradientId} gradient={design.gradients.sleeves} />
        )}
        {design.gradients.collar.enabled && (
          <GradientDefs id={collarGradientId} gradient={design.gradients.collar} />
        )}
        {design.gradients.panels.enabled && (
          <GradientDefs id={panelGradientId} gradient={design.gradients.panels} />
        )}
        {design.gradients.accents.enabled && (
          <GradientDefs id={accentsGradientId} gradient={design.gradients.accents} />
        )}

        {!artworkOnly &&
          Object.entries(assets.masks).map(([zone, url]) => (
            <mask
              key={zone}
              id={maskId(zone)}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={W}
              height={H}
            >
              <image href={url} x={0} y={0} width={W} height={H} />
            </mask>
          ))}
      </defs>

      {/* Garment photograph + zone colours (memoised static layer) */}
      {!artworkOnly && (
        <GarmentBase
          view={design.view}
          zones={design.zones}
          gradients={design.gradients}
          prefix={prefix}
        />
      )}

      {/* Pattern artwork, clipped to the garment silhouette */}
      {!artworkOnly && (
        <PatternLayer
            pattern={design.pattern}
            zones={design.zones}
            gradients={design.gradients}
            view={design.view}
            maskId={silhouetteMaskId}
            panelGradientId={panelGradientId}
            offset={design.patternOffset}
            visible={design.patternVisible}
            scale={design.patternScale}
            rotation={design.patternRotation}
            opacity={design.patternOpacity}
            region={design.patternRegion}
            customSrc={
              design.pattern === 'custom'
                ? design.images.find((image) => image.view === design.view && !image.hidden)?.src ??
                  design.images.find((image) => !image.hidden)?.src ??
                  null
                : null
            }
          />
      )}

      {/* Imported artwork, clipped to the printable area (not in artwork-only mode) */}
      {visibleImages.length > 0 && interactive && onUpdateImage && !artworkOnly && (
        <ImageLayer
          images={visibleImages}
          selectedId={selectedImageId}
          onSelect={onSelectImage ?? (() => undefined)}
          onChange={onUpdateImage}
          svgRef={resolvedRef}
          maskId={printableMaskId}
          garmentCenter={{ x: garmentCx, y: garmentTop + garmentHeight / 2 }}
          onContextMenuImage={onContextMenuImage}
        />
      )}
      {visibleImages.length > 0 && (artworkOnly || !interactive || !onUpdateImage) && (
        <g mask={artworkOnly ? undefined : `url(#${printableMaskId})`}>
          {visibleImages
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((image) => {
              const cx = image.x * W;
              const cy = image.y * H;
              const width = image.width * W;
              const height = image.height * H;
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
                   
                  />
                </g>
              );
            })}
        </g>
      )}

      {/* Front / back print (clipped to the printable area) */}
      {design.view === 'front' && (
        <g mask={artworkOnly ? undefined : `url(#${printableMaskId})`}>
          {design.badge.enabled && design.badge.text && (
            <g pointerEvents="none">
              <g transform={`translate(${badgeX} ${badgeY}) scale(${badgeScale})`}>
                <path
                  d="M 0 -40 L 40 -24 L 36 26 L 0 54 L -36 26 L -40 -24 Z"
                  fill={design.badge.color}
                  stroke={design.zones.collar}
                  strokeWidth={2.5}
                />
                <path
                  d="M 0 -30 L 30.6 -18 L 27.8 19.5 L 0 42 L -27.8 19.5 L -30.6 -18 Z"
                  fill="none"
                  stroke={design.zones.collar}
                  strokeWidth={1.4}
                  opacity={0.5}
                />
                <text
                  x={0}
                  y={10}
                  textAnchor="middle"
                  fill={design.zones.collar}
                  fontFamily="Inter, sans-serif"
                  fontSize={design.badge.text.length > 2 ? 19 : 24}
                  fontWeight={900}
                  letterSpacing={0.5}
                >
                  {design.badge.text}
                </text>
              </g>
            </g>
          )}

          {chestText && chestText.text && chestFont && (
            <g>{renderChestText(chestText, chestFont)}</g>
          )}
        </g>
      )}

      {/* Back print */}
      {design.view === 'back' && (
        <>
          {design.back.visible && (
            <g pointerEvents="none" mask={artworkOnly ? undefined : `url(#${printableMaskId})`}>
              {design.back.name && (
                <text
                  x={garmentCx}
                  y={backNameY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={design.back.color}
                  fontFamily={backFont.family}
                  fontWeight={backFont.weight}
                  fontStyle={backFont.style ?? 'normal'}
                  fontSize={Math.max(30, design.back.size * 0.38)}
                  letterSpacing={3.6}
                >
                  {design.back.name}
                </text>
              )}
              {design.back.number && (
                <text
                  x={garmentCx}
                  y={backNumberY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={design.back.color}
                  fontFamily={backFont.family}
                  fontWeight={backFont.weight}
                  fontStyle={backFont.style ?? 'normal'}
                  fontSize={design.back.size}
                  letterSpacing={-2.4}
                >
                  {design.back.number}
                </text>
              )}
            </g>
          )}
          {chestText && chestText.text && chestFont && (
            <g mask={artworkOnly ? undefined : `url(#${printableMaskId})`}>
              <g>{renderChestText(chestText, chestFont)}</g>
            </g>
          )}
        </>
      )}

      {/* Selection outline for the active text layer (never exported) */}
      {textBox && selectedChestText && selectedTextId === selectedChestText.id && (
        <g pointerEvents="none" data-export-ignore="true" aria-hidden="true">
          <rect
            x={textBox.x - 10}
            y={textBox.y - 10}
            width={textBox.width + 20}
            height={textBox.height + 20}
            rx={6}
            fill="none"
            stroke={selectedChestText.locked ? '#F5C97B' : '#F3E8D7'}
            strokeWidth={1.6}
            strokeDasharray="7 6"
            opacity={0.9}
            transform={
              selectedChestText.rotation
                ? `rotate(${selectedChestText.rotation} ${(selectedChestText.x / 100) * W} ${(selectedChestText.y / 100) * H})`
                : undefined
            }
          />
        </g>
      )}

      {/* Groove PH brand marks (printed on the garment, under the shading) */}
      <g pointerEvents="none">
        {/* Printed brand marks: clipped to the printable area */}
        <g mask={artworkOnly ? undefined : `url(#${printableMaskId})`}>
        {design.view === 'front' && design.branding.wordmark && (
          <image
            href={BRAND_WORDMARK_SRC}
            x={garmentCx - wordmarkW / 2}
            y={garmentTop + garmentHeight * 0.335}
            width={wordmarkW}
            height={wordmarkH}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.97}
          />
        )}
        {design.view === 'front' && design.branding.emblem && (
          <image
            href={BRAND_EMBLEM_SRC}
            x={garmentCx + garmentWidth * 0.135}
            y={garmentTop + garmentHeight * 0.275}
            width={emblemW}
            height={emblemH}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.97}
            style={{ imageRendering: 'crisp-edges' }}
          />
        )}
        {design.view === 'front' && design.branding.patch && (
          <image
            href={BRAND_PATCH_SRC}
            x={garmentCx + garmentWidth * 0.2}
            y={garmentTop + garmentHeight * 0.855}
            width={patchW}
            height={patchH}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.98}
          />
        )}
        {design.view === 'back' && design.branding.backGraphic && (
          <image
            href={BRAND_WORDMARK_SRC}
            x={garmentCx - backGraphicW / 2}
            y={garmentTop + garmentHeight * 0.245}
            width={backGraphicW}
            height={backGraphicH}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.97}
          />
        )}
        </g>
        {/* Inner collar label removed — neckline stays clean. */}
      </g>

      {/* Garment lighting: derived from the photograph so prints sit in the fabric */}
      {!artworkOnly && (
        <>
          <image
            href={assets.shading}
            x={0}
            y={0}
            width={W}
            height={H}
            mask={`url(#${silhouetteMaskId})`}
            style={{ mixBlendMode: 'multiply' }}
            pointerEvents="none"
          />
          <image
            href={assets.highlight}
            x={0}
            y={0}
            width={W}
            height={H}
            mask={`url(#${silhouetteMaskId})`}
            style={{ mixBlendMode: 'screen' }}
            opacity={0.45}
            pointerEvents="none"
          />
        </>
      )}

      {/* Hang tag — above the fabric lighting, front view only */}
      {!artworkOnly && design.view === 'front' && design.branding.hangTag && (
        <HangTag
          attachX={garmentCx + garmentWidth * 0.175}
          attachY={garmentTop + garmentHeight * 0.05}
          knotX={garmentCx + garmentWidth * 0.295}
          knotY={garmentTop + garmentHeight * 0.19}
          text={design.branding.hangTagText}
        />
      )}
    </svg>
  );
}

export default TeeSvg;
