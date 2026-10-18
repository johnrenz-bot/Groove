import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Compass,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Users,
  Code,
  Server,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { PROJECT_INFO } from '@/lib/config/projectInfo';

export const metadata: Metadata = {
  title: 'About Groove',
  description:
    'Groove is a BS Information Technology capstone project — a web-based performing arts hub for San Jose del Monte, Bulacan with smart chat support and studio locator.',
  alternates: { canonical: '/about' },
};

/**
 * WHY THIS IS A NEW PAGE AND NOT A REDIRECT
 *
 * The portals already have `/client/about` and `/coach/about`. Those are
 * per-role, and they are left exactly where they are. This is the public,
 * signed-out-facing answer to "what is this place and who is behind it" — the
 * question a visitor has before they have an account, and the one the header's
 * "About Groove" link sends every role here.
 *
 * The four numbered steps below are the same four a member actually goes through:
 * find, agree, book, show up. Keeping them to four is deliberate — a longer
 * "how it works" is a page nobody finishes.
 */
const STEPS = [
  {
    icon: Search,
    title: 'Find',
    body: 'Browse the directory or a discipline page. Every coach has been verified, and their specialism, rate and location are on the card before you message anyone.',
  },
  {
    icon: MessageSquare,
    title: 'Agree',
    body: 'Message a coach to talk terms. Nothing is charged and nothing is locked in yet — you are agreeing on what the session will be.',
  },
  {
    icon: CalendarCheck,
    title: 'Book',
    body: 'Confirm the slot. The digital session agreement, the fee and the schedule are all created together, so there is one record of what was agreed.',
  },
  {
    icon: Compass,
    title: 'Show up',
    body: 'The session happens, and it shows up in your calendar. Repeating with the same coach is one click from the profile.',
  },
];

const VALUES = [
  {
    title: 'Verified, not curated by hand-waving',
    body: 'A coach is verified against a standard before they appear in the directory. It is not a badge anyone can claim.',
  },
  {
    title: 'One record of what was agreed',
    body: 'The session agreement, the fee and the schedule live together. Disagreements are rare when everyone can read the same thing.',
  },
  {
    title: 'Built for the Philippine scene',
    body: 'Staged around how performing-arts work actually happens here — studio classes, freelance coaches, school productions and community crews.',
  },
];

// Icons for coreModules (not stored in projectInfo to keep it plain data)
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Super Admin Console': Server,
  'Performing Artist (Coach/Choreographer)': Users,
  'Client (Performer/Student)': GraduationCap,
};

// Icons for techStack (not stored in projectInfo to keep it plain data)
const TECH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Next.js 14+ (App Router)': Code,
  'React 18 + TypeScript': Code,
  'Supabase (PostgreSQL + Auth + Realtime + Storage)': Server,
  'Tailwind CSS + Custom Design System': Code,
  'Leaflet + OpenStreetMap (Studio Locator)': Globe,
  'Google Gemini (Groovey AI)': Server,
  'Vercel (Deployment)': Globe,
};

// Icons for limitations (not stored in projectInfo to keep it plain data)
const LIMITATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'No Payment Processing': XCircle,
  'Geographic Focus': Globe,
  'No Push/Email Notifications': AlertTriangle,
  'No Achievement/Badge System': XCircle,
  'Limited Offline Support': AlertTriangle,
  'Single-Language Primary': Globe,
};

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* ---- Hero ---- */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
          <span className="g-eyebrow mb-4 inline-flex">
            <GraduationCap className="h-3 w-3 mr-1.5" aria-hidden="true" />
            Capstone Project
          </span>
          <h1 className="g-display max-w-[24ch]">
            GroovePH — Performing Arts Hub for San Jose del Monte
          </h1>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            A BS Information Technology capstone project from STI College San Jose Del Monte.
            Connecting performers with verified coaches, rehearsal studios, and smart chat support —
            all in one platform.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              BSIT Capstone 2025
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              San Jose del Monte, Bulacan
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Web-Based Platform
            </span>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/users"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px"
            >
              Browse Coaches
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/register/coach"
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Teach on Groove
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
        {/* ---- Project Identity ---- */}
        <section aria-labelledby="project-identity" className="mb-16 max-w-[68ch]">
          <h2 id="project-identity" className="g-title text-2xl flex items-center gap-2">
            <Code className="h-5 w-5 text-accent-text" aria-hidden="true" />
            Project Identity
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">
              <strong>{PROJECT_INFO.fullName}</strong>
            </p>
            <p>
              <strong>Short name:</strong> {PROJECT_INFO.shortName} &nbsp;|&nbsp;
              <strong>Type:</strong> {PROJECT_INFO.academicContext.type} &nbsp;|&nbsp;
              <strong>Degree:</strong> {PROJECT_INFO.academicContext.degree} &nbsp;|&nbsp;
              <strong>Institution:</strong> {PROJECT_INFO.academicContext.institution} &nbsp;|&nbsp;
              <strong>Year:</strong> {PROJECT_INFO.academicContext.year}
            </p>
            <p>{PROJECT_INFO.purpose}</p>
          </div>
        </section>

        {/* ---- Objectives ---- */}
        <section aria-labelledby="objectives" className="mb-16">
          <h2 id="objectives" className="g-title mb-6 text-2xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
            Objectives
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_INFO.objectives.map((obj, idx) => (
              <li key={idx} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground">
                  {idx + 1}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{obj}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Core Modules ---- */}
        <section aria-labelledby="core-modules" className="mb-16">
          <h2 id="core-modules" className="g-title mb-6 text-2xl flex items-center gap-2">
            <Server className="h-5 w-5 text-accent-text" aria-hidden="true" />
            Core Modules
          </h2>
          <p className="mb-6 max-w-[62ch] text-sm text-muted-foreground">
            Three role-based portals, each tailored to its users' workflows.
          </p>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PROJECT_INFO.coreModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.name];
              return (
                <li key={mod.name} className="rounded-2xl border border-border bg-card p-5">
                  {Icon && <Icon className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                  <h3 className="text-sm font-semibold text-foreground">{mod.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mod.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- Key Features ---- */}
        <section aria-labelledby="key-features" className="mb-16">
          <h2 id="key-features" className="g-title mb-6 text-2xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
            Key Features
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_INFO.keyFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted-foreground">{feat}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- System Limitations ---- */}
        <section aria-labelledby="limitations" className="mb-16">
          <h2 id="limitations" className="g-title mb-6 text-2xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            System Limitations (Transparent Disclosure)
          </h2>
          <p className="mb-6 max-w-[62ch] text-sm text-muted-foreground">
            As a capstone project, GroovePH has deliberate scope boundaries. The following are not currently implemented:
          </p>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROJECT_INFO.limitations.map((lim) => {
              const Icon = LIMITATION_ICONS[lim.title];
              return (
                <li key={lim.title} className="rounded-2xl border border-warning/30 bg-warning-soft/20 p-5">
                  {Icon && <Icon className="mb-3 h-5 w-5 text-warning" aria-hidden="true" />}
                  <h3 className="text-sm font-semibold text-foreground">{lim.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lim.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- Survey Statistics ---- */}
        <section aria-labelledby="survey-stats" className="mb-16">
          <h2 id="survey-stats" className="g-title mb-6 text-2xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent-text" aria-hidden="true" />
            Survey Statistics (152 Respondents)
          </h2>
          <p className="mb-6 max-w-[62ch] text-sm text-muted-foreground">
            Key findings from the capstone survey that informed GroovePH's design.
            Source: STI College San Jose Del Monte Capstone Survey, 152 respondents, 2025.
          </p>
          <dl className="space-y-3">
            {PROJECT_INFO.surveyStats.map((stat, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <dt className="text-sm font-semibold text-foreground">{stat.question}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{stat.stat}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- Tech Stack ---- */}
        <section aria-labelledby="tech-stack" className="mb-16">
          <h2 id="tech-stack" className="g-title mb-6 text-2xl flex items-center gap-2">
            <Code className="h-5 w-5 text-accent-text" aria-hidden="true" />
            Technology Stack
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PROJECT_INFO.techStack.map((tech) => {
              const Icon = TECH_ICONS[tech.name];
              return (
                <li key={tech.name} className="group flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-muted">
                  <span>{tech.name}</span>
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- Disciplines ---- */}
        <section aria-labelledby="disciplines" className="mb-16">
          <h2 id="disciplines" className="g-title mb-6 text-2xl">
            What We Cover
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Dance', href: '/community/performing-arts/dance' },
              { label: 'Singing', href: '/community/performing-arts/singing' },
              { label: 'Acting', href: '/community/performing-arts/acting' },
              { label: 'Theater', href: '/community/performing-arts/theater' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-muted"
              >
                {item.label}
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ---- Development Team ---- */}
        <section aria-labelledby="team" className="mb-16">
          <h2 id="team" className="g-title mb-6 text-2xl flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-text" aria-hidden="true" />
            Development Team & Advisers
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Capstone Developers</h3>
              <ul className="space-y-3">
                {PROJECT_INFO.developers.map((dev) => (
                  <li key={dev.name} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-accent-text">
                      <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{dev.name}</p>
                      <p className="text-sm text-muted-foreground">{dev.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Academic Advisers</h3>
              <ul className="space-y-3">
                {PROJECT_INFO.advisers.map((adv) => (
                  <li key={adv.name} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-accent-text">
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{adv.name}</p>
                      <p className="text-sm text-muted-foreground">{adv.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- Story (Preserved) ---- */}
        <section aria-labelledby="story" className="mb-16 max-w-[68ch]">
          <h2 id="story" className="g-title text-2xl">
            Our Story
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Groove started from a simple frustration: finding a good performing-arts coach
              here mostly meant asking around. A friend knew someone. A group chat had a
              recommendation. None of it was verifiable, none of it recorded anything, and
              none of it told you whether the coach was any good.
            </p>
            <p>
              The coaching is real and the talent is here — what was missing was the
              infrastructure around it. Somewhere to be found, something that says a coach has
              been checked, and a record of what was agreed so neither side is relying on
              memory.
            </p>
            <p>
              That is what this is. Not a marketplace trying to take a cut of every session,
              and not a directory of profiles. A booking system for a scene that already
              exists.
            </p>
          </div>
        </section>

        {/* ---- Mission (Preserved) ---- */}
        <section aria-labelledby="mission" className="mb-16">
          <h2 id="mission" className="g-title mb-6 text-2xl">
            Our Mission
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {VALUES.map((value) => (
              <li
                key={value.title}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <ShieldCheck className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- How it works (Preserved) ---- */}
        <section aria-labelledby="how" className="mb-16">
          <h2 id="how" className="g-title mb-2 text-2xl">
            How It Works
          </h2>
          <p className="mb-6 max-w-[62ch] text-sm text-muted-foreground">
            Four steps, whether you are booking a one-off session or a run of weekly classes.
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-border bg-card p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground">
                  {index + 1}
                </span>
                <step.icon className="mt-4 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Contact (Updated) ---- */}
        <section
          aria-labelledby="contact"
          className="rounded-3xl border border-border bg-card p-6 sm:p-10"
        >
          <h2 id="contact" className="g-title text-2xl">
            Contact
          </h2>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            For support, partnerships, or to have a coach profile reviewed, get in touch.
          </p>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  <a href="mailto:grooveyyph@gmail.com" className="font-semibold text-accent-text hover:underline underline-offset-2">
                    grooveyyph@gmail.com
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  Based in
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  San Jose del Monte, Bulacan — with coaches across the Philippines.
                </dd>
              </div>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-subtle-foreground">
            Already have an account? Reach us through{' '}
            <Link href="/messages" className="underline underline-offset-4 hover:text-foreground">
              Messages
            </Link>{' '}
            so the reply reaches you.
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}