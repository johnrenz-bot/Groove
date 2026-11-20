'use client';

import React, { useId, useMemo } from 'react';
import { getMockupAssets, SHIRT_VIEWBOX } from '../../mockupAssets';
import type { TeeGradients, TeePattern, TeeZones } from '../../types';
import { PatternLayer } from '../PatternLayer';

/**
 * Small garment-shaped swatch used by the pattern picker: the real mockup
 * with the pattern printed on it, so the swatch shows exactly what the user
 * will get instead of a simplified stand-in.
 */
export function PatternThumbnail({
  pattern,
  zones,
  gradients,
}: {
  pattern: TeePattern;
  zones: TeeZones;
  gradients: TeeGradients;
}) {
  const rawId = useId();
  const prefix = useMemo(() => `thumb-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const maskId = `${prefix}-silhouette-mask`;
  const panelGradientId = `${prefix}-panel-gradient`;
  const bodyGradientId = `${prefix}-body-gradient`;

  const assets = getMockupAssets('front');
  const { width: W, height: H } = SHIRT_VIEWBOX;
  const bodyFill = gradients.body.enabled ? `url(#${bodyGradientId})` : zones.body;
  const thumbMasks = assets.masks;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="h-full w-full"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <image href={thumbMasks.silhouette} x={0} y={0} width={W} height={H} />
        </mask>
        {(['body', 'left-sleeve', 'right-sleeve'] as const).map((zone) => (
          <mask key={zone} id={`${prefix}-${zone}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <image href={thumbMasks[zone]} x={0} y={0} width={W} height={H} />
          </mask>
        ))}
        <linearGradient id={panelGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradients.panels.from} />
          <stop offset="100%" stopColor={gradients.panels.to} />
        </linearGradient>
        <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradients.body.from} />
          <stop offset="100%" stopColor={gradients.body.to} />
        </linearGradient>
      </defs>
      <image href={assets.mockup} x={0} y={0} width={W} height={H} />
      <g style={{ mixBlendMode: 'multiply' }}>
        <rect x={0} y={0} width={W} height={H} fill={bodyFill} mask={`url(#${maskId})`} />
      </g>
      <PatternLayer
        pattern={pattern}
        zones={zones}
        gradients={gradients}
        view="front"
        maskId={maskId}
        panelGradientId={panelGradientId}
      />
      {pattern === 'custom' && (
        <g aria-hidden="true">
          <rect x={W / 2 - 26} y={H / 2 - 30} width={52} height={52} rx={10} fill="#16161c" stroke="#d6b36a" strokeWidth={2} strokeDasharray="5 4" />
          <path d={`M ${W / 2 - 12} ${H / 2 - 8} h 24 l -6 10 h 8 l -14 16 4 -12 h -8 l 6 -14 Z`} fill="#d6b36a" opacity={0.9} />
        </g>
      )}
    </svg>
  );
}

export default PatternThumbnail;
