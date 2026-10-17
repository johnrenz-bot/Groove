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
  Calendar,
  CalendarDays,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ImageCard } from '@/components/shared/ImageCard';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { NumberedStep } from '@/components/shared/StatCard';
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

const PERFORMER_FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Browse Coaches',
    description:
      'Discover verified coaches by discipline, compare their rates and reviews, and book the right mentor for your craft.',
    href: '/client/talent',
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: 'Book Appointments',
    description:
      'Request rehearsal sessions, confirm agreements with a digital signature, and track every booking in one place.',
    href: '/client/appointments',
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: 'Manage Calendar',
    description:
      'Organize your rehearsal schedule, view upcoming sessions at a glance, and never miss an important practice date.',
    href: '/client/calendar',
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: 'AI Chat Assistant (Groovey)',
    description:
      'Get instant answers about bookings, coach bios, pricing, and platform policies from Groovey AI — available 24/7.',
    href: '/client/groovey',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Direct Messages',
    description:
      'Message coaches directly to clarify session details, discuss rates, and coordinate rehearsal logistics in real time.',
    href: '/messages',
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: 'Studio Locator',
    description:
      'Find rehearsal spaces and performing arts venues near San Jose del Monte, Bulacan — curated and community listings.',
    href: '/#studios',
  },
];

const COACH_FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Showcase Feed',
    description:
      'Browse performer talent posts from local artists, discover emerging students, and find the right fit for your coaching style.',
    href: '/coach/talents',
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: 'Manage Appointments',
    description:
      'Review incoming session requests, confirm or reschedule bookings, and maintain a clear record of all your engagements.',
    href: '/coach/appointments',
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: 'Session Calendar',
    description:
      'Track your full teaching schedule in one visual calendar, so you always know what is coming up and can plan ahead.',
    href: '/coach/calendar',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Find Performers',
    description:
      'Connect with local talent seeking coaching in your discipline. Review profiles, specialties, and availability at a glance.',
    href: '/coach/talents',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Direct Messages',
    description:
      'Communicate with performers to discuss session details, negotiate rates, and coordinate rehearsal logistics seamlessly.',
    href: '/messages',
  },
  {
    icon: <Award className="h-5 w-5" />,
    title: 'Build Your Reputation',
    description:
      'Collect verified reviews, showcase your credentials, and grow your coaching practice within the local arts community.',
    href: '/coach/profile',
  },
];

/* ─── Component ─── */

export default function LandingPage() {
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    // Prefetch dashboard routes so logged-in users who click "Get started"
    // land on a fast-loading page.
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/client/home';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleGetStarted = () => {
    setShowRoleModal(true);
  };

  return (
    /* Forced dark: the landing page always renders the dark palette,
       ignoring the visitor's Light/Dark/System choice. The
       `data-public-theme="dark"` attribute uses a high-specificity
       selector (0,2,0) in globals.css that beats `.light` on <html>
       (0,1,0), so it wins even when the dashboard has set the light theme.
       It never touches localStorage or <html>, so dashboards keep switching
       normally. Guests never see a theme toggle (Header/UserMenu/drawer render
       it only for signed-in users, and the footer toggle is off here). */
    <div data-public-theme="dark" className="groove-landing">
    <PublicLayout>
      {/* ─── Hero (keeps /image/bg/hero-theater.jpg) ─── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/image/bg/hero-theater.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0D]/90 via-[#0B0B0D]/55 to-[#0B0B0D]/95" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D]/70 via-transparent to-[#0B0B0D]/40" />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/3 h-72 w-[42rem] max-w-none -translate-x-1/2 rounded-full bg-[#F5B52E]/10 blur-[120px]"
          />
        </div>

        <div className="mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8">
          <p className="gl-hero-badge mb-7">
            <span className="gl-dot" aria-hidden="true" />
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Groove · Performing Arts Platform
          </p>

          <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.06] tracking-tight text-[#F7F5F0] sm:text-6xl lg:text-7xl">
            Discover, connect, and{' '}
            <span className="gl-headline-accent">perform with Groove</span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#F7F5F0]/80 sm:text-lg lg:text-xl">
            The performing arts platform for San Jose del Monte.
            Find coaches, book rehearsals, sign contracts, and grow your craft — all in one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="#disciplines" className="gl-btn-gold">
              Explore disciplines
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleGetStarted}
              trailingIcon={<ArrowRight className="h-5 w-5" />}
              className="border-white/20 bg-white/[0.07] px-8 py-4 text-base text-white backdrop-blur-md hover:border-[#F5B52E]/50 hover:bg-white/[0.12] hover:text-white"
            >
              Get started free
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-[0.16em] text-white/55">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#F5B52E]" aria-hidden="true" />
              Verified coaches
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#F5B52E]" aria-hidden="true" />
              Studio locator
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#F5B52E]" aria-hidden="true" />
              Digital contracts
            </span>
          </div>
        </div>

        <a
          href="#disciplines"
          aria-label="Scroll to disciplines"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-white/50 transition-colors hover:text-[#F5B52E] sm:block"
        >
          <ArrowDown className="h-5 w-5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </a>
      </section>

      {/* ─── Role Selection Modal ─── */}
      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              How would you like to join Groove?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose the path that fits you. You can always explore both sides later.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/register/client"
                className="g-card group flex flex-col gap-3 rounded-2xl p-5 transition-all hover:border-accent"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text transition-transform group-hover:scale-105">
                  <Users className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-bold text-foreground">I&apos;m a Performer</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Find coaches, book rehearsals, and grow your craft with the right mentor.
                  </p>
                </div>
              </Link>
              <Link
                href="/register/coach"
                className="g-card group flex flex-col gap-3 rounded-2xl p-5 transition-all hover:border-accent"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text transition-transform group-hover:scale-105">
                  <Award className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-bold text-foreground">I&apos;m a Coach</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Share your expertise, manage your schedule, and grow your coaching practice.
                  </p>
                </div>
              </Link>
            </div>
          </div>
      </Modal>

      {/* ─── Disciplines ─── */}
      <section id="disciplines" className="g-section mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="Disciplines"
            title="Every performing art has a home here"
            subtext="From hip-hop to ballet, vocal coaching to stage direction — find the right discipline and the right people to grow with."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(TALENT_DETAILS).map(([key, detail]) => (
            <Reveal key={key} className="g-reveal-stagger">
              <div className="g-card group relative h-80 overflow-hidden rounded-2xl sm:h-[22rem]">
                <Image
                  src={detail.image}
                  alt={detail.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                    {detail.icon}
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    {detail.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/70">
                    {detail.tagline}
                  </p>

                  <div className="grid grid-rows-[0fr] transition-all duration-500 group-hover:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="pt-3 text-sm leading-relaxed text-white/90">
                        {detail.description}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {detail.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-2 text-xs text-white/80">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="gl-band g-section">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <SectionHeader
              eyebrow="Why Groove"
              title="Built for real challenges in our local arts scene"
              subtext="We surveyed local performers and coaches to understand their biggest frustrations — then built Groove to solve them."
            />
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="gl-card-dark g-card-hover flex h-full flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="gl-icon-tile">
                    {stat.icon}
                  </span>
                  <span className="gl-stat-num text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                    {stat.value}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F7F5F0]">{stat.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#A6A3A0]">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Reveal className="g-reveal-stagger mt-10 text-center">
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              These results come from a community survey of students, choreographers, and
              performers in San Jose del Monte. Groove was designed from day one to address
              the three biggest friction points: discovery, communication, and space.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Studio Locator ─── */}
      <section id="studios" className="g-section mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="Studio Locator"
            title="Find rehearsal spaces near you"
            subtext="Browse curated listings and community-submitted studios across San Jose del Monte. Filter by discipline, capacity, and distance."
          />
        </Reveal>

        <Reveal className="g-reveal-stagger mt-14">
          <StudioLocator />
        </Reveal>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how" className="gl-band g-section scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <SectionHeader
              eyebrow="How it works"
              title="From discovery to performance in three steps"
              subtext="Groove makes it simple to find the right coach, book a session, and sign your agreement — all in one place."
            />
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <NumberedStep key={step.step} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Features ─── */}
      <section className="g-section mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="Platform features"
            title="Everything you need to perform at your best"
            subtext="Powerful tools designed for the performing arts community — from AI assistance to digital contracts."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Reveal key={feature.title} className="g-reveal-stagger">
              <div className="g-card g-card-hover flex h-full flex-col gap-4 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  {feature.icon}
                </span>
                <div className="space-y-1.5">
                  <h3 className="font-bold tracking-tight text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="gl-band g-section">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <SectionHeader
              eyebrow="Testimonials"
              title="Loved by performers and coaches alike"
              subtext="Hear from the artists and instructors who use Groove every day."
            />
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                quote:
                  'Groove made it so easy to find a choreographer for my dance team. The booking process is seamless, and the contracts give us peace of mind.',
                name: 'Aira Mae S.',
                role: 'Dance Troupe Leader',
                avatar: '/image/wc/testimonial1.jpg',
              },
              {
                quote:
                  "As a vocal coach, I used to spend hours coordinating sessions manually. Now everything — bookings, payments, and communication — is in one place.",
                name: 'Coach Rodel',
                role: 'Vocal & Performance Coach',
                avatar: '/image/wc/testimonial2.jpg',
              },
              {
                quote:
                  "The studio locator is a game-changer. I can finally find rehearsal spaces near me that fit my schedule and budget. Groove really understands what artists need.",
                name: 'Kenji T.',
                role: 'Theater Performer',
                avatar: '/image/wc/testimonial3.jpg',
              },
            ].map((testimonial) => (
              <Reveal key={testimonial.name} className="g-reveal-stagger">
                <div className="g-card flex h-full flex-col gap-4 p-6">
                  <p className="flex-1 text-sm leading-relaxed text-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For Performers ─── */}
      <section className="g-section mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <SectionHeader
            eyebrow="For Performers"
            title="Everything you need to grow your craft"
            subtext="Browse coaches, manage bookings, and connect with the community — all from one place."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PERFORMER_FEATURES.map((feature) => (
            <Reveal key={feature.title} className="g-reveal-stagger">
              <Link href={feature.href} className="group">
                <div className="g-card g-card-hover flex h-full flex-col gap-4 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text transition-transform group-hover:scale-105">
                    {feature.icon}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-bold tracking-tight text-foreground">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/register/client">
            <Button size="lg" trailingIcon={<ArrowRight className="h-4 w-4" />}>
              Join as Performer
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── For Coaches ─── */}
      <section id="coaches" className="gl-band g-section scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-4 py-1.5">
              <PenLine className="h-3.5 w-3.5 text-accent-text" />
              <span
                className="g-eyebrow border-l-[3px] pl-2"
                style={{ borderLeftColor: 'var(--ph-red)' }}
              >
                For Coaches
              </span>
            </div>
            <SectionHeader
              title="Grow your coaching practice"
              subtext="Tools built for instructors — manage your schedule, connect with local talent, and build a reputation in the SJDM performing arts scene."
            />
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COACH_FEATURES.map((feature) => (
              <Reveal key={feature.title} className="g-reveal-stagger">
                <Link href={feature.href} className="group">
                  <div className="g-card g-card-hover flex h-full flex-col gap-4 p-6 sm:p-7">
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
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/register/coach">
              <Button size="lg" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                Join as Coach
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="g-section mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <div className="g-card relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12 sm:py-20">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent-soft via-transparent to-transparent" />
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to find your groove?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Join the growing community of performers and coaches in San Jose del Monte.
              Sign up in minutes and start your journey today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" onClick={handleGetStarted} trailingIcon={<ArrowRight className="h-5 w-5" />}>
                Get started free
              </Button>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-border bg-transparent px-6 text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground transition-all duration-200 hover:-translate-y-px hover:bg-muted hover:border-border-strong"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
    </div>
  );
}
