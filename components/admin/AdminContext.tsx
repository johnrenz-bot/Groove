'use client';

import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

/**
 * Admin console cross-page state.
 *
 * Holds exactly two things, both of which every admin page would otherwise
 * re-fetch on every navigation:
 *
 *   - the verified admin identity (supplied by the server layout),
 *   - a broadcast channel, so an action taken on the users page (verify,
 *     suspend, delete) refreshes the open bookings, tickets, and dashboard
 *     pages instead of leaving them showing stale counts.
 *
 * It is a coordination layer, not an authorization layer. Nothing here grants
 * access; every query in `lib/admin/service.ts` is still bounded by RLS.
 */

export interface AdminContextValue {
  admin: Profile | null;
  /** Bumped after any mutation so listening pages refetch. */
  revision: number;
  /** Tell the console something changed. */
  notifyChange: () => void;
  /** Send a direct notification to specific accounts. */
  notifyUsers: (userIds: string[], title: string, message: string, ctaUrl?: string) => Promise<void>;
  /**
   * Record an administrative action server-side.
   *
   * Fire-and-forget by design: a failed audit write is logged to the console but
   * never surfaced to the user, because the action they took did succeed. The
   * entry is written by the route handler under the service-role key with the
   * identity taken from the verified session, so it cannot be forged or
   * suppressed from the client.
   */
  logAction: (
    action: string,
    entity: string,
    entityId?: string | null,
    summary?: string | null
  ) => void;
}

const AdminContext = createContext<AdminContextValue>({
  admin: null,
  revision: 0,
  notifyChange: () => {},
  notifyUsers: async () => {},
  logAction: () => {},
});

export function AdminProvider({
  admin,
  children,
}: {
  admin: Profile | null;
  children: React.ReactNode;
}) {
  const [revision, setRevision] = useState(0);

  const notifyChange = useCallback(() => setRevision((r) => r + 1), []);

  const logAction = useCallback(
    (action: string, entity: string, entityId?: string | null, summary?: string | null) => {
      void fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entity, entityId, summary }),
      }).catch((err) => {
        console.error('Audit log write failed:', err);
      });
    },
    []
  );

  const notifyUsers = useCallback(
    async (userIds: string[], title: string, message: string, ctaUrl?: string) => {
      if (userIds.length === 0) return;
      const supabase = createClient();
      const { error } = await supabase.from('notifications').insert(
        userIds.map((user_id) => ({ user_id, title, message, cta_url: ctaUrl ?? null }))
      );
      if (error) throw error;
      notifyChange();
    },
    [notifyChange]
  );

  const value = useMemo(
    () => ({ admin, revision, notifyChange, notifyUsers, logAction }),
    [admin, revision, notifyChange, notifyUsers, logAction]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}

/** Subscribe a page's data loader to console-wide invalidation. */
export function useAdminRevision() {
  return useAdmin().revision;
}