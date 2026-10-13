import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DisciplinePage } from '@/features/performing-arts/components/DisciplinePage';
import { DISCIPLINES, DISCIPLINE_IDS, getDiscipline } from '@/features/performing-arts/data/disciplines';

/**
 * One route, four pages: /community/performing-arts/{dance,singing,acting,theater}.
 *
 * A dynamic segment rather than four folders. The four pages differ only in
 * which record `DISCIPLINES` they render — the hero, the coach grid and the
 * classes list are identical — so a segment with `generateStaticParams` gives the
 * same four URLs with one implementation and one place to edit.
 *
 * Adding a fifth discipline is now one entry in `data/disciplines.ts`.
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

  const record = DISCIPLINES.find((d) => d.id === discipline);
  if (!record) notFound();

  return <DisciplinePage discipline={record.id} />;
}
