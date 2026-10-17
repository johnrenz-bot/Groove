export interface ActingAchievement {
  title: string;
  year?: number | string;
  source_url: string;
}

export interface ActingMember {
  name: string;
  role: string;
  source_url: string;
}

export interface ActingRecap {
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

export interface ActingCompany {
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
  achievements: ActingAchievement[];
  keyMembers: ActingMember[];
  recentRecaps: ActingRecap[];
}

export const FEATURED_ACTING_COMPANIES: ActingCompany[] = [
  {
    id: 'tp-actors-company',
    name: 'Tanghalang Pilipino Actors Company',
    slug: 'tanghalang-pilipino-actors-company',
    country: 'Philippines',
    city: 'Pasay, Metro Manila',
    flag: '🇵🇭',
    division: 'Resident Classical & Contemporary Acting Company',
    founded: 1987,
    founder: 'Nonon Padilla & Cultural Center of the Philippines',
    rosterStatus: 'Active Resident Ensemble · CCP Mainstage',
    bio: 'The Tanghalang Pilipino Actors Company (TP-AC) is the only full-time professional acting ensemble in the Philippines. Trained in Stanislavski actioning, Suzuki physical discipline, and Philippine movement idioms, the company undergoes rigorous daily classes in voice, movement, and script analysis. TP-AC actors form the core cast of major theatrical seasons at the Cultural Center of the Philippines, staging Filipino language translations of world classics and original Philippine epics.',
    source_url: 'http://tanghalangpilipino.com/',
    officialVideoUrl: 'https://culturalcenter.gov.ph/',
    logo: {
      url: null,
      alt: 'Tanghalang Pilipino mark',
      source_url: 'http://tanghalangpilipino.com/',
      verified: false,
      fallbackReason: 'Official resident company mark',
    },
    image: {
      url: '/image/pa/ccp-tanghalang-pilipino.jpg',
      alt: 'Tanghalang Pilipino actors in a dramatic confrontation on stage',
      credit: 'Cultural Center of the Philippines Digital Archives',
      source_url: 'https://digitalarchives.culturalcenter.gov.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: 'Philstage Gawad Buhay — Best Ensemble Performance (Anak Datu)',
        year: 2023,
        source_url: 'https://philstage.org/',
      },
      {
        title: 'Aliw Awards Hall of Fame for Best Theatrical Company',
        year: 2018,
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        title: 'Gawad Buhay — Best Stage Production (Mabining Mandirigma)',
        year: 2016,
        source_url: 'https://philstage.org/',
      },
    ],
    keyMembers: [
      {
        name: 'Fernando "Nanding" Josef',
        role: 'Artistic Director & Master Actor',
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        name: 'Carmela Bartolome',
        role: 'Senior Company Member & Movement Coach',
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        name: 'Marco Viaña',
        role: 'Associate Artistic Director & Leading Actor',
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        name: 'Lhorvie Nuevo',
        role: 'Senior Company Member (Gawad Buhay Awardee)',
        source_url: 'http://tanghalangpilipino.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'tp-recap-1',
        event: 'CCP Theater Festival — Tanghalang Ignacio Gimenez',
        stage: 'Epic Philippine Drama Staging',
        date: '2025-09-14',
        result: 'CHAMPION',
        category: 'Full-Length Dramatic Play',
        summary:
          'Tour-de-force ensemble performance blending physical theater, indigenous chanting, and classical dramatic actioning.',
        source_url: 'http://tanghalangpilipino.com/',
      },
    ],
  },
  {
    id: 'peta-kalinangan',
    name: 'PETA Kalinangan Ensemble',
    slug: 'peta-kalinangan-ensemble',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'Theater for Empowerment & Social Realism',
    founded: 1967,
    founder: 'Cecile Guidote-Alvarez (Ramon Magsaysay Awardee)',
    rosterStatus: 'Active Repertory Ensemble · PETA Theater Center',
    bio: 'The PETA Kalinangan Ensemble is the pioneer of modern socially conscious theater in the Philippines. Fusing Brechtian epic theater, Augusto Boal’s Theater of the Oppressed, and indigenous Filipino performance forms, PETA actors are versatile actor-pedagogues capable of moving from tragic social realism to high-energy musical comedy (Rak of Aegis, Walang Aray).',
    source_url: 'https://petatheater.com/',
    officialVideoUrl: 'https://petatheater.com/',
    logo: {
      url: '/image/pa/peta-mark.webp',
      alt: 'PETA Theater mark',
      source_url: 'https://petatheater.com/',
      verified: true,
    },
    image: {
      url: '/image/wc/acting.jpg',
      alt: 'PETA Kalinangan Ensemble in an intense ensemble scene',
      credit: 'PETA Theater Center',
      source_url: 'https://petatheater.com/',
      license: 'Promotional Partner',
    },
    achievements: [
      {
        title: 'Ramon Magsaysay Award for Public Theatrical Education',
        year: 2017,
        source_url: 'https://www.rmaward.asia/',
      },
      {
        title: 'Gawad Buhay — Outstanding Musical & Ensemble (Walang Aray)',
        year: 2024,
        source_url: 'https://philstage.org/',
      },
      {
        title: 'Historic 300+ Performance Record for Original Musical (Rak of Aegis)',
        year: 2019,
        source_url: 'https://petatheater.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Maribel Legarda',
        role: 'Artistic Director & Master Stage Director',
        source_url: 'https://petatheater.com/',
      },
      {
        name: 'Gie Onida',
        role: 'Senior Actor & Workshop Director',
        source_url: 'https://petatheater.com/',
      },
      {
        name: 'Neomi Gonzales',
        role: 'Ensemble Actor & Vocal Instructor',
        source_url: 'https://petatheater.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'peta-recap-1',
        event: 'PETA Theater Center Mainstage Musical Season',
        stage: 'Original Filipino Staging',
        date: '2025-03-20',
        result: 'CHAMPION',
        category: 'Musical Theater Ensemble',
        summary:
          'Sold-out 40-show run recognized for comedic timing, physical acrobatics, and emotional truth.',
        source_url: 'https://petatheater.com/',
      },
    ],
  },
  {
    id: 'rep-troupe',
    name: 'Repertory Philippines Acting Troupe',
    slug: 'repertory-philippines-acting-troupe',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'English Classical & Modern Drama Ensemble',
    founded: 1967,
    founder: 'Zenaida Amador, Baby Barredo, Leo Martinez',
    rosterStatus: 'Active Professional Resident Company',
    bio: 'Repertory Philippines is the legendary training academy of Philippine theater, credited with launching international stars like Tony Award-winner Lea Salonga and Monique Wilson. With over 85 seasons, REP’s actors specialize in classical British and American drama, Farce, Shakespearean verse speaking, and Broadway classics.',
    source_url: 'https://repertoryphilippines.ph/',
    logo: {
      url: null,
      alt: 'Repertory Philippines Emblem',
      source_url: 'https://repertoryphilippines.ph/',
      verified: false,
      fallbackReason: 'Official theater company mark',
    },
    image: {
      url: '/image/bg/hero-theater.jpg',
      alt: 'Actors on proscenium stage at Repertory Philippines production',
      credit: 'Repertory Philippines Archive',
      source_url: 'https://repertoryphilippines.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: '58 Consecutive Years of Professional Theatrical Production',
        year: 2025,
        source_url: 'https://repertoryphilippines.ph/',
      },
      {
        title: 'Aliw Awards Lifetime Achievement in Theater Production',
        year: 2017,
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
    keyMembers: [
      {
        name: 'Jeremy Domingo',
        role: 'Master Actor & Speech Coach',
        source_url: 'https://repertoryphilippines.ph/',
      },
      {
        name: 'Liesl Batucan-Del Rosario',
        role: 'Artistic Director & Classical Performer',
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
    recentRecaps: [
      {
        id: 'rep-recap-1',
        event: 'REP Season Mainstage Drama',
        stage: 'Opening Night Gala at REP Eastwood',
        date: '2024-10-18',
        result: 'WIN',
        category: 'Dramatic Stage Play',
        summary:
          'Critically acclaimed staging praised for psychological realism, nuance, and precise diction.',
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
  },
];
