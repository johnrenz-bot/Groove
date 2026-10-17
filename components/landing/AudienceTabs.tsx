'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/**
 * Performer / Coach, as a segmented control over a single column of features.
 *
 * The tab panel is driven by `aria-selected` + `aria-controls` on real
 * `role="tab"` buttons, and arrow-key movement is wired to the same roving
 * model the WAI-ARIA tabs pattern expects — previously the control was
 * click-only, so it was unusable from the keyboard.
 *
 * Switching panels cross-fades and slides by 8px rather than a full column
 * width: a large lateral slide on a 600px panel is motion for its own sake.
 */
const clientFeatures = [
  { title: 'Find verified coaches nearby', description: 'Search by discipline, location, and budget. Filter by ratings, availability, and specialization.' },
  { title: 'Book rehearsal sessions and studios', description: 'Real-time calendar with instant confirmation. Reschedule or cancel with one tap.' },
  { title: 'Digital contracts and e-signatures', description: 'Legally binding session agreements. Auto-generated PDFs with timestamps and audit trail.' },
  { title: 'Showcase Feed: share performances', description: 'Post videos, photos, and updates. Get feedback from coaches and peers.' },
  { title: 'Messages and calendar in one place', description: 'Unified inbox for coach chats, session reminders, and booking updates.' },
  { title: 'Track bookings, status, and progress', description: 'Personal dashboard with session history, skill milestones, and progress analytics.' },
  { title: 'Groovey AI coach assistant', description: '24/7 instant answers about bookings, coach bios, pricing, and platform policies.' },
];

const coachFeatures = [
  { title: 'Public coach profile and portfolio', description: 'Showcase credentials, specialties, rates, and verified reviews. SEO-optimized.' },
  { title: 'Manage schedule and availability', description: 'Set recurring slots, block dates, and sync with Google Calendar.' },
  { title: 'Accept/decline bookings', description: 'Review requests with student details. One-tap confirm or propose alternatives.' },
  { title: 'Create and send contracts', description: 'Template-based digital agreements. Auto-fill student info. Track signature status.' },
  { title: 'Community Showcase to attract talents', description: 'Post teaching demos, student highlights, and class announcements.' },
  { title: 'Earnings and session tracking', description: 'Revenue dashboard with payouts, pending sessions, and tax-ready reports.' },
  { title: 'Groovey AI assistant', description: 'Automated scheduling, student matching, and policy questions answered instantly.' },
];

type Audience = 'client' | 'coach';

const AUDIENCE_COPY: Record<Audience, { label: string; heading: string; lead: string; cta: string; href: string }> = {
  client: {
    label: 'For Performers',
    heading: 'Everything you need to grow your craft',
    lead: 'Browse coaches, manage bookings, and connect with the community — all from one place.',
    cta: 'Join as Performer',
    href: '/register/client',
  },
  coach: {
    label: 'For Coaches',
    heading: 'Grow your coaching practice',
    lead: 'Tools built for instructors — manage your schedule, connect with local talent, and build a reputation in the SJDM performing arts scene.',
    cta: 'Join as Coach',
    href: '/register/coach',
  },
};

import { Reveal } from '@/components/shared/Reveal';

export function AudienceTabs() {
  const [activeTab, setActiveTab] = useState<Audience>('client');
  const copy = AUDIENCE_COPY[activeTab];
  const features = activeTab === 'client' ? clientFeatures : coachFeatures;

  /**
   * Roving focus: ←/→ and Home/End move between the two tabs, matching the
   * WAI-ARIA tabs pattern. Without it the control is two separate buttons and
   * the panel relationship is announced but not operable.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order: Audience[] = ['client', 'coach'];
    const current = order.indexOf(activeTab);
    let next: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % order.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + order.length) % order.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = order.length - 1;

    if (next === null) return;
    event.preventDefault();
    setActiveTab(order[next]);
    document.getElementById(`audience-tab-${order[next]}`)?.focus();
  };

  return (
    /* `id="coaches"` is the scroll target for the "Coaches" entry in the public
       landing header (`LANDING_ANCHORS` in navConfig.ts). It used to be
       `id="audience"`, which nothing linked to — so that nav entry was a dead
       anchor and clicking "Coaches" moved nowhere. The heading id is still
       `audience-heading` and `aria-labelledby` still points at it; only the
       scroll target moved. */
    <section id="coaches" className="ld-section ld-band" aria-labelledby="audience-heading">
      <div className="ld-wrap">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="ld-eyebrow">Audience</p>
          <h2 id="audience-heading" className="ld-h2">
            Built for performers and the coaches who guide them
          </h2>
          <p className="ld-p">
            Two experiences, one platform. Choose your path and discover tools designed
            specifically for you.
          </p>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <div
            className="ld-seg"
            role="tablist"
            aria-label="Select audience"
            onKeyDown={onKeyDown}
          >
            {(['client', 'coach'] as Audience[]).map((audience) => (
              <button
                key={audience}
                type="button"
                role="tab"
                id={`audience-tab-${audience}`}
                aria-selected={activeTab === audience}
                aria-controls="audience-panel"
                tabIndex={activeTab === audience ? 0 : -1}
                onClick={() => setActiveTab(audience)}
                className="ld-seg__btn transition-all duration-200"
              >
                {audience === 'client' ? 'Performer' : 'Coach'}
              </button>
            ))}
          </div>
        </div>

        <div
          id="audience-panel"
          role="tabpanel"
          aria-labelledby={`audience-tab-${activeTab}`}
          tabIndex={0}
          className="mx-auto mt-12 max-w-3xl focus-visible:outline-none"
        >
          <div key={activeTab} className="ld-panel-in">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="ld-eyebrow">{copy.label}</p>
              <h3 className="ld-h2">{copy.heading}</h3>
              <p className="ld-p max-w-xl">{copy.lead}</p>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {features.map((feature, idx) => (
                <li
                  key={feature.title}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="ld-card ld-card--tight gap-2 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md animate-in fade-in"
                >
                  <h4 className="ld-h4">{feature.title}</h4>
                  <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex justify-center">
              <Link href={copy.href} className="ld-btn">
                {copy.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AudienceTabs;