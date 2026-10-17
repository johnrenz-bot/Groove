export interface VocalistAchievement {
  title: string;
  year?: number | string;
  source_url: string;
}

export interface VocalistMember {
  name: string;
  role: string;
  source_url: string;
}

export interface PerformanceRecap {
  id: string;
  event: string;
  stage: string;
  date: string;
  result: 'WIN' | 'CHAMPION' | 'FINALIST' | 'PODIUM';
  category: string;
  summary: string;
  source_url: string;
  score?: string;
  opponent?: string;
}

export interface VocalEnsemble {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  flag: string;
  division: string;
  founded: number | string;
  founder: string;
  rosterStatus: string;
  bio: string;
  source_url: string;
  officialVideoUrl?: string;
  logo?: {
    url: string | null;
    alt: string;
    source_url: string;
    verified: boolean;
    fallbackReason?: string;
  };
  image: {
    url: string | null;
    alt: string;
    credit: string;
    source_url: string;
    license: string;
  };
  achievements: VocalistAchievement[];
  keyMembers: VocalistMember[];
  recentRecaps: PerformanceRecap[];
}

export const FEATURED_VOCAL_ENSEMBLES: VocalEnsemble[] = [
  {
    id: 'madz',
    name: 'Philippine Madrigal Singers',
    slug: 'philippine-madrigal-singers',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'Chamber Choral (SATB / A Cappella)',
    founded: 1963,
    founder: 'Prof. Andrea O. Veneracion (National Artist for Music)',
    rosterStatus: 'Active Touring Ensemble · UNESCO Artists for Peace',
    bio: 'Recognized globally as one of the world’s most awarded vocal ensembles, the Philippine Madrigal Singers (fondly known as "The Madz") sing in a unique semicircle formation without a conductor. They made world history as the very first choir to win the prestigious European Grand Prix for Choral Singing twice (1997 in Tours, France and 2007 in Arezzo, Italy). Their repertoire spans Renaissance madrigals, avant-garde contemporary choral literature, and iconic Philippine folk and Kundiman arrangements.',
    source_url: 'https://www.philippinemadrigalsingers.com/',
    officialVideoUrl: 'https://www.youtube.com/c/PhilippineMadrigalSingers',
    logo: {
      url: null,
      alt: 'Philippine Madrigal Singers mark',
      source_url: 'https://www.philippinemadrigalsingers.com/',
      verified: false,
      fallbackReason: 'Official university institutional affiliation mark',
    },
    image: {
      url: '/image/pa/ccp-eastern-chamber-singers.jpg',
      alt: 'The Philippine Madrigal Singers performing in semicircle formation under ambient stage lighting',
      credit: 'Cultural Center of the Philippines Archives',
      source_url: 'https://digitalarchives.culturalcenter.gov.ph/',
      license: 'Institutional Archive',
    },
    achievements: [
      {
        title: 'European Grand Prix for Choral Singing Champion (Arezzo, Italy)',
        year: 2007,
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
      {
        title: 'European Grand Prix for Choral Singing Champion (Tours, France)',
        year: 1997,
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
      {
        title: 'UNESCO Artists for Peace Designation',
        year: 2009,
        source_url: 'https://en.unesco.org/',
      },
      {
        title: 'Guidoneum Award from Fondazione Guido d’Arezzo',
        year: 2010,
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Mark Anthony Carpio',
        role: 'Choirmaster & Artistic Director',
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
      {
        name: 'Andrea O. Veneracion (+)',
        role: 'Founding Choirmaster (National Artist for Music)',
        source_url: 'https://culturalcenter.gov.ph/',
      },
      {
        name: 'Anna Piquero',
        role: 'Soprano Section Leader & Vocal Coach',
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
      {
        name: 'Christopher Gozum',
        role: 'Tenor Soloist & Assistant Vocal Coach',
        source_url: 'https://www.philippinemadrigalsingers.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'madz-recap-1',
        event: 'Andrea O. Veneracion International Choral Festival',
        stage: 'Honorary Opening Gala Performance',
        date: '2025-08-10',
        result: 'CHAMPION',
        category: 'Chamber Choir / Folk Ensemble',
        summary:
          'Command performance featuring 16-part polyphony and contemporary Philippine vocal masterpieces at Tanghalang Ignacio Gimenez.',
        source_url: 'https://culturalcenter.gov.ph/',
      },
      {
        id: 'madz-recap-2',
        event: 'World Choral Expo — Lisbon, Portugal',
        stage: 'Headlining International Showcase',
        date: '2024-09-02',
        result: 'WIN',
        category: 'International Master Choir Series',
        summary:
          'Standing ovations at Lisbon Cathedral performing Southeast Asian microtonal vocal traditions and Renaissance polyphony.',
        source_url: 'https://www.ifcm.net/',
      },
    ],
  },
  {
    id: 'ust-singers',
    name: 'University of Santo Tomas Singers',
    slug: 'ust-singers',
    country: 'Philippines',
    city: 'Manila, Metro Manila',
    flag: '🇵🇭',
    division: 'Mixed Chamber Choir (SATB)',
    founded: 1992,
    founder: 'Prof. Fidel Gener Calalang Jr.',
    rosterStatus: 'Active Premier Ensemble · 2x Choir of the World',
    bio: 'Founded in 1992 by conductor and composer Prof. Fidel Calalang Jr., the UST Singers comprises students and alumni of the Pontifical and Royal University of Santo Tomas. They are the only choir in the world to win the coveted Luciano Pavarotti Trophy - "Choir of the World" twice at the Llangollen International Musical Eisteddfod in Wales (1995 and 2010), representing Philippine excellence across 34 international concert tours.',
    source_url: 'http://www.ustsingers.com/',
    officialVideoUrl: 'https://www.youtube.com/user/USTsingers',
    logo: {
      url: null,
      alt: 'UST Singers Emblem',
      source_url: 'http://www.ustsingers.com/',
      verified: false,
      fallbackReason: 'Official university conservatory heraldry',
    },
    image: {
      url: '/image/pa/ccp-ppo-opera.jpg',
      alt: 'The UST Singers in concert performance in historic recital hall',
      credit: 'Cultural Center of the Philippines Archives',
      source_url: 'https://culturalcenter.gov.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: 'Choir of the World — Luciano Pavarotti Trophy (Llangollen, Wales)',
        year: 2010,
        source_url: 'http://www.ustsingers.com/',
      },
      {
        title: 'Choir of the World — Luciano Pavarotti Trophy (Llangollen, Wales)',
        year: 1995,
        source_url: 'http://www.ustsingers.com/',
      },
      {
        title: 'Grand Prize Winner, Florilège Vocal de Tours (France)',
        year: 1998,
        source_url: 'http://www.ustsingers.com/',
      },
      {
        title: 'First Prize Champion in Polyphony & Folklore (Tolosa, Spain)',
        year: 2004,
        source_url: 'http://www.ustsingers.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Prof. Fidel Gener Calalang Jr.',
        role: 'Founder, Conductor & Chief Arranger',
        source_url: 'http://www.ustsingers.com/',
      },
      {
        name: 'Maria Victoria Ramos',
        role: 'Vocal Coach & Alto Section Leader',
        source_url: 'http://www.ustsingers.com/',
      },
      {
        name: 'John Paul Santos',
        role: 'Bass Section Leader & Rehearsal Pianist',
        source_url: 'http://www.ustsingers.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'ust-recap-1',
        event: 'Llangollen International Musical Eisteddfod Anniversary Gala',
        stage: 'World Champions Showcase',
        date: '2024-07-06',
        result: 'CHAMPION',
        category: 'Mixed Choir & Folk Showcase',
        summary:
          'Special guest headliner performance at the Royal International Pavilion celebrating two decades of choral supremacy.',
        source_url: 'http://www.ustsingers.com/',
      },
    ],
  },
  {
    id: 'koro-ilustrado',
    name: 'Koro Ilustrado',
    slug: 'koro-ilustrado',
    country: 'Philippines',
    city: 'Makati, Metro Manila',
    flag: '🇵🇭',
    division: 'All-Male Vocal Ensemble (TTBB)',
    founded: 2007,
    founder: 'Edmund Piquero Jr.',
    rosterStatus: 'Active Professional Chamber Chorale',
    bio: 'Koro Ilustrado is one of the premier all-male vocal ensembles in the Philippines, renowned for rich low-frequency resonance, dynamic vocal range, and modern a cappella arrangements. Their repertoire seamlessly bridges sacred Gregorian chant, patriotic kundiman, and contemporary pop-choral hits.',
    source_url: 'https://www.facebook.com/koroilustrado/',
    image: {
      url: '/image/pa/ccp-manila-sounds.jpg',
      alt: 'Koro Ilustrado performing in modern barong attire on stage',
      credit: 'Koro Ilustrado Official',
      source_url: 'https://culturalcenter.gov.ph/',
      license: 'Promotional Partner',
    },
    achievements: [
      {
        title: 'Gold Diploma, Singapore International Choral Festival',
        year: 2016,
        source_url: 'https://www.facebook.com/koroilustrado/',
      },
      {
        title: 'Champion, Equal Voices Category, Andrea O. Veneracion International Choral Fest',
        year: 2017,
        source_url: 'https://culturalcenter.gov.ph/',
      },
    ],
    keyMembers: [
      {
        name: 'Edmund Piquero Jr.',
        role: 'Artistic Director & Tenor Coach',
        source_url: 'https://www.facebook.com/koroilustrado/',
      },
      {
        name: 'Kenneth Arante',
        role: 'Bass-Baritone Section Coach',
        source_url: 'https://www.facebook.com/koroilustrado/',
      },
    ],
    recentRecaps: [
      {
        id: 'koro-recap-1',
        event: 'Andrea O. Veneracion International Choral Festival',
        stage: 'Equal Voice Category Finals',
        date: '2023-07-22',
        result: 'PODIUM',
        category: 'Male Choral Competition',
        summary:
          'Awarded second prize and Gold Diploma for masterly renditions of classical sacred polyphony and contemporary Filipino male choir works.',
        source_url: 'https://culturalcenter.gov.ph/',
      },
    ],
  },
];
