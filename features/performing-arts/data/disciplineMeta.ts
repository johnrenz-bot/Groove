import {
  BookOpen,
  Drama,
  Megaphone,
  Theater,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared presentation metadata for the four discipline community pages.
 *
 * The same records drive three surfaces:
 *   - the compact page header (title, audience, coach link)
 *   - the four highlight cards directly beneath it
 *   - the collapsed "Information Hub Architecture" accordion
 *
 * Keeping them together means the card a visitor clicks and the explanatory
 * copy beneath it can never describe two different things. All facts here are
 * carried over from the existing discipline pages — nothing was invented for
 * the refactor.
 */
export type DisciplinePageId = 'dance' | 'singing' | 'acting' | 'theater';

export interface DisciplineFilter {
  category?: string;
  query?: string;
}

export interface DisciplineHighlight {
  id: string;
  title: string;
  /** Short card copy, clamped to two lines in the UI. */
  description: string;
  /** Label for the longer editorial note kept inside the accordion. */
  detailLabel: string;
  /** Longer editorial note shown only when the accordion is expanded. */
  detail: string;
  /** Compact muted metadata under the card description. */
  meta: string;
  /** Small status chip. */
  status: string;
  icon: LucideIcon;
  filter: DisciplineFilter;
}

export interface DisciplinePageMeta {
  id: DisciplinePageId;
  /** Long-form discipline name used in the information accordion. */
  name: string;
  title: string;
  titleAccent: string;
  eyebrow: string;
  audience: string;
  findCoachesLabel: string;
  findCoachesHref: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  highlights: DisciplineHighlight[];
}

const DANCE: DisciplinePageMeta = {
  id: 'dance',
  name: 'Street Dance & Choreography',
  title: 'Dance',
  titleAccent: 'Community',
  eyebrow: 'Performing Arts · Dance',
  audience:
    'street dance crews, freestyle battlers, choreographers, studio instructors, and dance students',
  findCoachesLabel: 'Find Dance Coaches',
  findCoachesHref: '/client/talent?talent=Dance',
  primaryCtaLabel: 'Upcoming Battles & Events',
  primaryCtaHref: '#upcoming-events',
  highlights: [
    {
      id: 'competitions',
      title: 'Competitions & Results',
      description:
        'Official tournament schedules, qualifiers, battle brackets, and certified judging results.',
      detailLabel: 'Key leagues',
      detail:
        'IDL (International Dance League), HHI World & Philippine Championships, Red Bull Dance Your Style, UDO Street Dance Nationals',
      meta: 'IDL · HHI · Red Bull DYS · UDO',
      status: 'Official',
      icon: Trophy,
      filter: { category: 'competition' },
    },
    {
      id: 'auditions',
      title: 'Auditions & Castings',
      description:
        'Verified audition notices, casting calls, callback dates, and company recruitment criteria.',
      detailLabel: 'Recent calls',
      detail:
        'Commercial dance agency open calls, backup dancer casting for major concerts, and championship crew auditions',
      meta: 'Agency calls · concert casting · crew auditions',
      status: 'Casting',
      icon: Users,
      filter: { query: 'audition' },
    },
    {
      id: 'workshops',
      title: 'Workshops & Masterclasses',
      description:
        'Technique calibration, master mentor intensives, conservatory prep, and studio workshops.',
      detailLabel: 'Who it is for',
      detail:
        'Street dance crews, freestyle battlers, choreographers, studio instructors, and dance students',
      meta: 'Studio intensives · choreography labs · STEEZY',
      status: 'Open',
      icon: BookOpen,
      filter: { category: 'workshop' },
    },
    {
      id: 'announcements',
      title: 'Announcements & News',
      description:
        'National arts council notices, federation charters, award results, and official policy updates.',
      detailLabel: 'Milestones',
      detail:
        'Philippine crew victories at HHI Phoenix (Femme MNL, UPeepz), Red Bull World Finals, and national street dance crowns',
      meta: 'Federation charters · awards · policy',
      status: 'Newsroom',
      icon: Megaphone,
      filter: { category: 'news' },
    },
  ],
};

const SINGING: DisciplinePageMeta = {
  id: 'singing',
  name: 'Vocal Performance & Choral Ensembles',
  title: 'Singing & Vocal',
  titleAccent: 'Community',
  eyebrow: 'Performing Arts · Singing',
  audience:
    'classical soloists, choir scholars, Kundiman performers, musical theater vocalists, and vocal coaches',
  findCoachesLabel: 'Find Vocal Coaches',
  findCoachesHref: '/client/talent?talent=Singing',
  primaryCtaLabel: 'Upcoming Showcases & Competitions',
  primaryCtaHref: '#upcoming-events',
  highlights: [
    {
      id: 'competitions',
      title: 'Competitions & Results',
      description:
        'Official choral and solo competition schedules, qualifiers, and certified results.',
      detailLabel: 'Key competitions',
      detail:
        'NAMCYA National Finals, Andrea O. Veneracion International Choral Festival, European Grand Prix for Choral Singing',
      meta: 'NAMCYA · Andrea O. Veneracion · European Grand Prix',
      status: 'Official',
      icon: Trophy,
      filter: { category: 'competition' },
    },
    {
      id: 'auditions',
      title: 'Auditions & Castings',
      description:
        'Verified choir, opera, and conservatory auditions with callback and repertoire details.',
      detailLabel: 'Recent calls',
      detail:
        'Conservatory choir auditions, opera soloist casting, and collegiate choir open calls (Madz, UST Singers)',
      meta: 'Madz · UST Singers · opera casting',
      status: 'Casting',
      icon: Users,
      filter: { query: 'audition' },
    },
    {
      id: 'workshops',
      title: 'Workshops & Masterclasses',
      description:
        'Vocal pedagogy intensives, choral clinics, and conservatory preparation.',
      detailLabel: 'Who it is for',
      detail:
        'Classical soloists, choir scholars, Kundiman performers, musical theater vocalists, and vocal coaches',
      meta: 'IFCM · NATS · choral clinics',
      status: 'Open',
      icon: BookOpen,
      filter: { category: 'workshop' },
    },
    {
      id: 'announcements',
      title: 'Announcements & News',
      description:
        'Choral federation notices, competition results, and official season announcements.',
      detailLabel: 'Milestones',
      detail:
        'Philippine Madrigal Singers European Grand Prix victories, Tolosa Choral Championships, and international gold medals',
      meta: 'Federation notices · season news',
      status: 'Newsroom',
      icon: Megaphone,
      filter: { category: 'news' },
    },
  ],
};

const ACTING: DisciplinePageMeta = {
  id: 'acting',
  name: 'Stage Craft & Screen Acting',
  title: 'Acting & Stage Craft',
  titleAccent: 'Community',
  eyebrow: 'Performing Arts · Acting',
  audience:
    'dramatic actors, stage performers, voice actors, acting coaches, casting directors, and theater scholars',
  findCoachesLabel: 'Find Acting Coaches',
  findCoachesHref: '/client/talent?talent=Acting',
  primaryCtaLabel: 'Upcoming Auditions & Showcases',
  primaryCtaHref: '#upcoming-events',
  highlights: [
    {
      id: 'auditions',
      title: 'Auditions & Castings',
      description:
        'Verified stage and screen casting calls, callback dates, and company recruitment criteria.',
      detailLabel: 'Recent calls',
      detail:
        'Tanghalang Pilipino seasonal auditions, PETA acting laboratory castings, Repertory Philippines calls',
      meta: 'Tanghalang Pilipino · PETA · Repertory',
      status: 'Casting',
      icon: Users,
      filter: { category: 'competition' },
    },
    {
      id: 'showcases',
      title: 'Showcases & Staged Plays',
      description:
        'Collegiate theater tournaments, monologue showcases, and staged play seasons.',
      detailLabel: 'Key stages',
      detail:
        'Virgin Labfest playwright & staging calls, collegiate theater tournaments, and monologue showcases',
      meta: 'Virgin Labfest · collegiate theater',
      status: 'On stage',
      icon: Drama,
      filter: { category: 'event' },
    },
    {
      id: 'workshops',
      title: 'Workshops & Labs',
      description:
        'Acting laboratories, conservatory prep, and professional scene-study intensives.',
      detailLabel: 'Who it is for',
      detail:
        'Dramatic actors, stage performers, voice actors, acting coaches, casting directors, and theater scholars',
      meta: 'PETA labs · conservatory programs',
      status: 'Open',
      icon: BookOpen,
      filter: { category: 'workshop' },
    },
    {
      id: 'announcements',
      title: 'Announcements & News',
      description:
        'Guild standards, award results, and official industry notices.',
      detailLabel: 'Milestones',
      detail:
        'Gawad Buhay acting awards, Asian Academy Creative Awards, and critical acclaim in legitimate theater',
      meta: 'Gawad Buhay · guild updates',
      status: 'Newsroom',
      icon: Megaphone,
      filter: { category: 'news' },
    },
  ],
};

const THEATER: DisciplinePageMeta = {
  id: 'theater',
  name: 'Musical Theater & Stage Production',
  title: 'Musical Theater & Stage',
  titleAccent: 'Community',
  eyebrow: 'Performing Arts · Theater',
  audience:
    'musical theater artists, stage directors, playwrights, technical production crews, and stage managers',
  findCoachesLabel: 'Find Musical Theater Coaches',
  findCoachesHref: '/client/talent?talent=Theater',
  primaryCtaLabel: 'Upcoming Shows & Seasons',
  primaryCtaHref: '#upcoming-events',
  highlights: [
    {
      id: 'productions',
      title: 'Productions & Seasons',
      description:
        'Mainstage musicals, original Filipino productions, and announced season line-ups.',
      detailLabel: 'Recent productions',
      detail:
        'Major Manila musical productions, national tour casting, and record-breaking original Filipino musicals',
      meta: 'PETA · Repertory · Tanghalang Pilipino',
      status: 'On stage',
      icon: Theater,
      filter: { category: 'event' },
    },
    {
      id: 'auditions',
      title: 'Auditions & Castings',
      description:
        'Production casting calls, ensemble calls, and callback announcements.',
      detailLabel: 'Recent calls',
      detail:
        'Major Manila musical productions, national tour casting, ensemble singing and dancing callbacks',
      meta: 'Manila productions · national tours',
      status: 'Casting',
      icon: Users,
      filter: { query: 'audition' },
    },
    {
      id: 'workshops',
      title: 'Workshops & Labs',
      description:
        'Playwriting, direction, stage management, and technical theater training.',
      detailLabel: 'Who it is for',
      detail:
        'Musical theater artists, stage directors, playwrights, technical production crews, and stage managers',
      meta: 'Virgin Labfest · technical labs',
      status: 'Open',
      icon: BookOpen,
      filter: { category: 'workshop' },
    },
    {
      id: 'announcements',
      title: 'Announcements & News',
      description:
        'Season announcements, festival calls, and award results.',
      detailLabel: 'Milestones',
      detail:
        'Philstage Gawad Buhay, Palanca Awards for Literature, Fringe Festival calls, and record-breaking original Filipino musicals',
      meta: 'Philstage · Gawad Buhay · festivals',
      status: 'Newsroom',
      icon: Megaphone,
      filter: { category: 'news' },
    },
  ],
};

export const DISCIPLINE_PAGES: Record<DisciplinePageId, DisciplinePageMeta> = {
  dance: DANCE,
  singing: SINGING,
  acting: ACTING,
  theater: THEATER,
};
