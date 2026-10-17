import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComingSoonPage } from '@/features/performing-arts/components/ComingSoonPage';
import { DISCIPLINES, DISCIPLINE_IDS, getDiscipline } from '@/features/performing-arts/data/disciplines';

/**
 * One route, four pages: /community/performing-arts/{dance,singing,acting,theater}.
 *
 * A dynamic segment rather than four folders. Dance renders its own community
 * page; the other three render `ComingSoonPage`. Both are driven by the same
 * `DISCIPLINES` record, so the icon, title and description cannot drift between
 * the routes and adding a discipline is one entry in `data/disciplines.ts`.
 *
 * PUBLIC, NOT GATED
 *   The Supabase middleware classifies anything it does not recognise as
 *   `public`, so these routes are reachable signed-out. That is deliberate: they
 *   are discovery pages, and a coach directory you have to log in to see is a
 *   coach directory nobody sees.
 */
export function generateStaticParams() {
  return DISCIPLINE_IDS.filter((id) => id !== 'dance').map((id) => ({ discipline: id }));
}

/** Only the real ids are routable; anything else is a 404, not a blank page. */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ discipline: string }>;
}): Promise<Metadata> {
  const { discipline } = await params;
  if (discipline === 'dance') {
    return {
      title: 'Dance Community — Competitions, Events, Crews | GroovePH',
      description:
        'Official dance competitions, battle recaps, crew rosters, and verified updates from the Philippines and worldwide leagues.',
      alternates: { canonical: '/community/performing-arts/dance' },
      openGraph: {
        title: 'Dance Community — Competitions, Events, Crews | GroovePH',
        description:
          'Official dance competitions, battle recaps, crew rosters, and verified updates from the Philippines and worldwide leagues.',
        url: '/community/performing-arts/dance',
        type: 'website',
      },
    };
  }

  const record = getDiscipline(discipline);
  if (!record) return { title: 'Discipline not found' };

  if (discipline === 'singing') {
    return {
      title: 'Singing & Vocal Community — Choirs, Competitions, Masterclasses | GroovePH',
      description:
        'SINGING COMMUNITY — Choral Ensembles, Vocal Masterclasses, Competitions, Philippines & Worldwide. Verified updates from Philippine Madrigal Singers, NAMCYA, IFCM, NATS, and UST Singers.',
      alternates: { canonical: '/community/performing-arts/singing' },
      openGraph: {
        title: 'Singing & Vocal Community — Choirs, Competitions, Masterclasses | GroovePH',
        description:
          'SINGING COMMUNITY — Choral Ensembles, Vocal Masterclasses, Competitions, Philippines & Worldwide.',
        url: '/community/performing-arts/singing',
        type: 'website',
      },
    };
  }

  if (discipline === 'acting') {
    return {
      title: 'Acting & Stage Craft Community — Auditions, Conservatories, Monologues | GroovePH',
      description:
        'ACTING COMMUNITY — Castings, Theater Auditions, Monologues, Philippines & Worldwide. Verified updates from Tanghalang Pilipino, PETA, Repertory Philippines, SAG-AFTRA, and Dulaang UP.',
      alternates: { canonical: '/community/performing-arts/acting' },
      openGraph: {
        title: 'Acting & Stage Craft Community — Auditions, Conservatories, Monologues | GroovePH',
        description:
          'ACTING COMMUNITY — Castings, Theater Auditions, Monologues, Philippines & Worldwide.',
        url: '/community/performing-arts/acting',
        type: 'website',
      },
    };
  }

  if (discipline === 'theater') {
    return {
      title: 'Musical Theater & Stage Community — Productions, Playwriting, Staging | GroovePH',
      description:
        'THEATER COMMUNITY — Productions, Original Musicals, Playwriting, Backstage, Philippines & Worldwide. Verified updates from PETA, Repertory Philippines, Tanghalang Pilipino, Virgin Labfest, and Philstage.',
      alternates: { canonical: '/community/performing-arts/theater' },
      openGraph: {
        title: 'Musical Theater & Stage Community — Productions, Playwriting, Staging | GroovePH',
        description:
          'THEATER COMMUNITY — Productions, Original Musicals, Playwriting, Backstage, Philippines & Worldwide.',
        url: '/community/performing-arts/theater',
        type: 'website',
      },
    };
  }

  return {
    title: `${record.title} · Performing Arts`,
    description: record.metaDescription,
    alternates: { canonical: `/community/performing-arts/${record.id}` },
    openGraph: {
      title: `${record.title} · Groove`,
      description: record.metaDescription,
      url: `/community/performing-arts/${record.id}`,
      type: 'website',
    },
  };
}

export default async function DisciplineRoute({
  params,
}: {
  params: Promise<{ discipline: string }>;
}) {
  const { discipline } = await params;
  if (discipline === 'dance') {
    const { DanceCommunityPageServer } = await import(
      '@/features/dance/components/DanceCommunityPageServer'
    );
    return <DanceCommunityPageServer />;
  }

  if (discipline === 'singing') {
    const { SingingCommunityPageServer } = await import(
      '@/features/singing/components/SingingCommunityPageServer'
    );
    return <SingingCommunityPageServer />;
  }

  if (discipline === 'acting') {
    const { ActingCommunityPageServer } = await import(
      '@/features/acting/components/ActingCommunityPageServer'
    );
    return <ActingCommunityPageServer />;
  }

  if (discipline === 'theater') {
    const { TheaterCommunityPageServer } = await import(
      '@/features/theater/components/TheaterCommunityPageServer'
    );
    return <TheaterCommunityPageServer />;
  }

  const record = DISCIPLINES.find((d) => d.id === discipline);
  if (!record) notFound();

  return <ComingSoonPage discipline={record.id} />;
}
