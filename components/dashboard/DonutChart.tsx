'use client';

/**
 * Lightweight SVG donut used by the dashboard analytics widgets.
 *
 * There is no chart library in the product, and every segment here comes from
 * real counts supplied by the caller - the component never invents a series.
 * It is intentionally presentation-only: numbers are passed in from the page's
 * fetched data and the accessible label reports the same breakdown.
 */

import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  /** Any CSS color; theme tokens such as `var(--accent)` are preferred. */
  color: string;
}

export function DonutChart({
  data,
  size = 168,
  thickness = 16,
  centerValue,
  centerLabel,
  ariaLabel,
  className = '',
}: {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: React.ReactNode;
  centerLabel?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const total = data.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let offset = 0;

  const description =
    ariaLabel ??
    `${data.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}`;

  return (
    <div className={`g-donut ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={description}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          data.map((segment) => {
            const value = Math.max(0, segment.value);
            if (value === 0) return null;
            const length = (value / total) * circumference;
            const dash = `${Math.max(length - 2, 1)} ${circumference - Math.max(length - 2, 1)}`;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
          })}
        {centerValue !== undefined && (
          <text
            x="50%"
            y={centerLabel ? '46%' : '50%'}
            textAnchor="middle"
            dominantBaseline="middle"
            className="g-donut-value"
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="g-donut-label"
          >
            {centerLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

export default DonutChart;
