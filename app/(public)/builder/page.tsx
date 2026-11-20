import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { BuilderClient } from './BuilderClient';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';

export const metadata: Metadata = {
  title: 'Tee Customizer — Groove PH',
  description:
    'Design a boxy concept-kit jersey tee, import your own artwork, and export a print-ready preview. No cart or checkout.',
};

/**
 * /builder — the tee customizer.
 *
 * The editor owns the whole viewport: its own 56px top bar, floating tool rail,
 * inspector and canvas. Signed-in members get the dashboard shell in focus mode
 * (sidebar and dashboard top bar step aside); guests get the same editor with no
 * extra chrome, and the editor's own back link returns them to the site.
 */
export default async function BuilderPage() {
  const role = await resolveChromeRole();

  if (role === 'guest') {
    return <BuilderClient />;
  }

  return (
    <DashboardLayout role={role}>
      <BuilderClient />
    </DashboardLayout>
  );
}
