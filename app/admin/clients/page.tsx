'use client';

import React from 'react';
import { UserDirectory } from '@/components/admin/UserDirectory';

/**
 * Client management from the admin side. Shares the directory component with
 * /admin/coaches — see `components/admin/UserDirectory.tsx`.
 */
export default function AdminClientsPage() {
  return (
    <UserDirectory
      role="client"
      eyebrow="Client Directory"
      title="Client Management"
      description="Every registered client. Review verification documents, edit account details, and control account access."
    />
  );
}