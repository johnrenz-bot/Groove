/**
 * Featured dance crews and dancers styled after the IDL team roster presentation
 * (e.g., Brotherhood on IDL: https://www.idl.pro/teams/brotherhood).
 */

export interface DancerProfile {
  name: string;
  alias?: string;
  role: string;
  specialty: string;
  image?: string;
}

export interface MatchRecap {
  id: string;
  event: string;
  stage: string;
  date: string;
  opponent: string;
  opponentCountry: string;
  result: 'WIN' | 'CHAMPION' | 'FINALIST' | 'PODIUM';
  score?: string;
  category: string;
  summary: string;
  videoUrl?: string;
}

export interface DanceCrew {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  flag: string;
  division: string;
  founded: number;
  titlesCount: number;
  record: string; // e.g. "18-2" or "3x World Champs"
  tagline: string;
  bio: string;
  coverImage: string;
  logoText: string;
  achievements: string[];
  membersCount: number;
  keyDancers: DancerProfile[];
  recentRecaps: MatchRecap[];
}

export const FEATURED_CREWS: DanceCrew[] = [
  {
    id: 'brotherhood',
    name: 'THE BROTHERHOOD',
    slug: 'brotherhood',
    country: 'Canada',
    city: 'Vancouver',
    flag: '🇨🇦',
    division: 'MegaCrew & Adult Division',
    founded: 2011,
    titlesCount: 5,
    record: '24-1',
    tagline: 'IDL Champions & 2x HHI World Gold Medalists',
    bio: 'One of the most decorated competitive hip hop dance crews in history. Hailing from Vancouver, The Brotherhood redefined synchronized isolation, power staging, and musicality across international leagues.',
    coverImage: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80',
    logoText: 'BTHD',
    achievements: [
      'IDL World League Champions (2024)',
      'HHI World Hip Hop Dance Champions (Gold)',
      'Body Rock 1st Place Champions',
      'Vibe Dance Competition Champions',
    ],
    membersCount: 22,
    keyDancers: [
      { name: 'Scott Forsyth', alias: 'FORSYTH', role: 'Director & Choreographer', specialty: 'Urban Choreo / Staging' },
      { name: 'Kelvin Tu', alias: 'KTU', role: 'Lead Captain', specialty: 'Popping / Dynamics' },
      { name: 'Jerome Esplana', alias: 'ROME', role: 'Principal Dancer', specialty: 'Grooves / Footwork' },
    ],
    recentRecaps: [
      {
        id: 'rec-1',
        event: 'IDL WORLD FINALS 2024',
        stage: 'Grand Championship',
        date: 'Nov 2024',
        opponent: 'Royal Family Elite',
        opponentCountry: 'NZ',
        result: 'CHAMPION',
        score: '98.42 - 97.10',
        category: 'MegaCrew League',
        summary: 'Dominated the finals with explosive synchronization and a dramatic four-tier stage freeze that earned a standing ovation.',
      },
      {
        id: 'rec-2',
        event: 'BODY ROCK ASIA INVITATIONAL',
        stage: 'Final Showcase',
        date: 'Aug 2024',
        opponent: 'S-Rank',
        opponentCountry: 'USA',
        result: 'WIN',
        score: '1st Place',
        category: 'Open Division',
        summary: 'Unanimous judges decision following an intricate 6-minute medley blending West Coast hip hop and modern bounce.',
      },
    ],
  },
  {
    id: 'upeepz',
    name: 'UPEEPZ',
    slug: 'upeepz',
    country: 'Philippines',
    city: 'Manila / SJDM',
    flag: '🇵🇭',
    division: 'MegaCrew & Adult Division',
    founded: 2011,
    titlesCount: 6,
    record: '22-3',
    tagline: '2x HHI World Hip Hop Dance Champions & World of Dance Titans',
    bio: 'The pride of Philippine street dance. Two-time back-to-back World Champions at Hip Hop International MegaCrew division, renowned for storytelling, razor-sharp musicality, and Filipino theatrical energy.',
    coverImage: 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1200&q=80',
    logoText: 'UPPZ',
    achievements: [
      'HHI World MegaCrew Champions (2016, 2017 Back-to-Back)',
      'World of Dance Philippines Champions',
      'Arena Dance Competition Champions',
      'Red Bull Dance Your Style National Finalists',
    ],
    membersCount: 30,
    keyDancers: [
      { name: 'Chips Beltran', alias: 'CHIPS', role: 'Artistic Director', specialty: 'Concept Direction / Isolations' },
      { name: 'Gabriel Go', alias: 'GAB', role: 'Choreographer', specialty: 'House / Fast Footwork' },
      { name: 'Vimi Rivera', alias: 'VIMI', role: 'Lead Performer', specialty: 'Waacking & Locking' },
    ],
    recentRecaps: [
      {
        id: 'rec-3',
        event: 'HIP HOP INTERNATIONAL 2024',
        stage: 'World MegaCrew Final',
        date: 'Aug 2024',
        opponent: 'Brotherhood & Da Republic',
        opponentCountry: 'CAN / DOM',
        result: 'PODIUM',
        score: '8.86 (Bronze Medal)',
        category: 'MegaCrew Division',
        summary: 'Electrified the Arizona arena with an emotional homage to Filipino performing heritage and complex speed changes.',
      },
      {
        id: 'rec-4',
        event: 'WORLD OF DANCE MANILA',
        stage: 'Championship Round',
        date: 'May 2024',
        opponent: 'Legit Status',
        opponentCountry: 'PH',
        result: 'WIN',
        score: '96.80 pts',
        category: 'Upper Division',
        summary: 'Secured the Manila crown with breathtaking formations and high-energy urban routine.',
      },
    ],
  },
  {
    id: 'philippine-allstars',
    name: 'PHILIPPINE ALLSTARS',
    slug: 'philippine-allstars',
    country: 'Philippines',
    city: 'Quezon City',
    flag: '🇵🇭',
    division: 'Adult & Legendary Division',
    founded: 2005,
    titlesCount: 8,
    record: '31-4',
    tagline: 'Pioneers of Philippine Street Dance & 2x World Champions',
    bio: 'The legend that put the Philippines on the global street dance map. First Asian crew to claim the World Hip Hop Championship title, continuing to train the next generation of Asian hip hop royalty.',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    logoText: 'ALLSTARS',
    achievements: [
      'HHI World Champions (2006, 2008)',
      'World Hip Hop Dance Hall of Fame',
      'Battle of the Year Asia Champions',
      'Dance2Dance Switzerland 1st Place',
    ],
    membersCount: 16,
    keyDancers: [
      { name: 'Lema Diaz', alias: 'LEMA', role: 'Founder & Director', specialty: 'Old School Hip Hop / B-Girling' },
      { name: 'Ken John', alias: 'KENJ', role: 'Captain', specialty: 'Popping / Animation' },
      { name: 'Madelle Paltot-Enriquez', alias: 'MADELLE', role: 'Choreographer', specialty: 'Heels & Commercial' },
    ],
    recentRecaps: [
      {
        id: 'rec-5',
        event: 'RED BULL DANCE YOUR STYLE MANILA',
        stage: 'National Exhibition Battle',
        date: 'Sep 2024',
        opponent: 'All-Star Select',
        opponentCountry: 'PH',
        result: 'WIN',
        score: 'Crowd Decided',
        category: 'All Styles 1v1 & Crew',
        summary: 'Showcased masterclass musicality and locking fundamentals in front of 3,000 spectators in Bonifacio Global City.',
      },
    ],
  },
  {
    id: 'a-team',
    name: 'A-TEAM PHILIPPINES',
    slug: 'a-team',
    country: 'Philippines',
    city: 'Manila',
    flag: '🇵🇭',
    division: 'MegaCrew Division',
    founded: 2011,
    titlesCount: 4,
    record: '19-2',
    tagline: 'HHI World MegaCrew Champions & Body Rock Finalists',
    bio: 'Founded by the renowned Arda brothers, A-Team is celebrated globally for cinematic routine choreography, clean lines, and high-impact visual stunts.',
    coverImage: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
    logoText: 'A-TEAM',
    achievements: [
      'HHI World MegaCrew Champions (2014 Gold)',
      'Body Rock San Diego 2nd Place',
      'World Supremacy Battlegrounds Champions',
    ],
    membersCount: 26,
    keyDancers: [
      { name: 'MJ Arda', alias: 'MJ', role: 'Director', specialty: 'Urban Choreography' },
      { name: 'Angelica Arda', alias: 'ANGEL', role: 'Co-Director', specialty: 'Contemporary Hip Hop' },
    ],
    recentRecaps: [
      {
        id: 'rec-6',
        event: 'WORLD SUPREMACY BATTLEGROUNDS',
        stage: 'MegaCrew Finals',
        date: 'Oct 2024',
        opponent: 'Homeground Crews',
        opponentCountry: 'AUS',
        result: 'CHAMPION',
        score: '97.2 pts',
        category: 'International MegaCrew',
        summary: 'Secured the championship title in Sydney with an electrifying routine featuring 24 dancers in laser-precise sync.',
      },
    ],
  },
];
