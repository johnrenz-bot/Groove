'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';

export interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: string;
}

/**
 * The dashboard's feature banner.
 *
 * The photograph always carries a dark scrim — it sits on unpredictable imagery,
 * not on a theme surface — so the copy stays white and legible in Light, Dark
 * and every seasonal palette. The visible description replaces the old
 * info-only treatment: the banner is the one place with room to explain itself.
 */
export function HeroBanner({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
}: HeroBannerProps) {
  return (
    <section className="relative isolate w-full overflow-hidden rounded-2xl border border-border/70 shadow-[var(--shadow-md)]">
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={image}
          alt=""
          fill
          preload
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) calc(100vw - 64px), 1176px"
          className="object-cover object-center"
        />
        {/* Horizontal scrim for the copy, plus a soft bottom weight so the
            rounded edge never dissolves into a bright photograph. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      {/* Philippine flag sun — gold rays, decorative and never over the copy. */}
      <div className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 lg:opacity-[0.14]">
        <FlagSun size={210} />
      </div>
      <div className="pointer-events-none absolute -left-14 bottom-0 top-0 w-24 opacity-[0.14]">
        <div className="h-full w-full rounded-r-full bg-[linear-gradient(180deg,#1e56c6_0%,#d63a3a_100%)] skew-x-[-6deg]" />
      </div>

      <div className="relative z-10 flex min-h-[16rem] flex-col justify-center px-5 py-8 sm:min-h-[17rem] sm:px-8 sm:py-9 lg:min-h-[15rem] lg:px-10 lg:py-8">
        {eyebrow && (
          <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
            {eyebrow}
          </span>
        )}

        <h2 className="mt-3 max-w-xl font-serif text-2xl font-bold leading-[1.12] tracking-[-0.02em] text-white sm:text-3xl lg:text-[2rem]">
          {title}
        </h2>

        <p className="mt-2.5 max-w-lg text-xs leading-relaxed text-white/80 sm:text-sm">
          {description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
          <Link
            href={primaryCta.href}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-xs font-bold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transform-none sm:h-11 sm:px-6 sm:text-sm"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-xs font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transform-none sm:h-11 sm:px-6 sm:text-sm"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Philippine flag sun — gold rays, decorative */
function FlagSun({ size = 200 }: { size?: number }) {
  const c = size / 2;
  const longRay = size * 0.4;
  const shortRay = size * 0.3;
  const rayW = size * 0.015;
  const innerR = size * 0.1;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <line key={`l${i}`} x1={c + Math.cos(a) * innerR} y1={c + Math.sin(a) * innerR} x2={c + Math.cos(a) * longRay} y2={c + Math.sin(a) * longRay} stroke="#f2b705" strokeWidth={rayW} strokeLinecap="round" />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = ((i * 45 + 22.5) * Math.PI) / 180;
        return (
          <line key={`s${i}`} x1={c + Math.cos(a) * innerR} y1={c + Math.sin(a) * innerR} x2={c + Math.cos(a) * shortRay} y2={c + Math.sin(a) * shortRay} stroke="#f2b705" strokeWidth={rayW * 0.6} strokeLinecap="round" />
        );
      })}
      <circle cx={c} cy={c} r={innerR} stroke="#f2b705" strokeWidth={rayW * 0.7} fill="none" />
    </svg>
  );
}

export default HeroBanner;
