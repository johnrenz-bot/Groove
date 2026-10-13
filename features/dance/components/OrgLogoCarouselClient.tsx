'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { DanceOrg } from '@/lib/dance/types';
import { OrgTextPill } from './OrgTextPill';

interface OrgLogoCarouselClientProps {
  orgs: DanceOrg[];
}

/**
 * Official league / federation logo carousel.
 *
 * Logos only — no descriptions or text cards. The org list is duplicated so a
 * single `translateX(-50%)` (the `dance-marquee` keyframe in app/globals.css)
 * loops seamlessly. Hover or keyboard focus pauses the marquee; a pointer drag
 * lets touch users scrub the row. Users who prefer reduced motion get a static,
 * non-animated row and no drag handling.
 *
 * Each logo links to its official site in a new tab with
 * `rel="noopener noreferrer"`. A missing or failed-to-load logo falls back to an
 * `OrgTextPill` showing the organization's name. Logos are local `/logos/...`
 * paths, so no `remotePatterns` / `unoptimized` config is needed.
 */
export function OrgLogoCarouselClient({ orgs }: OrgLogoCarouselClientProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0 });

  if (!orgs || orgs.length === 0) return null;

  // Duplicate the list so the -50% translate loops seamlessly.
  const loop = [...orgs, ...orgs];

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion()) return;
      const track = trackRef.current;
      if (!track) return;
      // Freeze the marquee so the manual drag offset reads cleanly.
      track.style.animationPlayState = 'paused';
      dragState.current.active = true;
      dragState.current.startX = e.clientX;
    },
    [prefersReducedMotion]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const delta = e.clientX - dragState.current.startX;
    // `!important` so the manual offset overrides the (paused) animation's
    // transform, which otherwise sits above inline styles in the cascade.
    track.style.setProperty('transform', `translateX(${delta}px)`, 'important');
  }, []);

  const endDrag = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const track = trackRef.current;
    if (track) {
      // Drop the manual offset and resume the marquee from its frozen frame.
      track.style.removeProperty('transform');
      track.style.animationPlayState = '';
    }
  }, []);

  return (
    <section role="region" aria-label="Official league partners" className="mb-8">
      <h2 className="sr-only">Official league partners</h2>
      <span className="g-eyebrow mb-3">Official Leagues &amp; Federations</span>
      <div
        className="dance-marquee-wrap"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="dance-marquee-track" ref={trackRef}>
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
                className="mx-4 inline-flex shrink-0 items-center"
                style={{ height: 48 }}
              >
                {showLogo ? (
                  <Image
                    src={org.logo_url!}
                    alt={`${org.name} logo`}
                    height={40}
                    width={140}
                    preload={false}
                    style={{ width: 'auto', height: 40, objectFit: 'contain' }}
                    className="grayscale opacity-50 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                    onError={() =>
                      setFailed((prev) => {
                        const next = new Set(prev);
                        next.add(org.slug);
                        return next;
                      })
                    }
                  />
                ) : (
                  <OrgTextPill name={org.name} />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
