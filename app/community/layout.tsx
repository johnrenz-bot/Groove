import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';

/**
 * Community pages share the dashboard shell with the visitor's own workspace
 * — client sees the client sidebar, coach the coach sidebar, an admin the
 * admin console, and a guest the signed-out chrome (Community + About in the
 * rail, sign-in actions in the top bar).
 *
 * The pages under /community/* are PUBLIC (no auth required); the shell only
 * changes who the chrome belongs to, never the content. This keeps a member
 * who clicks "Community" in their sidebar inside their own workspace.
 */
export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await resolveChromeRole();
  return <DashboardLayout role={role}>{children}</DashboardLayout>;
}

