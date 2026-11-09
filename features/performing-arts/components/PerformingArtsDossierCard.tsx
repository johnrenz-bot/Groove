'use client';

import React from 'react';
import { Award, Drama, ExternalLink, MapPin, Music, Theater, Users } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { SafeImage } from '@/features/dance/components/SafeImage';
import { ReportIssueLink } from '@/features/dance/components/ReportIssueLink';
import { TitleRow } from '@/features/dance/components/TitleRow';

/**
 * Structural shape shared by the singing, acting and theater dossier records.
 * They already have identical field names, so each wrapper can pass its own
 * data straight through without mapping.
 */
export interface PerformingArtsDossierEntity {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  flag: string;
  division: string;
  founded: number | string;
  founder: string;
  rosterStatus: string;
  bio: string;
  source_url: string;
  officialVideoUrl?: string;
  logo?: { url: string | null; alt?: string; verified?: boolean } | null;
  image: { url: string | null; alt: string; credit?: string; source_url?: string };
  achievements: Array<{ title: string; year?: number | string; source_url: string }>;
  keyMembers: Array<{ name: string; role: string; source_url: string }>;
  recentRecaps: Array<{
    id: string;
    event: string;
    stage: string;
    date: string;
    result: string;
    category: string;
    summary: string;
    source_url: string;
    score?: string;
    opponent?: string;
  }>;
}

export interface PerformingArtsDossierCardProps {
  entity: PerformingArtsDossierEntity;
  /** "Ensemble", "Company", … used in the dossier eyebrow and report subject. */
  kindLabel: string;
  /** DOM id prefix that matches the selector's aria-controls target. */
  panelPrefix?: string;
  pagePath: string;
  /** Optional icon for the division pill: music, drama or theater. */
  discipline?: 'singing' | 'acting' | 'theater';
  labels: {
    honours: string;
    people: string;
    recaps: string;
    officialSite: string;
  };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isTBD(value: string | number | undefined | null): boolean {
  const str = String(value ?? '').trim().toLowerCase();
  return str === 'tbd' || str === '' || str === '—' || str === 'unknown';
}

/**
 * One premium dossier layout for the non-dance disciplines. It mirrors the
 * dance crew dossier: a large photograph carrying the name, a quiet overview
 * column, then three editorial record columns. Keeping one implementation
 * means the three pages cannot drift apart again.
 */
export function PerformingArtsDossierCard({
  entity,
  kindLabel,
  panelPrefix,
  pagePath,
  discipline = 'singing',
  labels,
}: PerformingArtsDossierCardProps) {
  const DisciplineIcon = discipline === 'singing' ? Music : discipline === 'acting' ? Drama : Theater;
  const panelIdPrefix = panelPrefix ?? kindLabel.toLowerCase();
  const cityMissing = isTBD(entity.city);
  const divisionMissing = isTBD(entity.division);
  const foundedMissing = isTBD(entity.founded);
  const founderMissing = isTBD(entity.founder);
  const rosterMissing = isTBD(entity.rosterStatus);

  const eyebrowClass =
    'flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--crew-text-muted)]';

  return (
    <article
      id={`${panelIdPrefix}-panel-${entity.id}`}
      role="tabpanel"
      aria-labelledby={`${panelIdPrefix}-tab-${entity.id}`}
      className="group relative overflow-hidden rounded-[28px] border crew-bd bg-[var(--crew-bg-card)] shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9)]"
    >
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-[var(--crew-accent-gold)]/70 to-transparent"
        aria-hidden="true"
      />

      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Photo */}
        <div className="relative min-h-[320px] overflow-hidden bg-[var(--crew-bg-row)] sm:min-h-[400px] lg:min-h-[540px]">
          {entity.image.url ? (
            <SafeImage
              src={entity.image.url}
              alt={entity.image.alt}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="object-cover object-center transition-transform duration-[1200ms] ease-out motion-reduce:transition-none group-hover:scale-[1.025]"
              fallback={
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-page)] p-8 text-center">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--crew-accent-gold)]/30 bg-[var(--crew-bg-tile)] text-3xl font-black tracking-tight text-[var(--crew-accent-gold)]">
                    {getInitials(entity.name)}
                  </span>
                  <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--crew-text-muted)]">
                    Photograph pending verification
                  </span>
                </div>
              }
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-page)] p-8 text-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--crew-accent-gold)]/30 bg-[var(--crew-bg-tile)] text-3xl font-black tracking-tight text-[var(--crew-accent-gold)]">
                {getInitials(entity.name)}
              </span>
              <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--crew-text-muted)]">
                Photograph pending verification
              </span>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10"
            aria-hidden="true"
          />

          <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
            <div className="flex flex-wrap items-center gap-2">
              {!divisionMissing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--crew-accent-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--crew-on-gold)] shadow-sm">
                  <DisciplineIcon className="h-3 w-3" aria-hidden="true" />
                  {entity.division}
                </span>
              )}
              {!cityMissing && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span className="max-w-[220px] truncate">
                    {entity.city}
                    {!isTBD(entity.country) ? `, ${entity.country}` : ''}
                  </span>
                </span>
              )}
            </div>

            {entity.logo?.verified && entity.logo.url && (
              <img
                src={entity.logo.url}
                alt=""
                className="h-10 w-auto max-w-[92px] object-contain drop-shadow-lg sm:h-12"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--crew-accent-gold)]">
              {isTBD(entity.country) ? `Featured ${kindLabel.toLowerCase()}` : `${entity.flag} ${entity.country}`}
            </p>
            <h3 className="max-w-xl font-serif text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
              {entity.name}
            </h3>

            {(entity.image.credit || entity.image.source_url) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/15 pt-3 text-[10px] text-white/55">
                {entity.image.credit && <span>Photo: {entity.image.credit}</span>}
                {entity.image.source_url && (
                  <a
                    href={entity.image.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[var(--crew-accent-gold)] transition-colors hover:text-[var(--crew-accent-gold-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Source
                    <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:p-8">
          <div>
            <p className={eyebrowClass}>
              <span aria-hidden="true" className="h-px w-5 bg-[var(--crew-accent-gold)]/70" />
              Verified {kindLabel.toLowerCase()} dossier
            </p>
            <p className="mt-4 text-[13px] leading-7 text-[var(--crew-text-body)] sm:text-sm">
              {entity.bio}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-4 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)]">
                Founded
              </dt>
              <dd
                className={cn(
                  'mt-1 text-sm font-semibold leading-snug text-[var(--crew-text-primary)]',
                  foundedMissing && 'italic text-[var(--crew-text-muted)]'
                )}
              >
                {foundedMissing ? 'Not yet verified' : entity.founded}
              </dd>
            </div>
            <div className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-4 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)]">
                Leadership
              </dt>
              <dd
                className={cn(
                  'mt-1 text-sm font-semibold leading-snug text-[var(--crew-text-primary)]',
                  founderMissing && 'italic text-[var(--crew-text-muted)]'
                )}
              >
                {founderMissing ? 'Not yet verified' : entity.founder}
              </dd>
            </div>
            <div className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-4 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)]">
                Roster
              </dt>
              <dd
                className={cn(
                  'mt-1 text-sm font-semibold leading-snug text-[var(--crew-text-primary)]',
                  rosterMissing && 'italic text-[var(--crew-text-muted)]'
                )}
              >
                {rosterMissing ? 'Not yet verified' : entity.rosterStatus}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-2.5 border-t crew-bd pt-4">
            <a
              href={entity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[var(--crew-accent-gold)] px-4 py-2 text-xs font-bold text-[var(--crew-on-gold)] shadow-sm transition-colors hover:bg-[var(--crew-accent-gold-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
            >
              <span>{labels.officialSite}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            {entity.officialVideoUrl && (
              <a
                href={entity.officialVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border crew-bd bg-[var(--crew-bg-row)] px-4 py-2 text-xs font-semibold text-[var(--crew-text-primary)] transition-colors hover:border-[color:var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
              >
                <span>Watch performance</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Records */}
      <div className="grid gap-8 border-t crew-bd p-5 sm:p-7 lg:grid-cols-3 lg:p-8">
        <section aria-label={labels.honours}>
          <p className={eyebrowClass}>
            <Award className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
            {labels.honours}
          </p>
          <ul className="mt-4 space-y-2">
            {entity.achievements.map((achievement, index) => (
              <li key={`${achievement.source_url}-${achievement.title}-${index}`}>
                <TitleRow achievement={achievement} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={labels.people}>
          <p className={eyebrowClass}>
            <Users className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
            {labels.people}
          </p>
          <ul className="mt-4 space-y-2">
            {entity.keyMembers.map((member) => (
              <li key={`${member.name}-${member.role}`}>
                <a
                  href={member.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/member block rounded-xl border crew-bd bg-[var(--crew-bg-row)] px-4 py-3 transition-colors hover:border-[color:var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--crew-text-primary)]">
                        {member.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--crew-text-muted)]">
                        {member.role}
                      </span>
                    </span>
                    <ExternalLink
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--crew-text-muted)] transition-colors group-hover/member:text-[var(--crew-accent-gold)]"
                      aria-hidden="true"
                    />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={labels.recaps}>
          <p className={eyebrowClass}>
            <Award className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
            {labels.recaps}
          </p>
          <ul className="mt-4 space-y-2">
            {entity.recentRecaps.map((recap) => (
              <li
                key={recap.id}
                className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-4 transition-colors hover:border-[color:var(--crew-border-hover)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-snug text-[var(--crew-text-primary)]">
                    {recap.event}
                  </span>
                  <span className="rounded-full border border-[color:var(--crew-accent-gold)]/35 bg-[var(--brand-sunburst-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--crew-accent-gold)]">
                    {recap.result}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--crew-text-muted)]">
                  {recap.date}
                  {recap.stage ? ` · ${recap.stage}` : ''}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--crew-text-body)]">
                  {recap.summary}
                </p>
                <a
                  href={recap.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--crew-accent-gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                >
                  Verification source
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t crew-bd px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-[10px] leading-relaxed text-[var(--crew-text-muted)]">
          Facts corroborated against official institutional and competition records. Always check the
          official source for final details.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <ReportIssueLink
            itemTitle={entity.name}
            itemId={entity.id}
            kind={kindLabel}
            pagePath={pagePath}
            className="text-[11px] font-medium text-[var(--crew-text-muted)] hover:text-[var(--crew-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
          />
          <a
            href={entity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-[var(--crew-accent-gold)] transition-colors hover:text-[var(--crew-chip-hover-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
          >
            <span>{kindLabel} dossier source</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default PerformingArtsDossierCard;
