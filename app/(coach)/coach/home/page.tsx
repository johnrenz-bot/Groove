/**
 * Coach dashboard — /coach/home
 *
 * Thin wrapper: the dashboard itself is role-parameterized and lives in
 * features/home/components/HomeDashboard.tsx (shared with /client/home).
 * All data comes from the database via features/home/services/homeService —
 * including "Verified" status, which reads the real account_verified flag
 * (the old page hardcoded "Verified Active" for every account).
 */
import { HomeDashboard } from '@/features/home/components/HomeDashboard';

export default function CoachHomePage() {
  return <HomeDashboard role="coach" />;
}
