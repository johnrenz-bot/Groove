import React from 'react';

/**
 * Decorative page-level background for the Coach Dashboard.
 *
 * Three layers, all pointer-events:none and aria-hidden:
 *   1. "Art • Discipline • Community" script phrase (upper area)
 *   2. Large Philippine sun emblem (right side, behind intro section)
 *   3. Banig-inspired woven patterns (edges and corners)
 *
 * The component renders behind all dashboard content via z-index:0.
 * The parent (.ph-dashboard) provides the stacking context.
 */
export function CoachDashboardBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Layer 1: Script phrase — "Art • Discipline • Community" */}
      <div className="ph-script-phrase absolute right-[8%] top-[6%] hidden items-center gap-4 md:flex lg:right-[12%] lg:top-[5%]">
        {/* Left decorative line */}
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--ph-gold)]/40 lg:w-24" />
        {/* Script text */}
        <span className="font-serif text-xl italic tracking-wide text-[var(--ph-gold)]/50 lg:text-2xl">
          Art <span className="mx-1 text-[var(--ph-gold)]/40">•</span> Discipline{' '}
          <span className="mx-1 text-[var(--ph-gold)]/40">•</span> Community
        </span>
        {/* Right decorative line */}
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--ph-gold)]/40 lg:w-24" />
      </div>

      {/* Layer 2: Philippine sun emblem — large, pale gold, subtle */}
      <div className="absolute -right-20 top-[12%] opacity-[0.08] lg:-right-16 lg:top-[10%]">
        <PhilippineSunLarge />
      </div>

      {/* Layer 2b: Secondary sun — smaller, bottom right */}
      <div className="absolute -bottom-16 -right-16 opacity-[0.05] lg:-bottom-12 lg:-right-12">
        <PhilippineSunLarge size={320} />
      </div>

      {/* Layer 3: Banig-inspired woven patterns */}
      {/* Top-right corner pattern */}
      <div className="ph-banig-pattern absolute -right-4 -top-4 h-48 w-48 opacity-[0.04] lg:h-64 lg:w-64" />

      {/* Right edge pattern */}
      <div className="ph-banig-pattern absolute -right-2 top-[30%] h-64 w-32 opacity-[0.03] lg:h-80 lg:w-40" />

      {/* Bottom-left corner pattern */}
      <div className="ph-banig-pattern absolute -bottom-4 -left-4 h-40 w-40 opacity-[0.04] lg:h-56 lg:w-56" />

      {/* Bottom-right corner pattern */}
      <div className="ph-banig-pattern absolute -bottom-4 -right-4 h-36 w-36 opacity-[0.03] lg:h-48 lg:w-48" />

      {/* Left edge pattern — subtle */}
      <div className="ph-banig-pattern absolute -left-2 top-[45%] h-48 w-24 opacity-[0.025] lg:h-64 lg:w-32" />

      {/* Banig diamond accents — top area */}
      <div className="absolute left-[15%] top-[8%] opacity-[0.06]">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 2L46 24L24 46L2 24Z" stroke="#C9A84C" strokeWidth="1" fill="none" />
          <path d="M24 8L40 24L24 40L8 24Z" stroke="#C9A84C" strokeWidth="0.5" fill="none" />
        </svg>
      </div>

      <div className="absolute right-[30%] top-[16%] opacity-[0.05]">
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <path d="M24 2L46 24L24 46L2 24Z" stroke="#C9A84C" strokeWidth="1" fill="none" />
          <path d="M24 8L40 24L24 40L8 24Z" stroke="#C9A84C" strokeWidth="0.5" fill="none" />
        </svg>
      </div>

      {/* Banig diamond accents — bottom area */}
      <div className="absolute bottom-[12%] left-[8%] opacity-[0.05]">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <path d="M24 2L46 24L24 46L2 24Z" stroke="#C9A84C" strokeWidth="1" fill="none" />
          <path d="M24 8L40 24L24 40L8 24Z" stroke="#C9A84C" strokeWidth="0.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Large Philippine sun with radiating rays.
 * Eight primary rays + eight secondary rays, pale gold, symmetrical.
 */
function PhilippineSunLarge({ size = 480 }: { size?: number }) {
  const center = size / 2;
  const primaryRayLength = size * 0.42;
  const secondaryRayLength = size * 0.35;
  const rayWidth = size * 0.012;
  const innerRadius = size * 0.14;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Eight primary rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = center + Math.cos(angle) * innerRadius;
        const y1 = center + Math.sin(angle) * innerRadius;
        const x2 = center + Math.cos(angle) * primaryRayLength;
        const y2 = center + Math.sin(angle) * primaryRayLength;
        return (
          <line
            key={`primary-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#C9A84C"
            strokeWidth={rayWidth}
            strokeLinecap="round"
          />
        );
      })}
      {/* Eight secondary rays (between primary) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = ((i * 45 + 22.5) * Math.PI) / 180;
        const x1 = center + Math.cos(angle) * innerRadius;
        const y1 = center + Math.sin(angle) * innerRadius;
        const x2 = center + Math.cos(angle) * secondaryRayLength;
        const y2 = center + Math.sin(angle) * secondaryRayLength;
        return (
          <line
            key={`secondary-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#C9A84C"
            strokeWidth={rayWidth * 0.6}
            strokeLinecap="round"
          />
        );
      })}
      {/* Inner circle */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        stroke="#C9A84C"
        strokeWidth={rayWidth * 0.8}
        fill="none"
      />
      {/* Outer ring */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius * 0.6}
        stroke="#C9A84C"
        strokeWidth={rayWidth * 0.5}
        fill="none"
      />
      {/* Center dot */}
      <circle cx={center} cy={center} r={innerRadius * 0.25} fill="#C9A84C" />
    </svg>
  );
}

export default CoachDashboardBackground;
