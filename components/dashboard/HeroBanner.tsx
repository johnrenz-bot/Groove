'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ExternalLink } from 'lucide-react';
import { Announcement } from '@/lib/types';

export interface HeroBannerProps {
  eyebrow: string;
  headline: string;
  subline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  announcement: Announcement | null;
}

export function HeroBanner({
  eyebrow,
  headline,
  subline,
  primaryCta,
  secondaryCta,
  announcement,
}: HeroBannerProps) {
  return (
    <section className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted sm:h-[240px]">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/media/Groove.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/70" aria-hidden />

      {/* Content */}
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <span className="g-eyebrow">{eyebrow}</span>
        <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl">
          {headline}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/75 sm:text-sm">{subline}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryCta.href}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            {primaryCta.label}
          </Link>
          <a
            href={secondaryCta.href}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {secondaryCta.label}
          </a>
        </div>
      </div>

      {/* Announcement overlay */}
      {announcement && (
        <div className="absolute bottom-3 right-3 z-20 hidden max-w-xs items-start gap-2.5 rounded-2xl border border-border bg-card/95 p-3.5 shadow-[var(--shadow-lg)] backdrop-blur-md sm:flex">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            {announcement.title && (
              <p className="truncate text-xs font-bold text-foreground">{announcement.title}</p>
            )}
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{announcement.message}</p>
            {announcement.cta_url && (
              <Link
                href={announcement.cta_url}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text hover:underline"
              >
                {announcement.cta_label ?? 'Learn more'}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default HeroBanner;
