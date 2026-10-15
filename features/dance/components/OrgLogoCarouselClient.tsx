'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { DanceOrg } from '@/lib/dance/types';
import { SafeImage } from './SafeImage';

interface OrgLogoCarouselClientProps {
  orgs: DanceOrg[];
}

/** One consistent text badge for leagues without a verifiable logo. */
function LeagueTextBadge({ name }: { name: string }) {
  return (
    <span className="flex h-[44px] w-[108px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 p-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      <span className="line-clamp-2 leading-tight">{name}</span>
    </span>
  );
}

interface OrgLogoCarouselClientProps {
  orgs: DanceOrg[];
}

/**
 * Official league / federation logo carousel.
 *
 * Logos only — responsive, infinite-scrolling marquee directly below the hero.
 * The org list is duplicated so `translateX(-50%)` (the `dance-marquee` keyframe)
 * loops seamlessly.
 *
 * Features:
 * - Hover or keyboard focus pauses the marquee.
 * - Mobile touch swiping and desktop pointer dragging with zero jumpiness.
 * - Suppresses accidental link clicks during drag.
 * - Links each genuine logo to its official website in a new tab (`target="_blank"`).
 * - Falls back to one consistent text badge when a logo is unavailable or fails.
 * - Respects `prefers-reduced-motion`.
 */
export function OrgLogoCarouselClient({ orgs }: OrgLogoCarouselClientProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    startTranslateX: 0,
    hasMoved: false,
  });

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const getComputedTranslateX = (): number => {
    if (!trackRef.current) return 0;
    const style = window.getComputedStyle(trackRef.current);
    const transform = style.transform;
    if (!transform || transform === 'none') return 0;
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const parts = matrixMatch[1].split(',').map((s) => parseFloat(s.trim()));
      return parts[4] || 0; // m41 = translateX
    }
    const matrix3dMatch = transform.match(/matrix3d\(([^)]+)\)/);
    if (matrix3dMatch) {
      const parts = matrix3dMatch[1].split(',').map((s) => parseFloat(s.trim()));
      return parts[12] || 0; // m41 in 3D
    }
    return 0;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion()) return;
      const track = trackRef.current;
      if (!track) return;

      const currentX = getComputedTranslateX();
      dragState.current = {
        active: true,
        startX: e.clientX,
        startTranslateX: currentX,
        hasMoved: false,
      };

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback if pointer capture is not supported
      }

      // Freeze marquee at exact current position so manual scrub is continuous
      track.style.animationPlayState = 'paused';
      track.style.setProperty('transform', `translateX(${currentX}px)`, 'important');
    },
    [prefersReducedMotion]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const track = trackRef.current;
    if (!track) return;

    const delta = e.clientX - dragState.current.startX;
    if (Math.abs(delta) > 5) {
      dragState.current.hasMoved = true;
    }

    const newX = dragState.current.startTranslateX + delta;
    track.style.setProperty('transform', `translateX(${newX}px)`, 'important');
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }

    // Delay resetting hasMoved slightly so link onClickCapture can detect drag vs tap
    setTimeout(() => {
      if (dragState.current) dragState.current.hasMoved = false;
    }, 120);

    const track = trackRef.current;
    if (track) {
      // Resume passive animation smoothly from the current state
      track.style.removeProperty('transform');
      track.style.animationPlayState = '';
    }
  }, []);

  if (!orgs || orgs.length === 0) return null;

  // Duplicate the list so the -50% translate loops seamlessly.
  const loop = [...orgs, ...orgs];

  return (
    <section
      role="region"
      aria-label="Official league partners"
      className="mb-8 overflow-hidden py-3"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Leagues &amp; Federations
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:inline-block">
          Hover to pause · Swipe to explore · Click to visit
        </span>
      </div>

      <div
        className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_3rem,black_calc(100%-3rem),transparent)]"
      >

        <div
          className="dance-marquee-wrap cursor-grab active:cursor-grabbing select-none py-2"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="dance-marquee-track items-center px-8 py-1" ref={trackRef}>
            {loop.map((org, index) => {
              const showLogo = Boolean(
                org.logo_url && org.logo_verified && !failed.has(org.slug)
              );

              return (
                <a
                  key={`${org.slug}-${index}`}
                  href={org.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${org.name} — official website (opens in a new tab)`}
                  title={org.name}
                  onClick={(e) => {
                    // Suppress click navigation if user was swiping/dragging
                    if (dragState.current.hasMoved) {
                      e.preventDefault();
                    }
                  }}
                  className="group mx-2 inline-flex h-[44px] w-[108px] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 p-2 transition-all duration-300 hover:border-border-strong hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text sm:mx-3"
                >
                  {showLogo ? (
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden">
                      <SafeImage
                        src={org.logo_url!}
                        alt={`${org.name} logo`}
                        sizes="108px"
                        className="object-contain object-center opacity-70 transition-all duration-300 group-hover:opacity-100"
                        fallback={null}
                        onError={() =>
                          setFailed((prev) => {
                            const next = new Set(prev);
                            next.add(org.slug);
                            return next;
                          })
                        }
                      />
                    </span>
                  ) : (
                    <LeagueTextBadge name={org.name} />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
