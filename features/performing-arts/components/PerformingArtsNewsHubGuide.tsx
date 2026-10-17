'use client';

/**
 * Performing Arts News, Categories Guide & Safety Disclaimer.
 *
 * Dedicated editorial guide and safety standards across:
 *   - /community/performing-arts/dance
 *   - /community/performing-arts/singing
 *   - /community/performing-arts/acting
 *   - /community/performing-arts/theater
 *
 * FEATURES:
 *   - Clear taxonomy explaining category purposes (Competitions, Auditions, Workshops, Events, Announcements)
 *     and target audience (performers, coaches, casting directors, students, patrons).
 *   - Prominent Safety & Anti-Scam Information Disclaimer.
 *   - Confirmed News vs Upcoming Events vs Community Submissions distinction.
 *   - Community Guidelines for news submission, copyright protection, scam prevention, and reporting.
 */

import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copyright,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Megaphone,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface PerformingArtsNewsHubGuideProps {
  discipline: 'dance' | 'singing' | 'acting' | 'theater';
  className?: string;
}

export function PerformingArtsNewsHubGuide({
  discipline,
  className,
}: PerformingArtsNewsHubGuideProps) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const disciplineMeta = {
    dance: {
      name: 'Street Dance & Choreography',
      targetAudience: 'Street dance crews, freestyle battlers, choreographers, studio instructors, and dance students',
      competitionsExample: 'IDL (International Dance League), HHI World & Philippine Championships, Red Bull Dance Your Style, UDO Street Dance Nationals',
      auditionsExample: 'Commercial dance agency open calls, backup dancer casting for major concerts, and championship crew auditions',
      achievementsExample: 'Philippine crew victories at HHI Phoenix (Femme MNL, UPeepz), Red Bull World Finals, and national street dance crowns',
    },
    singing: {
      name: 'Vocal Performance & Choral Ensembles',
      targetAudience: 'Classical soloists, choir scholars, Kundiman performers, musical theater vocalists, and vocal coaches',
      competitionsExample: 'NAMCYA National Finals, Andrea O. Veneracion International Choral Festival, European Grand Prix for Choral Singing',
      auditionsExample: 'Conserved choir auditions, opera soloist casting, and collegiate choir open calls (Madz, UST Singers)',
      achievementsExample: 'Philippine Madrigal Singers European Grand Prix victories, Tolosa Choral Championships, and international gold medals',
    },
    acting: {
      name: 'Stage Craft & Screen Acting',
      targetAudience: 'Dramatic actors, stage performers, voice actors, acting coaches, casting directors, and theater scholars',
      competitionsExample: 'Virgin Labfest playwright & staging calls, collegiate theater tournaments, and monologue showcases',
      auditionsExample: 'Tanghalang Pilipino seasonal auditions, PETA acting laboratory castings, Repertory Philippines calls',
      achievementsExample: 'Gawad Buhay acting awards, Asian Academy Creative Awards, and critical acclaim in legitimate theater',
    },
    theater: {
      name: 'Musical Theater & Stage Production',
      targetAudience: 'Musical theater artists, stage directors, playwrights, technical production crews, and stage managers',
      competitionsExample: 'Philstage Gawad Buhay, Palanca Awards for Literature (Full-length & One-act Plays), Fringe Festival calls',
      auditionsExample: 'Major Manila musical productions, national tour casting, ensemble singing & dancing callbacks',
      achievementsExample: 'Record-breaking original Filipino musicals (Rak of Aegis, Ang Huling El Bimbo, One More Chance)',
    },
  }[discipline];

  return (
    <div className={cn('space-y-6', className)}>
      {/* 1. Category Purpose & Audience Card */}
      <section
        aria-label="Performing Arts Category Purpose and Audience"
        className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-7 backdrop-blur-md"
      >
        <div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-text">
                <Radio className="h-3 w-3" />
                Information Hub Architecture
              </span>
              <span className="text-xs text-muted-foreground">· Verified Performing Arts Desks</span>
            </div>
            <h2 className="mt-1 text-base font-bold text-foreground sm:text-lg">
              News, Auditions &amp; Information Coverage
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Target Audience: <strong className="text-foreground">{disciplineMeta.name}</strong>
          </span>
        </div>

        {/* 4 Category Pillar Blocks */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Pillar 1: Competitions & Results */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-border hover:bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  <Trophy className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Competitions &amp; Results
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Official tournament schedules, qualifiers, battle brackets, and certified judging results.
              </p>
            </div>
            <div className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <strong className="text-foreground font-semibold">Key Leagues:</strong> {disciplineMeta.competitionsExample}
            </div>
          </div>

          {/* Pillar 2: Auditions & Castings */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-border hover:bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Auditions &amp; Castings
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Verified audition notices, casting calls, callback dates, and company recruitment criteria.
              </p>
            </div>
            <div className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <strong className="text-foreground font-semibold">Recent Calls:</strong> {disciplineMeta.auditionsExample}
            </div>
          </div>

          {/* Pillar 3: Workshops & Masterclasses */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-border hover:bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Workshops &amp; Masterclasses
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Technique calibration, master mentor intensives, conservatory prep, and studio workshops.
              </p>
            </div>
            <div className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <strong className="text-foreground font-semibold">Who it is for:</strong> {disciplineMeta.targetAudience}
            </div>
          </div>

          {/* Pillar 4: Industry Announcements */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-border hover:bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  <Megaphone className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Announcements &amp; News
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                National arts council notices, federation charters, award results, and official policy updates.
              </p>
            </div>
            <div className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <strong className="text-foreground font-semibold">Milestones:</strong> {disciplineMeta.achievementsExample}
            </div>
          </div>
        </div>

        {/* Source Credibility Distinction Guide */}
        <div className="mt-5 rounded-xl border border-border/60 bg-card p-3.5 sm:p-4">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>How We Distinguish Information Sources</span>
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-[11px]">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-emerald-400">Confirmed Official News</p>
                <p className="text-muted-foreground text-[10px]">
                  Directly verified from official federation statements, press archives, or organizers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-sky-400">Upcoming Events &amp; Calls</p>
                <p className="text-muted-foreground text-[10px]">
                  Scheduled tournaments, theater dates, or registration deadlines verified with ticket portals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
              <div>
                <p className="font-bold text-amber-400">Community Dispatches</p>
                <p className="text-muted-foreground text-[10px]">
                  Member tips and studio alerts undergoing ongoing verification by cultural editors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Safety & Anti-Scam Information Disclaimer */}
      <section
        aria-label="Safety and Information Disclaimer"
        className="rounded-2xl border border-warning/40 bg-warning/5 p-5 shadow-sm backdrop-blur-md sm:p-6"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/40 bg-warning/15 text-warning">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground sm:text-base">
                Safety &amp; Information Verification Advisory
              </h3>
              <span className="rounded bg-warning/20 px-2 py-0.5 text-[10px] font-extrabold text-warning uppercase">
                Notice
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              All information, competition results, schedules, auditions, and workshop notices published on
              GrooveSystem are curated for <strong>informational and educational purposes only</strong>. While our editorial
              team verifies links against official organizations, schedules, venues, and entrance fees remain under the
              sole discretion of the hosting organizers and are subject to change.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-card/80 p-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Verify Before Transacting:</strong> Always confirm workshop fees,
                  audition rules, and festival eligibility directly on the official website or verified social handles.
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-card/80 p-2.5">
                <AlertOctagon className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Anti-Scam Warning:</strong> Legitimate performing arts companies,
                  dance crews, and choirs <em>never</em> require unverified bank transfers via personal chat to audition.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Community Submission & Copyright Guidelines (Collapsible / Toggleable) */}
      <section
        aria-label="Community News Submission Guidelines"
        className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm"
      >
        <button
          type="button"
          onClick={() => setGuidelinesOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-accent-text">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground sm:text-sm">
                Community Guidelines: News Submissions &amp; Copyright Standards
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Rules for submitting achievements, respecting copyright, preventing scams, and reporting errors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span>{guidelinesOpen ? 'Collapse' : 'View Guidelines'}</span>
            {guidelinesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {guidelinesOpen && (
          <div className="mt-4 border-t border-border/70 pt-4 space-y-3.5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-accent" />
                  <span>1. Verifiable Source Requirement</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Every submitted event, match recap, or casting announcement must include a working source URL
                  from the hosting organizer, university, or registered guild. Unverified hearsay or anonymous
                  claims will not be published.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Copyright className="h-3.5 w-3.5 text-amber-500" />
                  <span>2. Copyright &amp; Media Attribution</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Only submit promotional artwork, production photos, or crew posters that are officially released
                  for public distribution. Always provide photographer credits and original media license information.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span>3. Zero Tolerance for Scams</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Any attempt to advertise predatory talent competitions, unauthorized ticketing scalping, or
                  talent scouts soliciting private payments will result in an immediate account ban and domain blacklisting.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                  <span>4. Reporting Misleading Content</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  If an event has been postponed, canceled, or contains inaccurate dates, please click the
                  &ldquo;Report Issue / Correction&rdquo; link on any update card or contact our editorial desk directly.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
              <span>GrooveSystem Performing Arts Editorial Desk · Manila &amp; Bulacan</span>
              <span>Updated October 2026</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default PerformingArtsNewsHubGuide;
