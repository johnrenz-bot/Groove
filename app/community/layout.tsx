import React from 'react';
import { ClientLayout } from '@/components/client/ClientLayout';

/**
 * Community pages share the same shell as the client portal — the header with
 * the sliding pill, the Groovey floating assistant, and the music provider.
 *
 * The pages under /community/* are PUBLIC (no auth required) but they inherit
 * the layout so that a signed-in visitor sees their portal header and a guest
 * sees the guest variant. The DashboardLayout in ClientLayout already handles
 * both cases via SessionProvider.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
