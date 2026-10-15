import type { Metadata } from 'next';
import React from 'react';
import { DanceCommunityPageServer } from '@/features/dance/components/DanceCommunityPageServer';

export const metadata: Metadata = {
  title: 'Dance Community — Competitions, Events, Crews | GroovePH',
  description:
    'DANCE COMMUNITY — Competitions, Events, Crews, Philippines & Worldwide. Real-time verified updates from IDL, HHI, Red Bull Dance Your Style, STEEZY, and Philippine dance federations.',
  alternates: {
    canonical: '/community/performing-arts/dance',
  },
  openGraph: {
    title: 'Dance Community — Competitions, Events, Crews | GroovePH',
    description:
      'DANCE COMMUNITY — Competitions, Events, Crews, Philippines & Worldwide. Real-time verified updates from IDL, HHI, Red Bull Dance Your Style, STEEZY, and Philippine dance federations.',
    url: '/comSmunity/performing-arts/dance',
    siteName: 'GroovePH',
    type: 'website',
    images: [
      {
        url: '/crews/brotherhood/team.jpg',
        width: 1500,
        height: 1000,
        alt: 'GroovePH Dance Community — Verified Crew and League Coverage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dance Community — Competitions, Events, Crews | GroovePH',
    description:
      'Competitions, Events, Crews, Philippines & Worldwide. Real-time verified updates from international leagues and Philippine dance federations.',
    images: ['/crews/brotherhood/team.jpg'],
  },
};

export default function DanceCommunityPage() {
  return (
    <React.Suspense fallback={null}>
      <DanceCommunityPageServer />
    </React.Suspense>
  );
}
