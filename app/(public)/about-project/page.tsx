import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  Code,
  Globe,
  GraduationCap,
  MapPin,
  Search,
  Server,
  ShieldCheck,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { Reveal } from '@/components/shared/Reveal';
import { PROJECT_INFO } from '@/lib/config/projectInfo';

export const metadata: Metadata = {
  title: 'About the Capstone Project — GroovePH',
  description:
    'The academic background, problem, objectives, development purpose, and project team behind GroovePH, a BS Information Technology capstone project at STI College San Jose Del Monte, Bulacan.',
  alternates: { canonical: '/about-project' },
};

/**
 * /about-project — THE ACADEMIC RECORD.
 *
 * This page is deliberately separate from /about. A visitor who wants to know
 * what GroovePH does should not have to read a capstone manuscript to find out,
 * and a panel reviewing the project should not have to infer the academic work
 * from a marketing page.
 *
 * Every name, figure, and scope statement below comes from the existing
 * `PROJECT_INFO` configuration — the same record the public About page and
 * Groovey AI used before the split. Nothing here is generated or estimated.
 */
const MODULE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'Super Admin Console': Server,
  'Performing Artist (Coach/Choreographer)': Users,
  'Client (Performer/Student)': GraduationCap,
};

const LIMITATION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'No Payment Processing': XCircle,
  'Geographic Focus': Globe,
  'No Push/Email Notifications': AlertTriangle,
  'No Achievement/Badge System': XCircle,
  'Limited Offline Support': AlertTriangle,
  'Single-Language Primary': Globe,
};

const DEVELOPMENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'Client portal': GraduationCap,
  'Coach portal': Users,
  'Admin console': Server,
};

/** Selected findings that directly explain the problem the project addresses. */
const SURVEY_HIGHLIGHTS = [
  PROJECT_INFO.surveyStats[1],
  PROJECT_INFO.surveyStats[2],
  PROJECT_INFO.surveyStats[4],
  PROJECT_INFO.surveyStats[5],
  PROJECT_INFO.surveyStats[7],
  PROJECT_INFO.surveyStats[9],
] as const;

const COMMUNITY_SUPPORT = [
  {
    icon: Search,
    title: 'Makes local coaches easier to find',
    body: 'A verified directory gives performers a starting point that does not depend on a group-chat recommendation or a friend of a friend.',
  },
  {
    icon: ShieldCheck,
    title: 'Gives agreements a shared record',
    body: 'Session terms, fees, and schedules are recorded in one place, so coach and client can refer to the same details instead of relying on memory.',
  },
  {
    icon: Users,
    title: 'Connects the scene beyond bookings',
    body: 'Discipline pages and community features give the local performing arts community a shared space beyond individual sessions.',
  },
];

const DEVELOPMENT_POINTS = [
  {
    title: 'Client portal',
    body: 'Coach discovery, appointment requests, schedules, messaging, Groovey AI, and digital agreements.',
  },
  {
    title: 'Coach portal',
    body: 'Profile management, booking requests, client roster, availability, portfolio, and verification documents.',
  },
  {
    title: 'Admin console',
    body: 'User verification, platform settings, announcements, audit logs, and operational oversight.',
  },
];

/**
 * The development story already described on this page, arranged as a simple
 * three-stage record. No tools, timelines, or outcomes are added beyond what
 * the capstone content above already states.
 */
const BUILD_STAGES = [
  {
    number: '01',
    title: 'Research',
    body: 'The project began with the local problem outlined above and the 2025 capstone survey of 152 performing artists.',
  },
  {
    number: '02',
    title: 'Build',
    body: 'Development focused on the workflows that connect a performer, a coach, and the platform administrator, turning the research into a working web application.',
  },
  {
    number: '03',
    title: 'Deliver',
    body: 'The result is a working web application rather than a static mock-up, with role-based modules for clients, coaches, and administrators.',
  },
];

const GLANCE = [
  {
    icon: Target,
    label: 'Project type',
    value: PROJECT_INFO.academicContext.type,
  },
  {
    icon: GraduationCap,
    label: 'Degree',
    value: PROJECT_INFO.academicContext.degree,
  },
  {
    icon: BookOpen,
    label: 'Institution',
    value: PROJECT_INFO.academicContext.institution,
  },
  {
    icon: CalendarCheck,
    label: 'Year',
    value: PROJECT_INFO.academicContext.year,
  },
];

const SECTION_LINKS = [
  { href: '#at-a-glance', label: 'Project record' },
  { href: '#background', label: 'Background' },
  { href: '#survey', label: 'Research' },
  { href: '#objectives', label: 'Objectives' },
  { href: '#development', label: 'Development' },
  { href: '#community-support', label: 'Community' },
  { href: '#limitations', label: 'Scope' },
  { href: '#team', label: 'Team' },
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GP';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export default function AboutProjectPage() {
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
            <div className="flex flex-wrap items-center gap-3">
              <span className="g-eyebrow inline-flex">
                <GraduationCap className="mr-1.5 h-3 w-3" aria-hidden="true" />
                Academic Capstone Project
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Student project
              </span>
            </div>

            <h1 className="g-display mt-4 max-w-[24ch] text-balance">
              The academic project behind GroovePH.
            </h1>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-muted-foreground">
              GroovePH was developed as a BS Information Technology capstone project at STI College
              San Jose Del Monte, Bulacan. This page documents the academic work behind the
              platform: the local problem, the research that informed it, the objectives, and the
              team that built it.
            </p>
            <p className="mt-4 max-w-[66ch] text-sm leading-relaxed text-muted-foreground">
              This is a student capstone project. It is separate from the public About page, which
              explains what GroovePH does for performers, coaches, and rehearsal spaces.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                BSIT Capstone 2025
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                STI College San Jose Del Monte
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                San Jose del Monte, Bulacan
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/about"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                About the platform
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/users"
                className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Browse coaches
              </Link>
            </div>
          </div>

          <Reveal variant="right" delay={90} className="relative">
            <aside
              aria-label="Academic record"
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

              <div className="relative flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-border/30 bg-accent-soft/20 text-accent-text">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Academic record
                </p>
              </div>

              <p className="relative mt-4 text-sm font-semibold leading-relaxed text-foreground">
                {PROJECT_INFO.fullName}
              </p>

              <dl className="relative mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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

              <div className="relative mt-4 flex items-start gap-2.5 rounded-2xl border border-accent-border/25 bg-accent-soft/15 p-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">
                    Location
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    San Jose del Monte, Bulacan
                  </p>
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
          {/* ---- Project record ---- */}
          <section aria-labelledby="at-a-glance" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Project record</span>
              <h2 id="at-a-glance" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                At a glance
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The academic details recorded for the project. The title below is reproduced from
                the capstone record.
              </p>
            </Reveal>

            <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-accent-border/30 bg-accent-soft/10 p-5 sm:col-span-2 lg:col-span-4">
                <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Project title
                </dt>
                <dd className="mt-2 break-words text-sm font-medium leading-relaxed text-foreground">
                  {PROJECT_INFO.fullName}
                </dd>
              </div>
              {GLANCE.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-card p-5">
                  <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
                    <item.icon className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ---- Background ---- */}
          <section
            aria-labelledby="background"
            className="grid scroll-mt-28 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
          >
            <Reveal className="max-w-[68ch]">
              <span className="g-eyebrow">Background</span>
              <h2 id="background" className="g-title mt-3 text-2xl sm:text-[1.85rem]">
                Why the project exists
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Finding a performing-arts coach in San Jose del Monte often meant asking around.
                  A friend knew someone. A group chat had a recommendation. None of it was easy to
                  verify, and nothing kept a record of what was agreed.
                </p>
                <p>
                  The coaching is real and the talent is here. What was missing was the
                  infrastructure around it: somewhere to be found, a way to check a coach, and a
                  shared record of the session so neither side is relying on memory.
                </p>
                <p>
                  The capstone project set out to build that infrastructure as a working web
                  platform for the local performing arts community — not as a marketplace that takes
                  a cut of every session, and not as a directory of profiles alone.
                </p>
              </div>
            </Reveal>

            <Reveal variant="right" delay={80}>
              <aside
                aria-labelledby="purpose"
                className="relative overflow-hidden rounded-3xl border border-accent-border/30 bg-accent-soft/10 p-6"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-accent/10 bg-accent/5"
                  aria-hidden="true"
                />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-accent-border/30 bg-card/70 text-accent-text">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 id="purpose" className="relative mt-3 text-sm font-semibold text-foreground">
                  Project purpose
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {PROJECT_INFO.purpose}
                </p>
              </aside>
            </Reveal>
          </section>

          {/* ---- Survey findings ---- */}
          <section aria-labelledby="survey" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Research</span>
              <h2 id="survey" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                What the survey pointed to
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The project&apos;s 2025 capstone survey gathered 152 responses from performing artists
                in San Jose del Monte, Bulacan. These selected findings shaped the platform&apos;s
                direction.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border/40 bg-accent-soft/20 px-3 py-1.5 text-accent-text">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  152 responses
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-muted-foreground">
                  2025 capstone survey
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-muted-foreground">
                  Performing artists in San Jose del Monte, Bulacan
                </span>
              </div>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SURVEY_HIGHLIGHTS.map((finding, index) => (
                <li key={finding.question} className="min-w-0">
                  <Reveal delay={(index % 3) * 60} className="h-full">
                    <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:shadow-[var(--shadow-sm)]">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-border/30 bg-accent-soft/20 text-[11px] font-bold text-accent-text">
                          {index + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle-foreground">
                          Finding
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-foreground">
                        {finding.question}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {finding.stat}
                      </p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            <p className="mt-4 max-w-[66ch] text-xs leading-relaxed text-subtle-foreground">
              Source: {PROJECT_INFO.academicContext.institution} capstone survey, 152 respondents,
              2025. Figures are reproduced from the project&apos;s existing records and are not live
              platform analytics.
            </p>
          </section>

          {/* ---- Objectives ---- */}
          <section aria-labelledby="objectives" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Objectives</span>
              <h2 id="objectives" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                What the project set out to do
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The objectives below are reproduced from the project&apos;s existing record.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROJECT_INFO.objectives.map((objective, index) => (
                <li key={objective} className="min-w-0">
                  <Reveal delay={(index % 3) * 50} className="h-full">
                    <div className="group flex h-full gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:shadow-[var(--shadow-sm)]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-border/30 bg-accent-soft/20 text-sm font-bold text-accent-text">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground">{objective}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Development ---- */}
          <section aria-labelledby="development" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Development</span>
              <h2 id="development" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                Why it was built as a working platform
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The development purpose was to turn the research into a usable web application, not a
                static mock-up. The work focused on the workflows that connect a performer, a coach,
                and the platform administrator.
              </p>
            </Reveal>

            <ol className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
              {BUILD_STAGES.map((stage, index) => (
                <li key={stage.number} className="min-w-0">
                  <Reveal delay={index * 60} className="h-full">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5">
                      <div
                        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-bold tracking-[0.2em] text-accent-text">
                        {stage.number}
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{stage.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {stage.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <Reveal>
                  <h3 className="text-lg font-semibold text-foreground">Build focus</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    The platform was developed around three connected role-based experiences.
                  </p>
                </Reveal>

                <ul className="mt-4 space-y-3">
                  {DEVELOPMENT_POINTS.map((point, index) => {
                    const Icon = DEVELOPMENT_ICONS[point.title] ?? CheckCircle;
                    return (
                      <li key={point.title}>
                        <Reveal delay={index * 50}>
                          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">{point.title}</h4>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {point.body}
                              </p>
                            </div>
                          </div>
                        </Reveal>
                      </li>
                    );
                  })}
                </ul>

                <Reveal>
                  <h3 className="mt-8 text-sm font-semibold text-foreground">
                    Three role-based modules
                  </h3>
                </Reveal>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PROJECT_INFO.coreModules.map((module, index) => {
                    const Icon = MODULE_ICONS[module.name];
                    return (
                      <li key={module.name} className="min-w-0">
                        <Reveal delay={index * 50} className="h-full">
                          <div className="h-full rounded-2xl border border-border bg-card p-4">
                            {Icon && (
                              <Icon
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                            <h4 className="mt-3 text-sm font-semibold text-foreground">
                              {module.name}
                            </h4>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {module.description}
                            </p>
                          </div>
                        </Reveal>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Reveal variant="right" delay={80}>
                <aside className="relative overflow-hidden rounded-2xl border border-border bg-muted/30 p-5">
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/5"
                    aria-hidden="true"
                  />
                  <h3 className="relative flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Code className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Technology used
                  </h3>
                  <ul className="relative mt-4 space-y-3 text-sm text-muted-foreground">
                    {PROJECT_INFO.techStack.map((technology) => (
                      <li key={technology.name} className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        <span>{technology.name}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              </Reveal>
            </div>
          </section>

          {/* ---- Community support ---- */}
          <section aria-labelledby="community-support" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Community</span>
              <h2 id="community-support" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                How it is designed to support the scene
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The project is intended to support the local performing arts community by making
                coordination clearer and local coaches easier to find.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {COMMUNITY_SUPPORT.map((item, index) => (
                <li key={item.title} className="min-w-0">
                  <Reveal delay={index * 70} className="h-full">
                    <article className="group h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-border/40 hover:shadow-[var(--shadow-sm)]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors group-hover:border-accent-border/40 group-hover:bg-accent-soft/30 group-hover:text-accent-text">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
              These are the project&apos;s intended contributions, not measured outcomes or school
              endorsements.
            </p>
          </section>

          {/* ---- Scope and limitations ---- */}
          <section aria-labelledby="limitations" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">Scope</span>
              <h2 id="limitations" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                Project scope and limitations
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                As an academic project, GroovePH has deliberate boundaries. They are stated here so
                the platform&apos;s capabilities are not overstated.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PROJECT_INFO.limitations.map((limitation, index) => {
                const Icon = LIMITATION_ICONS[limitation.title];
                return (
                  <li key={limitation.title} className="min-w-0">
                    <Reveal delay={(index % 3) * 50} className="h-full">
                      <div className="h-full rounded-2xl border border-warning/30 bg-warning-soft/20 p-5">
                        {Icon && <Icon className="h-5 w-5 text-warning" aria-hidden="true" />}
                        <h3 className="mt-3 text-sm font-semibold text-foreground">
                          {limitation.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {limitation.description}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---- Team ---- */}
          <section aria-labelledby="team" className="scroll-mt-28">
            <Reveal className="max-w-[66ch]">
              <span className="g-eyebrow">People</span>
              <h2 id="team" className="g-title mt-3 mb-3 text-2xl sm:text-[1.85rem]">
                Project team and academic guidance
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Names and roles are reproduced from the project&apos;s existing records.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-muted-foreground">
                  {PROJECT_INFO.developers.length} capstone developers
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-muted-foreground">
                  {PROJECT_INFO.advisers.length} academic guides
                </span>
              </div>
            </Reveal>

            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <Reveal>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Capstone developers</h3>
                </Reveal>
                <ul className="space-y-3">
                  {PROJECT_INFO.developers.map((developer, index) => (
                    <li key={developer.name}>
                      <Reveal delay={index * 40}>
                        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent-border/30 bg-accent-soft/20 text-xs font-bold text-accent-text">
                            {initialsFor(developer.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-foreground">
                              {developer.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{developer.role}</p>
                          </div>
                        </div>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Reveal>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Academic guidance</h3>
                </Reveal>
                <ul className="space-y-3">
                  {PROJECT_INFO.advisers.map((adviser, index) => (
                    <li key={adviser.name}>
                      <Reveal delay={index * 40}>
                        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-accent-text">
                            <GraduationCap className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-foreground">
                              {adviser.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{adviser.role}</p>
                          </div>
                        </div>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ---- Cross-link back to the platform ---- */}
          <aside
            aria-labelledby="platform-link"
            className="relative overflow-hidden rounded-3xl border border-accent-border/30 bg-accent-soft/10 p-6 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-accent/15 bg-accent/5"
              aria-hidden="true"
            />
            <Reveal className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-[62ch]">
                <span className="g-eyebrow">The platform</span>
                <h2 id="platform-link" className="g-title mt-2 text-2xl">
                  GroovePH in practice
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This page covers the academic project. The public About page covers what GroovePH
                  does today, who it is for, and how to get in touch.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  About Groove
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/users"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Browse coaches
                </Link>
              </div>
            </Reveal>
          </aside>

          {/* ---- Student project notice ---- */}
          <section
            aria-labelledby="student-notice"
            className="rounded-3xl border border-border bg-muted/30 p-6 sm:p-8"
          >
            <h2 id="student-notice" className="text-sm font-semibold text-foreground">
              Student project notice
            </h2>
            <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              GroovePH is a student capstone project developed for academic purposes. It is not an
              official publication, product, or endorsement of STI College San Jose Del Monte.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
