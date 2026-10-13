'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import {
  DISCIPLINES,
  PLACEHOLDER_CLASSES,
  getDiscipline,
  type DisciplineId,
} from '../data/disciplines';
import { DisciplineCoachGrid, DisciplineClasses } from './DisciplineSections';

/**
 * The body shared by all four discipline pages.
 *
 * A component rather than four page files: the hero, the coach grid and the
 * classes list are identical apart from which record is passed in, and four
 * copies would drift the first time any one of them was edited.
 *
 * `discipline` is passed from the route, not looked up here — the page already
 * has it, and reading it again would mean a lookup that can fail in a component
 * that has no business failing.
 */
export function DisciplinePage({ discipline }: { discipline: DisciplineId }) {
  const record = getDiscipline(discipline);
  if (!record) return null;

  const sessions = PLACEHOLDER_CLASSES.filter((c) => c.discipline === discipline);

  return (
    <PublicLayout>
      {/* ---- Hero ---- */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[62ch]">
              <span className="g-eyebrow mb-4 inline-flex">
                <record.icon className="h-3 w-3" aria-hidden="true" />
                Performing Arts
              </span>
              <h1 className="g-display">{record.title}</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {record.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={record.findCoachesHref}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px"
                >
                  Find a coach
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/users"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Browse the directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16">
        {/* ---- About ---- */}
        <section aria-labelledby="about" className="mb-14">
          <h2 id="about" className="g-title text-2xl">
            About {record.label.toLowerCase()}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {record.about.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* ---- Coaches ---- */}
        <section aria-labelledby="coaches" className="mb-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="coaches" className="g-title text-2xl">
                {record.label} coaches
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Verified coaches who list {record.label.toLowerCase()} as a discipline.
              </p>
            </div>
            <Link
              href="/client/talent#directory"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text transition-colors hover:underline hover:underline-offset-4"
            >
              See all coaches
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <DisciplineCoachGrid discipline={record} />
        </section>

        {/* ---- Upcoming classes ---- */}
        <section aria-labelledby="classes" className="mb-14">
          <div className="mb-6">
            <h2 id="classes" className="g-title text-2xl">
              Upcoming classes
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Open sessions led by {record.label.toLowerCase()} coaches.
            </p>
          </div>
          {sessions.length > 0 ? (
            <DisciplineClasses
              sessions={sessions}
              isPlaceholder
              findCoachesHref={record.findCoachesHref}
            />
          ) : (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No classes scheduled right now.
            </p>
          )}
        </section>

        {/* ---- Other disciplines ---- */}
        <section aria-labelledby="other">
          <h2 id="other" className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Compass className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Explore the other disciplines
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DISCIPLINES.filter((d) => d.id !== discipline).map((other) => (
              <Link
                key={other.id}
                href={`/community/performing-arts/${other.id}`}
                className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-muted"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <other.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {other.title}
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  Explore
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default DisciplinePage;
