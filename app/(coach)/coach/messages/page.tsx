import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HubView } from '@/features/hub/HubView';

export const metadata: Metadata = {
  title: 'Messages & Bookings — GroovePH',
  description: 'One thread per booking - messages, booking, agreement and schedule in one place.',
};

export default function CoachHubPage() {
  return (
    <Suspense fallback={null}>
      <HubView role="coach" />
    </Suspense>
  );
}

