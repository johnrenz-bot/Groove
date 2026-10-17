'use client';

/**
 * Community Rules & Code of Conduct for Dancer Circle.
 *
 * Placed at the bottom of the Dancer Circle community area.
 * Covers:
 *   1. Mutual Respect & Pakikisama (Anti-Harassment & Inclusive Culture)
 *   2. Dance Safety & Appropriate Content (Safe floor stunts & family-friendly media)
 *   3. Studio Privacy & Video Consent (Never record without fellow dancers' consent)
 *   4. Copyright & Choreography Attribution (Credit choreographers & track producers)
 *   5. Anti-Scam & Audition Verification (Protect personal data & avoid fee traps)
 *   6. Reporting Inappropriate Behavior (Clear moderation steps)
 */

import React from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Copyright,
  Eye,
  Flag,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export function DancerCircleRules() {
  const rules = [
    {
      id: 'respect',
      icon: HeartHandshake,
      title: '1. Mutual Respect & Pakikisama (Anti-Harassment)',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description:
        'Dance is a universal language of expression. We enforce zero tolerance for bullying, hate speech, body-shaming, discrimination, or aggressive mockery in battle comments. Welcome beginners and uplift fellow dancers across all styles.',
    },
    {
      id: 'safety',
      icon: ShieldCheck,
      title: '2. Physical Safety & Appropriate Content',
      color: 'text-accent bg-accent/10 border-accent/20',
      description:
        'Share choreography, practice runs, and stage highlights that celebrate movement. Do not post hazardous stunts or unassisted acrobatics without proper crash pads and warnings. Explicit, vulgar, or unsafe footage will be removed.',
    },
    {
      id: 'privacy',
      icon: Eye,
      title: '3. Studio Privacy & Recording Consent',
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      description:
        'Always ask for consent before recording rehearsal footage that features other studio members, students, or instructors in the background. Never publish private phone numbers, rehearsal studio door codes, or sensitive personal data.',
    },
    {
      id: 'copyright',
      icon: Copyright,
      title: '4. Choreography Credits & Music Copyright',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      description:
        'Always tag and credit the original choreographer, crew, and music producer in your captions. Routine plagiarism or claiming another creator’s choreo as your original work violates community trust.',
    },
    {
      id: 'scam',
      icon: AlertTriangle,
      title: '5. Audition Safety & Anti-Scam Protection',
      color: 'text-warning bg-warning/10 border-warning/20',
      description:
        'Legitimate dance auditions, backup dancer castings, and crew auditions never ask for unverified upfront placement fees or sensitive documents via private messaging. Always verify calls with registered organizations.',
    },
    {
      id: 'reporting',
      icon: Flag,
      title: '6. Reporting Inappropriate Behavior',
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      description:
        'If you encounter harassment, copyright infringement, or spam, click the three dots (⋮) on the post or comment to report it, or contact Groove community moderators. All reports are confidential and reviewed promptly.',
    },
  ];

  return (
    <section
      aria-label="Dancer Circle Community Rules & Guidelines"
      className="mt-8 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-md sm:p-7"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-text">
              <Sparkles className="h-3 w-3" />
              Dancer Circle Code
            </span>
            <span className="text-xs text-muted-foreground">· Official Guidelines</span>
          </div>
          <h2 className="mt-1 text-base font-bold text-foreground sm:text-lg">
            Community Rules &amp; Studio Etiquette
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Active for all dancers, coaches &amp; crews</span>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div
              key={rule.id}
              className="flex gap-3.5 rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-all hover:border-border hover:bg-muted/40"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${rule.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-xs font-bold text-foreground sm:text-sm">
                  {rule.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  {rule.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Badge / Footer note */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-accent" />
          <span>
            Keeping our Filipino dance tambayan respectful, creative, and safe for performers of all ages.
          </span>
        </div>
        <span className="font-semibold text-accent-text">
          Sama-sama sa entablado · GrooveSystem
        </span>
      </div>
    </section>
  );
}

export default DancerCircleRules;
