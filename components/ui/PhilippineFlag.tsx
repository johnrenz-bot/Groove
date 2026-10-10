import { cn } from '@/components/shared/cn';

/**
 * PhilippineFlag — the national flag of the Philippines drawn entirely inline
 * as an SVG. No images, external URLs, packages, or emoji.
 *
 *   - blue   #0038A8 top half
 *   - red    #CE1126 bottom half
 *   - white  triangle from the hoist: (0,0) (0,20) (13,10)
 *   - golden #FCD116 sun with eight rays
 *   - three correctly formed five-pointed golden stars
 *
 * This is a static platform mark used by the shared profile header. It
 * identifies Groove PH, not the individual: public.profiles has no country or
 * nationality column and this component does not invent one.
 */

interface PhilippineFlagProps {
  className?: string;
  /** Rendered width in px. Defaults to 20. */
  width?: number | string;
  /** Rendered height in px. Defaults to 14. */
  height?: number | string;
}

const BLUE = '#0038A8';
const RED = '#CE1126';
const GOLD = '#FCD116';
const WHITE = '#FFFFFF';

/** Centre of the sun, at the centroid of the white triangle. */
const SUN_X = 4.4;
const SUN_Y = 10;

/** The eight main rays, one every 45°. */
const SUN_RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Builds a five-pointed star as an SVG polygon point list.
 * Ten vertices alternating between the outer and inner radius, starting at the
 * top point so the star is upright.
 */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const x = (cx + radius * Math.cos(angle)).toFixed(2);
    const y = (cy + radius * Math.sin(angle)).toFixed(2);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

/** One star inside the triangle near each of the three vertices. */
const STAR_POINTS = [
  starPoints(2.6, 3.4, 1.15, 0.48),
  starPoints(2.6, 16.6, 1.15, 0.48),
  starPoints(8.3, 10, 1.15, 0.48),
];

export function PhilippineFlag({ className, width = 20, height = 14 }: PhilippineFlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 30 20"
      width={width}
      height={height}
      role="img"
      aria-label="Philippines flag"
      className={cn('rounded-sm overflow-hidden ring-1 ring-black/10', className)}
    >
      {/* Blue (top) and red (bottom) fields */}
      <rect x="0" y="0" width="30" height="10" fill={BLUE} />
      <rect x="0" y="10" width="30" height="10" fill={RED} />

      {/* White triangle from the hoist */}
      <polygon points="0,0 0,20 13,10" fill={WHITE} />

      {/* Golden sun: eight rays around a central disc */}
      <g fill={GOLD}>
        {SUN_RAY_ANGLES.map((angle) => (
          <polygon
            key={angle}
            points={`${SUN_X},7 ${SUN_X - 0.65},8.5 ${SUN_X + 0.65},8.5`}
            transform={`rotate(${angle} ${SUN_X} ${SUN_Y})`}
          />
        ))}
        <circle cx={SUN_X} cy={SUN_Y} r="1.5" />
      </g>

      {/* Three five-pointed golden stars */}
      <g fill={GOLD}>
        {STAR_POINTS.map((points, index) => (
          <polygon key={index} points={points} />
        ))}
      </g>
    </svg>
  );
}

export default PhilippineFlag;
