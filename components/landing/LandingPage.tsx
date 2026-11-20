import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Check, Building2 } from 'lucide-react';

import { PublicLayout } from '@/components/shared/PublicLayout';
import { Footer } from '@/components/shared/Footer';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CURATED_STUDIOS } from '@/lib/studios/curatedStudios';
import { getLandingStats } from './landingStats.server';

// Landing Sections
import { HeroSection } from './HeroSection';
import { WhyGroove } from './WhyGroove';
import { Disciplines } from './Disciplines';
import { AudienceTabs } from './AudienceTabs';
import { HowItWorks } from './HowItWorks';
import { FaqSection } from './FaqSection';
import { FilipinoPatternBackground } from './FilipinoPatternBackground';

export async function LandingPage() {
  const stats = await getLandingStats();
  const studios = CURATED_STUDIOS.slice(0, 3);

  // Database-backed numbers only. A stat the query could not answer arrives
  // as 0 and is hidden rather than replaced with a made-up figure.
  const statItems = [
    { value: stats.coaches, label: 'Verified Coaches' },
    { value: stats.studios, label: 'Rehearsal Studios' },
    { value: stats.disciplines, label: 'Core Disciplines' },
  ]
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, display: s.value.toLocaleString() }));

  return (
    <div className="groove-landing dark min-h-screen bg-background text-white overflow-x-hidden relative">
      <PublicLayout showFooter={false}>
        {/* 1. HERO SECTION */}
        <HeroSection />

        {/* 2. WHY GROOVE? (8 Survey Stat Cards + Attribution) */}
        <div className="relative">
          <FilipinoPatternBackground variant="subtle" />
          <WhyGroove />
        </div>

        {/* 3. DISCIPLINES (4 Equal Cards) */}
        <Disciplines />

        {/* 4. FOR PERFORMERS / FOR COACHES (Animated Tab Switcher + 6 Cards per Tab) */}
        <div className="relative">
          <FilipinoPatternBackground variant="subtle" />
          <AudienceTabs />
        </div>

        {/* 5. HOW IT WORKS (4 Steps + Animated Connecting Line) */}
        <HowItWorks />

        {/* 6. STUDIOS & COMMUNITY STATS */}
        <section id="studios" className="relative mx-auto max-w-[1240px] px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24">
          <FilipinoPatternBackground variant="subtle" />

          <SectionHeading
            eyebrow="Community & Studios"
            title="A growing performing arts network in Bulacan."
            description="Discover verified coaches, rehearsing artists, and equipped local studios across San Jose del Monte."
            align="left"
          />

          {/* Platform Stats Row — only when the database answered with at least one real figure */}
          {statItems.length > 0 && (
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {statItems.map((s) => (
                <div
                  key={s.label}
                  className="rounded-[22px] border border-white/5 bg-surface/70 p-6 backdrop-blur-md "
                >
                  <p className="font-sans text-5xl font-semibold tracking-[-0.02em] text-muted-foreground">{s.display}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Curated Studios Preview Cards */}
          {studios.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Featured Rehearsal Spaces
                </span>
                <Link
                  href="/users"
                  className="text-xs font-semibold text-white/60 hover:text-muted-foreground transition-colors flex items-center gap-1"
                >
                  View all spaces
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {studios.map((studio) => (
                  <div
                    key={studio.id}
                    className="group relative flex flex-col justify-between rounded-[22px] border border-white/5 bg-surface/70 p-6 backdrop-blur-md  transition-all duration-200 hover:border-border hover:-translate-y-1"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-border bg-surface-2 text-muted-foreground ">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          <Check className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-white group-hover:text-muted-foreground transition-colors">
                        {studio.name}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                        {studio.address ?? 'Published on studio directory page.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5">
                      <span className="text-[11px] font-medium text-white/45">
                        San Jose del Monte, Bulacan
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 7. CENTERED FAQ SECTION (6-8 Questions in Smooth Accordion + Contact Support Link) */}
        <FaqSection />

        {/* 8. FINAL CTA — cinematic editorial statement band */}
        <section className="relative mx-auto max-w-[1240px] px-4 pb-20 sm:px-8 lg:px-10 lg:pb-28">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10">
            <Image
              src="/image/bg/hero-theater.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-[center_22%]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#080808]/95 via-[#080808]/72 to-[#080808]/25"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#080808]/90 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 flex min-h-[26rem] flex-col justify-center gap-6 px-6 py-14 sm:min-h-[30rem] sm:px-12 lg:px-16">
              <h2 className="max-w-2xl font-sans text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                Take the next step<br />
                <span className="ed-accent">of your craft.</span>
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
                Join the performers, coaches and studios building a stronger performing arts scene in San Jose del Monte.
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/register/client">
                  <GradientButton className="px-7 py-4 text-sm">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </GradientButton>
                </Link>
                <Link href="/login">
                  <OutlineButton className="px-7 py-4 text-sm">Sign in</OutlineButton>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 9. FOOTER */}
        <Footer className="border-t border-white/5 bg-background" showThemeToggle={false} />
      </PublicLayout>
    </div>
  );
}

export default LandingPage;

