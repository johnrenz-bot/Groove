/**
 * Editorial presentation layer for the performing-arts hub.
 *
 * This file holds ONLY presentation metadata — which existing record gets which
 * image, what that image actually shows, and which Groove feature links sit
 * beside it. Every fact, title, excerpt, date, organisation and external URL
 * lives in `./content.ts` and is reused from there rather than restated, so the
 * portal pages and the public page can never disagree about what is claimed.
 *
 * IMAGE PROVENANCE
 * ----------------
 * Images come from one of exactly three places, and `credit` on each entry
 * records which:
 *
 *   1. `ccp-*`  — photographs published by the Cultural Center of the
 *      Philippines on its own Digital Archives host
 *      (digitalarchives.culturalcenter.gov.ph). These depict named, real CCP
 *      productions and resident companies, so the card shows the actual
 *      organisation rather than a stand-in.
 *   2. `*-mark` — an organisation's own published logo/brand asset, downloaded
 *      from that organisation's website.
 *   3. `stock-*` — an original performance photograph already bundled with this
 *      app under /public. Used ONLY where no authentic image of the subject
 *      could be sourced, and only for subjects that are categories or
 *      disciplines rather than named companies.
 *
 * Nothing here was found via a general image search: search results for these
 * organisations were actively misleading (a political rally for "Tanghalang
 * Pilipino", a Javanese royal title for "PETA", a tree for "Ballet Philippines").
 * Every image below was opened and looked at before being recorded.
 *
 * `alt` describes what is visible in the photograph. It does not assert an
 * organisation the image cannot be shown to depict — where a card has no
 * verified photograph, `alt` and `credit` say so rather than implying one.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Footprints,
  Music2,
  Drama,
  Mic,
  Landmark,
  Sparkles,
  CalendarDays,
  Users,
  Compass,
} from 'lucide-react';
import type { CategoryId } from './content';

export type HubRole = 'client' | 'coach' | 'public';

export interface HubImage {
  src: string;
  /** Describes what is visible. Never asserts an unverifiable organisation. */
  alt: string;
  /** Who published it, shown on the card. */
  credit: string;
  /** Link to the original, where the publisher exposes one. */
  sourceUrl?: string;
  /**
   * True when this is a stand-in rather than a photograph of the subject.
   * Surfaced in the UI so a visitor is never shown a generic image under an
   * implied claim of authenticity.
   */
  isPlaceholder?: boolean;
}

/**
 * Images published by the Cultural Center of the Philippines for its own
 * productions, taken from its Digital Archives. `verified: '2026-10-11'`.
 */
const CCP_ARCHIVES = 'https://digitalarchives.culturalcenter.gov.ph/';

/** Images published by the named organisation itself. */
const ORG_SITES = {
  ballet: 'https://www.ballet.ph/',
  peta: 'https://petatheater.com/',
  pfds: 'https://www.philippinefolkdancesociety.com/',
} as const;

/** Performance photographs already bundled with the app. */
const BUNDLED = {
  stage: '/image/bg/hero-stage.jpg',
  heritageStage: '/image/bg/hero-theater.jpg',
  soloDance: '/image/bg/dance-hero.jpg',
  partneredDance: '/image/wc/dance.jpg',
  curtain: '/image/wc/theater.jpg',
  folkStage: '/image/wc/acting.jpg',
  liveMusic: '/image/login/arti.jpg',
} as const;

const PA = '/image/pa/';

/**
 * Verified registry of every image the hub can show.
 *
 * Named so a card refers to a SUBJECT ("bayanihan"), never to a file — which is
 * what makes the no-reuse check in verify-pa-image-map.mjs meaningful.
 */
export const HUB_IMAGES = {
  /* ---- Cultural Center of the Philippines — own production photographs --- */
  ccpTanghalangPilipino: {
    src: `${PA}ccp-tanghalang-pilipino.jpg`,
    alt: 'A performer in a wheelchair centre stage, framed by a large wing-shaped set piece and amber stage light.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/banner-images/Banner-Tanghalang%20Pilipino%20-%20Mabining%20Mandirigma.jpeg`,
  },
  ccpBalletPhilippines: {
    src: `${PA}ccp-ballet-philippines-paglalakbay.jpg`,
    alt: 'Nine dancers in straw-coloured costumes frozen mid-leap against a plain studio backdrop.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/banner-images/Banner-Paglalakbay%20The%20Journey%20of%20the%20Sea%20People%20by%20Ballet%20Philippines%202.jpeg`,
  },
  ccpPhilippinePhilharmonic: {
    src: `${PA}ccp-philippine-philharmonic.jpg`,
    alt: 'A violinist in white concert dress bowing, with the rest of the orchestra seated behind in shadow.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/banner-images/Banner-Philippine%20Philharmonic%20Orchestra%2041st%20Concert%20Season%20Concert%20VIII%20Coda%202.jpeg`,
  },
  ccpEasternChamberSingers: {
    src: `${PA}ccp-eastern-chamber-singers.jpg`,
    alt: 'A large choir in red and cream barong-style dress performing together on a darkened stage.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-02-01-2026%20Eastern%20Chamber%20Singers%20%5BADARNA%5D1.png`,
  },
  ccpManilaSounds: {
    src: `${PA}ccp-manila-sounds.jpg`,
    alt: 'Promotional poster for Manila Sounds, a concert of Filipino folk song by the Ugnayan ng Diwata ensemble.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/collection-images/Col-Manila%20Sounds%20Saliw%20ng%20Himig%20ng%20Maynila.jpg`,
  },
  ccpVamosABelen: {
    src: `${PA}ccp-vamos-a-belen.jpg`,
    alt: 'Dancers in full traditional costume with woven shawls and floral garlands performing in a folk-dance competition.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-12-20-2025%20Vamos%20A%20Belen%205.jpeg`,
  },
  ccpIntramurosEvenings: {
    src: `${PA}ccp-intramuros-evenings.jpg`,
    alt: 'Two singers holding clasped hands mid-performance, in embroidered traditional dress before a chorus in raised fists.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-12-13-2025%20Intramuros%20Evenings%20-%20Christmas%20Harmonies%202.jpeg`,
  },
  ccpPpoOpera: {
    src: `${PA}ccp-ppo-opera.jpg`,
    alt: 'A soloist and conductor at the front of a full symphony orchestra under blue stage light.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-03-13-2026%20Philippine%20Philharmonic%20Orchestra%20Versatile%20%E2%80%93%20Concert%20VII%20Opera%202.jpeg`,
  },
  ccpPpoPreludi: {
    src: `${PA}ccp-ppo-preludi.jpg`,
    alt: 'A full orchestra in concert dress seen from the stalls, with the conductor on a lit podium.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-01-16-2026%20PPO%2041%20Versatile%20%5BConcert%20V%20%E2%80%93%20Preludi%5D5.png`,
  },
  ccpVamosABelenAlt: {
    src: `${PA}ccp-vamos-a-belen-alt.jpg`,
    alt: 'Performers in woven traditional costume dancing on a blue-lit stage with live musicians seated at the side.',
    credit: 'Cultural Center of the Philippines',
    sourceUrl: `${CCP_ARCHIVES}storage/entity-images/Ent-12-19-2025%20Vamos%20A%20Belen%201.jpeg`,
  },

  /* --------------- Organisations' own published brand assets --------------- */
  balletPhilippinesMark: {
    src: `${PA}ballet-philippines-mark.png`,
    alt: 'The Ballet Philippines circular logo mark.',
    credit: 'Ballet Philippines',
    sourceUrl: ORG_SITES.ballet,
  },
  balletPhilippinesCover: {
    src: `${PA}ballet-philippines-cover.jpg`,
    alt: 'A Ballet Philippines season banner in wide format.',
    credit: 'Ballet Philippines',
    sourceUrl: ORG_SITES.ballet,
  },
  petaMark: {
    src: `${PA}peta-mark.webp`,
    alt: 'The PETA Theater wordmark, set in a red brushstroke script.',
    credit: 'PETA Theater',
    sourceUrl: ORG_SITES.peta,
  },
  pfdsMark: {
    src: `${PA}pfds-mark.jpg`,
    alt: 'The Philippine Folk Dance Society seal, reading PHILIPPINE FOLK DANCE SOCIETY 1949.',
    credit: 'Philippine Folk Dance Society',
    sourceUrl: ORG_SITES.pfds,
  },

  /* ---- Bundled originals — used only for subjects, not named companies --- */
  stockStage: {
    src: BUNDLED.stage,
    alt: 'An ensemble performing under warm spotlights on a proscenium stage, seen through stage haze.',
    credit: 'Groove Performing Arts',
  },
  stockHeritageStage: {
    src: BUNDLED.heritageStage,
    alt: 'A folkloric ensemble in colourful costumes on a stage framed by woven-pattern panels before a seated audience.',
    credit: 'Groove Performing Arts',
  },
  stockSoloDance: {
    src: BUNDLED.soloDance,
    alt: 'A solo dancer in a flowing gold dress mid-turn under warm stage lighting.',
    credit: 'Groove Performing Arts',
  },
  stockPartneredDance: {
    src: BUNDLED.partneredDance,
    alt: 'Two dancers performing an acrobatic lift, framed by red and violet aerial silks on a dark stage.',
    credit: 'Groove Performing Arts',
  },
  stockCurtain: {
    src: BUNDLED.curtain,
    alt: 'A performer parting heavy red stage curtains, backlit so a long shadow falls downstage.',
    credit: 'Groove Performing Arts',
  },
  stockFolkStage: {
    src: BUNDLED.folkStage,
    alt: 'A costumed stage performer with one arm raised, backed by an ensemble against a painted tropical backdrop.',
    credit: 'Groove Performing Arts',
  },
  stockLiveMusic: {
    src: BUNDLED.liveMusic,
    alt: 'A performer singing into a microphone stand on a runway stage as confetti falls over the crowd.',
    credit: 'Groove Performing Arts',
  },
} as const satisfies Record<string, HubImage>;

export type HubImageKey = keyof typeof HUB_IMAGES;

export interface EditorialCategory {
  id: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  image: HubImage;
  target: CategoryId;
}

/**
 * Six visual entry points, each on its own distinct photograph.
 */
export const EDITORIAL_CATEGORIES: EditorialCategory[] = [
  {
    id: 'dance',
    label: 'Dance',
    blurb:
      'Classical technique, contemporary choreography and the professional companies that sustain them.',
    icon: Footprints,
    image: HUB_IMAGES.ccpBalletPhilippines,
    target: 'contemporary-dance',
  },
  {
    id: 'music',
    label: 'Music',
    blurb:
      'Kundiman, rondalla and the kulintang gong traditions of Mindanao and the Sulu Archipelago.',
    icon: Music2,
    image: HUB_IMAGES.ccpManilaSounds,
    target: 'music',
  },
  {
    id: 'theater',
    label: 'Theater',
    blurb:
      'Resident companies, independent producers and the long tradition of staging Filipino history.',
    icon: Drama,
    image: HUB_IMAGES.ccpTanghalangPilipino,
    target: 'theater',
  },
  {
    id: 'vocal',
    label: 'Vocal Performance',
    blurb:
      'From the kundiman love song to contemporary songwriters and the training that supports both.',
    icon: Mic,
    image: HUB_IMAGES.ccpEasternChamberSingers,
    target: 'music',
  },
  {
    id: 'traditional',
    label: 'Traditional Arts',
    blurb:
      'Folkloric dance and stage traditions, each described in the community it belongs to.',
    icon: Landmark,
    image: HUB_IMAGES.ccpVamosABelen,
    target: 'traditional-dance',
  },
  {
    id: 'contemporary',
    label: 'Contemporary Performance',
    blurb:
      'Where the sector is going: new choreography, new work, and the institutions commissioning it.',
    icon: Sparkles,
    image: HUB_IMAGES.ccpPhilippinePhilharmonic,
    target: 'contemporary-dance',
  },
];

/**
 * Cross-collection duplicates are permitted in exactly one case: an article
 * reusing the photograph of the organisation it is about. "Ballet Philippines
 * and the Professionalization of Dance" showing a Ballet Philippines
 * performance is the correct picture, not a repeat.
 *
 * Every such pairing is named here, so verify-pa-image-map.mjs can fail on an
 * accidental duplicate instead of silently allowing one.
 */
export const INTENTIONAL_IMAGE_SHARES: Record<string, string> = {
  'cultural-policy-framework': 'ncca',
  'lumad-arts-museum': 'nmp',
  'bayanihan-national-folk-dance-company': 'bayanihan',
  'ballet-philippines-legacy': 'ballet-ph',
  'tanghalang-pilipino-mandate': 'tanghalang-pilipino',
  'peta-theater-education': 'peta',
  'folk-dance-society-workshops': 'pfds',
  'rofg-documentation': 'rofg',
};

/**
 * Per-record image assignment.
 *
 * No two ORGANISATION cards share a photograph and no two ARTICLE cards share
 * one — repeated thumbnails across an unrelated grid is what made the page read
 * as filler. The only permitted overlap is the one named above.
 *
 * Where no authentic photograph of a named organisation could be sourced and
 * licensed, the entry is marked `isPlaceholder`, and the card says so in words
 * rather than letting a stand-in imply a connection that does not exist.
 */
export const ORG_IMAGES: Record<string, HubImage> = {
  // Government bodies publish no performance photography of their own.
  ncca: {
    src: HUB_IMAGES.stockCurtain.src,
    alt: 'A representative theatre image: a performer parting red stage curtains under a single overhead light.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  ccp: HUB_IMAGES.ccpIntramurosEvenings,
  'ccp-directory': {
    src: HUB_IMAGES.stockStage.src,
    alt: 'A representative image of a performing ensemble: performers under warm spotlights on a proscenium stage.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  nmp: {
    src: HUB_IMAGES.stockHeritageStage.src,
    alt: 'A representative heritage image: an ensemble in traditional costume on a stage framed by woven-pattern panels.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  pia: {
    src: HUB_IMAGES.stockLiveMusic.src,
    alt: 'A representative image of a public Philippine performance: a singer at a microphone stand before a crowd.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  'ballet-ph': HUB_IMAGES.ccpBalletPhilippines,
  // No photograph of Bayanihan performing could be sourced and licensed; an
  // authentic CCP folk-dance photograph stands in and is labelled as such.
  bayanihan: {
    ...HUB_IMAGES.ccpVamosABelen,
    alt: 'A representative folk-dance image: dancers in traditional costume with woven shawls in a competition.',
    credit: 'Cultural Center of the Philippines (representative image)',
    isPlaceholder: true,
  },
  // ROFG's only published brand asset is a generic house glyph, which would be
  // actively misleading. A labelled stand-in is used instead.
  rofg: {
    ...HUB_IMAGES.ccpVamosABelenAlt,
    alt: 'A representative folkloric stage image: performers in woven costume dancing beside live musicians.',
    credit: 'Cultural Center of the Philippines (representative image)',
    isPlaceholder: true,
  },
  'tanghalang-pilipino': HUB_IMAGES.ccpTanghalangPilipino,
  peta: HUB_IMAGES.petaMark,
  pfds: HUB_IMAGES.pfdsMark,
  'ccp-orchestra': HUB_IMAGES.ccpPhilippinePhilharmonic,
  'ccp-venues': {
    src: HUB_IMAGES.stockPartneredDance.src,
    alt: 'A representative image of performers using a stage: two dancers in an acrobatic lift under stage lighting.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
};

export const ARTICLE_IMAGES: Record<string, HubImage> = {
  // Articles whose subject is an organisation reuse that organisation's card
  // image — see INTENTIONAL_IMAGE_SHARES.
  'cultural-policy-framework': ORG_IMAGES.ncca,
  'lumad-arts-museum': ORG_IMAGES.nmp,
  'bayanihan-national-folk-dance-company': ORG_IMAGES.bayanihan,
  'ballet-philippines-legacy': HUB_IMAGES.ccpBalletPhilippines,
  'tanghalang-pilipino-mandate': HUB_IMAGES.ccpTanghalangPilipino,
  'peta-theater-education': HUB_IMAGES.petaMark,
  'folk-dance-society-workshops': HUB_IMAGES.pfdsMark,
  'rofg-documentation': ORG_IMAGES.rofg,
  // Articles with no single organisation to point at.
  'ccp-at-60': HUB_IMAGES.ccpEasternChamberSingers,
  'kundiman-and-rondalla': HUB_IMAGES.ccpManilaSounds,
  'national-artist-composers': HUB_IMAGES.ccpPpoOpera,
  'tinikling-and-the-visayas': {
    src: HUB_IMAGES.stockFolkStage.src,
    alt: 'A representative folk-dance image: a costumed performer with one arm raised before an ensemble.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  'singkil-maranao-cosmic-dance': {
    src: HUB_IMAGES.stockSoloDance.src,
    alt: 'A representative dance image: a solo dancer in a flowing gold dress mid-turn under warm stage light.',
    credit: 'Groove Performing Arts (representative image)',
    isPlaceholder: true,
  },
  'kulintang-mindanao': {
    ...HUB_IMAGES.ccpPpoPreludi,
    alt: 'A representative image of a performing ensemble: an orchestra in concert dress seen from the stalls, conductor on a lit podium.',
    credit: 'Cultural Center of the Philippines (representative image)',
    isPlaceholder: true,
  },
  'national-artists-dance-theater': {
    ...HUB_IMAGES.balletPhilippinesMark,
    alt: 'A representative image of a resident dance company: the Ballet Philippines circular logo mark.',
    credit: 'Ballet Philippines (representative image)',
    isPlaceholder: true,
  },
  'participation-guide': {
    ...HUB_IMAGES.balletPhilippinesCover,
    alt: 'A representative image of a Philippine dance company presenting its work: a Ballet Philippines season banner.',
    credit: 'Ballet Philippines (representative image)',
    isPlaceholder: true,
  },
};

export interface HubFeatureLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The Groove destinations a reader is most likely to want next. */
export const GROOVE_FEATURES: Record<HubRole, HubFeatureLink[]> = {
  client: [
    {
      href: '/client/talent',
      label: 'Find a coach',
      description: 'Browse verified coaches and studios, then book a session.',
      icon: Compass,
    },
    {
      href: '/client/appointments',
      label: 'Your appointments',
      description: 'Track upcoming sessions and review past bookings.',
      icon: CalendarDays,
    },
    {
      href: '/users',
      label: 'Community directory',
      description: 'Connect with performers and peers across San Jose del Monte.',
      icon: Users,
    },
    {
      href: '/client/groovey',
      label: 'Ask Groovey',
      description: 'Get help finding a coach or understanding a discipline.',
      icon: Sparkles,
    },
  ],
  coach: [
    {
      href: '/coach/talents',
      label: 'Your showcase',
      description: 'Curate the profile clients see when they discover you.',
      icon: Compass,
    },
    {
      href: '/coach/appointments',
      label: 'Your bookings',
      description: 'Manage session requests, schedules and confirmations.',
      icon: CalendarDays,
    },
    {
      href: '/users',
      label: 'Community directory',
      description: 'Connect with other coaches, performers and collaborators.',
      icon: Users,
    },
    {
      href: '/coach/calendar',
      label: 'Availability',
      description: 'Keep your teaching schedule visible and accurate.',
      icon: CalendarDays,
    },
  ],
  public: [
    {
      href: '/login',
      label: 'Sign in to Groove',
      description: 'Access bookings, messaging and your performer profile.',
      icon: Compass,
    },
    {
      href: '/users',
      label: 'Community directory',
      description: 'Browse the performers and coaches on the platform.',
      icon: Users,
    },
    {
      href: '/register/client',
      label: 'Join as a performer',
      description: 'Create a client account to book and collaborate.',
      icon: Sparkles,
    },
  ],
};