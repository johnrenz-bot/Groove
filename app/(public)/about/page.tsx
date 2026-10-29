import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle,
  Compass,
  FileCheck,
  GraduationCap,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { Reveal } from '@/components/shared/Reveal';

export const metadata: Metadata = {
  title: 'About Groove — Performing Arts Platform',
  description:
    'Learn how GroovePH connects performers, verified coaches, rehearsal spaces, and the performing arts community of San Jose del Monte, Bulacan.',
  alternates: { canonical: '/about' },
};

/**
 * /about — THE PUBLIC PLATFORM STORY.
 *
 * This page answers the visitor's question: "What is GroovePH, who is it for,
 * and what can I actually do here?" The academic side of the project has its
 * own page at /about-project. Keeping them separate lets this page stay useful
 * to a performer or coach who does not need the capstone documentation, while
 * still giving anyone curious about the school project a clear route to it.
 *
 * Everything below describes a feature that exists in the platform today.
 * Scope boundaries are stated plainly in the "Good to know" section rather than
 * hidden behind marketing language.
 */
const AUDIENCES = [
  {
    icon: Users,
    title: 'Performers & clients',
    body: 'For students, performers, and creatives who want to train with the right coach.',
    items: [
      'Discover coaches by discipline, rate, and location',
      'Book sessions and keep them in your calendar',
      'Message coaches and sign digital session agreements',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Coaches & choreographers',
    body: 'For performing-arts professionals who want a clearer way to be found and booked.',
    items: [
      'Publish a verified coach profile',
      'Manage requests, availability, and client details',
      'Keep session terms and schedules in one place',
    ],
  },
  {
    icon: MapPin,
    title: 'Studios & rehearsal spaces',
    body: 'For the spaces performers need to find. Studios appear through the locator rather than a separate account type.',
    items: [
      'Listed in the rehearsal-space directory',
      'Discoverable through radius-based search',
      'Help performers plan where to rehearse',
    ],
  },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Coach discovery',
    body: 'Browse a verified directory and compare specialism, rate, and location before you reach out.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification',
    body: 'Coach profiles are checked through a document-based verification process.',
  },
  {
    icon: CalendarCheck,
    title: 'Bookings & schedules',
    body: 'Send a session request, confirm the details, and keep upcoming sessions in your calendar.',
  },
  {
    icon: FileCheck,
    title: 'Digital agreements',
    body: 'The session terms, fee, and schedule are recorded together, with a drawn signature.',
  },
  {
    icon: MessageSquare,
    title: 'Direct messaging',
    body: 'Discuss goals, rates, and availability in the platform before committing to a booking.',
  },
  {
    icon: Bot,
    title: 'Groovey AI',
    body: 'A performing-arts assistant for guidance while you use the platform.',
  },
  {
    icon: Users,
    title: 'Community',
    body: 'Dance, singing, acting, and theater pages for the performing arts community.',
  },
  {
    icon: MapPin,
    title: 'Studio locator',
    body: 'Find rehearsal spaces with radius-based search and map-based listings.',
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'Find',
    body: 'Browse the directory or a discipline page. Specialism, rate, and location are on the coach card before you message anyone.',
  },
  {
    icon: MessageSquare,
    title: 'Agree',
    body: 'Message a coach to talk terms. Nothing is charged and nothing is locked in yet — you are agreeing on what the session will be.',
  },
  {
    icon: CalendarCheck,
    title: 'Book',
    body: 'Confirm the slot. The digital session agreement, the fee, and the schedule are created together, so there is one record of what was agreed.',
  },
  {
    icon: Compass,
    title: 'Show up',
    body: 'The session happens, and it shows up in your calendar. Repeating with the same coach is one click from the profile.',
  },
];

const VALUES = [
  {
    title: 'Verification before visibility',
    body: 'A coach profile is checked before it appears in the directory. The point is to make “who can teach this?” answerable, not to collect profiles.',
  },
  {
    title: 'One record of what was agreed',
    body: 'The session agreement, fee, and schedule live together, so both sides can refer to the same details.',
  },
  {
    title: 'Built around the local scene',
    body: 'The platform is shaped around how performing-arts work happens in San Jose del Monte: studio classes, freelance coaches, school productions, and community crews.',
  },
];

const VALUE_ICONS = [ShieldCheck, FileCheck, MapPin] as const;

const BOUNDARIES = [
  {
    title: 'No payments or commissions',
    body: 'Rates are agreed directly between coach and client. Groove does not process payments or take a cut of sessions.',
  },
  {
    title: 'Local by design',
    body: 'The studio locator and curated listings focus on San Jose del Monte, Bulacan. Coaches from other areas can join, but venue coverage is locally focused.',
  },
  {
    title: 'In-app notifications',
    body: 'Booking and message updates appear in the app. Email is used for registration, not automated booking confirmations.',
  },
  {
    title: 'No separate studio accounts',
    body: 'Studios and rehearsal spaces appear through the studio locator. The current account types are client, coach, and admin.',
  },
];

const DISCIPLINES = [
  { label: 'Dance', href: '/community/performing-arts/dance' },
  { label: 'Singing', href: '/community/performing-arts/singing' },
  { label: 'Acting', href: '/community/performing-arts/acting' },
  { label: 'Theater', href: '/community/performing-arts/theater' },
];

const SECTION_LINKS = [
  { href: '#what-is-groove', label: 'Overview' },
  { href: '#who-it-is-for', label: "Who it's for" },
  { href: '#features', label: 'Features' },
  { href: '#disciplines', label: 'Disciplines' },
  { href: '#how', label: 'How it works' },
  { href: '#boundaries', label: 'Good to know' },
  { href: '#capstone-link', label: 'Capstone' },
  { href: '#contact', label: 'Contact' },
];

const GLANCE = [
  {
    icon: MapPin,
    label: 'Location',
    value: 'San Jose del Monte, Bulacan',
  },
  {
    icon: ShieldCheck,
    label: 'Directory',
    value: 'Verified coach profiles',
  },
  {
    icon: CalendarCheck,
    label: 'Bookings',
    value: 'Sessions & digital agreements',
  },
  {
    icon: Search,
    label: 'Studio locator',
    value: 'Verified studios on Google Maps',
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-border bg-card/40">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-accent-soft/40 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent-soft/20" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <span className="g-eyebrow mb-4 inline-flex">
              <Sparkles className="mr-1.5 h-3 w-3" aria-hidden="true" />
              Performing Arts Platform
            </span>
            <h1 className="g-display max-w-[20ch] text-balance">
              A performing arts home for San Jose del Monte.
            </h1>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
              GroovePH is a web-based performing arts hub for San Jose del Monte, Bulacan — a
              shared place to find verified coaches, book sessions, and keep the details of an
              agreement together.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                San Jose del Monte, Bulacan
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified coach directory
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Bookings &amp; agreements
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/users"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Browse coaches
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
                <Link
                  href="/register/coach"
                  className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Teach on Groove
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
          </div>

          <Reveal variant="right" delay={90} className="relative">
            <aside
              aria-label="Platform snapshot"
              className="relative overflow-hidden rounded-[28px] border border-accent-border/30 bg-gradient-to-br from-accent-soft/20 via-card to-card p-5 shadow-[var(--shadow-lg)] sm:p-7"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-accent/15 bg-accent/5"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent/5 blur-2xl"
                aria-hidden="true"
              />

              <div className="relative flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Platform snapshot
                </p>
              </div>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                Discovery, booking, and community in one place for the local performing arts scene.
              </p>

              <dl className="relative mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GLANCE.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-sm"
                  >
                    <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
                      <item.icon className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd className="mt-1.5 text-xs font-medium leading-relaxed text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="relative mt-4 rounded-2xl border border-accent-border/25 bg-accent-soft/15 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">
                  Community disciplines
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {DISCIPLINES.map((discipline) => (
                    <span
                      key={discipline.label}
                      className="rounded-full border border-accent-border/40 bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-foreground"
                    >
                      {discipline.label}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ---- On-page navigation ---- */}
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-8 sm:px-8 sm:pt-10">
        <nav
          aria-label="On this page"
          className="overflow-hidden rounded-2xl border border-border bg-card/70 p-1.5 shadow-[var(--shadow-sm)]"
        >
          <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTION_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <a
                  href={link.href}
                  className="inline-flex whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="space-y-16 sm:space-y-20">
          {/* ---- What Groove is ---- */}
          <section
            aria-labelledby="what-is-groove"
            className="grid scroll-mt-28 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
          >
            <Reveal className="max-w-[68ch]">
              <span className="g-eyebrow">What Groove is</span>
              <h2 id="what-is-groove" className="g-title mt-3 text-2xl sm:text-[1.85rem]">
                Built for the way local performing arts actually works.
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Finding a coach here often means asking around. A friend knows someone, a group
                  chat has a recommendation, and the details of the session live in a conversation
                  that is hard to return to later. The coaching is real; the coordination around it
                  is what Groove is designed to improve.
                </p>
                <p>
                  Groove brings coach discovery, booking, schedules, messaging, digital agreements,
                  and community pages into one place. It is not a marketplace taking a cut of every
                  session. It is a booking and coordination platform for a scene that already exists.
                </p>
              </div>
            </Reveal>

            <Reveal variant="right" delay={80}>
              <aside
                className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6"
                aria-labelledby="at-a-glance"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/5"
                  aria-hidden="true"
                />
                <div className="relative flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-border/30 bg-accent-soft/20 text-accent-text">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 id="at-a-glance" className="text-sm font-semibold text-foreground">
                    At a glance
                  </h3>
                </div>
                <dl className="relative mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {GLANCE.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-muted/30 p-3.5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-1.5 text-xs font-medium leading-relaxed text-foreground">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </Reveal>
          </section>

          {/* ---- Audience ---- */}
          <section aria-labelledby="who-it-is-for" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">Who it is for</span>
              <h2 id="who-it-is-for" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                Three sides of the same local scene.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Groove is built around the people who make performing-arts sessions happen: the
                performer, the coach, and the space where they rehearse.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {AUDIENCES.map((audience, index) => (
                <li key={audience.title} className="min-w-0">
                  <Reveal delay={index * 70} className="h-full">
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/50 hover:shadow-[var(--shadow-md)]">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-border/30 bg-accent-soft/25 text-accent-text transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                          <audience.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-[11px] font-bold tracking-[0.2em] text-subtle-foreground">
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-foreground">{audience.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {audience.body}
                      </p>
                      <ul className="mt-5 space-y-2.5 border-t border-divider pt-4">
                        {audience.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle
                              className="mt-0.5 h-4 w-4 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Features ---- */}
          <section aria-labelledby="features" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">Platform features</span>
              <h2 id="features" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                What you can do on Groove.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These are the features that exist in the platform today.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, index) => (
                <li key={feature.title} className="min-w-0">
                  <Reveal delay={(index % 4) * 50} className="h-full">
                    <article className="group h-full rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:bg-muted/20 hover:shadow-[var(--shadow-sm)]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors group-hover:border-accent-border/40 group-hover:bg-accent-soft/30 group-hover:text-accent-text">
                        <feature.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.body}
                      </p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Disciplines ---- */}
          <section aria-labelledby="disciplines" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">Disciplines</span>
              <h2 id="disciplines" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                Explore the community.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Each discipline page collects community updates and local resources for that part of
                the performing arts.
              </p>
            </Reveal>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DISCIPLINES.map((discipline, index) => (
                <Reveal key={discipline.label} delay={index * 50}>
                  <Link
                    href={discipline.href}
                    className="group relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent-soft/10 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/50 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle-foreground">
                        Discipline 0{index + 1}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all group-hover:border-accent-border group-hover:text-accent-text">
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="mt-4">
                      <span className="text-lg font-semibold tracking-tight text-foreground">
                        {discipline.label}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">Community page</p>
                    </div>
                    <div
                      className="pointer-events-none absolute -bottom-8 -right-6 h-20 w-20 rounded-full border border-accent/10 bg-accent/5 transition-transform duration-300 group-hover:scale-125"
                      aria-hidden="true"
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ---- How it works ---- */}
          <section aria-labelledby="how" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">How it works</span>
              <h2 id="how" className="g-title mt-3 mb-2 text-2xl sm:text-[1.85rem]">
                Four steps from finding a coach to showing up.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The same four steps work for a one-off session or a run of weekly classes.
              </p>
            </Reveal>

            <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="min-w-0">
                  <Reveal delay={index * 60} className="h-full">
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:shadow-[var(--shadow-sm)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-border/30 bg-accent-soft/25 text-sm font-bold text-accent-text">
                          {index + 1}
                        </span>
                        <step.icon
                          className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent-text"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="mt-5 text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          {/* ---- Mission ---- */}
          <section aria-labelledby="mission" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">What we are building toward</span>
              <h2 id="mission" className="g-title mt-3 text-2xl sm:text-[1.85rem]">
                A clearer way to work together.
              </h2>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {VALUES.map((value, index) => {
                const Icon = VALUE_ICONS[index];
                return (
                  <li key={value.title} className="min-w-0">
                    <Reveal delay={index * 70} className="h-full">
                      <article className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:shadow-[var(--shadow-sm)]">
                        <div
                          className="absolute inset-y-0 left-0 w-0.5 bg-accent/70"
                          aria-hidden="true"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-border/30 bg-accent-soft/20 text-accent-text">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="text-[11px] font-bold tracking-[0.2em] text-subtle-foreground">
                            0{index + 1}
                          </span>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-foreground">{value.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {value.body}
                        </p>
                      </article>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---- Boundaries ---- */}
          <section aria-labelledby="boundaries" className="scroll-mt-28">
            <Reveal className="max-w-[62ch]">
              <span className="g-eyebrow">Good to know</span>
              <h2 id="boundaries" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                A few boundaries are intentional.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Groove is focused on discovery, coordination, and agreements. It is not trying to be
                everything at once.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BOUNDARIES.map((boundary, index) => (
                <li key={boundary.title} className="min-w-0">
                  <Reveal delay={(index % 2) * 60} className="h-full">
                    <article className="flex h-full gap-3.5 rounded-2xl border border-border bg-muted/30 p-5 transition-colors hover:border-border-strong">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                        <Info className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{boundary.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {boundary.body}
                        </p>
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Academic cross-link ---- */}
          <aside
            aria-labelledby="capstone-link"
            className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-accent-border/30 bg-accent-soft/10 p-6 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-accent/15 bg-accent/5"
              aria-hidden="true"
            />
            <Reveal className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-[62ch]">
                <span className="g-eyebrow">
                  <GraduationCap className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                  Academic background
                </span>
                <h2 id="capstone-link" className="g-title mt-2 text-2xl">
                  Behind the platform
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  GroovePH began as a BS Information Technology capstone project at STI College San
                  Jose Del Monte, Bulacan. The academic background, problem, objectives, project
                  team, and scope are documented separately.
                </p>
              </div>
              <Link
                href="/about-project"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-accent-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                About the capstone project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </aside>

          {/* ---- Contact ---- */}
          <section
            aria-labelledby="contact"
            className="scroll-mt-28 rounded-3xl border border-border bg-card p-6 sm:p-10"
          >
            <Reveal>
              <span className="g-eyebrow">Get in touch</span>
              <h2 id="contact" className="g-title mt-3 text-2xl">
                Contact
              </h2>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                Questions about the platform, a coach profile, or your account? Email the team or
                read the FAQ.
              </p>
            </Reveal>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <Reveal delay={80}>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                        Email
                      </dt>
                      <dd className="mt-1 break-words text-sm text-muted-foreground">
                        <a
                          href="mailto:grooveyyph@gmail.com"
                          className="font-semibold text-accent-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                          grooveyyph@gmail.com
                        </a>
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                        Based in
                      </dt>
                      <dd className="mt-1 text-sm text-muted-foreground">
                        San Jose del Monte, Bulacan
                      </dd>
                    </div>
                  </div>
                </dl>
              </Reveal>

              <Reveal variant="right" delay={140}>
                <div className="rounded-2xl border border-accent-border/30 bg-accent-soft/10 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Need a quicker answer?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    The FAQ covers common questions about accounts, verification, bookings, and the
                    platform.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href="/faq"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      Read the FAQ
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <p className="text-xs leading-relaxed text-subtle-foreground">
                      Signed-in members can also reach the team through{' '}
                      <Link
                        href="/messages"
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        Messages
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
