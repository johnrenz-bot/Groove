export interface CrewAchievement {
  title: string;
  year?: number | string;
  source_url: string;
}

export interface CrewMember {
  name: string;
  role: string;
  source_url: string;
}

export interface MatchRecap {
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

export interface DanceCrew {
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
  achievements: CrewAchievement[];
  keyMembers: CrewMember[];
  recentRecaps: MatchRecap[];
}

export const FEATURED_CREWS: DanceCrew[] = [
  {
    id: 'brotherhood',
    name: 'The Brotherhood',
    slug: 'brotherhood',
    country: 'Canada',
    city: 'Surrey, BC & Vancouver',
    flag: '🇨🇦',
    division: 'MegaCrew & Adult Division',
    founded: 2011,
    founder: 'Scott Forsyth (Co-Director Adrian Vendiola)',
    rosterStatus: '20 Dancers (2025/2026 Season)',
    bio: 'Founded in 2011 in Surrey, BC by Scott Forsyth. The Brotherhood is celebrated for razor-sharp precision, high-intensity choreography, and world championship titles. In 2025, Brotherhood returned as a founding Pro Team in the International Dance League (IDL).',
    source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
    officialVideoUrl: 'https://www.youtube.com/watch?v=u0OZagcCAfg',
    logo: {
      url: '/logos/crews/brotherhood/Logo.png',
      alt: 'The Brotherhood official logo',
      source_url: 'https://www.brotherhoodcrew.com/',
      verified: true,
    },
    image: {
      url: '/crews/brotherhood/team.png',
      alt: 'The Brotherhood dance crew from Surrey, BC & Vancouver, Canada',
      credit: 'Official Roster Photo · brotherhoodcrew.com',
      source_url: 'https://www.brotherhoodcrew.com/roster',
      license: 'Official promotional team media',
    },
    achievements: [
      {
        title: 'HHI World Hip Hop Dance Championship — Gold (Varsity)',
        year: 2013,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'HHI World Hip Hop Dance Championship — Gold (Adult)',
        year: 2014,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'Body Rock Dance Competition — 1st Place',
        year: 2015,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'VIBE Dance Competition — Champions',
        year: 2017,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'VIBE Dance Competition — Champions',
        year: 2019,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'World of Dance Vancouver — Champions (3 consecutive years: 2013–2015)',
        year: '2013–2015',
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'NBC World of Dance Season 2 — Competitor',
        year: 2018,
        source_url: 'https://en.wikipedia.org/wiki/Brotherhood_(dance_crew)',
      },
      {
        title: 'International Dance League (IDL) Launch Event — 1st Place Pro Team',
        year: 2025,
        source_url: 'https://www.brotherhoodcrew.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Scott Forsyth',
        role: 'Founder & Director',
        source_url: 'https://www.brotherhoodcrew.com/roster',
      },
      {
        name: 'Adrian Vendiola',
        role: 'Director & Captain',
        source_url: 'https://www.brotherhoodcrew.com/roster',
      },
      {
        name: 'Kelvin Tu',
        role: 'Principal Dancer',
        source_url: 'https://www.brotherhoodcrew.com/roster',
      },
    ],
    recentRecaps: [
      {
        id: 'bro-idl-launch-2025',
        event: 'IDL Launch Event',
        stage: 'Pro Team Competition',
        date: '2025',
        result: 'CHAMPION',
        category: 'Pro Team',
        summary:
          'Brotherhood captured 1st place in the inaugural launch event as a founding franchise Pro Team in the International Dance League.',
        source_url: 'https://www.brotherhoodcrew.com/',
      },
    ],
  },
  {
    id: 'jam-republic',
    name: 'Jam Republic',
    slug: 'jam-republic',
    country: 'Philippines',
    city: 'Metro Manila',
    flag: '🇵🇭',
    division: 'MegaCrew & Adult Division',
    founded: 'TBD',
    founder: 'TBD',
    rosterStatus: 'Active Roster',
    bio: 'Jam Republic is a Filipino hip hop dance crew from Metro Manila, known for high-energy, tightly synchronized choreography and for representing the Philippines on international dance stages.',
    source_url: 'https://www.facebook.com/jamrepublic',
    logo: {
      url: '/logos/crews/JamRepublic/Logo.png',
      alt: 'Jam Republic official logo',
      source_url: 'https://www.facebook.com/jamrepublic',
      verified: true,
    },
    image: {
      url: '/crews/jamrepublic/team.png',
      alt: 'Jam Republic dance crew from the Philippines',
      credit: 'Team photo · Jam Republic',
      source_url: 'https://www.facebook.com/jamrepublic',
      license: 'Promotional team media',
    },
    achievements: [],
    keyMembers: [],
    recentRecaps: [],
  },
  {
    id: 'grv',
    name: 'GRV',
    slug: 'grv',
    country: 'TBD',
    city: 'TBD',
    flag: '🏳️',
    division: 'TBD',
    founded: 'TBD',
    founder: 'TBD',
    rosterStatus: 'Active Roster',
    bio: 'GRV is a dance crew featured on the platform. Full profile details are being verified and will be added shortly.',
    source_url: 'https://www.instagram.com/',
    logo: {
      url: '/logos/crews/grv/Logo.png',
      alt: 'GRV official logo',
      source_url: 'https://www.instagram.com/',
      verified: true,
    },
    image: {
      url: '/crews/grv/team.jpg',
      alt: 'GRV dance crew photo',
      credit: 'Team photo · GRV',
      source_url: 'https://www.instagram.com/',
      license: 'Promotional team media',
    },
    achievements: [],
    keyMembers: [],
    recentRecaps: [],
  },
    {
    id: 'royal-family',
    name: 'The Royal Family',
    slug: 'royal-family',
    country: 'New Zealand',
    city: 'Auckland',
    flag: '🇳🇿',
    division: 'Professional/Elite',
    founded: 2006,
    founder: 'Parris Goebel',
    rosterStatus: 'Active Roster',
    bio: 'Architects of "Polyswagg"—a high-energy fusion of Pacific culture and urban dance. One of the most influential crews in commercial dance history, known for their massive sound and visual impact.',
    source_url: 'https://www.theroyalfamilydancecrew.com/crew',
    logo: {
      url: '/logos/crews/RoyalFam/Logo.png',
      alt: 'The Royal Family logo',
      source_url: 'https://www.theroyalfamilydancecrew.com/',
      verified: true,
    },
    image: {
      url: '/crews/Royalfam/team.png',
      alt: 'The Royal Family crew photo',
      credit: 'Official team photo · theroyalfamilydancecrew.com',
      source_url: 'https://www.theroyalfamilydancecrew.com/',
      license: 'Official promotional team media',
    },
    achievements: [
      {
        title: 'World Hip Hop Dance Championships — Megacrew Gold (3x Consecutive)',
        year: '2011–2013',
        source_url: 'https://www.theroyalfamilydancecrew.com/crew',
      },
      {
        title: 'Super Bowl Halftime Show Performance with Rihanna',
        year: 2023,
        source_url: 'https://www.rnz.co.nz/life/culture/south-auckland-dance-crew-showing-the-world-poly-swagg',
      },
    ],
    keyMembers: [
      {
        name: 'Parris Goebel',
        role: 'Founder & Choreographer',
        source_url: 'https://www.theroyalfamilydancecrew.com/crew',
      },
    ],
    recentRecaps: [],
  },
  {
    id: '1million',
    name: '1MILLION Dance Studio',
    slug: '1million',
    country: 'South Korea',
    city: 'Seoul',
    flag: '🇰🇷',
    division: 'Professional/Choreography Collective',
    founded: 2008,
    founder: 'TBD',
    rosterStatus: 'Active Roster',
    bio: '1MILLION Dance Studio is one of South Korea\'s most influential dance studios, based in Seoul. Its choreographers are known worldwide for K-pop choreography, viral dance films, and a polished, high-impact studio style.',
    source_url: 'https://www.youtube.com/@1MILLIONDanceStudio',
    logo: {
      url: '/logos/crews/1million/Logo.png',
      alt: '1MILLION Dance Studio official logo',
      source_url: 'https://www.youtube.com/@1MILLIONDanceStudio',
      verified: true,
    },
    image: {
      url: '/crews/1million/team.png',
      alt: '1MILLION Dance Studio choreographers in Seoul',
      credit: 'Team photo · 1MILLION Dance Studio',
      source_url: 'https://www.youtube.com/@1MILLIONDanceStudio',
      license: 'Promotional team media',
    },
    achievements: [],
    keyMembers: [
      {
        name: 'Lia Kim',
        role: 'Choreographer',
        source_url: 'https://www.youtube.com/@1MILLIONDanceStudio',
      },
      {
        name: 'Mina Myoung',
        role: 'Choreographer',
        source_url: 'https://www.youtube.com/@1MILLIONDanceStudio',
      },
    ],
    recentRecaps: [],
  },
  {
    id: 'jabbawockeez',
    name: 'Jabbawockeez',
    slug: 'jabbawockeez',
    country: 'USA',
    city: 'Las Vegas, NV',
    flag: '🇺🇸',
    division: 'Professional/Elite',
    founded: 2003,
    founder: 'Core members (mask-concept creators)',
    rosterStatus: 'Active Roster',
    bio: 'World-renowned mask-wearing hip hop crew known for their synchronized precision and conceptual storytelling. They rose to global fame after winning the first season of America\'s Best Dance Crew.',
    source_url: 'https://www.jbwkz.com/',
    logo: {
      url: '/logos/crews/jabbawockeez/Logo.png',
      alt: 'Jabbawockeez logo',
      source_url: 'https://www.jbwkz.com/',
      verified: true,
    },
    image: {
      url: '/crews/jabbawockeez/team.png',
      alt: 'Jabbawockeez crew performing live on stage in white masks and black hoodies',
      credit: 'AI-generated illustrative image · jbwkz.com',
      source_url: 'https://www.jbwkz.com/',
      license: 'AI-generated illustrative image',
    },
    achievements: [
      {
        title: 'MTV\'s America\'s Best Dance Crew — Champions (Season 1)',
        year: 2008,
        source_url: 'https://www.jbwkz.com/',
      },
      {
        title: 'America\'s Got Talent — Finalists',
        year: 2011,
        source_url: 'https://www.jbwkz.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Core Members',
        role: 'Performing Artists',
        source_url: 'https://www.jbwkz.com/',
      },
    ],
    recentRecaps: [],
  },
  {
    id: 'kinjaz',
    name: 'Kinjaz',
    slug: 'kinjaz',
    country: 'USA/China',
    city: 'Global',
    flag: '🇺🇸',
    division: 'Professional/Creative',
    founded: 2009,
    founder: 'Core Creative Collective',
    rosterStatus: 'Active Roster',
    bio: 'A creative collective blending urban dance with a distinct "Kinjaz" aesthetic, known for intricate choreography and global influence. They are recognized for bridging eastern and western dance cultures.',
    source_url: 'https://www.kinjaz.com/',
    logo: {
      url: '/logos/kinjaz.jpg',
      alt: 'Kinjaz logo',
      source_url: 'https://www.kinjaz.com/',
      verified: true,
    },
    image: {
      url: '/crews/kinjaz/team.png',
      alt: 'Kinjaz urban dance collective crew photo',
      credit: 'AI-generated illustrative image · kinjaz.com',
      source_url: 'https://www.kinjaz.com/',
      license: 'AI-generated illustrative image',
    },
    achievements: [
      {
        title: 'Featured on NBC\'s World of Dance',
        year: 2017,
        source_url: 'https://www.kinjaz.com/',
      },
      {
        title: 'MTV\'s America\'s Best Dance Crew — Competitor',
        year: 2013,
        source_url: 'https://www.kinjaz.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Kinjaz Collective',
        role: 'Choreographers & Artists',
        source_url: 'https://www.kinjaz.com/',
      },
    ],
    recentRecaps: [],
  },

];