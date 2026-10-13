'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  X,
  ExternalLink,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Info,
  Clock,
  Compass,
  MapPin,
  Camera,
  Music4,
  Footprints,
  Music2,
  Drama,
  Star,
  Landmark,
  GraduationCap,
  Newspaper,
  Library,
  HeartHandshake,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/components/shared/cn';
import {
  ARTICLES,
  CATEGORIES,
  CATEGORY_MAP,
  LISTINGS,
  ORGANIZATIONS,
  RESOURCES,
  TRUST_LABELS,
  type Article,
  type ResourceLink,
} from '../data/content';
import {
  ARTICLE_IMAGES,
  EDITORIAL_CATEGORIES,
  GROOVE_FEATURES,
  ORG_IMAGES,
  HUB_IMAGES,
  type HubImage,
  type HubRole,
} from '../data/editorial';

/* ------------------------------------------------------------------- icons */

/**
 * Category icon names come from the dataset, so a category gains an icon the
 * moment it is declared there rather than needing a second edit here. The map
 * is the translation from that name to the actual component.
 */
const CATEGORY_ICONS = {
  Compass,
  Music4,
  Footprints,
  Music2,
  Drama,
  Landmark,
  Star,
  CalendarDays,
  GraduationCap,
  Newspaper,
  Library,
  HeartHandshake,
} as const;

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name as keyof typeof CATEGORY_ICONS] ?? Compass;
  return <Icon className={className} aria-hidden="true" />;
}

/** Formats an ISO date without pulling in a date library. */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Every off-site link in this feature routes through here so the security
 * attributes can never be forgotten at a call site.
 */
function ExtLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      className={cn('group/el inline-flex items-center gap-1.5', className)}
    >
      {children}
      <ExternalLink
        className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover/el:opacity-100"
        aria-hidden="true"
      />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Small uppercase kicker above a heading — the editorial signature. */
function Kicker({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p
      id={id}
      className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-text"
    >
      <span aria-hidden="true" className="h-px w-5 bg-accent/50" />
      {children}
    </p>
  );
}

/**
 * Section heading. `h2` by default so the document keeps one H1 and a flat
 * H2/H3 hierarchy regardless of how many times this is reused.
 */
function SectionHead({
  kicker,
  title,
  lede,
  aside,
}: {
  kicker: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <Kicker>{kicker}</Kicker>
        <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.75rem]">
          {title}
        </h2>
        {lede && (
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{lede}</p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Trust marker for a third-party record. */
function TrustTag({ trust }: { trust: ResourceLink['trust'] }) {
  const variant =
    trust === 'government' ? 'accent' : trust === 'national-institution' ? 'approved' : 'neutral';
  return <Badge variant={variant}>{TRUST_LABELS[trust]}</Badge>;
}

/* ------------------------------------------------------------------- hero */

/**
 * Editorial hero. Deliberately not a full-bleed banner: a magazine feature
 * needs a reading measure and a type hierarchy, so the image sits beside the
 * headline rather than behind it, and the type stays at a sane size.
 */
function Hero({ role }: { role: HubRole }) {
  const features = GROOVE_FEATURES[role];
  return (
    <section aria-labelledby="hub-hero-heading" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
          <div>
            <Kicker>Groove Performing Arts</Kicker>
            <h1
              id="hub-hero-heading"
              className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-foreground sm:text-[2.6rem] lg:text-[3rem]"
            >
              Filipino Performing Arts, Philippines
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
              Discover the people, traditions, organizations, and stories shaping Philippine
              performing arts — from community folk dance and the kulintang traditions of
              Mindanao to contemporary choreography, theater, and the institutions that preserve
              them.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {features.slice(0, 2).map((f) => {
                const Icon = f.icon;
                return (
                  <Link
                    key={f.href}
                    href={f.href}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {f.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                );
              })}
              <a
                href="#explore"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-[13px] font-semibold text-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Search the hub
              </a>
            </div>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6">
              {[
                { label: 'Categories', value: CATEGORIES.length },
                { label: 'Stories', value: ARTICLES.length },
                { label: 'Verified sources', value: ORGANIZATIONS.length + RESOURCES.length },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums tracking-[-0.02em] text-foreground">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 4:5 portrait keeps the stage image from being letterboxed, and is
              the ratio the smaller editorial thumbnails reuse below. */}
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <div className="relative aspect-[4/5] w-full sm:aspect-[16/11] lg:aspect-[4/5]">
              <Image
                src={HUB_IMAGES.ccpTanghalangPilipino.src}
                alt={HUB_IMAGES.ccpTanghalangPilipino.alt}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">
                  Start here
                </p>
                <p className="mt-1.5 text-sm leading-snug text-foreground">
                  The institutions below hold the statutory mandates and national collections that
                  keep these traditions documented.
                </p>
              </figcaption>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- featured stories */

/**
 * The lead story gets the large image; the rest become equal-weight thumbnails.
 * All four come from the same verified ARTICLES array.
 */
function FeaturedStory() {
  const [lead, ...rest] = ARTICLES;
  const leadImg = ARTICLE_IMAGES[lead.id] ?? HUB_IMAGES.stockStage;

  return (
    <section id="featured" aria-labelledby="featured-heading" className="scroll-mt-24">
      <SectionHead
        kicker="Featured"
        title="Start with these"
        lede="Pieces that establish the legal, institutional, and artistic groundwork the rest of the hub builds on."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Lead story — large image, 16:10 */}
        <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/40">
          <a
            href="#stories"
            className="relative block aspect-[16/10] w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Browse the full stories list, including ${lead.title}`}
          >
            <Image
              src={leadImg.src}
              alt={leadImg.alt}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent"
            />
          </a>

          <div className="flex flex-1 flex-col p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">
            <CategoryIcon name={CATEGORY_MAP[lead.category].icon} className="h-3 w-3" />
            {CATEGORY_MAP[lead.category].shortLabel}
          </Badge>
              {lead.kind === 'external-summary' && <Badge variant="neutral">Source summary</Badge>}
              <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle-foreground">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                <time dateTime={lead.date}>{formatDate(lead.date)}</time>
              </span>
            </div>

            <h3
              id="featured-heading"
              className="mt-3.5 text-xl font-bold leading-snug tracking-[-0.02em] text-foreground"
            >
              {lead.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lead.excerpt}</p>

            <p className="mt-auto pt-5 text-[11px] text-muted-foreground">
              {lead.sourceUrl ? (
                <ExtLink href={lead.sourceUrl} className="hover:text-accent-text">
                  Source: {lead.source}
                </ExtLink>
              ) : (
                <span>Source: {lead.source}</span>
              )}
            </p>
          </div>
        </article>

        {/* Secondary stories — uniform 3:2 thumbnails */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {rest.slice(0, 3).map((a) => {
            const img = ARTICLE_IMAGES[a.id] ?? HUB_IMAGES.stockStage;
            return (
              <li key={a.id} className="h-full">
                <article className="group flex h-full gap-4 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-border-strong">
                  <div className="relative aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="128px"
                      className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-text">
                      {CATEGORY_MAP[a.category].shortLabel}
                    </p>
                    <h4 className="mt-1.5 text-sm font-bold leading-snug tracking-[-0.01em] text-foreground">
                      {a.title}
                    </h4>
                    <p className="mt-auto pt-2 text-[11px] text-subtle-foreground">
                      <time dateTime={a.date}>{formatDate(a.date)}</time>
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- categories */

function CategoryGrid() {
  return (
    <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-24">
      <SectionHead
        kicker="Categories"
        title="Six ways in"
        lede="Each category opens the searchable directory below, filtered to that discipline."
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EDITORIAL_CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.id} className="h-full">
              <a
                href="#explore"
                onClick={(e) => {
                  // Deep-link into the explorer with the matching category applied
                  // via the query string the Explorer reads on mount.
                  e.preventDefault();
                  const el = document.getElementById('explore');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  window.dispatchEvent(
                    new CustomEvent('pa:set-category', { detail: c.target })
                  );
                }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/40 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={c.image.src}
                    alt={c.image.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <h3
                      id={c.id === 'dance' ? 'categories-heading' : undefined}
                      className="text-[0.9375rem] font-bold tracking-[-0.01em] text-foreground"
                    >
                      {c.label}
                    </h3>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {c.blurb}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-semibold text-accent-text">
                    Browse this category
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------- stories */

/** Editorial list: dated rows, consistent rhythm, source on every entry. */
function StoryList({ items }: { items: Article[] }) {
  return (
    <ul className="mt-2 divide-y divide-divider">
      {items.map((a) => {
        const img = ARTICLE_IMAGES[a.id] ?? HUB_IMAGES.stockStage;
        return (
          <li key={a.id}>
            <article className="group flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="160px"
                  className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.04]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-text">
                    {CATEGORY_MAP[a.category].shortLabel}
                  </span>
                  {a.kind === 'external-summary' && <Badge variant="neutral">Source summary</Badge>}
                  <span className="inline-flex items-center gap-1 text-[11px] text-subtle-foreground">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={a.date}>{formatDate(a.date)}</time>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-subtle-foreground">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {a.readMinutes} min
                  </span>
                </div>

                <h4 className="mt-2 text-[0.9375rem] font-bold leading-snug tracking-[-0.01em] text-foreground">
                  {a.title}
                </h4>
                <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                  {a.excerpt}
                </p>
                <p className="mt-2 text-[11px] text-subtle-foreground">
                  {a.sourceUrl ? (
                    <ExtLink href={a.sourceUrl} className="hover:text-accent-text">
                      Source: {a.source}
                    </ExtLink>
                  ) : (
                    <span>Source: {a.source}</span>
                  )}
                </p>
                <ImageCredit image={img} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function Stories() {
  const featured = ARTICLES.slice(3, 8);
  const heritage = ARTICLES.filter((a) => a.category === 'heritage');

  return (
    <>
      <section id="stories" aria-labelledby="stories-heading" className="scroll-mt-24">
        <SectionHead
          kicker="Stories"
          title="Latest features"
          lede="Editorial explainers and summarised third-party reporting, each labelled with its source and date."
        />
        <div className="mt-6">
          <StoryList items={featured} />
        </div>
      </section>

      <section id="heritage" aria-labelledby="heritage-heading" className="scroll-mt-24">
        <SectionHead
          kicker="Cultural heritage"
          title="Traditions, named and attributed"
          lede="Background written to name the communities each tradition belongs to, rather than treating distinct groups as interchangeable."
        />
        <div className="mt-6">
          <StoryList items={heritage} />
        </div>
      </section>
    </>
  );
}

/* --------------------------------------------------------- organizations */

/**
 * Attribution line rendered under an image.
 *
 * Several cards now display photographs published by a third party (the CCP's
 * own production images, an organisation's own logo). Those publishers must be
 * credited, and a stand-in image must never be allowed to read as if it were a
 * photograph of the organisation it sits under — so the two cases are labelled
 * differently and the distinction is explicit rather than implied.
 */
function ImageCredit({ image }: { image: HubImage }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[10px] leading-relaxed text-subtle-foreground">
      <Camera className="h-3 w-3 shrink-0" aria-hidden="true" />
      {image.isPlaceholder ? (
        <span>Representative image — not a photograph of this organisation</span>
      ) : image.sourceUrl ? (
        <ExtLink href={image.sourceUrl} className="hover:text-accent-text">
          Image: {image.credit}
        </ExtLink>
      ) : (
        <span>Image: {image.credit}</span>
      )}
    </p>
  );
}

function OrgCard({ org }: { org: ResourceLink }) {
  const img = ORG_IMAGES[org.id] ?? HUB_IMAGES.stockStage;
  const unverified = org.status === 'needs-verification';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/40 transition-colors hover:border-border-strong">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.04]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TrustTag trust={org.trust} />
          <Badge variant="neutral">
            <CategoryIcon name={CATEGORY_MAP[org.category].icon} className="h-3 w-3" />
            {CATEGORY_MAP[org.category].shortLabel}
          </Badge>
        </div>

        <h3 className="mt-3 text-[0.9375rem] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {org.name}
        </h3>
        <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
          {org.description}
        </p>

        <ImageCredit image={img} />

        {org.note && (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{org.note}</span>
          </p>
        )}

        <div className="mt-4 border-t border-divider pt-4">
          {org.location && (
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] text-subtle-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {org.location}
            </p>
          )}
          <ExtLink
            href={org.url}
            className="text-[13px] font-semibold text-accent-text hover:underline"
          >
            Visit {org.name.split('(')[0].trim()}
          </ExtLink>
          <p className="mt-1.5 text-[11px] text-subtle-foreground">
            {unverified && 'Needs verification · '}
            Last verified{' '}
            <time dateTime={org.verifiedOn}>{formatDate(org.verifiedOn)}</time>
          </p>
        </div>
      </div>
    </article>
  );
}

function Organizations() {
  return (
    <section id="organizations" aria-labelledby="organizations-heading" className="scroll-mt-24">
      <SectionHead
        kicker="Organizations"
        title="Who to trust, and why"
        lede="Institutions holding statutory mandates, national collections, or accredited programmes. Each link records when it was last checked."
      />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ORGANIZATIONS.map((o) => (
          <li key={o.id} className="h-full">
            <OrgCard org={o} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------- events & learning */

function EventsAndLearning() {
  const learning = LISTINGS.filter((l) => l.category === 'education' || l.category === 'events');
  const resources = RESOURCES.filter((r) => r.category === 'events' || r.category === 'resources');

  return (
    <section id="events" aria-labelledby="events-heading" className="scroll-mt-24">
      <SectionHead
        kicker="Events & learning"
        title="Where to find what is on"
        lede="We do not restate schedules we cannot keep current. These are the official calendars and training providers worth checking directly."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Official calendars — linked out, never restated */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Official calendars
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Schedules change quickly, and a stale listing is worse than none. Check the organizer
            for current dates, pricing, and availability.
          </p>
          <ul className="mt-4 divide-y divide-divider border-y border-divider">
            {resources.map((r) => (
              <li key={r.id} className="py-3.5">
                <ExtLink
                  href={r.url}
                  className="text-[13px] font-semibold text-foreground hover:text-accent-text"
                >
                  {r.name}
                </ExtLink>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {r.description}
                </p>
                {r.status === 'needs-verification' && (
                  <p className="mt-1 text-[11px] text-warning">Needs verification — confirm the link</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Training providers */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Landmark className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Training &amp; workshops
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Programs outside the university system, with the awarding body named for each.
          </p>
          <ul className="mt-4 divide-y divide-divider border-y border-divider">
            {learning.map((l) => (
              <li key={l.id} className="py-3.5">
                <p className="text-[13px] font-semibold text-foreground">{l.name}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {l.description}
                </p>
                <p className="mt-1 text-[11px] text-subtle-foreground">
                  Confirmed by{' '}
                  <ExtLink href={l.sourceUrl} className="font-semibold text-accent-text hover:underline">
                    {l.source}
                  </ExtLink>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- explore */

/**
 * Search + filter island.
 *
 * Also listens for `pa:set-category`, which the category cards dispatch so a
 * card click filters the directory rather than only scrolling to it.
 */
function Explorer() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  // Category cards deep-link into this section.
  React.useEffect(() => {
    const onPick = (e: Event) => {
      setCategory((e as CustomEvent<string>).detail ?? 'all');
    };
    window.addEventListener('pa:set-category', onPick);
    return () => window.removeEventListener('pa:set-category', onPick);
  }, []);

  const trimmed = query.trim().toLowerCase();
  const match = (...fields: Array<string | undefined>) =>
    !trimmed || fields.some((f) => f && f.toLowerCase().includes(trimmed));
  const inCat = (id: string) => category === 'all' || id === category;

  const articles = useMemo(
    () => ARTICLES.filter((a) => inCat(a.category) && match(a.title, a.excerpt, a.source)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, trimmed]
  );
  const orgs = useMemo(
    () => ORGANIZATIONS.filter((o) => inCat(o.category) && match(o.name, o.description, o.location)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, trimmed]
  );
  const resources = useMemo(
    () => RESOURCES.filter((r) => inCat(r.category) && match(r.name, r.description, r.location)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, trimmed]
  );

  const total = articles.length + orgs.length + resources.length;
  const filtered = Boolean(trimmed) || category !== 'all';
  const reset = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <section id="explore" aria-labelledby="explore-heading" className="scroll-mt-24">
      <SectionHead
        kicker="Search"
        title="Explore the full directory"
        lede="Search across every story, organization, and verified source in the hub."
      />

      <div className="mt-8 rounded-2xl border border-border bg-card/40 p-5">
        <label htmlFor="hub-search" className="text-sm font-semibold text-foreground">
          Search articles, organizations, and resources
        </label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="hub-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try &quot;tinikling&quot;, &quot;PETA&quot;, &quot;kulintang&quot;, or &quot;NCCA&quot;"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Filter by category
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="All" />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(category === c.id ? 'all' : c.id)}
                label={c.shortLabel}
                icon={<CategoryIcon name={c.icon} className="h-3 w-3" />}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{total}</span>{' '}
            {total === 1 ? 'result' : 'results'}
            {filtered && ' after filtering'}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer text-xs font-semibold text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No results found"
          description="No articles, organizations, or resources match that search. Try a broader term, or reset the filters to browse everything."
          action={
            <Button size="sm" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="mt-8 space-y-8">
          {articles.length > 0 && (
            <ResultGroup title="Stories" count={articles.length}>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((a) => {
                  const img = ARTICLE_IMAGES[a.id] ?? HUB_IMAGES.stockStage;
                  return (
                    <li key={a.id} className="h-full">
                      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/40 transition-colors hover:border-border-strong">
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          <Image
                            src={img.src}
                            alt={img.alt}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.04]"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="neutral">
                              <CategoryIcon
                                name={CATEGORY_MAP[a.category].icon}
                                className="h-3 w-3"
                              />
                              {CATEGORY_MAP[a.category].shortLabel}
                            </Badge>
                            {a.kind === 'external-summary' && (
                              <Badge variant="neutral">Source summary</Badge>
                            )}
                          </div>
                          <h4 className="mt-2.5 text-sm font-bold leading-snug tracking-[-0.01em] text-foreground">
                            {a.title}
                          </h4>
                          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                            {a.excerpt}
                          </p>
                          <p className="mt-auto pt-3 text-[11px] text-subtle-foreground">
                            <time dateTime={a.date}>{formatDate(a.date)}</time>
                            {' · '}
                            {a.readMinutes} min
                          </p>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </ResultGroup>
          )}

          {orgs.length > 0 && (
            <ResultGroup title="Organizations" count={orgs.length}>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {orgs.map((o) => (
                  <li key={o.id} className="h-full">
                    <OrgCard org={o} />
                  </li>
                ))}
              </ul>
            </ResultGroup>
          )}

          {resources.length > 0 && (
            <ResultGroup title="Verified resources" count={resources.length}>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map((r) => (
                  <li key={r.id} className="h-full">
                    <article className="flex h-full flex-col rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-border-strong">
                      <div className="flex flex-wrap items-center gap-2">
                        <TrustTag trust={r.trust} />
                      </div>
                      <h4 className="mt-2.5 text-sm font-bold leading-snug tracking-[-0.01em] text-foreground">
                        {r.name}
                      </h4>
                      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                        {r.description}
                      </p>
                      {r.note && (
                        <p className="mt-2 text-[11px] leading-relaxed text-warning">{r.note}</p>
                      )}
                      <div className="mt-3 border-t border-divider pt-3">
                        <ExtLink
                          href={r.url}
                          className="text-[13px] font-semibold text-accent-text hover:underline"
                        >
                          Open {r.name}
                        </ExtLink>
                        <p className="mt-1 text-[11px] text-subtle-foreground">
                          {r.status === 'needs-verification' && 'Needs verification · '}
                          <time dateTime={r.verifiedOn}>{formatDate(r.verifiedOn)}</time>
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          )}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
        active
          ? 'border-accent-border bg-accent-soft text-accent-text'
          : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const id = `grp-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="flex items-baseline gap-2 text-sm font-bold text-foreground">
        {title}
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">({count})</span>
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------ on groove */

function OnGroove({ role }: { role: HubRole }) {
  const features = GROOVE_FEATURES[role];
  return (
    <section id="on-groove" aria-labelledby="on-groove-heading" className="scroll-mt-24">
      <SectionHead
        kicker="On Groove"
        title={role === 'public' ? 'Where to go next' : 'Put this into practice'}
        lede="The reading is the context. These are the parts of Groove where you act on it."
      />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <li key={f.href} className="h-full">
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <h3
                  id={f.href === features[0].href ? 'on-groove-heading' : undefined}
                  className="mt-3.5 text-sm font-bold tracking-[-0.01em] text-foreground"
                >
                  {f.label}
                </h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text">
                  Go
                  <ArrowUpRight
                    className="h-3 w-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------- root */

export function PerformingArtsHub({ role }: { role: HubRole }) {
  return (
    <div className="pb-20">
      <Hero role={role} />

      <div className="mx-auto flex max-w-[1240px] flex-col gap-14 px-5 pt-12 sm:gap-16 sm:px-8 sm:pt-14">
        <FeaturedStory />
        <CategoryGrid />
        <Stories />
        <Organizations />
        <EventsAndLearning />
        <Explorer />
        <OnGroove role={role} />

        {/* Source notes — kept compact, as the brief asks. */}
        <section aria-labelledby="notes-heading" className="rounded-2xl border border-border bg-card/40 p-6">
          <h2
            id="notes-heading"
            className="flex items-center gap-2 text-sm font-bold tracking-[-0.01em] text-foreground"
          >
            <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Source notes
          </h2>
          <div className="mt-3 grid gap-4 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
            <p>
              <strong className="text-foreground">Curated, not live.</strong> This is a static
              directory compiled by Groove. It is not connected to a CMS or news feed, and the dates
              shown are editorial publication dates.
            </p>
            <p>
              <strong className="text-foreground">Original summaries.</strong> All descriptions
              are written for this page. No third-party article text is reproduced; summarised
              reporting links to the original publisher.
            </p>
            <p>
              <strong className="text-foreground">Cultural specificity.</strong> Traditions
              described here belong to named communities — Maranao, Tausug, Maguindanao, Sama-Bajau,
              Lumad groups and others. They are not interchangeable.
            </p>
            <p>
              <strong className="text-foreground">Verification.</strong> Entries marked{' '}
              <span className="text-warning">Needs verification</span> were live but blocked
              automated checks, or temporarily unavailable. The reason is given on the card.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-divider pt-5">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back to Groove home
            </Link>
            <a
              href="mailto:Groove1152000@gmail.com?subject=Performing%20Arts%20hub%20—%20correction%20or%20resource"
              className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Suggest a correction
            </a>
            <p className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
              <Info className="h-3 w-3" aria-hidden="true" />
              Images are performance photographs bundled with the app.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PerformingArtsHub;