'use client';

import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Copyright,
  FileCheck2,
  HelpCircle,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Accordion, AccordionItem } from './Accordion';
import { DISCIPLINE_PAGES, type DisciplinePageId } from '../data/disciplineMeta';

/**
 * Performing Arts Information, Source Standards & Safety Guide.
 *
 * The four former full-width information panels are now four collapsed
 * accordion rows. Nothing was removed: the category taxonomy, target audience,
 * source distinctions, safety advisory, and submission/copyright standards are
 * all inside the panels. The panel group is deliberately narrower (max-w-3xl)
 * than the content grid above it.
 */
export interface PerformingArtsNewsHubGuideProps {
  discipline: DisciplinePageId;
  className?: string;
}

export function PerformingArtsNewsHubGuide({
  discipline,
  className,
}: PerformingArtsNewsHubGuideProps) {
  const meta = DISCIPLINE_PAGES[discipline];

  return (
    <section
      id="information-standards"
      aria-labelledby="information-standards-title"
      className={cn('mx-auto w-full max-w-3xl scroll-mt-24', className)}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--crew-accent-gold)]">
            Information &amp; standards
          </p>
          <h2
            id="information-standards-title"
            className="mt-1 text-sm font-semibold text-foreground"
          >
            How this desk works
          </h2>
        </div>
        <p className="text-[10px] text-muted-foreground">
          4 topics · collapsed by default
        </p>
      </div>

      <Accordion type="single">
        <AccordionItem
          title="Information Hub Architecture"
          subtitle="Coverage categories, audiences, and the editorial scope of this desk"
          icon={Radio}
        >
          <p>
            <strong className="text-foreground">{meta.name}.</strong> Target audience:{' '}
            <strong className="text-foreground">{meta.audience}</strong>. This desk curates
            competitions, auditions, workshops and official announcements from named
            organizations, then links each item back to its publisher.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {meta.highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/60 bg-background/30 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className="h-3 w-3 shrink-0 text-[var(--crew-accent-gold)]"
                      aria-hidden="true"
                    />
                    <p className="text-[11px] font-semibold text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    <strong className="text-foreground/80">{item.detailLabel}:</strong>{' '}
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </AccordionItem>

        <AccordionItem
          title="How We Distinguish Information Sources"
          subtitle="Confirmed official news, scheduled calls, and community dispatches"
          icon={ShieldCheck}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-success/25 bg-success-soft p-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-background/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                Confirmed Official News
              </span>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Directly verified from official federation statements, press archives, or
                organizers.
              </p>
            </div>

            <div className="rounded-lg border border-info/25 bg-info-soft p-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-background/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-info" />
                Upcoming Events &amp; Calls
              </span>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Scheduled tournaments, theater dates, or registration deadlines verified with
                ticket portals.
              </p>
            </div>

            <div className="rounded-lg border border-warning/25 bg-warning-soft p-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-background/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
                Community Dispatches
              </span>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Member tips and studio alerts undergoing ongoing verification by cultural
                editors.
              </p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Safety & Information Verification Advisory"
          subtitle="Read before paying a fee, sending a deposit, or attending a call"
          icon={ShieldAlert}
          badge={
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-warning">
              Notice
            </span>
          }
        >
          <p>
            All information, competition results, schedules, auditions, and workshop notices
            published on GrooveSystem are curated for{' '}
            <strong className="text-foreground">
              informational and educational purposes only
            </strong>
            . While our editorial team verifies links against official organizations,
            schedules, venues, and entrance fees remain under the sole discretion of the
            hosting organizers and are subject to change.
          </p>

          <ul className="mt-2.5 space-y-2">
            <li className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/30 p-2.5">
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--crew-accent-gold)]"
                aria-hidden="true"
              />
              <span>
                <strong className="text-foreground">Verify Before Transacting:</strong> Always
                confirm workshop fees, audition rules, and festival eligibility directly on
                the official website or verified social handles.
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft p-2.5">
              <AlertOctagon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger"
                aria-hidden="true"
              />
              <span>
                <strong className="text-foreground">Anti-Scam Warning:</strong> Legitimate
                performing arts companies, dance crews, and choirs <em>never</em> require
                unverified bank transfers via personal chat to audition.
              </span>
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem
          title="Community Guidelines: News Submissions & Copyright Standards"
          subtitle="Sourcing, media attribution, scam prevention, and corrections"
          icon={FileCheck2}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Send className="h-3 w-3 text-[var(--crew-accent-gold)]" aria-hidden="true" />
                1. Verifiable Source Requirement
              </h4>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Every submitted event, match recap, or casting announcement must include a
                working source URL from the hosting organizer, university, or registered
                guild. Unverified hearsay or anonymous claims will not be published.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Copyright
                  className="h-3 w-3 text-[var(--crew-accent-gold)]"
                  aria-hidden="true"
                />
                2. Copyright &amp; Media Attribution
              </h4>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Only submit promotional artwork, production photos, or crew posters that are
                officially released for public distribution. Always provide photographer
                credits and original media license information.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <AlertTriangle className="h-3 w-3 text-warning" aria-hidden="true" />
                3. Zero Tolerance for Scams
              </h4>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Any attempt to advertise predatory talent competitions, unauthorized
                ticketing scalping, or talent scouts soliciting private payments will result
                in an immediate account ban and domain blacklisting.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <HelpCircle className="h-3 w-3 text-info" aria-hidden="true" />
                4. Reporting Misleading Content
              </h4>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                If an event has been postponed, canceled, or contains inaccurate dates, please
                click the &ldquo;Report Issue / Correction&rdquo; link on any update card or
                contact our editorial desk directly.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>GrooveSystem Performing Arts Editorial Desk · Manila &amp; Bulacan</span>
            <span>Updated October 2026</span>
          </div>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

export default PerformingArtsNewsHubGuide;
