'use client';

import React from 'react';
import { ExternalLink, Trophy, Users, Award, Drama, PlayCircle } from 'lucide-react';
import type { ActingCompany } from '../data/actors';
import { SafeImage } from '@/features/dance/components/SafeImage';

interface ActorDossierCardProps {
  company: ActingCompany;
}

export function ActorDossierCard({ company }: ActorDossierCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[320px_1fr] lg:gap-8">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted/20">
          <SafeImage
            src={company.image.url || '/image/pa/ccp-tanghalang-pilipino.jpg'}
            alt={company.image.alt}
            sizes="(min-width: 1024px) 320px, 100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          />
          <span className="absolute bottom-2.5 left-2.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            {company.flag} {company.city}
          </span>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-text">
                <Drama className="h-3.5 w-3.5" aria-hidden="true" />
                {company.division}
              </span>
              <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                Est. {company.founded}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {company.rosterStatus}
              </span>
            </div>

            <h3 className="mt-3 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {company.name}
            </h3>

            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Founded by <span className="font-semibold text-foreground">{company.founder}</span>
            </p>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {company.bio}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
            <a
              href={company.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover"
            >
              <span>Official Company Site</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            {company.officialVideoUrl && (
              <a
                href={company.officialVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
              >
                <PlayCircle className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                <span>Showcase Footage</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 border-t border-divider bg-muted/10 p-6 sm:p-8 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Dramatic Honors</span>
          </div>
          <ul className="space-y-2.5">
            {company.achievements.map((ach) => (
              <li
                key={ach.title}
                className="rounded-xl border border-border bg-card p-3 text-xs shadow-xs"
              >
                <span className="font-semibold text-foreground">{ach.title}</span>
                {ach.year && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    ({ach.year})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Directors &amp; Master Actors</span>
          </div>
          <ul className="space-y-2.5">
            {company.keyMembers.map((member) => (
              <li
                key={member.name}
                className="rounded-xl border border-border bg-card p-3 text-xs shadow-xs"
              >
                <div className="font-semibold text-foreground">{member.name}</div>
                <div className="text-[11px] text-muted-foreground">{member.role}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Award className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Landmark Productions</span>
          </div>
          <ul className="space-y-2.5">
            {company.recentRecaps.map((recap) => (
              <li
                key={recap.id}
                className="rounded-xl border border-border bg-card p-3 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{recap.event}</span>
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent-text">
                    {recap.result}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{recap.stage}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {recap.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
