import type { Metadata } from 'next';
import React from 'react';
import { ActingCommunityPageServer } from '@/features/acting/components/ActingCommunityPageServer';

export const metadata: Metadata = {
  title: 'Acting & Stage Craft Community — Auditions, Conservatories, Monologues | GroovePH',
  description:
    'ACTING COMMUNITY — Castings, Theater Auditions, Monologues, Philippines & Worldwide. Verified updates from Tanghalang Pilipino, PETA, Repertory Philippines, SAG-AFTRA, and Dulaang UP.',
  alternates: {
    canonical: '/community/performing-arts/acting',
  },
  openGraph: {
    title: 'Acting & Stage Craft Community — Auditions, Conservatories, Monologues | GroovePH',
    description:
      'ACTING COMMUNITY — Castings, Theater Auditions, Monologues, Philippines & Worldwide. Verified updates from Tanghalang Pilipino, PETA, Repertory Philippines, SAG-AFTRA, and Dulaang UP.',
    url: '/community/performing-arts/acting',
    siteName: 'GroovePH',
    type: 'website',
    images: [
      {
        url: '/image/pa/ccp-tanghalang-pilipino.jpg',
        width: 1200,
        height: 800,
        alt: 'GroovePH Acting Community — Verified Dramatic & Screen Acting Coverage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acting & Stage Craft Community — Auditions, Conservatories, Monologues | GroovePH',
    description:
      'Castings, Theater Auditions, Monologues, Philippines & Worldwide. Verified updates from premier acting companies and guilds.',
    images: ['/image/pa/ccp-tanghalang-pilipino.jpg'],
  },
};

export default function ActingCommunityPage() {
  return (
    <React.Suspense fallback={null}>
      <ActingCommunityPageServer />
    </React.Suspense>
  );
}
