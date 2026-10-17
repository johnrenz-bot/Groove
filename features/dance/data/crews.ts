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
    country: 'International',
    city: 'Auckland & Singapore',
    flag: '🌐',
    division: 'Elite Agency & Street Woman Fighter 2 Finalist Crew',
    founded: 2010,
    founder: 'Nicholas Ong (Nick Six)',
    rosterStatus: 'Active Roster (SWF2 Finalists)',
    bio: 'Jam Republic The Agency is an international dance talent collective founded by Nicholas Ong (Nick Six), representing premier choreographers and commercial dancers globally. In 2023, the Jam Republic crew achieved global renown as finalists on Mnet\'s Street Woman Fighter 2.',
    source_url: 'https://jamrepublicagency.com/',
    logo: {
      url: '/logos/crews/JamRepublic/Logo.png',
      alt: 'Jam Republic official logo',
      source_url: 'https://jamrepublicagency.com/',
      verified: true,
    },
    image: {
      url: '/crews/jamrepublic/team.png',
      alt: 'Jam Republic dance crew on stage',
      credit: 'Team photo · Jam Republic Agency',
      source_url: 'https://jamrepublicagency.com/',
      license: 'Promotional team media',
    },
    achievements: [
      {
        title: 'Mnet Street Woman Fighter 2 — Finalist Crew (2nd Place)',
        year: 2023,
        source_url: 'https://jamrepublicagency.com/',
      },
      {
        title: 'World Tour & Music Video Choreography (Justin Bieber, Rihanna, TWICE, CL)',
        year: '2015–2026',
        source_url: 'https://jamrepublicagency.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Nicholas Ong (Nick Six)',
        role: 'Founder & CEO',
        source_url: 'https://jamrepublicagency.com/',
      },
      {
        name: 'Kirsten Dodgen',
        role: 'Principal Choreographer & SWF2 Leader',
        source_url: 'https://jamrepublicagency.com/',
      },
      {
        name: 'Latrice Kabamba',
        role: 'Choreographer & SWF2 Dancer',
        source_url: 'https://jamrepublicagency.com/',
      },
      {
        name: 'Audrey Lane',
        role: 'Choreographer & SWF2 Dancer',
        source_url: 'https://jamrepublicagency.com/',
      },
    ],
    recentRecaps: [],
  },
  {
    id: 'grv',
    name: 'GRV',
    slug: 'grv',
    country: 'USA',
    city: 'Walnut & Anaheim, California',
    flag: '🇺🇸',
    division: 'Adult Division & IDL Pro Team',
    founded: 2007,
    founder: 'David Lim, Jeff Baluyut, Angelie Descalzo, Valerie Meneses',
    rosterStatus: 'Active Roster (IDL Champions)',
    bio: 'Founded in Walnut, California in 2007, GRV is one of the world\'s premier adult urban dance teams, celebrated for powerhouse synchronized choreography, stage storytelling, and operating Offstage Dance Studio in Anaheim. In 2026, GRV captured the inaugural International Dance League (IDL) Championship title.',
    source_url: 'https://www.idl.pro/',
    logo: {
      url: '/logos/crews/grv/Logo.png',
      alt: 'GRV official logo',
      source_url: 'https://www.idl.pro/',
      verified: true,
    },
    image: {
      url: '/crews/grv/team.jpg',
      alt: 'GRV dance crew photo',
      credit: 'Team photo · GRV / IDL',
      source_url: 'https://www.idl.pro/',
      license: 'Promotional team media',
    },
    achievements: [
      {
        title: 'International Dance League (IDL) Championship — 1st Place Champions (94.00)',
        year: 2026,
        source_url: 'https://www.idl.pro/',
      },
      {
        title: 'VIBE Dance Competition — 1st Place Champions',
        year: 2016,
        source_url: 'https://www.idl.pro/',
      },
      {
        title: 'World of Dance Los Angeles — 1st Place Champions',
        year: 2015,
        source_url: 'https://www.worldofdance.com/',
      },
      {
        title: 'Body Rock Dance Competition — 1st Place Champions',
        year: 2014,
        source_url: 'https://www.idl.pro/',
      },
    ],
    keyMembers: [
      {
        name: 'David Lim',
        role: 'Co-Founder & Artistic Director',
        source_url: 'https://www.idl.pro/',
      },
      {
        name: 'Valerie Meneses',
        role: 'Co-Founder & Executive Director',
        source_url: 'https://www.idl.pro/',
      },
    ],
    recentRecaps: [
      {
        id: 'grv-idl-championship-2026',
        event: 'IDL 2026 Championship',
        stage: 'Finals (Shrine Expo Hall)',
        date: '2026',
        result: 'CHAMPION',
        category: 'Pro Team',
        summary:
          'GRV captured the inaugural IDL Pro Team Championship title scoring 94.00 to edge out Brotherhood at the Shrine Expo Hall in Los Angeles.',
        source_url: 'https://www.idl.pro/',
        score: '94.00',
      },
    ],
  },
  {
    id: 'royal-family',
    name: 'The Royal Family',
    slug: 'royal-family',
    country: 'New Zealand',
    city: 'Auckland',
    flag: '🇳🇿',
    division: 'Professional/MegaCrew Elite',
    founded: 2006,
    founder: 'Parris Goebel',
    rosterStatus: 'Active Global Roster',
    bio: 'Architects of "Polyswagg"—a high-energy fusion of Pacific culture, hip hop, and commercial dance. Created by world-renowned choreographer Parris Goebel at The Palace Dance Studio in Auckland, The Royal Family is one of the most dominant mega-crews in international dance history.',
    source_url: 'https://www.theroyalfamilydancecrew.com/',
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
        title: 'World Hip Hop Dance Championships (HHI) — MegaCrew Gold (3x Consecutive)',
        year: '2011–2013',
        source_url: 'https://www.theroyalfamilydancecrew.com/',
      },
      {
        title: 'World Hip Hop Dance Championships (HHI) — Adult Division Gold',
        year: '2011, 2012, 2013',
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'World Hip Hop Dance Championships (HHI) — Varsity Division Gold',
        year: '2011, 2012',
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'Super Bowl LVII Halftime Show with Rihanna — Featured Dancers',
        year: 2023,
        source_url: 'https://www.theroyalfamilydancecrew.com/',
      },
      {
        title: 'Justin Bieber "Purpose: The Movement" — Full Album Choreography & Videos',
        year: 2015,
        source_url: 'https://www.theroyalfamilydancecrew.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Parris Goebel',
        role: 'Founder, Choreographer & Artistic Director',
        source_url: 'https://www.theroyalfamilydancecrew.com/',
      },
    ],
    recentRecaps: [],
  },
  {
    id: 'legit-status',
    name: 'Legit Status',
    slug: 'legit-status',
    country: 'Philippines',
    city: 'Metro Manila',
    flag: '🇵🇭',
    division: 'MegaCrew & Varsity Division',
    founded: 2009,
    founder: 'Vimi Rivera',
    rosterStatus: 'Active Roster (World Champions)',
    bio: 'Legit Status is a premier Philippine street dance company founded in 2009 by Vimi Rivera. In 2023, Legit Status made international dance history by winning the Gold Medal in the MegaCrew Division at the World Hip Hop Dance Championship in Phoenix, Arizona.',
    source_url: 'https://hiphopinternational.com/',
    logo: {
      url: null,
      alt: 'Legit Status logo',
      source_url: 'https://hiphopinternational.com/',
      verified: false,
      fallbackReason: 'Official text pill fallback',
    },
    image: {
      url: null,
      alt: 'Legit Status Dance Crew Philippines',
      credit: 'Official HHI / Legit Status',
      source_url: 'https://hiphopinternational.com/',
      license: 'Promotional competition media',
    },
    achievements: [
      {
        title: 'HHI World Hip Hop Dance Championship — MegaCrew Gold Champions',
        year: 2023,
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'World Supremacy Battlegrounds — International Champions',
        year: 2018,
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'HHI Philippines National Championship — MegaCrew Champions',
        year: '2023, 2024',
        source_url: 'https://hiphopinternational.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Vimi Rivera',
        role: 'Founder & Head Choreographer',
        source_url: 'https://hiphopinternational.com/',
      },
      {
        name: 'Alexis Rivera',
        role: 'Choreographer & Captain',
        source_url: 'https://hiphopinternational.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'legit-hhi-worlds-2023',
        event: 'HHI World Hip Hop Dance Championship 2023',
        stage: 'MegaCrew World Finals (Phoenix, Arizona)',
        date: '2023',
        result: 'CHAMPION',
        category: 'MegaCrew',
        summary:
          'Legit Status captured the historic World Championship Gold Medal in the MegaCrew division, besting over 50 nations.',
        source_url: 'https://hiphopinternational.com/',
      },
    ],
  },
  {
    id: 'upeepz',
    name: 'UPeepz',
    slug: 'upeepz',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'MegaCrew & Adult Division',
    founded: 2011,
    founder: 'Chips Beltran',
    rosterStatus: 'Active Roster (2x World Champions)',
    bio: 'Founded in 2011 at the University of the Philippines Diliman by Chips Beltran, UPeepz is a world-renowned Filipino hip hop dance company celebrated for pioneering choreography, thematic storytelling, and back-to-back MegaCrew World Championship titles at HHI.',
    source_url: 'https://hiphopinternational.com/',
    logo: {
      url: null,
      alt: 'UPeepz logo',
      source_url: 'https://hiphopinternational.com/',
      verified: false,
      fallbackReason: 'Official text pill fallback',
    },
    image: {
      url: null,
      alt: 'UPeepz World Champion Dance Company Philippines',
      credit: 'UPeepz Official',
      source_url: 'https://hiphopinternational.com/',
      license: 'Promotional competition media',
    },
    achievements: [
      {
        title: 'HHI World Hip Hop Dance Championship — MegaCrew Gold Champions (Back-to-back)',
        year: '2016, 2017',
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'World of Dance World Finals — Adult Division Champions',
        year: 2019,
        source_url: 'https://www.worldofdance.com/',
      },
      {
        title: 'NBC World of Dance Season 4 — World Competitors',
        year: 2020,
        source_url: 'https://www.worldofdance.com/',
      },
      {
        title: 'VPeepz (Varsity) — NBC World of Dance Season 3 Division Finalists',
        year: 2019,
        source_url: 'https://www.worldofdance.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Chips Beltran',
        role: 'Founder, CEO & Head Coach',
        source_url: 'https://hiphopinternational.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'upeepz-wod-2019',
        event: 'World of Dance World Finals 2019',
        stage: 'Adult Division Finals',
        date: '2019',
        result: 'CHAMPION',
        category: 'Adult Division',
        summary:
          'UPeepz claimed 1st place in the Adult Division at the World of Dance World Finals, showcasing signature intricate polyrhythms.',
        source_url: 'https://www.worldofdance.com/',
      },
    ],
  },
  {
    id: 'hq-crew',
    name: 'HQ (Headquarters)',
    slug: 'hq-crew',
    country: 'Philippines',
    city: 'Metro Manila',
    flag: '🇵🇭',
    division: 'Adult Division',
    founded: 2020,
    founder: 'Core Artistic Directors',
    rosterStatus: 'Active Roster (Adult World Champions)',
    bio: 'HQ is an elite Philippine adult competition crew that made waves across the global street dance scene by taking the World Championship Gold Medal in the Adult Division at the 2023 World Hip Hop Dance Championship in Phoenix, Arizona.',
    source_url: 'https://hiphopinternational.com/',
    logo: {
      url: null,
      alt: 'HQ logo',
      source_url: 'https://hiphopinternational.com/',
      verified: false,
    },
    image: {
      url: null,
      alt: 'HQ Dance Crew Manila Philippines',
      credit: 'HQ Official',
      source_url: 'https://hiphopinternational.com/',
      license: 'Promotional competition media',
    },
    achievements: [
      {
        title: 'HHI World Hip Hop Dance Championship — Adult Division Gold Champions',
        year: 2023,
        source_url: 'https://hiphopinternational.com/',
      },
      {
        title: 'HHI Philippines National Championship — Adult Division Champions',
        year: 2023,
        source_url: 'https://hiphopinternational.com/',
      },
    ],
    keyMembers: [
      {
        name: 'HQ Artistic Directors',
        role: 'Choreographers & Founders',
        source_url: 'https://hiphopinternational.com/',
      },
    ],
    recentRecaps: [],
  },
  {
    id: 'redbull-dys-athletes',
    name: 'Red Bull Dance Your Style PH Champions',
    slug: 'redbull-dys-athletes',
    country: 'Philippines',
    city: 'Manila, Cebu & Baguio',
    flag: '🇵🇭',
    division: 'Red Bull Dance Your Style National Champions',
    founded: 2022,
    founder: 'Red Bull Philippines & National Battlers',
    rosterStatus: 'Active National Champions & World Finalists',
    bio: 'Official Philippine National Champions of Red Bull Dance Your Style—the world\'s premier 1-on-1 all-styles street dance competition where the crowd decides the winner. Champions represent the Philippines on the global battle stage.',
    source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    logo: {
      url: '/logos/red-bull-dance-your-style.png',
      alt: 'Red Bull Dance Your Style logo',
      source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      verified: true,
    },
    image: {
      url: '/dance-updates/redbull-dys-world-final-2026.jpg',
      alt: 'Red Bull Dance Your Style Philippines Champions',
      credit: 'Red Bull Content Pool',
      source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      license: 'Official Red Bull media',
    },
    achievements: [
      {
        title: 'Izzy Johnson — Red Bull Dance Your Style Philippines 2026 National Champion (Zurich World Finalist)',
        year: 2026,
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
      {
        title: 'Sam Rivera ("Nemesis") — Red Bull Dance Your Style Philippines 2025 National Champion (Los Angeles World Finalist)',
        year: 2025,
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
      {
        title: 'Mickey Yatar — Red Bull Dance Your Style Philippines 2022 Inaugural National Champion (Johannesburg World Finalist)',
        year: 2022,
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
    ],
    keyMembers: [
      {
        name: 'Izzy Johnson (Izzy)',
        role: '2026 National Champion (Manila)',
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
      {
        name: 'Sam Rivera (Nemesis)',
        role: '2025 National Champion (Cebu)',
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
      {
        name: 'Mickey Yatar',
        role: '2022 Inaugural National Champion (Baguio)',
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
    ],
    recentRecaps: [
      {
        id: 'dys-ph-2026-national-final',
        event: 'Red Bull Dance Your Style Philippines 2026 National Finals',
        stage: 'National Finals (Bridgetowne, Manila)',
        date: '2026',
        result: 'CHAMPION',
        category: '1-on-1 All Styles',
        summary:
          'Izzy Johnson defeated JXYB in the crowd-voted final round at Bridgetowne Manila to earn the Philippine slot at the World Final in Zurich, Switzerland.',
        source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
      },
    ],
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
      credit: 'Official organizational archive · jbwkz.com',
      source_url: 'https://www.jbwkz.com/',
      license: 'Official archival creative image',
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
      credit: 'Official collective press archive · kinjaz.com',
      source_url: 'https://www.kinjaz.com/',
      license: 'Official organizational press photo',
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