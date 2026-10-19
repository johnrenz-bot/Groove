import { Hero } from '@/components/landing/Hero';
import { Disciplines } from '@/components/landing/Disciplines';
import { AudienceTabs } from '@/components/landing/AudienceTabs';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { WhyGroove } from '@/components/landing/WhyGroove';
import { FinalCta } from '@/components/landing/FinalCta';
import { FaqTeaserSection } from '@/components/faq/FaqTeaserSection';
import { Footer } from '@/components/shared/Footer';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { getLandingStats } from '@/components/landing/landingStats.server';

/**
 * THE PUBLIC LANDING PAGE — the guest-facing half of `/`.
 *
 * This used to be `app/page.tsx`, which was a SECOND `page.tsx` resolving to
 * `/` alongside `app/(public)/page.tsx`. Turbopack silently preferred the root
 * one, so the `(public)` group's authentication-aware page never ran: `/` was
 * rendered for everyone, authenticated members included, and the header on it
 * drew the signed-in account cluster on a marketing page. There is now exactly
 * one route for `/` — `app/(public)/page.tsx` — and it decides *whether* to
 * render this; nothing else may.
 *
 * `data-public-theme="dark"` is kept for backwards compatibility with anything
 * that still queries it, but it carries no styles of its own: the page is drawn
 * entirely from `--card` / `--border` / `--muted-foreground` / `--accent`, so it
 * follows the visitor's Light/Dark/System choice like every other route.
 *
 * `<PagePatterns />` is deliberately NOT mounted here — the root layout already
 * renders exactly one copy for the whole app, and a second one on `/` was
 * doubling the corner artwork over the hero.
 *
 * Section order is: hero, why groove (survey stats), disciplines, audience tabs,
 * how it works, FAQ, closing CTA, footer. The anchors (`#disciplines`,
 * `#coaches`, `#how`, `#faq`) and every outgoing link are unchanged:
 * the header, the footer and the dashboard all point at them.
 *
 * Server component: it awaits `getLandingStats()`, which is why the whole route
 * is dynamic.
 */
export default async function LandingSections() {
  const stats = await getLandingStats();

  return (
    <div data-public-theme="dark" className="groove-landing">
      <PublicLayout showFooter={false}>
        <main id="main" className="flex-1">
          <Hero stats={stats} />
          <WhyGroove />
          <Disciplines />
          <AudienceTabs />
          <HowItWorks />
          <FaqTeaserSection />
          <FinalCta />
        </main>
        <Footer showThemeToggle={false} className="mt-auto" />
      </PublicLayout>
    </div>
  );
}