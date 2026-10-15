'use client';

import React from 'react';
import Image from 'next/image';

/**
 * SafeImage — the only image element allowed on the Dance Community page.
 *
 * Guarantees:
 * - Geometry comes from the PARENT (aspect-* + w-full in fill mode, or an
 *   explicit w/h box in fixed mode), so a slow or failed image never shifts
 *   layout (no CLS).
 * - A skeleton wash shows while loading (fill mode).
 * - On error the <img> is REMOVED and replaced with `fallback` — raw alt
 *   text or a broken-image icon is never visible. Pass `fallback={null}` to
 *   render nothing on failure (for small decorative marks).
 * - `referrerPolicy="no-referrer"` on every image.
 * - One-shot error handling: a fallback must never be another image that can
 *   fail (no infinite loops).
 */
interface SafeImageProps {
  src: string;
  /** Descriptive alt for screen readers. Never rendered as visible text. */
  alt: string;
  /**
   * Fill mode (default): wrapper is absolute inset-0 — the parent must be
   * `relative` with an aspect ratio or fixed size.
   */
  fill?: boolean;
  /** Fixed mode (fill=false): explicit box size for small marks/logos. */
  width?: number;
  height?: number;
  sizes?: string;
  /** Classes applied to the <img> itself (e.g. object-cover). */
  className?: string;
  /** Extra classes for the wrapper. */
  wrapperClassName?: string;
  /** Rendered in place of the image when loading fails. Defaults to a dark wash. */
  fallback?: React.ReactNode;
  eager?: boolean;
  imgStyle?: React.CSSProperties;
  /** Called once when the image fails to load (for parent fallback UIs). */
  onError?: () => void;
}

export function SafeImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes,
  className = 'object-cover object-center',
  wrapperClassName = '',
  fallback,
  eager = false,
  imgStyle,
  onError,
}: SafeImageProps) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // New src = fresh attempt.
  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  const handleError = React.useCallback(() => {
    setFailed(true);
    onError?.();
  }, [onError]);

  if (!fill) {
    const boxStyle = {
      width: width ?? 16,
      height: height ?? 16,
    };
    if (failed) {
      if (fallback === null) return null;
      return (
        <span
          className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${wrapperClassName}`}
          style={boxStyle}
          aria-hidden="true"
        >
          {fallback}
        </span>
      );
    }
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${wrapperClassName}`}
        style={boxStyle}
        aria-hidden={alt === '' ? true : undefined}
      >
        <Image
          src={src}
          alt={alt}
          width={width ?? 16}
          height={height ?? 16}
          sizes={sizes}
          className={className}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          priority={eager}
          style={{ opacity: loaded ? 1 : 0, ...imgStyle }}
        />
      </span>
    );
  }

  if (failed) {
    return (
      <div className={`absolute inset-0 overflow-hidden ${wrapperClassName}`} aria-hidden="true">
        {fallback ?? <div className="h-full w-full bg-gradient-to-br from-[#2a2a2a] via-black to-[#171717]" />}
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${wrapperClassName}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-muted/40 motion-reduce:animate-none"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        priority={eager}
        style={imgStyle}
      />
    </div>
  );
}

export default SafeImage;
