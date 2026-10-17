export interface TheaterAchievement {
  title: string;
  year?: number | string;
  source_url: string;
}

export interface TheaterCreativeMember {
  name: string;
  role: string;
  source_url: string;
}

export interface TheaterProductionRecap {
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

export interface TheaterCompany {
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
  achievements: TheaterAchievement[];
  keyMembers: TheaterCreativeMember[];
  recentRecaps: TheaterProductionRecap[];
}

export const FEATURED_THEATER_COMPANIES: TheaterCompany[] = [
  {
    id: 'peta',
    name: 'Philippine Educational Theater Association',
    slug: 'peta',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'Original Filipino Musicals & People’s Theater',
    founded: 1967,
    founder: 'Cecile Guidote-Alvarez',
    rosterStatus: 'Active Cultural Institution · PETA Theater Center',
    bio: 'Recognized as one of Asia’s premier cultural institutions, PETA has pioneered the creation and staging of original Filipino musical theater for over five decades. Known for historic hits such as "Rak of Aegis", "Walang Aray", and "One More Chance The Musical", PETA blends folk traditions, rock and pop jukebox arrangements, and incisive social commentary to create theater that resonates deeply with audiences of all generations.',
    source_url: 'https://petatheater.com/',
    officialVideoUrl: 'https://petatheater.com/',
    logo: {
      url: '/image/pa/peta-mark.webp',
      alt: 'PETA Theater mark',
      source_url: 'https://petatheater.com/',
      verified: true,
    },
    image: {
      url: '/image/wc/theater.jpg',
      alt: 'PETA musical stage performance with dynamic cast and lighting',
      credit: 'PETA Theater Center',
      source_url: 'https://petatheater.com/',
      license: 'Promotional Partner',
    },
    achievements: [
      {
        title: 'Ramon Magsaysay Award for Theatrical Arts & Education',
        year: 2017,
        source_url: 'https://www.rmaward.asia/',
      },
      {
        title: 'Philstage Gawad Buhay — Outstanding Musical (Walang Aray)',
        year: 2024,
        source_url: 'https://philstage.org/',
      },
      {
        title: 'National Landmark Record: 300+ Sold-Out Shows (Rak of Aegis)',
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
        name: 'Vince Lim',
        role: 'Resident Musical Director & Composer',
        source_url: 'https://petatheater.com/',
      },
      {
        name: 'Myke Salomon',
        role: 'Arranger & Musical Director (Rak of Aegis, One More Chance)',
        source_url: 'https://petatheater.com/',
      },
      {
        name: 'Rody Vera',
        role: 'Acclaimed Playwright & Palanca Hall of Famer',
        source_url: 'https://petatheater.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'peta-recap-1',
        event: 'PETA Musical Theater Season',
        stage: 'PETA Theater Center Mainstage',
        date: '2024-06-30',
        result: 'CHAMPION',
        category: 'Original Filipino Musical',
        summary:
          'Sold-out 50-performance season that swept multiple major awards for book, direction, and design.',
        source_url: 'https://petatheater.com/',
      },
    ],
  },
  {
    id: 'rep',
    name: 'Repertory Philippines',
    slug: 'repertory-philippines',
    country: 'Philippines',
    city: 'Quezon City, Metro Manila',
    flag: '🇵🇭',
    division: 'Broadway Classics, West End Drama & Farce',
    founded: 1967,
    founder: 'Zenaida Amador, Baby Barredo, Leo Martinez, Carmen Barredo, Tony Mercado',
    rosterStatus: 'Active Professional Resident Company',
    bio: 'Repertory Philippines is widely celebrated as "The Grand Dame of Philippine Theater." For nearly 60 years and across more than 450 productions, REP has presented the gold standard of English-language theater in Asia, staging classic Broadway musicals, contemporary London dramas, farces, and dedicated Theater for Young Audiences. REP has nurtured generations of world-renowned talent, including Broadway icon Lea Salonga.',
    source_url: 'https://repertoryphilippines.ph/',
    logo: {
      url: null,
      alt: 'Repertory Philippines Mark',
      source_url: 'https://repertoryphilippines.ph/',
      verified: false,
      fallbackReason: 'Official resident company heraldry',
    },
    image: {
      url: '/hero-theater.jpg',
      alt: 'Ornate theater auditorium with gilded balconies and red velvet seating',
      credit: 'Repertory Philippines Archive',
      source_url: 'https://repertoryphilippines.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: 'Over 85 Theatrical Seasons & 450+ Full Productions Staged',
        year: 2025,
        source_url: 'https://repertoryphilippines.ph/',
      },
      {
        title: 'Aliw Awards Hall of Fame for Theatrical Excellence',
        year: 2018,
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
    keyMembers: [
      {
        name: 'Liesl Batucan-Del Rosario',
        role: 'Artistic Director & Classical Performer',
        source_url: 'https://repertoryphilippines.ph/',
      },
      {
        name: 'Jeremy Domingo',
        role: 'Associate Artistic Director & Voice Coach',
        source_url: 'https://repertoryphilippines.ph/',
      },
      {
        name: 'Mindy Perez-Rubio',
        role: 'Managing Director & Production Head',
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
    recentRecaps: [
      {
        id: 'rep-recap-1',
        event: 'REP Inaugural Season at Eastwood Theater',
        stage: 'Mainstage Opening Night',
        date: '2024-11-15',
        result: 'WIN',
        category: 'Classic Musical Staging',
        summary:
          'Celebrated gala opening in REP’s custom contemporary theater venue with critical acclaim for acoustics and design.',
        source_url: 'https://repertoryphilippines.ph/',
      },
    ],
  },
  {
    id: 'tanghalang-pilipino',
    name: 'Tanghalang Pilipino',
    slug: 'tanghalang-pilipino',
    country: 'Philippines',
    city: 'Pasay, Metro Manila',
    flag: '🇵🇭',
    division: 'National Resident Theater Company of the CCP',
    founded: 1987,
    founder: 'Nonon Padilla & Cultural Center of the Philippines',
    rosterStatus: 'Active Resident Theater Company of the CCP',
    bio: 'Tanghalang Pilipino (TP) is the resident theater company of the Cultural Center of the Philippines, mandated to develop, promote, and preserve Philippine theatrical heritage. Known for its courageous dramaturgy, poetic Tagalog translations of Shakespeare and Chekhov, and revolutionary indigenous epics (such as Anak Datu and Mabining Mandirigma), TP maintains the only full-time professional Actors Company in the country.',
    source_url: 'http://tanghalangpilipino.com/',
    logo: {
      url: null,
      alt: 'Tanghalang Pilipino Logo',
      source_url: 'http://tanghalangpilipino.com/',
      verified: false,
      fallbackReason: 'Official CCP resident mark',
    },
    image: {
      url: '/image/pa/ccp-tanghalang-pilipino.jpg',
      alt: 'Tanghalang Pilipino actors in a dramatic confrontation on stage',
      credit: 'CCP Digital Archives',
      source_url: 'https://digitalarchives.culturalcenter.gov.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: 'Gawad Buhay — Outstanding Production of a Play (Anak Datu)',
        year: 2023,
        source_url: 'https://philstage.org/',
      },
      {
        title: '38 Consecutive Seasons of Original Filipino Drama at the CCP',
        year: 2025,
        source_url: 'http://tanghalangpilipino.com/',
      },
    ],
    keyMembers: [
      {
        name: 'Fernando "Nanding" Josef',
        role: 'Artistic Director & Palanca Awardee',
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        name: 'Marco Viaña',
        role: 'Associate Artistic Director & Set Designer',
        source_url: 'http://tanghalangpilipino.com/',
      },
      {
        name: 'Dennis Marasigan',
        role: 'Master Director & Lighting Designer',
        source_url: 'http://tanghalangpilipino.com/',
      },
    ],
    recentRecaps: [
      {
        id: 'tp-recap-1',
        event: 'CCP Theater Season Finale',
        stage: 'Tanghalang Ignacio Gimenez',
        date: '2025-04-12',
        result: 'CHAMPION',
        category: 'Original Historical Drama',
        summary:
          'Deeply moving exploration of cultural identity and pre-colonial unity, widely acclaimed by critics and educators.',
        source_url: 'http://tanghalangpilipino.com/',
      },
    ],
  },
  {
    id: 'vlf',
    name: 'Virgin Labfest (Writer’s Bloc & CCP)',
    slug: 'virgin-labfest',
    country: 'Philippines',
    city: 'Pasay, Metro Manila',
    flag: '🇵🇭',
    division: 'Festival of Untried, Untested, Unstaged One-Act Plays',
    founded: 2005,
    founder: 'Rody Vera, Cultural Center of the Philippines, Tanghalang Pilipino',
    rosterStatus: 'Annual Theatrical Laboratory Festival',
    bio: 'Established in 2005, the Virgin Labfest (VLF) is the premier national festival dedicated to premiering new one-act plays by Filipino playwrights. Co-produced by the CCP, Tanghalang Pilipino, and the playwrights collective Writer’s Bloc, VLF has launched over 250 original plays, nurturing contemporary dramatists and giving stage directors and actors a fearless sandbox for experimental theater.',
    source_url: 'https://culturalcenter.gov.ph/',
    logo: {
      url: null,
      alt: 'Virgin Labfest Symbol',
      source_url: 'https://culturalcenter.gov.ph/',
      verified: false,
      fallbackReason: 'Official festival mark',
    },
    image: {
      url: '/image/bg/hero-stage.jpg',
      alt: 'Actors on black box theater stage during a Virgin Labfest premiere',
      credit: 'CCP Digital Archives',
      source_url: 'https://digitalarchives.culturalcenter.gov.ph/',
      license: 'Public Educational Archive',
    },
    achievements: [
      {
        title: 'Over 250 World-Premiere Filipino One-Act Plays Staged',
        year: 2025,
        source_url: 'https://culturalcenter.gov.ph/',
      },
      {
        title: 'Multiple Palanca Memorial Awards for Literature Originating at VLF',
        year: 2024,
        source_url: 'https://culturalcenter.gov.ph/',
      },
    ],
    keyMembers: [
      {
        name: 'Rody Vera',
        role: 'Festival Co-Founder & Dramaturg',
        source_url: 'https://culturalcenter.gov.ph/',
      },
      {
        name: 'Tuxqs Rutaquio',
        role: 'Festival Director & Production Designer',
        source_url: 'https://culturalcenter.gov.ph/',
      },
    ],
    recentRecaps: [
      {
        id: 'vlf-recap-1',
        event: 'Virgin Labfest 20: Bisyo at Virtud',
        stage: 'Tanghalang Ignacio Gimenez (Black Box)',
        date: '2025-06-25',
        result: 'CHAMPION',
        category: 'New Playwriting Showcase',
        summary:
          '12 new one-act plays presented over three weeks to packed houses, celebrated for brave socio-political themes.',
        source_url: 'https://culturalcenter.gov.ph/',
      },
    ],
  },
];
