import { Drama, Mic, Sparkles, Theater } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The four discipline pages.
 *
 * ONE definition, four routes. `/community/performing-arts/[discipline]` renders
 * this, so adding a fifth discipline is a single entry here plus a matching
 * talent filter — not a new folder, a new page, and a second copy of the hero.
 *
 * MATCHING AGAINST `coach_profiles.talents`
 *   That column is free text and, for coaches who registered with the skills
 *   picker, may hold a JSON array. The `match` terms below are the SAME
 *   substring heuristic the admin dashboard uses (`lib/admin/presentation.ts`
 *   `TALENT_BUCKETS`) rather than an equality test, because `== 'Dance'` would
 *   match almost nobody. Keeping one heuristic means "what does the admin chart
 *   count" and "what does this page show" cannot disagree.
 */
export type DisciplineId = 'dance' | 'singing' | 'acting' | 'theater';

export interface Discipline {
  id: DisciplineId;
  /** Nav label — short, because it appears in a menu. */
  label: string;
  /** Page title. */
  title: string;
  /** Used as the route's metadata description. */
  metaDescription: string;
  /** Hero paragraph. */
  description: string;
  /** Two or three sentences on the page body. */
  about: string[];
  icon: LucideIcon;
  /** Substrings that mark a coach as belonging to this discipline. */
  match: string[];
  /** Where "Find a coach" goes, and where the coach grid reads from. */
  findCoachesHref: string;
  /** Disciplines worth cross-linking at the foot of the page. */
  related: DisciplineId[];
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 'dance',
    label: 'Dance',
    title: 'Dance on Groove',
    metaDescription:
      'Find dance coaches in the Philippines — hip-hop, contemporary, ballet and traditional choreography — and book a session on Groove.',
    description:
      'Hip-hop, contemporary, ballet and traditional choreography, taught by coaches who are verified and working in the Philippines right now.',
    about: [
      'Dance is the largest single discipline on Groove. A coach here might teach a six-year-old their first pirouette, choreograph a school performance, or coach a hip-hop crew preparing for a battle — and the booking flow treats all three the same way.',
      'Every coach below has been verified against the same standard, and every session is booked through the platform so the agreement, the fee and the schedule are all in one place.',
    ],
    icon: Sparkles,
    match: ['dance', 'choreo'],
    findCoachesHref: '/client/talent#directory',
    related: ['theater', 'acting'],
  },
  {
    id: 'singing',
    label: 'Singing',
    title: 'Singing & Vocal',
    metaDescription:
      'Find vocal coaches in the Philippines — technique, breath control, harmony and stage presence — and book a session on Groove.',
    description:
      'Vocal technique, breath control, harmonies and stage presence, from coaches who have performed the work they teach.',
    about: [
      'Vocal coaching covers a wide range: a beginner learning to hold a note, a choir singer who wants to read music faster, a performer preparing a solo number for a showcase.',
      'Coaches list what they specialise in, so you can tell a classical voice teacher from a contemporary one before you book.',
    ],
    icon: Mic,
    match: ['sing', 'vocal'],
    findCoachesHref: '/client/talent#directory',
    related: ['theater', 'acting'],
  },
  {
    id: 'acting',
    label: 'Acting',
    title: 'Acting & Stage Craft',
    metaDescription:
      'Find acting coaches in the Philippines — method acting, character work, scene study and audition preparation — on Groove.',
    description:
      'Method acting, character work, scene study and audition preparation, with coaches who have worked on real productions.',
    about: [
      'Acting coaching tends to be practical: you arrive with a monologue or a scene, and you leave with something you can actually perform.',
      'If you are auditioning, look for a coach whose specialism matches the material — the discipline a coach trained in changes the notes you will get.',
    ],
    icon: Drama,
    match: ['act'],
    findCoachesHref: '/client/talent#directory',
    related: ['theater', 'dance'],
  },
  {
    id: 'theater',
    label: 'Theater',
    title: 'Musical Theater',
    metaDescription:
      'Find musical theatre coaches in the Philippines — staging, musical numbers, triple-threat training — on Groove.',
    description:
      'Staging, musical numbers and triple-threat training — coaches who can take you from the page to the stage.',
    about: [
      'Musical theatre asks for singing, acting and movement at once. Coaches here work across all three, often with people preparing for a specific production.',
      'Booking a session is the fastest way to find out whether a coach is right for the production you are working on.',
    ],
    icon: Theater,
    match: ['theater', 'theatre', 'thespian'],
    findCoachesHref: '/client/talent#directory',
    related: ['acting', 'singing'],
  },
];

export const DISCIPLINE_IDS = DISCIPLINES.map((d) => d.id);

export function getDiscipline(id: string): Discipline | undefined {
  return DISCIPLINES.find((d) => d.id === id);
}

/**
 * REMOVED WITH THE DISCIPLINE PAGE — and why
 * ---------------------------------------------------------------------------
 * `PLACEHOLDER_CLASSES`, `ClassSession` and `coachMatchesDiscipline` all lived
 * here to serve `DisciplinePage`, which rendered a full coach grid plus an
 * "Upcoming classes" list on the singing, acting and theater routes.
 *
 * The classes list was nine invented sessions: a "Sample Coach", made-up seat
 * counts, and dates that led nowhere, behind a one-line disclaimer. On a page
 * that also showed real coaches, that list read as a real schedule. It was the
 * single most misleading thing in the feature, so when those routes became
 * "Coming Soon" pages the fabricated dataset was deleted rather than parked —
 * a placeholder schedule left in the repo is one import away from being
 * published again.
 *
 * `match` stays on every discipline record: it is what classifies a coach for
 * the community and directory filters, which are live. `coachMatchesDiscipline`
 * moves there when a discipline page returns; nothing imports it today, so it is
 * gone rather than exported unused.
 *
 * There is still no classes table in the schema. `supabase/schema.sql` has
 * appointments (one coach, one client, one agreed slot) and nothing that
 * represents an open class with many attendees. When that table lands, the
 * schedule section can be built against real rows.
 */
