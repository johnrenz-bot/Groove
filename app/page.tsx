import { Hero } from '@/components/landing/Hero';
import { Disciplines } from '@/components/landing/Disciplines';
import { AudienceTabs } from '@/components/landing/AudienceTabs';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { StudiosPreview } from '@/components/landing/StudiosPreview';
import { FinalCta } from '@/components/landing/FinalCta';
import { Footer } from '@/components/shared/Footer';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { PagePatterns } from '@/components/layout/PagePatterns';
import { getLandingStats } from '@/components/landing/landingStats';

export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <div data-public-theme="dark" className="groove-landing">
      <PagePatterns variant="full" />
      <PublicLayout showFooter={false}>
        <main className="flex-1">
          <Hero stats={stats} />
          <Disciplines />
          <AudienceTabs />
          <HowItWorks />
          <StudiosPreview />
          <FinalCta />
        </main>
        <Footer showThemeToggle={false} className="mt-auto" />
      </PublicLayout>
    </div>
  );
}