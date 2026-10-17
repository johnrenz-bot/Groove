import { Hero } from '@/components/landing/Hero';
import { Disciplines } from '@/components/landing/Disciplines';
import { AudienceTabs } from '@/components/landing/AudienceTabs';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { StudiosPreview } from '@/components/landing/StudiosPreview';
import { FinalCta } from '@/components/landing/FinalCta';
import { CommunityTestimonials } from '@/components/landing/CommunityTestimonials';
import { FaqTeaserSection } from '@/components/faq/FaqTeaserSection';
import { Footer } from '@/components/shared/Footer';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { getLandingStats } from '@/components/landing/landingStats';

/**
 * `/` — the public landing page.
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
 * Section order is: hero, disciplines, coaches, how it works, studios, FAQ,
 * closing CTA, footer. The anchors (`#disciplines`, `#coaches`, `#how`,
 * `#studios`) and every outgoing link are unchanged: the header, the footer and
 * the dashboard all point at them.
 */
export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <div data-public-theme="dark" className="groove-landing">
      <PublicLayout showFooter={false}>
        <main id="main" className="flex-1">
          <Hero stats={stats} />
          <Disciplines />
          <AudienceTabs />
          <HowItWorks />
          <StudiosPreview />
          <CommunityTestimonials />
          <FaqTeaserSection />
          <FinalCta />
        </main>
        <Footer showThemeToggle={false} className="mt-auto" />
      </PublicLayout>
    </div>
  );
}