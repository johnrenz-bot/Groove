'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { AdminProvider } from './AdminContext';
import type { Profile } from '@/lib/types';

/**
 * Admin shell.
 *
 * Structurally identical to the client and coach shells — same sidebar, navbar,
 * and maintenance banner — so the console feels like part of the product rather
 * than a bolted-on back office. What differs is the wrapper:
 *
 *   - `AdminProvider` publishes the identity the server layout already verified,
 *     so no page re-queries who it is and no page has to defend itself against
 *     being rendered for the wrong user.
 */
export function AdminLayout({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin?: Profile | null;
}) {
  return (
    <AdminProvider admin={admin ?? null}>
      <DashboardLayout role="admin" showMaintenanceBanner>
        {children}
      </DashboardLayout>
    </AdminProvider>
  );
}

export default AdminLayout;