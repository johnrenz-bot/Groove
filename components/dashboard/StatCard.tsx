/**
 * Backwards-compatible import site. The canonical metric tile now lives in
 * `components/ui/StatCard.tsx` so admin, client and coach surfaces share one
 * count-up + hover behaviour.
 */
export { StatCard, type StatCardProps, type StatTone } from '@/components/ui/StatCard';
export { StatCard as default } from '@/components/ui/StatCard';
