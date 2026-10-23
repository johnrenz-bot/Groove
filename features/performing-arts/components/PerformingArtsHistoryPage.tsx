import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronRight,
  Compass,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { DisciplinePageHeader } from './DisciplinePageHeader';
import { AttributionFooter } from './AttributionFooter';
import {
  HISTORY_FIGURES,
  HISTORY_INSTITUTIONS,
  HISTORY_LEARNING_PATHS,
  HISTORY_PERIODS,
  HISTORY_SOURCES,
  HISTORY_THREADS,
  HISTORY_TOPICS,
} from '../data/history';

function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <li>
          <Link
            href="/users"
            className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Community
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li>
          <Link
            href="/performing-arts-philippines"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Performing Arts
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li>
          <span className="font-semibold text-foreground">History &amp; learning</span>
        </li>
      </ol>
    </nav>
  );
}

function ExternalLinkNote({
  href,
  children,
  className = '',
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
      className={`inline-flex items-center gap-1 underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {children}
      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-4 border-b border-border/70 pb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--crew-accent-gold)]">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-1 text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {lede && (
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">{lede}</p>
      )}
    </div>
  );
}

/**
 * /community/performing-arts/history
 *
 * A reading page, not a live feed. It keeps the same slim header, card borders
 * and gold accents as the four discipline pages, but the body is organised as a
 * timeline, three discipline threads, a people/institutions register, and a
 * clearly separated source list. Every outbound link already exists in the
 * verified resource set used by the Performing Arts hub.
 */
export function PerformingArtsHistoryPage() {
  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <Breadcrumb />

      <DisciplinePageHeader
        eyebrow="Performing Arts · History & Learning"
        title="Philippine Performing Arts"
        accent="History"
        audience="students, researchers, teachers, performers, and anyone who wants the context behind the craft"
        verifiedLabel="Editorial synthesis of legal, government, institutional, and company sources"
        lastUpdated="October 2026"
        stats={[
          { label: 'Periods', value: HISTORY_PERIODS.length },
          { label: 'Disciplines', value: HISTORY_THREADS.length },
          { label: 'Sources', value: HISTORY_SOURCES.length },
        ]}
        primaryCta={{ label: 'Read the timeline', href: '#timeline' }}
        secondaryCta={{ label: 'Browse the arts hub', href: '/performing-arts-philippines' }}
        secondaryIcon={Compass}
      />

      {/* How to read this page */}
      <section
        aria-labelledby="how-to-read-title"
        className="rounded-xl border border-[var(--brand-sunburst-border)]/60 bg-[var(--brand-sunburst-soft)] p-4"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--crew-border-accent)] bg-background/40 text-[var(--crew-accent-gold)]">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="how-to-read-title" className="text-[13px] font-semibold text-foreground">
              How to read this page
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              This is an editorial overview, not a complete national history. Period names are
              conventional; where a year appears it is one recorded by the cited institution or
              legal text. Traditions are attributed to the communities who hold them rather than
              treated as a single “Filipino” style. Follow the source links for primary material and
              fuller company histories.
            </p>
          </div>
        </div>
      </section>

      {/* Jump links */}
      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {HISTORY_TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <a
              key={topic.label}
              href={topic.target}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-[var(--crew-border-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {topic.label}
            </a>
          );
        })}
      </nav>

      {/* Timeline */}
      <section id="timeline" aria-labelledby="timeline-title" className="scroll-mt-24">
        <SectionHeading
          id="timeline-title"
          eyebrow="Timeline"
          title="Five conventional periods"
          lede="A sequence for orientation, not a set of hard boundaries. Community traditions continued through every period, and contemporary practice draws on all of them."
        />

        <ol className="space-y-3">
          {HISTORY_PERIODS.map((period, index) => (
            <li
              key={period.id}
              className="rounded-xl border border-border/70 bg-card/40 p-4 transition-colors hover:border-[var(--crew-border-hover)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-start gap-2 sm:w-40">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)] text-[10px] font-bold tabular-nums text-[var(--crew-accent-gold)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.1em] text-[var(--crew-accent-gold)]">
                    {period.era}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-foreground">{period.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {period.summary}
                  </p>
                  <ul className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
                    {period.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--crew-accent-gold)]/70"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Discipline threads */}
      <section id="disciplines" aria-labelledby="disciplines-title" className="scroll-mt-24">
        <SectionHeading
          id="disciplines-title"
          eyebrow="Dance · Music · Theater"
          title="Three overlapping histories"
          lede="The same period looks different from inside each discipline. These notes are starting points, not substitutes for the cited archives."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {HISTORY_THREADS.map((thread) => {
            const Icon = thread.icon;
            return (
              <article
                key={thread.id}
                className="flex h-full flex-col rounded-xl border border-border/70 bg-card/40 p-4 transition-colors hover:border-[var(--crew-border-hover)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)] text-[var(--crew-accent-gold)]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[13px] font-semibold text-foreground">{thread.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {thread.summary}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {thread.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--crew-accent-gold)]/70"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* People and institutions */}
      <section id="people" aria-labelledby="people-title" className="scroll-mt-24">
        <SectionHeading
          id="people-title"
          eyebrow="Artists & institutions"
          title="Who carried the work"
          lede="A short register of practitioners and organizations named in the sources. It is deliberately partial: the NCCA’s National Artists list and the CCP directory are the authoritative starting points."
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4">
            <h3 className="text-[13px] font-semibold text-foreground">Selected practitioners</h3>
            <ul className="mt-2 divide-y divide-border/60">
              {HISTORY_FIGURES.map((figure) => (
                <li key={figure.name} className="py-2 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-semibold text-foreground">{figure.name}</p>
                  <p className="text-[10px] text-[var(--crew-accent-gold)]">{figure.role}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {figure.note}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
              See the{' '}
              <ExternalLinkNote href="https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/">
                NCCA National Artists list
              </ExternalLinkNote>{' '}
              for full citations.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4">
            <h3 className="text-[13px] font-semibold text-foreground">Institutions & companies</h3>
            <ul className="mt-2 divide-y divide-border/60">
              {HISTORY_INSTITUTIONS.map((institution) => (
                <li key={institution.name} className="py-2 first:pt-0 last:pb-0">
                  <ExternalLinkNote
                    href={institution.href}
                    className="text-[11px] font-semibold text-foreground"
                  >
                    {institution.name}
                  </ExternalLinkNote>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {institution.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Learning paths */}
      <section id="learn" aria-labelledby="learn-title" className="scroll-mt-24">
        <SectionHeading
          id="learn-title"
          eyebrow="Learning resources"
          title="Where to go deeper"
          lede="Four practical routes into primary material, archives, company histories, and current training."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HISTORY_LEARNING_PATHS.map((path) => {
            const Icon = path.icon;
            const isInternal = path.href.startsWith('/');
            const className =
              'group flex h-full flex-col rounded-xl border border-border/70 bg-card/40 p-4 transition-colors hover:border-[var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background';
            const content = (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)] text-[var(--crew-accent-gold)]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--crew-accent-gold)]">
                  {path.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                  {path.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--crew-accent-gold)]">
                  {isInternal ? 'Open' : 'Visit source'}
                  <ArrowUpRight
                    className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </span>
              </>
            );

            return (
              <React.Fragment key={path.title}>
                {isInternal ? (
                  <Link href={path.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <a
                    href={path.href}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={className}
                  >
                    {content}
                  </a>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Sources */}
      <section id="sources" aria-labelledby="sources-title" className="scroll-mt-24">
        <SectionHeading
          id="sources-title"
          eyebrow="Sources"
          title="Citations and further reading"
          lede="Links below were carried over from the Performing Arts hub’s verified source set. Government hosts sometimes block automated checks, so confirm anything time-sensitive in a browser."
        />

        <div className="rounded-xl border border-border/70 bg-card/40">
          <ul className="divide-y divide-border/60">
            {HISTORY_SOURCES.map((source) => (
              <li key={`${source.label}-${source.href}`} className="p-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <ExternalLinkNote
                    href={source.href}
                    className="text-[11px] font-semibold text-foreground"
                  >
                    {source.label}
                  </ExternalLinkNote>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {source.publisher}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {source.note}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 h-3 w-3 shrink-0 text-[var(--crew-accent-gold)]"
            aria-hidden="true"
          />
          <span>
            This page does not reproduce third-party article text. Descriptions are written for
            Groove, and every factual anchor is linked to the publisher or legal text above. If a
            date or attribution looks wrong, send a correction to the editorial desk.
          </span>
        </p>
      </section>

      <AttributionFooter label="Performing arts history attribution">
        Historical summaries are editorial and partial. Traditions, names and repertoire belong to
        the communities and institutions credited in the sources above. Groove is an independent
        directory and is not affiliated with or endorsed by these organizations.
      </AttributionFooter>
    </div>
  );
}

export default PerformingArtsHistoryPage;
