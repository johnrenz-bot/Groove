'use client';

/**
 * Community Rules & Code of Conduct for Dancer Circle.
 *
 * Compact, collapsed-by-default panel. The previous version was a full-width
 * grid of six cards that took a screen and a half before the feed even started;
 * the rules are real policy, but they are not the reason someone opened the
 * showcase. The panel now shows a single summary row and expands into a
 * one-at-a-time accordion.
 *
 * Covers:
 *   1. Mutual Respect & Pakikisama (Anti-Harassment & Inclusive Culture)
 *   2. Dance Safety & Appropriate Content (Safe floor stunts & family-friendly media)
 *   3. Studio Privacy & Video Consent (Never record without fellow dancers' consent)
 *   4. Copyright & Choreography Attribution (Credit choreographers & track producers)
 *   5. Anti-Scam & Audition Verification (Protect personal data & avoid fee traps)
 *   6. Reporting Inappropriate Behavior (Clear moderation steps)
 *
 * Acknowledgement is stored in localStorage under its own key. The initial
 * state is always the server-safe `false`; the stored value is applied after
 * mount, so there is no hydration mismatch.
 */

import React, { useId, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  Copyright,
  Eye,
  Flag,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/components/shared/cn';

const ACK_STORAGE_KEY = 'groove:showcase:dancer-rules-ack:v1';
const ACK_EVENT = 'groove:showcase:dancer-rules-ack-changed';

function readAcknowledged(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ACK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeAcknowledged(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACK_STORAGE_KEY, String(value));
  } catch {
    /* storage may be unavailable; the current session still reflects the choice */
  }
}

/*
 * `useSyncExternalStore` gives us the saved value after hydration while the
 * server snapshot stays `false`, so the panel's first paint is identical on the
 * server and the client.
 */
let cachedAcknowledged: boolean | null = null;

function getAcknowledgedSnapshot(): boolean {
  cachedAcknowledged ??= readAcknowledged();
  return cachedAcknowledged;
}

function getServerAcknowledgedSnapshot(): boolean {
  return false;
}

function subscribeAcknowledged(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handleChange = () => {
    cachedAcknowledged = null;
    onChange();
  };
  window.addEventListener('storage', handleChange);
  window.addEventListener(ACK_EVENT, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(ACK_EVENT, handleChange);
  };
}

function setAcknowledgedStore(value: boolean) {
  if (typeof window === 'undefined') return;
  cachedAcknowledged = value;
  writeAcknowledged(value);
  window.dispatchEvent(new Event(ACK_EVENT));
}

export function DancerCircleRules() {
  const { t } = useLanguage();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [openRule, setOpenRule] = useState<string | null>('respect');
  const acknowledged = useSyncExternalStore(
    subscribeAcknowledged,
    getAcknowledgedSnapshot,
    getServerAcknowledgedSnapshot
  );

  const acknowledge = () => setAcknowledgedStore(true);
  const undoAcknowledgment = () => setAcknowledgedStore(false);

  const rules = [
    {
      id: 'respect',
      icon: HeartHandshake,
      title: t('showcase.rule1Title', '1. Mutual Respect & Pakikisama (Anti-Harassment)'),
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description:
        t('showcase.rule1Body', 'Dance is a universal language of expression. We enforce zero tolerance for bullying, hate speech, body-shaming, discrimination, or aggressive mockery in battle comments. Welcome beginners and uplift fellow dancers across all styles.'),
    },
    {
      id: 'safety',
      icon: ShieldCheck,
      title: t('showcase.rule2Title', '2. Physical Safety & Appropriate Content'),
      color: 'text-accent bg-accent/10 border-accent/20',
      description:
        t('showcase.rule2Body', 'Share choreography, practice runs, and stage highlights that celebrate movement. Do not post hazardous stunts or unassisted acrobatics without proper crash pads and warnings. Explicit, vulgar, or unsafe footage will be removed.'),
    },
    {
      id: 'privacy',
      icon: Eye,
      title: t('showcase.rule3Title', '3. Studio Privacy & Recording Consent'),
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      description:
        t('showcase.rule3Body', 'Always ask for consent before recording rehearsal footage that features other studio members, students, or instructors in the background. Never publish private phone numbers, rehearsal studio door codes, or sensitive personal data.'),
    },
    {
      id: 'copyright',
      icon: Copyright,
      title: t('showcase.rule4Title', '4. Choreography Credits & Music Copyright'),
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      description:
        t('showcase.rule4Body', 'Always tag and credit the original choreographer, crew, and music producer in your captions. Routine plagiarism or claiming another creator’s choreo as your original work violates community trust.'),
    },
    {
      id: 'scam',
      icon: AlertTriangle,
      title: t('showcase.rule5Title', '5. Audition Safety & Anti-Scam Protection'),
      color: 'text-warning bg-warning/10 border-warning/20',
      description:
        t('showcase.rule5Body', 'Legitimate dance auditions, backup dancer castings, and crew auditions never ask for unverified upfront placement fees or sensitive documents via private messaging. Always verify calls with registered organizations.'),
    },
    {
      id: 'reporting',
      icon: Flag,
      title: t('showcase.rule6Title', '6. Reporting Inappropriate Behavior'),
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      description:
        t('showcase.rule6Body', 'If you encounter harassment, copyright infringement, or spam, click the three dots (⋮) on the post or comment to report it, or contact Groove community moderators. All reports are confidential and reviewed promptly.'),
    },
  ];

  return (
    <section
      aria-label="Dancer Circle Community Rules & Guidelines"
      className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[var(--shadow-sm)] backdrop-blur-md"
    >
      {/* Summary row — the entire panel when collapsed. */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={expanded ? t('showcase.rulesCollapse', 'Collapse community rules') : t('showcase.rulesExpand', 'Expand community rules')}
        className="flex w-full cursor-pointer items-center gap-2.5 p-3 text-left transition hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:gap-3 sm:px-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border/60 bg-accent-soft text-accent-text">
          <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-text">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">{t('showcase.dancerCircleCode', 'Dancer Circle Code')}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">·</span>
            <span className="hidden truncate text-[9px] font-semibold tracking-wide text-muted-foreground sm:inline">
              {t('showcase.rulesSubtitle', 'Official Guidelines')}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-bold text-foreground sm:text-sm">
            {t('showcase.rulesTitle', 'Community Rules & Studio Etiquette')}
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {t('showcase.rulesCount', '{count} rules', { count: rules.length })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('showcase.rulesActive', 'Active')}
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5">
          {acknowledged && (
            <CheckCircle2 className="h-4 w-4 text-success sm:hidden" aria-hidden="true" />
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-300',
              expanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Expandable body. `inert` keeps the collapsed accordion out of the tab
          order while the grid-row transition animates. */}
      <div
        id={panelId}
        inert={!expanded}
        aria-hidden={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border/70 px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="space-y-1.5">
              {rules.map((rule) => {
                const Icon = rule.icon;
                const isOpen = openRule === rule.id;
                const contentId = `${panelId}-${rule.id}`;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'overflow-hidden rounded-xl border transition-colors',
                      isOpen
                        ? 'border-accent-border/50 bg-muted/35'
                        : 'border-border/60 bg-muted/15 hover:bg-muted/30'
                    )}
                  >
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpenRule(isOpen ? null : rule.id)}
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                        className="flex w-full cursor-pointer items-center gap-2.5 p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                            rule.color
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-foreground sm:text-xs">
                          {rule.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-180 text-accent-text'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>

                    <div
                      id={contentId}
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-out',
                        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="px-3 pb-3 pl-[3.25rem] text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note — preserved from the full card. */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/80 p-2.5 text-[11px]">
              <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Award className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="leading-snug">
                  {t('showcase.footerLine', 'Keeping our Filipino dance tambayan respectful, creative, and safe for performers of all ages.')}
                </span>
              </div>
              <span className="font-semibold text-accent-text">
                {t('showcase.footerSignature', 'Sama-sama sa entablado · GrooveSystem')}
              </span>
            </div>

            {/* Acknowledgement — persisted per device. */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck
                  className={cn('h-4 w-4 shrink-0', acknowledged ? 'text-success' : 'text-accent-text')}
                  aria-hidden="true"
                />
                <span className="leading-snug">
                  {acknowledged
                    ? t('showcase.acknowledgedHint', 'Saved on this device')
                    : t('showcase.activeForAll', 'Active for all dancers, coaches & crews')}
                </span>
              </div>

              {acknowledged ? (
                <div className="flex items-center gap-2">
                  <span
                    role="status"
                    className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('showcase.acknowledged', 'Acknowledged')}
                  </span>
                  <button
                    type="button"
                    onClick={undoAcknowledgment}
                    className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-semibold text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t('showcase.acknowledgeUndo', 'Undo')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={acknowledge}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground shadow-sm shadow-accent/20 transition hover:bg-accent-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('showcase.acknowledgeRules', 'I acknowledge these rules')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DancerCircleRules;
