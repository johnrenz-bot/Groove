import React from 'react';

/**
 * Philippine sun motif — eight primary rays with delicate linework.
 * Pure SVG, no image dependencies. Decorative only (aria-hidden).
 */
export function PhilippineSun({
  size = 80,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const center = size / 2;
  const rayLength = size * 0.38;
  const rayWidth = size * 0.04;
  const innerRadius = size * 0.12;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`ph-sun ${className}`}
    >
      {/* Eight primary rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = center + Math.cos(angle) * innerRadius;
        const y1 = center + Math.sin(angle) * innerRadius;
        const x2 = center + Math.cos(angle) * rayLength;
        const y2 = center + Math.sin(angle) * rayLength;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth={rayWidth}
            strokeLinecap="round"
          />
        );
      })}
      {/* Inner circle */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        stroke="currentColor"
        strokeWidth={rayWidth * 0.8}
        fill="none"
      />
      {/* Center dot */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius * 0.35}
        fill="currentColor"
      />
    </svg>
  );
}

export default PhilippineSun;
