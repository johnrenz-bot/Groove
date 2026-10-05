'use client';

import React, { useState } from 'react';
import { UserDirectory } from '@/components/admin/UserDirectory';

/**
 * Coach management from the admin side.
 *
 * Renders the shared `UserDirectory` locked to the coach role rather than
 * duplicating the users table. The underlying data, the inspector, and every
 * action are literally the same code as /admin/users — a separate coach table
 * would drift from it the moment either changed.
 */
export default function AdminCoachesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <UserDirectory
      key={refreshKey}
      role="coach"
      eyebrow="Coach Directory"
      title="Coach Management"
      description="Every registered coach. Review verification documents, edit rates and schedules, and control account access."
    />
  );
}