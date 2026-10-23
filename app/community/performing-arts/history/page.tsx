import type { Metadata } from 'next';
import React from 'react';
import { PerformingArtsHistoryPage } from '@/features/performing-arts/components/PerformingArtsHistoryPage';

export const metadata: Metadata = {
  title: 'Philippine Performing Arts History & Learning | GroovePH',
  description:
    'A sourced overview of Philippine performing arts: indigenous and community traditions, Spanish and American colonial periods, postwar nation-building, and contemporary dance, music and theater. Includes artists, institutions, archives and learning resources.',
  alternates: {
    canonical: '/community/performing-arts/history',
  },
  openGraph: {
    title: 'Philippine Performing Arts History & Learning | GroovePH',
    description:
      'A sourced overview of Philippine dance, music and theater — from community traditions and colonial-era forms to contemporary institutions, artists and archives.',
    url: '/community/performing-arts/history',
    siteName: 'GroovePH',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Philippine Performing Arts History & Learning | GroovePH',
    description:
      'A sourced overview of Philippine dance, music and theater, with artists, institutions, archives and learning resources.',
  },
};

export default function PerformingArtsHistoryRoute() {
  return (
    <React.Suspense fallback={null}>
      <PerformingArtsHistoryPage />
    </React.Suspense>
  );
}
