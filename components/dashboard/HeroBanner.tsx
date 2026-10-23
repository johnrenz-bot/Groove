'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { InfoTip } from '@/components/ui/InfoTip';

export interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: string;
}

export function HeroBanner({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
}: HeroBannerProps) {
  return (
    // `lg:h-[200px]` was a fixed px height, so at desktop the banner stayed a
    // 200px band while everything below it compacted — leaving a visible seam in
    // the page rhythm. `lg:h-[11rem]` is 154px at the 14px root and scales with
    // the type below it. The `aspect-*` ratios above `lg` are unitless and are
    // deliberately left alone: they describe the crop, not the density.
    <section className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border shadow-[0_1px_2px_rgba(20,40,75,0.06),0_8px_24px_rgba(20,40,75,0.05)] sm:aspect-[2/1] lg:aspect-auto lg:h-[11rem]">
      {/* Background image — fills the whole banner, no gaps.

          `preload` because this banner is the Largest Contentful Paint element
          on both dashboards: without it the image is lazy-loaded, and the
          browser logs "Image … was detected as the Largest Contentful Paint
          (LCP). Please add the `loading=\"eager\"` property if this image is
          above the fold" on every dashboard load. It is above the fold — the
          banner is the first section under the greeting on /client/home and
          /coach/home — so it is preloaded rather than deferred. */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
      </div>

      {/* Dark navy gradient, strictly left-to-right so the top and bottom
          edges never go black — text stays readable on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1a33]/90 via-[#0b1a33]/50 to-transparent" />

      {/* Philippine flag sun — gold rays on left edge */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 lg:opacity-[0.15]">
        <FlagSun size={200} />
      </div>

      {/* Blue/red swoosh — left edge */}
      <div className="absolute -left-12 bottom-0 top-0 w-24 opacity-[0.12]">
        <div className="h-full w-full bg-[linear-gradient(180deg,#1e56c6_0%,#d63a3a_100%)] skew-x-[-6deg] rounded-r-full" />
      </div>

      {/* Content — vertically centered, compact so it fits the capped height */}
      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-6">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 sm:text-xs">
            {eyebrow}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 sm:mt-3">
          <h2 className="font-serif text-2xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
            {title}
          </h2>
          <InfoTip
            title={title}
            short={description}
            details={description}
            className="border-white/30 bg-black/40 text-white/80 hover:border-white/60 hover:bg-black/65 hover:text-white"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
          <Link
            href={primaryCta.href}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-5 text-xs font-semibold text-accent-foreground shadow-[0_2px_8px_rgba(20,40,75,0.2)] transition hover:bg-accent-hover sm:h-11 sm:px-6 sm:text-sm"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:h-11 sm:px-6 sm:text-sm"
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
