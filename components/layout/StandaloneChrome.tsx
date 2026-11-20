'use client';

import React from 'react';
import { DashboardChrome } from '@/components/layout/DashboardChrome';
import { useSession } from '@/components/providers/SessionProvider';
import type { DashboardRole } from '@/components/header/roleMeta';

/**
 * The shared chrome for the authenticated full-screen routes that are not
 * member portals or the admin console — /messages, /users, /userprofile/[id]
 * and /contracts/[id]. They used to mount the old top bar (<AppHeader>); they
 * now render the same Orbit-style sidebar + top bar as every other page in
 * the app, with the role resolved from the live session (guests get the
 * signed-out chrome).
 *
 * The music player lives in the ROOT layout (app/layout.tsx) via
 * <PlayerGate /> — a single provider/gate for the entire app — so this
 * chrome does not mount its own instance.
 */
export function StandaloneChrome({ children }: { children: React.ReactNode }) {
  const { role } = useSession();
  const resolved: DashboardRole | 'guest' =
    role === 'coach' || role === 'admin' || role === 'client' ? role : 'guest';
  return (
    <DashboardChrome role={resolved}>
      {children}
    </DashboardChrome>
  );
}

export default StandaloneChrome;

