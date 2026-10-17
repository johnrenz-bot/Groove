import type { Metadata } from 'next';
import React from 'react';
import { TheaterCommunityPageServer } from '@/features/theater/components/TheaterCommunityPageServer';

export const metadata: Metadata = {
  title: 'Musical Theater & Stage Community — Productions, Playwriting, Staging | GroovePH',
  description:
    'THEATER COMMUNITY — Productions, Original Musicals, Playwriting, Backstage, Philippines & Worldwide. Verified updates from PETA, Repertory Philippines, Tanghalang Pilipino, Virgin Labfest, and Philstage.',
  alternates: {
    canonical: '/community/performing-arts/theater',
  },
  openGraph: {
    title: 'Musical Theater & Stage Community — Productions, Playwriting, Staging | GroovePH',
    description:
      'THEATER COMMUNITY — Productions, Original Musicals, Playwriting, Backstage, Philippines & Worldwide. Verified updates from PETA, Repertory Philippines, Tanghalang Pilipino, Virgin Labfest, and Philstage.',
    url: '/community/performing-arts/theater',
    siteName: 'GroovePH',
    type: 'website',
    images: [
      {
        url: '/hero-theater.jpg',
        width: 1200,
        height: 800,
        alt: 'GroovePH Theater Community — Verified Stage & Musical Theater Coverage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Musical Theater & Stage Community — Productions, Playwriting, Staging | GroovePH',
    description:
      'Productions, Original Musicals, Playwriting, Backstage, Philippines & Worldwide. Verified updates from premier stage companies.',
    images: ['/hero-theater.jpg'],
  },
};

export default function TheaterCommunityPage() {
  return (
    <React.Suspense fallback={null}>
      <TheaterCommunityPageServer />
    </React.Suspense>
  );
}
