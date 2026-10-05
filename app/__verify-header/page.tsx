'use client';

import React from 'react';
import { AppTopNav } from '@/components/shared/AppTopNav';
import { ADMIN_NAV, ADMIN_PORTAL_LABEL } from '@/components/admin/navigation';
import { CLIENT_NAV, CLIENT_PORTAL_LABEL } from '@/components/client/navigation';
import { COACH_NAV, COACH_PORTAL_LABEL } from '@/components/coach/navigation';

/**
 * TEMPORARY visual-verification harness for the shared header. Not part of the
 * app; deleted after checking the header at 375 / 768 / 1280 in a real browser,
 * in both themes.
 *
 * Renders the one <AppTopNav> with each role's real menu rather than a fixture,
 * so what is verified here is the same tree the three dashboards render.
 */
const ROLES = [
  {
    role: 'admin' as const,
    portalLabel: ADMIN_PORTAL_LABEL,
    primary: ADMIN_NAV.primary,
    groups: ADMIN_NAV.groups,
  },
  {
    role: 'coach' as const,
    portalLabel: COACH_PORTAL_LABEL,
    primary: COACH_NAV.primary,
    groups: COACH_NAV.groups,
  },
  {
    role: 'client' as const,
    portalLabel: CLIENT_PORTAL_LABEL,
    primary: CLIENT_NAV.primary,
    groups: CLIENT_NAV.groups,
  },
];

export default function VerifyHeaderPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {ROLES.map((r) => (
        <div key={r.role} className="border-b border-divider">
          <AppTopNav role={r.role} portalLabel={r.portalLabel} primary={r.primary} groups={r.groups} />
          <div className="px-8 py-16">
            <p className="text-sm text-muted-foreground">{r.role} surface — scroll target below.</p>
            {Array.from({ length: 12 }).map((_, i) => (
              <p key={i} className="py-3 text-sm text-subtle-foreground">
                Content row {i + 1}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}