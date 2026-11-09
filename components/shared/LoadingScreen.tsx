'use client';

/**
 * Back-compat shim. The canonical implementation now lives in
 * `@/components/loading/LoadingScreen` so every surface (splash,
 * route loader, modal) shares one cinematic system. Existing imports
 * in app/loading.tsx and DashboardLayout keep working unchanged.
 */
export { LoadingScreen } from '@/components/loading/LoadingScreen';
export type { LoadingScreenProps } from '@/components/loading/LoadingScreen';
export { default } from '@/components/loading/LoadingScreen';
