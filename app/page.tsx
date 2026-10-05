'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MessageSquare,
  MapPin,
  Bot,
  Users,
  Handshake,
  Sparkles,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Award,
  Music,
  Drama,
  Theater,
  Compass,
  ClipboardCheck,
  PenLine,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ImageCard } from '@/components/shared/ImageCard';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard, NumberedStep } from '@/components/shared/StatCard';
import { Reveal } from '@/components/shared/Reveal';
import { StudioLocator } from '@/components/studio/StudioLocator';

/* ─── Content ─── */

interface TalentDetail {
  title: string;
  /** One short line, always visible under the title. */
  tagline: string;
  image: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

const TALENT_DETAILS: Record<string, TalentDetail> = {
  Dance: {
    title: 'Dance & Choreography',
    tagline: 'Hip-Hop to Ballet',
    image: '/image/wc/dance.jpg',
    description:
      'Connect with expert choreographers and dancers specializing in Hip-Hop, Contemporary, Ballet, Ballroom, K-Pop, and traditional folk dances.',
    highlights: [
      'Solo & Group Choreography',
      'Rehearsal Preparation',
      'Technique Refinement',
      'Audition Coaching',
    ],
    icon: <Music className="h-5 w-5" />,
  },
  Singing: {
    title: 'Vocal Performance & Coaching',
    tagline: 'Pop to Musical Theater',
    image: '/image/wc/singg.png',
    description:
      'Train your vocals across Pop, R&B, Classical, Acoustic, and Musical Theater with experienced vocal coaches.',
    highlights: [
      'Breath Control & Range',
      'Pitch Precision',
      'Stage Presence & Mic Technique',
      'Harmony & Arrangement',
    ],
    icon: <Music className="h-5 w-5" />,
  },
  Acting: {
    title: 'Acting & Stage Craft',
    tagline: 'Method to screen presence',
    image: '/image/wc/acting.jpg',
    description:
      'Learn method acting, improvisation, audition preparation, and screen presence from accomplished theatre and TV artists.',
    highlights: [
      'Character Development',
      'Script Analysis',
      'Monologue Coaching',
      'Camera & Screen Techniques',
    ],
    icon: <Drama className="h-5 w-5" />,
  },
  Theater: {
    title: 'Theater & Production',
    tagline: 'Stagecraft & direction',
    image: '/image/wc/theater.jpg',
    description:
      'Immerse yourself in full stagecraft, musical theater production, stage management, and performance directing.',
    highlights: [
      'Musical Theater Execution',
      'Stage Direction',
      'Collaborative Ensembles',
      'Live Show Discipline',
    ],
    icon: <Theater className="h-5 w-5" />,
  },
};

const FEATURES = [
  {
    icon: <Bot className="h-5 w-5" />,
    title: 'AI Chat Assistant',
    description:
      'Instant answers about bookings, coach bios, pricing, and platform policies — powered by modern AI, available 24/7.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Verified Coaches',
    description:
      'Browse vetted instructors with verified credentials, portfolios, transparent rates, and authentic client reviews.',
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: 'Studio Locator',
    description:
      'Find, evaluate, and navigate to rehearsal spaces and dance studios across San Jose del Monte with map precision.',
  },
  {
    icon: <Handshake className="h-5 w-5" />,
    title: 'Digital Contracts',
    description:
      'Sign secure digital session agreements with e-signatures, and stay connected through community performance posts.',
  },
];

const STATS = [
  {
    value: '78.9%',
    label: 'Finding Coaches',
    description:
      'Of local artists in San Jose del Monte reported difficulty finding available and qualified coaches or choreographers.',
    icon: <Search className="h-5 w-5" />,
  },
  {
    value: '82.2%',
    label: 'Communication Delays',
    description:
      'Experienced delays receiving responses when inquiring about coach rates, availability, or session scheduling.',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    value: '86.8%',
    label: 'Studio Accessibility',
    description:
      'Encountered difficulty locating nearby rehearsal studios and practice facilities within preferred distances.',
    icon: <MapPin className="h-5 w-5" />,
  },
];

const STEPS = [
  {
    step: 1,
    title: 'Create your profile',
    description:
      'Sign up as a performer or a coach. Add your disciplines, rates, availability, and portfolio in a few minutes.',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    step: 2,
    title: 'Discover and book',
    description:
      'Search verified coaches by discipline, compare rates and reviews, then request a session that fits your schedule.',
    icon: <Compass className="h-5 w-5" />,
  },
  {
    step: 3,
    title: 'Perform together',
    description:
      'Confirm the agreement with a digital signature, coordinate in the studio, and grow your craft with the community.',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
];

/**
 * Hero trust strip. Derived entirely from the constants above, so the numbers
 * can never drift from the content they describe.
 */
const HERO_METRICS = [
  {
    value: String(Object.keys(TALENT_DETAILS).length),
    label: 'Disciplines',
    detail: 'Dance, singing, acting & theater',
  },
  {
    value: 'Live',
    label: 'Studio discovery',
    detail: 'OpenStreetMap, mapped around SJDM',
  },
  {
    value: String(FEATURES.length),
    label: 'Platform tools',
    detail: 'Booking, contracts & chat',
  },
];

/* ─── Component ─── */

export default function WelcomePage() {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TalentDetail | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleModalOpen(false);
        setSelectedTalent(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PublicLayout transparentNav onCtaClick={() => setRoleModalOpen(true)}>
      {/* ══════════════ HERO — full-bleed cinematic, always dark ══════════════
          Always dark regardless of theme, because the photograph is: inverting
          it in light mode would mean a washed-out grey stage. The scrims below
          are functional (they carry text contrast over an unpredictable image),
          not decoration, so this stays one of the few places a gradient is the
          right tool. */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-theater.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Left-weighted scrim for the text column. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/94 via-black/78 to-black/40"
          />
          {/* Vertical scrim to seat the section against the next one. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60"
          />
          {/* Single warm key light, top-left, echoing the gold accent. One
              source, low opacity -- a stage wash, not a gradient mesh. */}
          <div
            aria-hidden="true"
            className="absolute -left-40 -top-56 h-[520px] w-[520px] rounded-full bg-accent/10 blur-[120px]"
          />
        </div>

        <div className="g-container pb-24 pt-24 sm:pb-32 sm:pt-32 lg:pb-40 lg:pt-40">
          <div className="max-w-3xl">
            <span className="g-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Performing Arts Platform
            </span>

            {/* Fluid type scale: one clamp instead of four breakpoints, so the
                headline never jumps size on the way from tablet to desktop. */}
            <h1 className="g-fade-up g-fade-up-1 mt-7 text-[clamp(2.5rem,7.2vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.035em] text-white">
              Discover, connect,
              <br />
              and perform with{' '}
              <span className="text-accent">Groove</span>
            </h1>

            <p className="g-fade-up g-fade-up-2 mt-7 max-w-xl text-base leading-relaxed text-white/72 sm:text-lg">
              Groove connects talented artists, verified coaches, and rehearsal studios in San
              Jose del Monte, Bulacan — one place to find your coach, book the studio, and sign the
              agreement.
            </p>

            {/* Primary action is the only filled gold element on the page. The
                secondary is a bordered ghost so the hierarchy is unambiguous. */}
            <div className="g-fade-up g-fade-up-3 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={() => setRoleModalOpen(true)}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
                className="h-[3.25rem] px-7 text-[15px] shadow-[var(--shadow-accent)]"
              >
                Get started free
              </Button>
              <Link href="#talent" className="sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-[3.25rem] w-full border-white/25 bg-white/[0.06] px-7 text-[15px] text-white backdrop-blur-sm transition hover:border-white/45 hover:bg-white/[0.11] sm:w-auto"
                >
                  Explore disciplines
                </Button>
              </Link>
            </div>

            <div className="g-fade-up g-fade-up-4 mt-9 flex items-center gap-2 text-xs text-white/60">
              <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Built for the San Jose del Monte performing arts community
            </div>
          </div>

          {/* Trust strip. A single band divided by hairlines rather than three
              floating cards -- three separate cards here read as three competing
              claims instead of one summary. */}
          <dl className="g-fade-up g-fade-up-5 mt-16 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/10 backdrop-blur-md sm:grid-cols-3">
            {HERO_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="bg-black/45 px-5 py-5 transition-colors duration-300 hover:bg-black/60"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  {metric.label}
                </dt>
                <dd>
                  <span className="mt-1.5 block text-[26px] font-bold leading-none tabular-nums tracking-[-0.03em] text-white">
                    {metric.value}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-white/60">
                    {metric.detail}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Scroll cue. Hidden from assistive tech: it is decoration, and the
            section below it is reachable by keyboard anyway. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-7 hidden justify-center lg:flex"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50">
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </span>
        </div>
      </section>

      {/* ══════════════ DISCIPLINES ══════════════ */}
      <section id="talent" className="g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="Disciplines"
            title="Four disciplines, one community"
            subtext="Connect and collaborate across dance, singing, acting, and theater with verified instructors."
          />

          {/* Coach Directory treatment: photo fills the card, one bottom
              gradient, title + one short line always visible, longer
              description revealed from the bottom on hover (and permanently on
              touch). The card itself is the button — the old separate
              "Explore" button duplicated this exact click target. */}
          <Reveal className="g-reveal-stagger mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(TALENT_DETAILS).map(([key, details]) => (
              <ImageCard
                key={key}
                overlay
                aspect="aspect-[3/4]"
                image={details.image}
                alt={details.title}
                name={details.title}
                subtitle={details.tagline}
                description={details.description}
                onActivate={() => setSelectedTalent(details)}
                badges={
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"
                  >
                    {details.icon}
                  </span>
                }
              />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ══════════════ STATS + MISSION / VISION ══════════════ */}
      <section id="about" className="g-section-alt g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="Why Groove"
            title="Built on real community pain points"
            subtext="We surveyed local artists in San Jose del Monte to understand what was holding performers back."
          />

          <Reveal className="g-reveal-stagger mt-14 grid gap-5 md:grid-cols-3">
            {STATS.map((stat) => (
              <StatCard
                key={stat.label}
                value={stat.value}
                label={stat.label}
                description={stat.description}
                icon={stat.icon}
                accent
              />
            ))}
          </Reveal>

          <Reveal className="mt-6 grid gap-5 md:grid-cols-2">
            {[
              {
                label: 'Our mission',
                text: 'To create accessible opportunities for performers to showcase their talents and offer professional services by directly resolving the hurdles of finding coaches, delayed responses, and limited studio access.',
              },
              {
                label: 'Our vision',
                text: 'To develop a unified, supportive digital ecosystem for the performing arts community that elevates standards, empowers coaches, and inspires emerging artists to thrive creatively and professionally.',
              },
            ].map((block) => (
              <div key={block.label} className="g-card g-card-hover h-full p-7 sm:p-8">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-px w-8 bg-accent" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
                    {block.label}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ══════════════ STUDIO LOCATOR — live OpenStreetMap data ══════════════
          This section used to render three hardcoded "partner studios" with
          invented names, invented descriptions and invented hourly rates
          (three different peso-per-hour figures), next to a Google Maps embed
          iframe hardcoded to a "DANCE studio" search. None of that was real:
          there is no studio table, and no such directory existed to be listed.

          It is now the same <StudioLocator> the dashboards use, backed by
          /api/studios -> the OpenStreetMap Overpass API. Every name, distance
          and link on the page is a real search result. No price, rating,
          review or description is shown, because none of those exist in the
          source data and inventing them is exactly what this replaces. */}
      <section id="studios" className="g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="Studio locator"
            title="Find a rehearsal space near you"
            subtext="Live results from OpenStreetMap for dance studios, performing arts venues, and rehearsal spaces around San Jose del Monte, Bulacan. Narrow by distance, then open a result to see exactly where it is."
          />

          <Reveal className="mt-12">
            <StudioLocator
              id="studio-locator"
              title="Rehearsal spaces near San Jose del Monte"
              subtitle="Live OpenStreetMap results — distances are measured from your chosen centre"
            />
          </Reveal>

          <p className="mt-5 text-center text-xs text-subtle-foreground">
            Listings come from the OpenStreetMap community, not from Groove, and carry no price or
            rating data. Confirm hours, fees and access directly with the venue before you book.
          </p>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section id="how" className="g-section-alt g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="How it works"
            title="Three steps to your next stage"
            subtext="From profile to performance, Groove keeps the whole process in one place."
          />

          <Reveal className="g-reveal-stagger mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <NumberedStep
                key={step.step}
                step={step.step}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="services" className="g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="Platform"
            title="Everything you need to perform"
            subtext="Tools built specifically for the performing arts community."
          />

          <Reveal className="g-reveal-stagger mt-14 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="g-card g-card-hover group flex items-start gap-4 p-6 sm:p-7"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text transition-transform duration-200 group-hover:scale-105"
                >
                  {feature.icon}
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="g-section-alt g-section">
        <div className="g-container">
          <div className="g-card relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
            {/* Subtle ambient gold glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30"
            >
              <div className="h-[280px] w-[500px] rounded-full bg-accent/20 blur-[90px]" />
            </div>
            <div className="relative mx-auto max-w-xl space-y-5">
              <span className="g-eyebrow">
                <PenLine className="h-3 w-3" aria-hidden="true" />
                Get started
              </span>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
                Ready to find your groove?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Create an account and start connecting with performers, coaches, and rehearsal
                studios today.
              </p>
              <div className="flex flex-col justify-center gap-3 pt-1 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => setRoleModalOpen(true)}
                  trailingIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Create account
                </Button>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicLayoutFooterExtra />

      {/* ══════════════ MODALS ══════════════ */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Join Groove"
        description="Choose how you want to join the performing arts community."
        size="xl"
      >
        <div className="group/modal-cards grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="transition-all duration-300 group-hover/modal-cards:opacity-60 hover:!opacity-100 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75 fill-mode-both">
            <ImageCard
              overlay
              href="/register/client"
              aspect="aspect-[3/4] sm:aspect-[4/5] min-h-[360px] sm:min-h-[420px]"
              image="/image/login/arti.jpg"
              alt="Client / Performer registration"
              name="Client / Performer"
              subtitle="Discover coaches and book studio rehearsals"
              badges={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <Users className="h-3.5 w-3.5 text-accent" /> Performer
                </span>
              }
              continuePill="Continue as Client"
            />
          </div>
          <div className="transition-all duration-300 group-hover/modal-cards:opacity-60 hover:!opacity-100 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150 fill-mode-both">
            <ImageCard
              overlay
              href="/register/coach"
              aspect="aspect-[3/4] sm:aspect-[4/5] min-h-[360px] sm:min-h-[420px]"
              image="/image/login/choreo.jpg"
              alt="Coach / Choreographer registration"
              name="Coach / Choreographer"
              subtitle="List your rates and mentor performers"
              badges={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <Award className="h-3.5 w-3.5 text-accent" /> Coach
                </span>
              }
              continuePill="Continue as Coach"
            />
          </div>
        </div>

        <p className="mt-6 border-t border-divider pt-5 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent-text hover:underline underline-offset-4"
            onClick={() => setRoleModalOpen(false)}
          >
            Sign in
          </Link>
        </p>
      </Modal>

      <Modal
        open={!!selectedTalent}
        onClose={() => setSelectedTalent(null)}
        title={selectedTalent?.title}
        description={selectedTalent?.description}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTalent(null)}>
              Close
            </Button>
            <Link href="/login" onClick={() => setSelectedTalent(null)}>
              <Button size="sm">Sign in to book a coach</Button>
            </Link>
          </>
        }
      >
        {selectedTalent && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
              Coaching focus areas
            </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedTalent.highlights.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-3 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
          </div>
        )}
      </Modal>
    </PublicLayout>
  );
}

/** Footer child: back-to-top pill. */
function PublicLayoutFooterExtra() {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
