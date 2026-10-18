import { StudioLocator } from '@/components/studio/StudioLocator';

/**
 * TEMPORARY verification harness for the Studio Locator client behaviour.
 * Deleted immediately after the checks below run; not part of the app.
 *
 * It exists because StudioLocator is only mounted on the client and coach
 * dashboards, both of which are behind the auth proxy, and Supabase auth is
 * returning 500 in this environment — so the component cannot otherwise be
 * driven in a browser at all.
 */
export default function VerifyLocatorPage() {
  return (
    <main className="p-6">
      <StudioLocator />
    </main>
  );
}