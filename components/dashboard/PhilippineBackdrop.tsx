import React from 'react';

/**
 * Fixed full-screen decorative backdrop for dashboard pages.
 * Pure CSS + inline SVG, no images. z-index: -1, pointer-events: none.
 *
 * Layers:
 *   1. Cream gradient base + two soft radial highlights
 *   2. Woven edge strips (left + right) with gold diagonal lines, masked toward center
 *   3. Philippine sun SVG (top-right, gold, ~38% opacity)
 */
export function PhilippineBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
    >
      {/* Layer 1: Base + radial highlights — token-driven so dark mode stays dark.
          The previous hardcoded cream gradient (#fbf6ea → #f6eedb) painted a
          light wash over the black page in dark mode. */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_70%)]" />
      <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(196,160,90,0.08)_0%,transparent_70%)]" />

      {/* Layer 2: Woven edge strips */}
      {/* Left strip */}
      <div
        className="absolute inset-y-0 left-0 w-[22vw] opacity-[0.035]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 25px, rgb(196,160,90) 25px, rgb(196,160,90) 26.5px),
            repeating-linear-gradient(-45deg, transparent, transparent 25px, rgb(196,160,90) 25px, rgb(196,160,90) 26.5px)
          `,
          maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
        }}
      />
      {/* Right strip */}
      <div
        className="absolute inset-y-0 right-0 w-[22vw] opacity-[0.035]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 25px, rgb(196,160,90) 25px, rgb(196,160,90) 26.5px),
            repeating-linear-gradient(-45deg, transparent, transparent 25px, rgb(196,160,90) 25px, rgb(196,160,90) 26.5px)
          `,
          maskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
        }}
      />

      {/* Layer 3: Philippine sun — top-right */}
      <div className="absolute right-[3vw] top-[120px] hidden opacity-[0.38] md:block">
        <PhilippineSunSVG size={150} />
      </div>

      {/* Layer 4: Small sun — bottom-left corner */}
      <div className="absolute -bottom-8 -left-8 opacity-[0.15] md:hidden">
        <PhilippineSunSVG size={100} />
      </div>
    </div>
  );
}

/**
 * Philippine sun: 8 long rays, 8 short rays between them, center circle with star.
 * Gold color, decorative only.
 */
function PhilippineSunSVG({ size = 150 }: { size?: number }) {
  const c = size / 2;
  const longRay = size * 0.38;
  const shortRay = size * 0.28;
  const rayW = size * 0.018;
  const innerR = size * 0.12;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 8 long rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line
            key={`l${i}`}
            x1={c + Math.cos(a) * innerR}
            y1={c + Math.sin(a) * innerR}
            x2={c + Math.cos(a) * longRay}
            y2={c + Math.sin(a) * longRay}
            stroke="#C4A05A"
            strokeWidth={rayW}
            strokeLinecap="round"
          />
        );
      })}
      {/* 8 short rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = ((i * 45 + 22.5) * Math.PI) / 180;
        return (
          <line
            key={`s${i}`}
            x1={c + Math.cos(a) * innerR}
            y1={c + Math.sin(a) * innerR}
            x2={c + Math.cos(a) * shortRay}
            y2={c + Math.sin(a) * shortRay}
            stroke="#C4A05A"
            strokeWidth={rayW * 0.6}
            strokeLinecap="round"
          />
        );
      })}
      {/* Center circle */}
      <circle cx={c} cy={c} r={innerR} stroke="#C4A05A" strokeWidth={rayW * 0.7} fill="none" />
      {/* Star in center */}
      <polygon
        points={starPoints(c, c, innerR * 0.5, innerR * 0.22, 5)}
        fill="#C4A05A"
      />
    </svg>
  );
}

/** Calculate star polygon points */
function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const step = Math.PI / points;
  const result: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    result.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return result.join(' ');
}

export default PhilippineBackdrop;
