'use client';

import React, { useId } from 'react';
import { getMockupAssets, SHIRT_VIEWBOX } from '../mockupAssets';
import type { TeeGradients, TeePattern, TeePatternRegion, TeeView, TeeZones } from '../types';

interface PatternLayerProps {
  pattern: TeePattern;
  zones: TeeZones;
  gradients: TeeGradients;
  view: TeeView;
  /** id of the silhouette mask: pattern art can never escape the garment. */
  maskId?: string;
  /** id of the linear/radial gradient used by panel fills, if any. */
  panelGradientId: string;
  /** Pattern placement offset as fractions of the canvas. */
  offset?: { x: number; y: number };
  /** Master visibility of the pattern artwork. */
  visible?: boolean;
  /** Uniform scale around the garment centre (1 = authored size). */
  scale?: number;
  /** Degrees, rotates the artwork around the garment centre. */
  rotation?: number;
  /** 0–1 opacity of the whole layer. */
  opacity?: number;
  /** Restrict the print to a garment region. */
  region?: TeePatternRegion;
  /** Data URL of the artwork used by the 'custom' tile pattern. */
  customSrc?: string | null;
}

/**
 * Printed pattern panels — authored in photo pixel coordinates
 * (1536 × 1024), symmetric about the garment's centre line, and scoped to
 * the photo-derived zone masks so nothing can spill outside the fabric or
 * onto the collar and cuffs unless deliberately designed there.
 *
 *   flame       layered twin flames from the hem + sleeve slashes
 *   tribal      symmetric claw slashes from the side panels
 *   racing      diagonal triple apex stripes
 *   swoosh      mirrored wing arcs, hem to sleeve
 *   geometric   ordered halftone arc rising from below the hem
 *   minimal     tonal seam pinstripes
 *   side-panels solid contrast side panels from underarm to hem
 *   gradient    symmetric fade washing in from both side panels
 *   lightning   mirrored bolt clusters arcing from the side seams
 *   custom      the user's imported artwork, tiled across the garment
 *
 * Every element is mirrored or centred around the garment's measured centre
 * (from the photo-derived garment bounding box), so the artwork re-anchors
 * correctly when switching between the front and back photographs.
 */
export function PatternLayer({
  pattern,
  zones,
  gradients,
  view,
  maskId,
  panelGradientId,
  offset = { x: 0, y: 0 },
  visible = true,
  scale = 1,
  rotation = 0,
  opacity = 1,
  region = 'all',
  customSrc = null,
}: PatternLayerProps): React.ReactElement | null {
  const customTileId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (pattern === 'none' || !visible) return null;

  const { width: W, height: H } = SHIRT_VIEWBOX;
  const box = getMockupAssets(view).garment;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const top = box.y;
  const bottom = box.y + box.height;

  const panelFill = gradients.panels.enabled ? `url(#${panelGradientId})` : zones.panels;
  const accent = zones.accents;
  const fadeId = `${(maskId ?? 'pattern')}-fade`;

  const mask = (zone: 'body' | 'left-sleeve' | 'right-sleeve') => {
    if (zone === 'body' && !allowBody) return `url(#${emptyMaskId})`;
    if ((zone === 'left-sleeve' || zone === 'right-sleeve') && !allowSleeves)
      return `url(#${emptyMaskId})`;
    return maskId ? `url(#${maskId.replace('silhouette', zone)})` : undefined;
  };

  // Region gating: which garment zones may carry the artwork. A disallowed
  // zone is pointed at a guaranteed-empty mask so the artwork is invisible
  // there without restructuring the pattern JSX.
  const allowBody = region !== 'sleeves';
  const allowSleeves = region !== 'body';
  const emptyMaskId = `${customTileId}-empty`;

  // Offset in viewBox units (sliders work in fractions of the canvas).
  const ox = offset.x * W;
  const oy = offset.y * H;

  const mirror = `translate(${2 * cx} 0) scale(-1 1)`;
  const placement = `translate(${ox} ${oy}) translate(${cx} ${cy}) rotate(${rotation}) scale(${scale}) translate(${-cx} ${-cy})`;

  return (
    <g mask={maskId ? `url(#${maskId})` : undefined} transform={placement} opacity={opacity}>
      {/* Shared local defs (fade wedge, ordered dot grids, empty gate mask). */}
      <defs>
        <mask id={emptyMaskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <rect x={0} y={0} width={W} height={H} fill="black" />
        </mask>
        <radialGradient id={fadeId} cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="68%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.62" />
        </radialGradient>
      </defs>

      {pattern === 'flame' && (
        <>
          <g mask={mask('body')}>
            {/* Left flame cluster */}
            <path
              d={`M ${cx - 356} ${bottom + 30}
                 Q ${cx - 360} ${bottom - 180} ${cx - 312} ${bottom - 330}
                 Q ${cx - 284} ${bottom - 408} ${cx - 258} ${bottom - 498}
                 Q ${cx - 212} ${bottom - 330} ${cx - 188} ${bottom - 235}
                 Q ${cx - 168} ${bottom - 105} ${cx - 172} ${bottom + 30} Z`}
              fill={panelFill}
              opacity={0.94}
            />
            <path
              d={`M ${cx - 322} ${bottom + 30}
                 Q ${cx - 320} ${bottom - 120} ${cx - 288} ${bottom - 222}
                 Q ${cx - 268} ${bottom - 282} ${cx - 246} ${bottom - 356}
                 Q ${cx - 210} ${bottom - 218} ${cx - 190} ${bottom - 120}
                 Q ${cx - 180} ${bottom - 30} ${cx - 184} ${bottom + 30} Z`}
              fill={accent}
              opacity={0.42}
            />
            {/* Right flame cluster (mirrored) */}
            <g transform={mirror}>
              <path
                d={`M ${cx - 356} ${bottom + 30}
                   Q ${cx - 360} ${bottom - 180} ${cx - 312} ${bottom - 330}
                   Q ${cx - 284} ${bottom - 408} ${cx - 258} ${bottom - 498}
                   Q ${cx - 212} ${bottom - 330} ${cx - 188} ${bottom - 235}
                   Q ${cx - 168} ${bottom - 105} ${cx - 172} ${bottom + 30} Z`}
                fill={panelFill}
                opacity={0.94}
              />
              <path
                d={`M ${cx - 322} ${bottom + 30}
                   Q ${cx - 320} ${bottom - 120} ${cx - 288} ${bottom - 222}
                   Q ${cx - 268} ${bottom - 282} ${cx - 246} ${bottom - 356}
                   Q ${cx - 210} ${bottom - 218} ${cx - 190} ${bottom - 120}
                   Q ${cx - 180} ${bottom - 30} ${cx - 184} ${bottom + 30} Z`}
                fill={accent}
                opacity={0.42}
              />
            </g>
            {/* Slender wisp tips flanking the main flames */}
            <path
              d={`M ${cx - 138} ${bottom + 30}
                 Q ${cx - 146} ${bottom - 95} ${cx - 128} ${bottom - 175}
                 Q ${cx - 118} ${bottom - 215} ${cx - 108} ${bottom - 262}
                 Q ${cx - 84} ${bottom - 130} ${cx - 82} ${bottom + 30} Z`}
              fill={panelFill}
              opacity={0.85}
            />
            <g transform={mirror}>
              <path
                d={`M ${cx - 138} ${bottom + 30}
                   Q ${cx - 146} ${bottom - 95} ${cx - 128} ${bottom - 175}
                   Q ${cx - 118} ${bottom - 215} ${cx - 108} ${bottom - 262}
                   Q ${cx - 84} ${bottom - 130} ${cx - 82} ${bottom + 30} Z`}
                fill={panelFill}
                opacity={0.85}
              />
            </g>
          </g>
          {/* Sleeve slashes */}
          <g mask={mask('left-sleeve')}>
            <path d={`M ${cx - 520} ${top + 280} L ${cx - 425} ${top + 420} L ${cx - 458} ${top + 458} L ${cx - 555} ${top + 316} Z`} fill={panelFill} opacity={0.9} />
            <path d={`M ${cx - 545} ${top + 320} L ${cx - 470} ${top + 428} L ${cx - 482} ${top + 442} L ${cx - 558} ${top + 333} Z`} fill={accent} opacity={0.8} />
          </g>
          <g mask={mask('right-sleeve')}>
            <path d={`M ${cx + 520} ${top + 280} L ${cx + 425} ${top + 420} L ${cx + 458} ${top + 458} L ${cx + 555} ${top + 316} Z`} fill={panelFill} opacity={0.9} />
            <path d={`M ${cx + 545} ${top + 320} L ${cx + 470} ${top + 428} L ${cx + 482} ${top + 442} L ${cx + 558} ${top + 333} Z`} fill={accent} opacity={0.8} />
          </g>
        </>
      )}

      {pattern === 'tribal' && (
        <g mask={mask('body')}>
          {[
            `M ${cx - 395} ${top + 380} L ${cx - 205} ${top + 250} L ${cx - 262} ${top + 392} L ${cx - 378} ${top + 448} Z`,
            `M ${cx - 398} ${top + 520} L ${cx - 225} ${top + 415} L ${cx - 272} ${top + 545} L ${cx - 380} ${top + 580} Z`,
            `M ${cx - 385} ${top + 655} L ${cx - 248} ${top + 575} L ${cx - 285} ${top + 678} L ${cx - 370} ${top + 705} Z`,
          ].map((d, i) => (
            <path key={i} d={d} fill={panelFill} opacity={0.92} />
          ))}
          <g transform={mirror}>
            {[
              `M ${cx - 395} ${top + 380} L ${cx - 205} ${top + 250} L ${cx - 262} ${top + 392} L ${cx - 378} ${top + 448} Z`,
              `M ${cx - 398} ${top + 520} L ${cx - 225} ${top + 415} L ${cx - 272} ${top + 545} L ${cx - 380} ${top + 580} Z`,
              `M ${cx - 385} ${top + 655} L ${cx - 248} ${top + 575} L ${cx - 285} ${top + 678} L ${cx - 370} ${top + 705} Z`,
            ].map((d, i) => (
              <path key={i} d={d} fill={panelFill} opacity={0.92} />
            ))}
          </g>
          {/* Accent edge blades */}
          {[
            `M ${cx - 352} ${top + 372} L ${cx - 238} ${top + 288} L ${cx - 276} ${top + 378} Z`,
            `M ${cx - 355} ${top + 522} L ${cx - 258} ${top + 443} L ${cx - 292} ${top + 528} Z`,
          ].map((d, i) => (
            <path key={`a-${i}`} d={d} fill={accent} opacity={0.6} />
          ))}
          <g transform={mirror}>
            {[
              `M ${cx - 352} ${top + 372} L ${cx - 238} ${top + 288} L ${cx - 276} ${top + 378} Z`,
              `M ${cx - 355} ${top + 522} L ${cx - 258} ${top + 443} L ${cx - 292} ${top + 528} Z`,
            ].map((d, i) => (
              <path key={`a-${i}`} d={d} fill={accent} opacity={0.6} />
            ))}
          </g>
          {/* Centre chevron below the chest print zone */}
          <path
            d={`M ${cx - 44} ${top + 660} L ${cx} ${top + 592} L ${cx + 44} ${top + 660} L ${cx + 44} ${top + 700} L ${cx} ${top + 636} L ${cx - 44} ${top + 700} Z`}
            fill={panelFill}
            opacity={0.85}
          />
        </g>
      )}

      {pattern === 'racing' && (
        <g mask={mask('body')}>
          {/* Left apex stripes */}
          <path d={`M ${cx - 385} ${top + 260} L ${cx - 340} ${top + 260} L ${cx - 245} ${bottom + 30} L ${cx - 288} ${bottom + 30} Z`} fill={panelFill} opacity={0.94} />
          <path d={`M ${cx - 330} ${top + 258} L ${cx - 309} ${top + 258} L ${cx - 214} ${bottom + 30} L ${cx - 234} ${bottom + 30} Z`} fill={accent} opacity={0.85} />
          <path d={`M ${cx - 295} ${top + 258} L ${cx - 281} ${top + 258} L ${cx - 187} ${bottom + 30} L ${cx - 201} ${bottom + 30} Z`} fill={accent} opacity={0.35} />
          {/* Right apex stripes (mirrored) */}
          <g transform={mirror}>
            <path d={`M ${cx - 385} ${top + 260} L ${cx - 340} ${top + 260} L ${cx - 245} ${bottom + 30} L ${cx - 288} ${bottom + 30} Z`} fill={panelFill} opacity={0.94} />
            <path d={`M ${cx - 330} ${top + 258} L ${cx - 309} ${top + 258} L ${cx - 214} ${bottom + 30} L ${cx - 234} ${bottom + 30} Z`} fill={accent} opacity={0.85} />
            <path d={`M ${cx - 295} ${top + 258} L ${cx - 281} ${top + 258} L ${cx - 187} ${bottom + 30} L ${cx - 201} ${bottom + 30} Z`} fill={accent} opacity={0.35} />
          </g>
        </g>
      )}

      {pattern === 'swoosh' && (
        <g mask={region === 'body' ? mask('body') : undefined}>
          {(region === 'sleeves' ? [mask('left-sleeve'), mask('right-sleeve')] : [undefined]).map((sleeveMask, index) => (
            <g key={index} mask={sleeveMask}>
              <path
                d={`M ${cx - 18} ${top + 905} C ${cx - 165} ${top + 760} ${cx - 330} ${top + 645} ${cx - 545} ${top + 625}`}
                fill="none"
                stroke={panelFill}
                strokeWidth={92}
                strokeLinecap="round"
                opacity={0.92}
              />
              <path
                d={`M ${cx + 18} ${top + 905} C ${cx + 165} ${top + 760} ${cx + 330} ${top + 645} ${cx + 545} ${top + 625}`}
                fill="none"
                stroke={panelFill}
                strokeWidth={92}
                strokeLinecap="round"
                opacity={0.92}
              />
              <path
                d={`M ${cx - 14} ${top + 818} C ${cx - 170} ${top + 688} ${cx - 330} ${top + 575} ${cx - 540} ${top + 555}`}
                fill="none"
                stroke={accent}
                strokeWidth={11}
                strokeLinecap="round"
                opacity={0.9}
              />
              <path
                d={`M ${cx + 14} ${top + 818} C ${cx + 170} ${top + 688} ${cx + 330} ${top + 575} ${cx + 540} ${top + 555}`}
                fill="none"
                stroke={accent}
                strokeWidth={11}
                strokeLinecap="round"
                opacity={0.9}
              />
            </g>
          ))}
        </g>
      )}

      {pattern === 'geometric' && (
        <g mask={region === 'all' ? undefined : region === 'body' ? mask('body') : `url(#${emptyMaskId})`}>
          {/* Ordered halftone arc rising from below the hem — dot rows, not random circles. */}
          {[620, 470, 330, 210, 110].map((radius, index) => (
            <path
              key={radius}
              d={`M ${cx - radius} ${bottom + 120} A ${radius} ${radius} 0 0 1 ${cx + radius} ${bottom + 120}`}
              fill="none"
              stroke={panelFill}
              strokeWidth={index < 2 ? 34 : 22}
              strokeLinecap="round"
              strokeDasharray={index < 2 ? '0.5 64' : '0.5 46'}
              opacity={0.9 - index * 0.16}
            />
          ))}
          {/* Solid centre chevron */}
          <path
            d={`M ${cx - 52} ${top + 640} L ${cx} ${top + 585} L ${cx + 52} ${top + 640} L ${cx + 52} ${top + 672} L ${cx} ${top + 622} L ${cx - 52} ${top + 672} Z`}
            fill={panelFill}
            opacity={0.9}
          />
          <path
            d={`M ${cx - 30} ${top + 665} L ${cx} ${top + 632} L ${cx + 30} ${top + 665} L ${cx + 30} ${top + 684} L ${cx} ${top + 656} L ${cx - 30} ${top + 684} Z`}
            fill={accent}
            opacity={0.75}
          />
        </g>
      )}

      {pattern === 'minimal' && (
        <>
          <g mask={mask('body')} stroke={accent} fill="none" strokeLinecap="round">
            {/* Twin pinstripes hugging each side seam */}
            {[-1, 1].map((side) => (
              <g key={side}>
                <path
                  d={`M ${cx + side * 368} ${top + 300} C ${cx + side * 385} ${top + 480} ${cx + side * 372} ${top + 720} ${cx + side * 350} ${bottom + 20}`}
                  strokeWidth={5}
                  opacity={0.5}
                />
                <path
                  d={`M ${cx + side * 345} ${top + 300} C ${cx + side * 361} ${top + 480} ${cx + side * 350} ${top + 720} ${cx + side * 328} ${bottom + 20}`}
                  strokeWidth={2.4}
                  opacity={0.4}
                />
              </g>
            ))}
            {/* Hem pinstripe */}
            <path
              d={`M ${cx - 340} ${bottom - 95} L ${cx + 340} ${bottom - 95}`}
              strokeWidth={4}
              opacity={0.38}
            />
          </g>
          {/* Cuff ticks */}
          <g mask={mask('left-sleeve')}>
            <path d={`M ${cx - 545} ${top + 395} L ${cx - 330} ${top + 520}`} stroke={accent} strokeWidth={9} strokeLinecap="round" opacity={0.55} />
          </g>
          <g mask={mask('right-sleeve')}>
            <path d={`M ${cx + 545} ${top + 395} L ${cx + 330} ${top + 520}`} stroke={accent} strokeWidth={9} strokeLinecap="round" opacity={0.55} />
          </g>
        </>
      )}

      {pattern === 'side-panels' && (
        <>
          <g mask={mask('body')}>
            {/* Left side panel, underarm to hem */}
            <path
              d={`M ${cx - 383} ${top + 290} L ${cx - 295} ${top + 315} Q ${cx - 330} ${top + 640} ${cx - 345} ${bottom + 30} L ${cx - 383} ${bottom + 30} Z`}
              fill={panelFill}
              opacity={0.95}
            />
            <path
              d={`M ${cx + 383} ${top + 290} L ${cx + 295} ${top + 315} Q ${cx + 330} ${top + 640} ${cx + 345} ${bottom + 30} L ${cx + 383} ${bottom + 30} Z`}
              fill={panelFill}
              opacity={0.95}
            />
            {/* Inner piping along the panel seams */}
            <path
              d={`M ${cx - 295} ${top + 315} Q ${cx - 330} ${top + 640} ${cx - 345} ${bottom + 30}`}
              fill="none"
              stroke={accent}
              strokeWidth={6}
              opacity={0.85}
            />
            <path
              d={`M ${cx + 295} ${top + 315} Q ${cx + 330} ${top + 640} ${cx + 345} ${bottom + 30}`}
              fill="none"
              stroke={accent}
              strokeWidth={6}
              opacity={0.85}
            />
          </g>
          {/* Sleeve under-panels */}
          <g mask={mask('left-sleeve')}>
            <path
              d={`M ${cx - 596} ${top + 430} L ${cx - 372} ${top + 620} L ${cx - 410} ${top + 645} L ${cx - 610} ${top + 472} Z`}
              fill={panelFill}
              opacity={0.9}
            />
          </g>
          <g mask={mask('right-sleeve')}>
            <path
              d={`M ${cx + 596} ${top + 430} L ${cx + 372} ${top + 620} L ${cx + 410} ${top + 645} L ${cx + 610} ${top + 472} Z`}
              fill={panelFill}
              opacity={0.9}
            />
          </g>
        </>
      )}

      {pattern === 'lightning' && (
        <>
          {/* Body: mirrored bolt clusters angled toward the hem */}
          <g mask={mask('body')}>
            {[
              // Big leading bolt, viewer's left
              `M ${cx - 330} ${top + 235} L ${cx - 398} ${top + 505} L ${cx - 345} ${top + 505} L ${cx - 415} ${top + 745} L ${cx - 262} ${top + 443} L ${cx - 318} ${top + 443} L ${cx - 255} ${top + 235} Z`,
            ].map((d, index) => (
              <path key={index} d={d} fill={panelFill} opacity={0.94} />
            ))}
            <g transform={mirror}>
              <path
                d={`M ${cx - 330} ${top + 235} L ${cx - 398} ${top + 505} L ${cx - 345} ${top + 505} L ${cx - 415} ${top + 745} L ${cx - 262} ${top + 443} L ${cx - 318} ${top + 443} L ${cx - 255} ${top + 235} Z`}
                fill={panelFill}
                opacity={0.94}
              />
            </g>
            {/* Accent inner bolt */}
            <path
              d={`M ${cx - 337} ${top + 330} L ${cx - 372} ${top + 487} L ${cx - 340} ${top + 487} L ${cx - 380} ${top + 632} L ${cx - 296} ${top + 462} L ${cx - 330} ${top + 462} L ${cx - 285} ${top + 330} Z`}
              fill={accent}
              opacity={0.88}
            />
            <g transform={mirror}>
              <path
                d={`M ${cx - 337} ${top + 330} L ${cx - 372} ${top + 487} L ${cx - 340} ${top + 487} L ${cx - 380} ${top + 632} L ${cx - 296} ${top + 462} L ${cx - 330} ${top + 462} L ${cx - 285} ${top + 330} Z`}
                fill={accent}
                opacity={0.88}
              />
            </g>
            {/* Low centre accent strike below the chest print zone */}
            <path
              d={`M ${cx + 8} ${top + 735} L ${cx - 22} ${top + 845} L ${cx + 4} ${top + 845} L ${cx - 18} ${top + 918} L ${cx + 38} ${top + 812} L ${cx + 12} ${top + 812} L ${cx + 34} ${top + 735} Z`}
              fill={accent}
              opacity={0.55}
            />
          </g>
          {/* Sleeves: sharp bolt slashes */}
          <g mask={mask('left-sleeve')}>
            <path
              d={`M ${cx - 498} ${top + 205} L ${cx - 428} ${top + 385} L ${cx - 462} ${top + 385} L ${cx - 388} ${top + 520} L ${cx - 512} ${top + 322} L ${cx - 470} ${top + 322} L ${cx - 528} ${top + 205} Z`}
              fill={accent}
              opacity={0.9}
            />
          </g>
          <g mask={mask('right-sleeve')}>
            <path
              d={`M ${cx + 498} ${top + 205} L ${cx + 428} ${top + 385} L ${cx + 462} ${top + 385} L ${cx + 388} ${top + 520} L ${cx + 512} ${top + 322} L ${cx + 470} ${top + 322} L ${cx + 528} ${top + 205} Z`}
              fill={accent}
              opacity={0.9}
            />
          </g>
        </>
      )}

      {pattern === 'custom' && customSrc && (
        <>
          <defs>
            <pattern
              id={`${customTileId}-tile`}
              width={236}
              height={236}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-8)"
            >
              <image
                href={customSrc}
                x={52}
                y={52}
                width={132}
                height={132}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.9}
              />
            </pattern>
          </defs>
          {region === 'all' && <rect x={0} y={0} width={W} height={H} fill={`url(#${customTileId}-tile)`} />}
          {region === 'body' && (
            <rect x={0} y={0} width={W} height={H} mask={mask('body')} fill={`url(#${customTileId}-tile)`} />
          )}
          {region === 'sleeves' && (
            <>
              <rect x={0} y={0} width={W} height={H} mask={mask('left-sleeve')} fill={`url(#${customTileId}-tile)`} />
              <rect x={0} y={0} width={W} height={H} mask={mask('right-sleeve')} fill={`url(#${customTileId}-tile)`} />
            </>
          )}
        </>
      )}

      {pattern === 'gradient' && (
        <g mask={mask('body')}>
          {/* Two soft flares washing in from the side seams */}
          <path
            d={`M ${cx - 383} ${top + 300} Q ${cx - 280} ${top + 260} ${cx - 165} ${top + 320} Q ${cx - 255} ${top + 640} ${cx - 305} ${bottom + 30} L ${cx - 383} ${bottom + 30} Z`}
            fill={fadeId ? `url(#${fadeId})` : panelFill}
            opacity={0.72}
          />
          <path
            d={`M ${cx + 383} ${top + 300} Q ${cx + 280} ${top + 260} ${cx + 165} ${top + 320} Q ${cx + 255} ${top + 640} ${cx + 305} ${bottom + 30} L ${cx + 383} ${bottom + 30} Z`}
            fill={fadeId ? `url(#${fadeId})` : panelFill}
            opacity={0.72}
          />
          {/* Accent kiss at the flare tips */}
          <path
            d={`M ${cx - 165} ${top + 320} Q ${cx - 255} ${top + 640} ${cx - 305} ${bottom + 30}`}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
            opacity={0.5}
          />
          <path
            d={`M ${cx + 165} ${top + 320} Q ${cx + 255} ${top + 640} ${cx + 305} ${bottom + 30}`}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
            opacity={0.5}
          />
        </g>
      )}
    </g>
  );
}

export default PatternLayer;
