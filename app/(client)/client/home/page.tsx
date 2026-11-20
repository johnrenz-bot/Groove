/**
 * Client dashboard — /client/home
 *
 * Thin wrapper: the dashboard itself is role-parameterized and lives in
 * features/home/components/HomeDashboard.tsx (shared with /coach/home).
 * All data comes from the database via features/home/services/homeService —
 * never invented, never a decorative zero.
 */
import { HomeDashboard } from '@/features/home/components/HomeDashboard';

export default function ClientHomePage() {
  return <HomeDashboard role="client" />;
}
