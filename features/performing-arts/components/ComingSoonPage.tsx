'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { DISCIPLINES, type DisciplineId } from '../data/disciplines';

/**
 * COMING SOON — the body of the three discipline pages that do not exist yet.
 *
 * WHY THIS REPLACED THE FULL DISCIPLINE PAGE
 *   `/community/performing-arts/{singing,acting,theater}` used to render
 *   `DisciplinePage`, which shipped a coach grid, an "About" section and an
 *   "Upcoming classes" list. The classes list was `PLACEHOLDER_CLASSES`: nine
 *   invented sessions with a "Sample Coach" and made-up seat counts, behind a
 *   disclaimer small enough to miss. A page that is 80% not-real is worse than a
 *   page that is honestly not here yet — the invented rows looked like a
 *   schedule somebody could try to book.
 *
 *   So the placeholder dataset, `DisciplinePage` and `DisciplineSections` were
 *   removed rather than left dormant. Keeping them would mean the fake schedule
 *   stays in the repository for the next route to pick up by accident.
 *
 * WHAT THIS PAGE DELIBERATELY DOES NOT DO
 *   No coach grid, no class list, no "coming soon" forms, no countdown, no
 *   newsletter capture. Every one of those would be a feature that does not
 *   work, and a signup box that silently discards the address is worse than no
 *   signup box. What it does offer is real: the community directory, the coach
 *   directory, and the sibling disciplines.
 *
 * ONE COMPONENT, THREE PAGES
 *   Driven by the same `DISCIPLINES` record that `DisciplinePage` used, so the
 *   icon, title and description cannot drift between the three routes, and
 *   adding a discipline is one entry in `data/disciplines.ts`.
 *
 * NO SHELL — AND THAT IS NOT AN OMISSION
 *   `app/community/layout.tsx` wraps every `/community/*` route in
 *   `<ClientLayout>` → `<DashboardLayout>`, which already renders the header,
 *   the providers and a padded `<main>` at `max-w-[1240px]`. The page therefore
 *   returns CONTENT only.
 *
 *   `DisciplinePage` used to wrap itself in `<PublicLayout>` as well, so each of
 *   these three routes rendered the whole shell twice: two headers, two
 *   `<main>` landmarks, and a footer inside the dashboard column. That was a
 *   real defect, not a stylistic choice, and the dance page — which has never
 *   wrapped itself — is the correct model.
 */
export function ComingSoonPage({ discipline }: { discipline: DisciplineId }) {
  const record = DISCIPLINES.find((d) => d.id === discipline);
  // The route already 404s on an unknown id; returning null here means a bad
  // prop degrades to an empty section rather than throwing inside a layout.
  if (!record) return null;

  const Icon = record.icon;
  const siblings = DISCIPLINES.filter((d) => d.id !== discipline);

  return (
    <div>
      <section className="border-b border-border bg-card/40">
        <div className="pb-10 pt-6 sm:pb-12 sm:pt-8">
          <span className="g-eyebrow mb-4 inline-flex">
            <Icon className="h-3 w-3" aria-hidden="true" />
            Performing Arts
          </span>
          <h1 className="g-display">{record.title}</h1>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            {record.description}
          </p>
        </div>
      </section>

      <div className="pt-10 sm:pt-12">
        {/* ---- the status card ------------------------------------------------
            Dashed border and the muted surface are the app's existing "nothing
            here yet" vocabulary (see `EmptyState`), so this reads as the same
            kind of state as an empty directory rather than as a broken page. */}
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border-strong bg-card px-6 py-12 text-center sm:px-10 sm:py-16">
          {/* Discipline mark, oversized and decorative. `aria-hidden` because the
              heading immediately below already names the discipline.

              The icon is explicitly sized to fill its box: a bare `<Icon />` keeps
              Lucide's default 24x24 and renders as a tiny speck in the corner, so
              the wrapper's font-size would do nothing at all. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-10 block h-[9rem] w-[9rem] text-foreground/[0.04] select-none sm:h-[13rem] sm:w-[13rem]"
          >
            <Icon strokeWidth={1} className="h-full w-full" />
          </span>

          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
            <Icon className="h-7 w-7 text-accent-text" aria-hidden="true" />
          </span>

          <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-text">
            Coming soon
          </p>
          <h2 className="g-title relative mt-3 text-2xl sm:text-3xl">
            {record.title} is not open yet
          </h2>
          <p className="relative mx-auto mt-4 max-w-[54ch] text-sm leading-relaxed text-muted-foreground">
            We are still building this section, and we would rather show you an honest
            &ldquo;not yet&rdquo; than a page full of coaches and schedules we cannot yet
            stand behind. Everything below is live and working today.
          </p>

          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/users"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Back to Community
            </Link>
            <Link
              href={record.findCoachesHref}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Find a coach now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ---- what exists today --------------------------------------------
            Real links only. Dance is live and leads; the other two siblings are
            the same coming-soon routes, listed so the section is a usable index
            of the four disciplines rather than a dead end. */}
        <section aria-labelledby="available" className="mt-14">
          <h2 id="available" className="g-title text-2xl">
            What&rsquo;s live today
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The disciplines that are open, and where to go in the meantime.
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {siblings.map((other) => {
              const OtherIcon = other.icon;
              const open = other.id === 'dance';
              return (
                <li key={other.id}>
                  <Link
                    href={`/community/performing-arts/${other.id}`}
                    className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <OtherIcon
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {other.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {open
                          ? 'Verified updates, league directories and crew coverage.'
                          : 'Also in progress.'}
                      </span>
                    </span>
                    <ArrowRight
                      className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- a single honest note ------------------------------------------
            One sentence saying what the page is for, so a reader who followed a
            Community > Performing Arts link knows they did not land somewhere
            broken. */}
        <section aria-labelledby="note" className="mt-14">
          <h2 id="note" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            About this section
          </h2>
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
            {record.about[0]}
          </p>
        </section>
      </div>
    </div>
  );
}

export default ComingSoonPage;