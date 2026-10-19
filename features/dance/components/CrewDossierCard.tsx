'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ExternalLink, Award, MapPin } from 'lucide-react';
import { ReportIssueLink } from './ReportIssueLink';
import { cn } from '@/components/shared/cn';
import { StatTile } from './StatTile';
import { TitleTile } from './TitleTile';
import { TitleRow } from './TitleRow';
import { VideoCard } from './VideoCard';
import { RecapRow } from './RecapRow';
import type { DanceCrew, CrewAchievement, MatchRecap } from '../data/crews';

interface CrewDossierCardProps {
  crew: DanceCrew;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isTBD(value: string | number): boolean {
  const str = String(value).trim().toLowerCase();
  return str === 'tbd' || str === '' || str === '—' || str === 'unknown';
}

function sortAchievements(achievements: CrewAchievement[]): CrewAchievement[] {
  // World titles first (contain "World" or "Championship"), then by year desc
  return [...achievements].sort((a, b) => {
    const aIsWorld = /world|championship|gold|champion/i.test(a.title);
    const bIsWorld = /world|championship|gold|champion/i.test(b.title);
    if (aIsWorld && !bIsWorld) return -1;
    if (!aIsWorld && bIsWorld) return 1;
    // Sort by year descending
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
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Check for missing data
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

  // For recaps - show latest one, with "View all" if more than 1
  const latestRecap = crew.recentRecaps[0];
  const hasRecaps = crew.recentRecaps.length > 0;
  const extraRecaps = crew.recentRecaps.slice(1);

  const handleSuggestUpdate = useCallback((field: string) => {
    const subject = encodeURIComponent(`Suggest update — Crew: ${crew.name} (${field})`);
    const body = encodeURIComponent(
      `Hello Groove team,\n\nI would like to suggest an update for the ${field.toLowerCase()} of ${crew.name}.\n\nCurrent value: Not verified\nCorrect information:\nSource (if available):\n\nThank you.`
    );
    window.open(`mailto:grooveyyph@gmail.com?subject=${subject}&body=${body}`);
  }, [crew.name]);

  return (
    <article
      id={`crew-panel-${crew.id}`}
      role="tabpanel"
      aria-labelledby={`crew-tab-${crew.id}`}
      className="rounded-3xl border crew-bd bg-[var(--crew-bg-card)] p-7"
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[460px_1fr]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Hero Photo */}
          {/* Hero Photo. 440px was a fixed inline height that ignored the 14px
              root; 380px keeps the portrait crop at the same shape while letting
              the dossier sit in a denser grid. */}
          <div className="relative rounded-2xl overflow-hidden" style={{ height: '380px' }}>
            {hasImage ? (
              <>
                <Image
                  src={crew.image.url!}
                  alt={crew.image.alt}
                  fill
                  className={cn(
                    'object-cover transition-transform duration-700',
                    reducedMotion ? 'transition-none' : 'group-hover:scale-[1.05]'
                  )}
                  sizes="(max-width: 1024px) 100vw, 460px"
                  preload={false}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                />
                {/* Dark gradient overlay from bottom */}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                  aria-hidden="true"
                />
                {/* Subtle top gradient for logo readability on bright photos */}
                <div
                  className="pointer-events-none absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-black/35 to-transparent"
                  aria-hidden="true"
                />
                {/* Crew logo at top-right, no container */}
                {crew.logo?.verified && crew.logo.url && (
                  <img
                    src={crew.logo.url}
                    alt={`${crew.name} logo`}
                    className="absolute top-4 right-4 h-12 w-auto object-contain drop-shadow-lg"
                    aria-hidden="true"
                  />
                )}
              </>
            ) : (
              // Gradient fallback with monogram
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-card)] to-[var(--crew-bg-page)] p-8 text-center">
                <span
                  aria-hidden="true"
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--crew-bg-tile)] text-3xl font-black tracking-tight text-[var(--crew-accent-gold)] ring-2 ring-[color:var(--crew-accent-gold)]/30"
                >
                  {getInitials(crew.name)}
                </span>
                <span className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[var(--crew-text-muted)]">
                  {divisionMissing ? 'Division TBD' : crew.division}
                </span>
              </div>
            )}

            {/* Bottom: Division pill + Location pill, Crew name, Photo credit */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              {/* Division + Location pills */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {!divisionMissing && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--crew-text-primary)] text-[var(--crew-bg-page)] px-3 py-1 text-[11px] font-semibold shadow-sm">
                    {crew.division}
                  </span>
                )}
                {!cityMissing && !countryMissing && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--crew-bg-tile)]/80 backdrop-blur-sm border crew-bd px-3 py-1 text-[11px] font-medium text-[var(--crew-text-body)]">
                    <MapPin className="h-3 w-3 text-[var(--crew-text-muted)]" aria-hidden="true" />
                    <span>{crew.city}, {crew.country}</span>
                  </span>
                )}
              </div>

              {/* Crew name in large serif */}
              <h3 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--crew-text-primary)] leading-tight">
                {crew.name}
              </h3>

              {/* Photo credit line + Source link */}
              {hasImage && crew.image.credit && (
                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--crew-text-muted)]">
                  <span className="truncate max-w-[280px]">Credit: {crew.image.credit}</span>
                  {crew.image.source_url && (
                    <a
                      href={crew.image.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[var(--crew-accent-gold)] hover:text-[var(--crew-chip-hover-text)] inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                    >
                      Source <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video Card */}
          {hasVideo && (
            <VideoCard
              videoUrl={crew.officialVideoUrl!}
              title={`${crew.name} Official Performance`}
              crewName={crew.name}
            />
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Description */}
          <div>
            <p className="text-sm leading-relaxed text-[var(--crew-text-body)] whitespace-normal break-words">
              {crew.bio}
            </p>
          </div>

          {/* Stats Tiles */}
          <div className="grid grid-cols-3 gap-3">
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

          {/* Top Certified Titles */}
          {(topThree.length > 0 || crew.achievements.length > 0) && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-primary)] mb-3">
                <Award className="h-4 w-4 text-[var(--crew-accent-gold)]" aria-hidden="true" />
                <span>Top Certified Titles</span>
              </div>

              {topThree.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {topThree.map((achievement, index) => (
                    <TitleTile
                      key={achievement.source_url + index}
                      achievement={achievement}
                      index={index}
                      isTopThree={true}
                    />
                  ))}
                  {topThree.length < 3 && (
                    <>
                      {topThree.length === 1 && (
                        <div className="col-span-2" />
                      )}
                      {topThree.length === 2 && <div className="col-span-1" />}
                    </>
                  )}
                </div>
              ) : (
                // No achievements at all
                <div className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-6 text-center">
                  <Award className="h-8 w-8 mx-auto mb-3 text-[var(--crew-text-muted)]/50" aria-hidden="true" />
                  <p className="text-sm text-[var(--crew-text-muted)] mb-3">No certified titles on record yet</p>
                  <button
                    type="button"
                    onClick={() => handleSuggestUpdate('Titles')}
                    className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[var(--crew-accent-gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                    aria-label={`Suggest a verified result for ${crew.name}`}
                  >
                    Suggest a verified result
                  </button>
                </div>
              )}

              {/* More Titles Section */}
              {showMoreTitles && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)] mb-3">
                    <span>More Titles</span>
                    {moreTitles.length > 8 && !showAllTitles && (
                      <span className="text-[var(--crew-accent-gold)]">(+{moreTitles.length - 6} more)</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {showAllTitles
                      ? moreTitles.map((achievement, index) => (
                          <TitleRow
                            key={achievement.source_url + index}
                            achievement={achievement}
                          />
                        ))
                      : moreTitles.slice(0, 6).map((achievement, index) => (
                          <TitleRow
                            key={achievement.source_url + index}
                            achievement={achievement}
                          />
                        ))}
                  </div>
                  {moreTitles.length > 8 && !showAllTitles && (
                    <button
                      type="button"
                      onClick={() => setShowAllTitles(true)}
                      className="mt-3 w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                    >
                      <span className="text-sm font-medium text-[var(--crew-text-muted)]">
                        Show all {moreTitles.length} titles
                      </span>
                    </button>
                  )}
                  {moreTitles.length > 8 && showAllTitles && (
                    <button
                      type="button"
                      onClick={() => setShowAllTitles(false)}
                      className="mt-3 w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                    >
                      <span className="text-sm font-medium text-[var(--crew-text-muted)]">
                        Show fewer
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recap Row */}
          {hasRecaps && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-primary)] mb-3">
                <Award className="h-4 w-4 text-[var(--crew-accent-gold)]" aria-hidden="true" />
                <span>Official Match Recaps</span>
              </div>
              <div className="space-y-3">
                <RecapRow
                  recap={latestRecap!}
                  crewName={crew.name}
                  isLatest={true}
                />
                {extraRecaps.length > 0 && !showAllRecaps && (
                  <RecapRow
                    showViewAll={true}
                    totalRecaps={crew.recentRecaps.length}
                    onViewAll={() => setShowAllRecaps(true)}
                    recap={extraRecaps[0]}
                    crewName={crew.name}
                    isLatest={false}
                  />
                )}
                {showAllRecaps && extraRecaps.map((recap, index) => (
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
                    className="w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                  >
                    <span className="text-sm font-medium text-[var(--crew-text-muted)]">
                      Show fewer
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t crew-bd pt-4">
            <p className="text-[11px] text-[var(--crew-text-muted)]">
              Facts corroborated against official federation records
            </p>
            <div className="flex items-center gap-3">
              <ReportIssueLink
                itemTitle={crew.name}
                itemId={crew.id}
                kind="Crew"
                className="text-[11px] font-medium text-[var(--crew-text-muted)] hover:text-[var(--crew-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
              />
              <a
                href={crew.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[var(--crew-accent-gold)] hover:text-[var(--crew-chip-hover-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
                aria-label={`View crew dossier source for ${crew.name}`}
              >
                <span>Crew dossier source</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CrewDossierCard;