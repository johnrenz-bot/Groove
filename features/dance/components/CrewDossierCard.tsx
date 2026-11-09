'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Award, ExternalLink, MapPin, Users } from 'lucide-react';
import { ReportIssueLink } from './ReportIssueLink';
import { cn } from '@/components/shared/cn';
import { StatTile } from './StatTile';
import { TitleTile } from './TitleTile';
import { TitleRow } from './TitleRow';
import { VideoCard } from './VideoCard';
import { RecapRow } from './RecapRow';
import type { DanceCrew, CrewAchievement } from '../data/crews';

interface CrewDossierCardProps {
  crew: DanceCrew;
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

function sortAchievements(achievements: CrewAchievement[]): CrewAchievement[] {
  return [...achievements].sort((a, b) => {
    const aIsWorld = /world|championship|gold|champion/i.test(a.title);
    const bIsWorld = /world|championship|gold|champion/i.test(b.title);
    if (aIsWorld && !bIsWorld) return -1;
    if (!aIsWorld && bIsWorld) return 1;

    const aYear = parseInt(String(a.year || '0').match(/\d{4}/)?.[0] || '0', 10);
    const bYear = parseInt(String(b.year || '0').match(/\d{4}/)?.[0] || '0', 10);
    return bYear - aYear;
  });
}

export function CrewDossierCard({ crew }: CrewDossierCardProps) {
  const [showAllTitles, setShowAllTitles] = useState(false);
  const [showAllRecaps, setShowAllRecaps] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const foundedMissing = isTBD(crew.founded);
  const founderMissing = isTBD(crew.founder);
  const rosterMissing = isTBD(crew.rosterStatus);
  const cityMissing = isTBD(crew.city);
  const countryMissing = isTBD(crew.country);
  const divisionMissing = isTBD(crew.division);

  const hasImage = Boolean(crew.image.url);
  const hasVideo = Boolean(crew.officialVideoUrl);
  const sortedAchievements = sortAchievements(crew.achievements);
  const topThree = sortedAchievements.slice(0, 3);
  const moreTitles = sortedAchievements.slice(3);
  const showMoreTitles = moreTitles.length > 0;

  const latestRecap = crew.recentRecaps[0];
  const hasRecaps = crew.recentRecaps.length > 0;
  const extraRecaps = crew.recentRecaps.slice(1);

  const handleSuggestUpdate = useCallback(
    (field: string) => {
      const subject = encodeURIComponent(`Suggest update — Crew: ${crew.name} (${field})`);
      const body = encodeURIComponent(
        `Hello Groove team,\n\nI would like to suggest an update for the ${field.toLowerCase()} of ${crew.name}.\n\nCurrent value: Not verified\nCorrect information:\nSource (if available):\n\nThank you.`
      );
      window.open(`mailto:grooveyyph@gmail.com?subject=${subject}&body=${body}`);
    },
    [crew.name]
  );

  const eyebrowClass =
    'flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--crew-text-muted)]';

  return (
    <article
      id={`crew-panel-${crew.id}`}
      role="tabpanel"
      aria-labelledby={`crew-tab-${crew.id}`}
      className="group relative overflow-hidden rounded-[28px] border crew-bd bg-[var(--crew-bg-card)] shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9)]"
    >
      {/* Hairline of gold across the top: the dossier's editorial masthead. */}
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-[var(--crew-accent-gold)]/70 to-transparent"
        aria-hidden="true"
      />

      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* ---------------------------------------------------------------- Photo */}
        <div className="relative min-h-[340px] overflow-hidden bg-[var(--crew-bg-row)] sm:min-h-[420px] lg:min-h-[560px]">
          {hasImage ? (
            <Image
              src={crew.image.url!}
              alt={crew.image.alt}
              fill
              className={cn(
                'object-cover object-center transition-transform duration-[1200ms] ease-out',
                reducedMotion ? 'transition-none' : 'group-hover:scale-[1.025]'
              )}
              sizes="(max-width: 1024px) 100vw, 46vw"
              preload={false}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-page)] p-8 text-center">
              <span
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--crew-accent-gold)]/30 bg-[var(--crew-bg-tile)] text-3xl font-black tracking-tight text-[var(--crew-accent-gold)]"
              >
                {getInitials(crew.name)}
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

          {/* Top row: division + verified photo mark */}
          <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
            <div className="flex flex-wrap items-center gap-2">
              {!divisionMissing && (
                <span className="inline-flex items-center rounded-full bg-[var(--crew-accent-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--crew-on-gold)] shadow-sm">
                  {crew.division}
                </span>
              )}
              {!cityMissing && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span className="max-w-[220px] truncate">
                    {cityMissing ? '' : `${crew.city}${countryMissing ? '' : `, ${crew.country}`}`}
                  </span>
                </span>
              )}
            </div>

            {crew.logo?.verified && crew.logo.url && (
              <img
                src={crew.logo.url}
                alt={`${crew.name} logo`}
                className="h-10 w-auto max-w-[92px] object-contain drop-shadow-lg sm:h-12"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Bottom: name + photo attribution */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--crew-accent-gold)]">
              {countryMissing ? 'Featured crew' : `${crew.flag} ${crew.country}`}
            </p>
            <h3 className="max-w-xl font-serif text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
              {crew.name}
            </h3>

            {hasImage && (crew.image.credit || crew.image.source_url) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/15 pt-3 text-[10px] text-white/55">
                {crew.image.credit && <span>Photo: {crew.image.credit}</span>}
                {crew.image.source_url && (
                  <a
                    href={crew.image.source_url}
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

        {/* ------------------------------------------------------------ Overview */}
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:p-8">
          <div>
            <p className={eyebrowClass}>
              <span aria-hidden="true" className="h-px w-5 bg-[var(--crew-accent-gold)]/70" />
              Verified crew dossier
            </p>
            <p className="mt-4 text-[13px] leading-7 text-[var(--crew-text-body)] sm:text-sm">
              {crew.bio}
            </p>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <StatTile
              label="Founded"
              value={foundedMissing ? 'Not yet verified' : String(crew.founded)}
              isMissing={foundedMissing}
              onSuggestUpdate={() => handleSuggestUpdate('Founded')}
              crewName={crew.name}
            />
            <StatTile
              label="Leadership"
              value={founderMissing ? 'Not yet verified' : crew.founder}
              isMissing={founderMissing}
              onSuggestUpdate={() => handleSuggestUpdate('Leadership')}
              crewName={crew.name}
            />
            <StatTile
              label="Roster"
              value={rosterMissing ? 'Not yet verified' : crew.rosterStatus}
              isMissing={rosterMissing}
              onSuggestUpdate={() => handleSuggestUpdate('Roster')}
              crewName={crew.name}
            />
          </div>

          {/* Key people: a compact editorial credit line, not a second card grid. */}
          {crew.keyMembers.length > 0 && (
            <div>
              <p className={eyebrowClass}>
                <Users className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
                Key members
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {crew.keyMembers.slice(0, 6).map((member) => (
                  <li key={member.name}>
                    <a
                      href={member.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-col rounded-xl border crew-bd bg-[var(--crew-bg-row)] px-3 py-1.5 transition-colors hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                    >
                      <span className="text-[11px] font-semibold text-[var(--crew-text-primary)]">
                        {member.name}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--crew-text-muted)]">
                        {member.role}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasVideo && (
            <VideoCard
              videoUrl={crew.officialVideoUrl!}
              title={`${crew.name} official performance`}
              crewName={crew.name}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ Records */}
      <div className="border-t crew-bd">
        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-8">
          {/* Titles */}
          <div>
            <p className={eyebrowClass}>
              <Award className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
              Top certified titles
            </p>

            {topThree.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {topThree.map((achievement, index) => (
                  <TitleTile
                    key={`${achievement.source_url}-${index}`}
                    achievement={achievement}
                    index={index}
                    isTopThree
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border crew-bd bg-[var(--crew-bg-row)] p-6 text-center">
                <Award
                  className="mx-auto mb-3 h-8 w-8 text-[var(--crew-text-muted)]/50"
                  aria-hidden="true"
                />
                <p className="mb-3 text-sm text-[var(--crew-text-muted)]">
                  No certified titles on record yet
                </p>
                <button
                  type="button"
                  onClick={() => handleSuggestUpdate('Titles')}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[var(--crew-accent-gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                  aria-label={`Suggest a verified result for ${crew.name}`}
                >
                  Suggest a verified result
                </button>
              </div>
            )}

            {showMoreTitles && (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--crew-text-muted)]">
                  <span>More titles</span>
                  <span className="ml-auto font-medium normal-case tracking-normal text-[var(--crew-text-muted)]/80">
                    {moreTitles.length} on record
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(showAllTitles ? moreTitles : moreTitles.slice(0, 6)).map(
                    (achievement, index) => (
                      <TitleRow
                        key={`${achievement.source_url}-${index}`}
                        achievement={achievement}
                      />
                    )
                  )}
                </div>

                {moreTitles.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTitles((current) => !current)}
                    className="mt-3 w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                    aria-expanded={showAllTitles}
                  >
                    <span className="text-xs font-medium text-[var(--crew-text-muted)]">
                      {showAllTitles ? 'Show fewer titles' : `Show all ${moreTitles.length} titles`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recaps */}
          <div>
            <p className={eyebrowClass}>
              <Award className="h-3.5 w-3.5 text-[var(--crew-accent-gold)]" aria-hidden="true" />
              Official match recaps
            </p>

            {hasRecaps ? (
              <div className="mt-4 space-y-3">
                <RecapRow recap={latestRecap!} crewName={crew.name} isLatest />

                {extraRecaps.length > 0 && !showAllRecaps && (
                  <RecapRow
                    showViewAll
                    totalRecaps={crew.recentRecaps.length}
                    onViewAll={() => setShowAllRecaps(true)}
                    recap={extraRecaps[0]}
                    crewName={crew.name}
                    isLatest={false}
                  />
                )}

                {showAllRecaps &&
                  extraRecaps.map((recap) => (
                    <RecapRow
                      key={recap.id}
                      recap={recap}
                      crewName={crew.name}
                      isLatest={false}
                    />
                  ))}

                {showAllRecaps && extraRecaps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRecaps(false)}
                    className="w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
                  >
                    <span className="text-xs font-medium text-[var(--crew-text-muted)]">
                      Show fewer recaps
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed crew-bd bg-[var(--crew-bg-row)] p-6 text-center">
                <p className="text-sm text-[var(--crew-text-muted)]">
                  No official match recaps published yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t crew-bd px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-[10px] leading-relaxed text-[var(--crew-text-muted)]">
            Facts corroborated against official federation and competition records. Always check the
            official source for final details.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <ReportIssueLink
              itemTitle={crew.name}
              itemId={crew.id}
              kind="Crew"
              pagePath="/community/performing-arts/dance"
              className="text-[11px] font-medium text-[var(--crew-text-muted)] hover:text-[var(--crew-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
            />
            <a
              href={crew.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-[var(--crew-accent-gold)] transition-colors hover:text-[var(--crew-chip-hover-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-card)]"
              aria-label={`View crew dossier source for ${crew.name}`}
            >
              <span>Crew dossier source</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CrewDossierCard;
