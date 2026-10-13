import type { Metadata } from 'next';
import { DanceCommunityView } from '@/features/dance/components/DanceCommunityView';

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
    url: '/community/performing-arts/dance',
    siteName: 'GroovePH',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: 'GroovePH Dance Community',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dance Community — Competitions, Events, Crews | GroovePH',
    description:
      'Competitions, Events, Crews, Philippines & Worldwide. Real-time verified updates from international leagues and Philippine dance federations.',
    images: ['https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80'],
  },
};

export default function DanceCommunityPage() {
  return <DanceCommunityView />;
}
