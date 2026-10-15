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
} from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';

export const metadata: Metadata = {
  title: 'About Groove',
  description:
    'Groove is a performing-arts platform for the Philippines: find a verified coach, book a session, and keep the agreement, the fee and the schedule in one place.',
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

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* ---- Hero ---- */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
          <span className="g-eyebrow mb-4 inline-flex">About</span>
          <h1 className="g-display max-w-[20ch]">A place for the people who make the show happen.</h1>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            Groove is a performing-arts platform built in the Philippines, for coaches and the
            people who train with them. Find a verified coach, agree on a session, and keep
            the terms, the fee and the schedule in one place.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/users"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground transition-transform hover:-translate-y-px"
            >
              Browse coaches
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
        {/* ---- Story ---- */}
        <section aria-labelledby="story" className="mb-16 max-w-[68ch]">
          <h2 id="story" className="g-title text-2xl">
            Our story
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

        {/* ---- Mission ---- */}
        <section aria-labelledby="mission" className="mb-16">
          <h2 id="mission" className="g-title mb-6 text-2xl">
            Our mission
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

        {/* ---- How it works ---- */}
        <section aria-labelledby="how" className="mb-16">
          <h2 id="how" className="g-title mb-2 text-2xl">
            How it works
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

        {/* ---- Disciplines ---- */}
        <section aria-labelledby="disciplines" className="mb-16">
          <h2 id="disciplines" className="g-title mb-6 text-2xl">
            What we cover
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

        {/* ---- Contact ---- */}
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
                  {/* PLACEHOLDER — replace with the real support address. Nothing
                      in the repository carries one today, and an invented address
                      on a contact page is worse than an obvious gap: it would
                      bounce. `/messages` below is the working route meanwhile. */}
                  <span className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-xs">
                    support address to be added
                  </span>
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
