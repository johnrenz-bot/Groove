import type { Metadata } from 'next';
import React from 'react';
import { SingingCommunityPageServer } from '@/features/singing/components/SingingCommunityPageServer';

export const metadata: Metadata = {
  title: 'Singing & Vocal Community — Choirs, Competitions, Masterclasses | GroovePH',
  description:
    'SINGING COMMUNITY — Choral Ensembles, Vocal Masterclasses, Competitions, Philippines & Worldwide. Verified updates from Philippine Madrigal Singers, NAMCYA, IFCM, NATS, and UST Singers.',
  alternates: {
    canonical: '/community/performing-arts/singing',
  },
  openGraph: {
    title: 'Singing & Vocal Community — Choirs, Competitions, Masterclasses | GroovePH',
    description:
      'SINGING COMMUNITY — Choral Ensembles, Vocal Masterclasses, Competitions, Philippines & Worldwide. Verified updates from Philippine Madrigal Singers, NAMCYA, IFCM, NATS, and UST Singers.',
    url: '/community/performing-arts/singing',
    siteName: 'GroovePH',
    type: 'website',
    images: [
      {
        url: '/image/pa/ccp-eastern-chamber-singers.jpg',
        width: 1200,
        height: 800,
        alt: 'GroovePH Singing Community — Verified Choral & Vocal Performance Coverage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Singing & Vocal Community — Choirs, Competitions, Masterclasses | GroovePH',
    description:
      'Choral Ensembles, Vocal Masterclasses, Competitions, Philippines & Worldwide. Verified updates from premier choral federations.',
    images: ['/image/pa/ccp-eastern-chamber-singers.jpg'],
  },
};

export default function SingingCommunityPage() {
  return (
    <React.Suspense fallback={null}>
      <SingingCommunityPageServer />
    </React.Suspense>
  );
}
