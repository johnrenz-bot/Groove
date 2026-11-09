import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Check, Building2 } from 'lucide-react';

import { PublicLayout } from '@/components/shared/PublicLayout';
import { Footer } from '@/components/shared/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
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

  const statItems = [
    { value: (stats.coaches > 0 ? stats.coaches : 18).toLocaleString(), label: 'Verified Coaches' },
    { value: (stats.studios > 0 ? stats.studios : 6).toLocaleString(), label: 'Rehearsal Studios' },
    { value: (stats.disciplines > 0 ? stats.disciplines : 4).toLocaleString(), label: 'Core Disciplines' },
  ];

  return (
    <div className="groove-landing dark min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden relative">
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

          {/* Platform Stats Row */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="rounded-[22px] border border-white/5 bg-[#121212]/70 p-6 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              >
                <p className="text-4xl font-extrabold tracking-tight text-[#E8B84B]">{s.value}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/60">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Curated Studios Preview Cards */}
          {studios.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E8B84B]/80 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Featured Rehearsal Spaces
                </span>
                <Link
                  href="/users"
                  className="text-xs font-semibold text-white/60 hover:text-[#E8B84B] transition-colors flex items-center gap-1"
                >
                  View all spaces
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {studios.map((studio) => (
                  <div
                    key={studio.id}
                    className="group relative flex flex-col justify-between rounded-[22px] border border-white/5 bg-[#121212]/70 p-6 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-[#E8B84B]/40 hover:-translate-y-1"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E8B84B]/25 bg-[#E8B84B]/10 text-[#E8B84B] shadow-[0_0_12px_rgba(232,184,75,0.15)]">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E8B84B]/20 bg-[#E8B84B]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#E8B84B]">
                          <Check className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-white group-hover:text-[#E8B84B] transition-colors">
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

        {/* 8. FINAL CTA */}
        <section className="relative mx-auto max-w-[1240px] px-6 pb-24 sm:px-8 lg:px-10 lg:pb-32">
          <FilipinoPatternBackground variant="subtle" />
          <GlassCard glow className="p-10 text-center sm:p-16 border border-[#E8B84B]/30 bg-[#121212]/80 backdrop-blur-xl shadow-[0_0_50px_rgba(232,184,75,0.15)]">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Take the next step of your craft.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Join performers, coaches and studios building a stronger performing arts scene in San Jose del Monte.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register/client">
                <GradientButton className="px-6 py-3.5">
                  Get started free <ArrowRight className="h-4 w-4" />
                </GradientButton>
              </Link>
              <Link href="/login">
                <OutlineButton className="px-6 py-3.5">Sign in</OutlineButton>
              </Link>
            </div>
          </GlassCard>
        </section>

        {/* 9. FOOTER */}
        <Footer className="border-t border-white/5 bg-[#0a0a0a]" showThemeToggle={false} />
      </PublicLayout>
    </div>
  );
}

export default LandingPage;
