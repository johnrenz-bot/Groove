import {
  BookOpen,
  Drama,
  Footprints,
  GraduationCap,
  Landmark,
  Library,
  Music4,
  Theater,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Content model for /community/performing-arts/history.
 *
 * EDITORIAL RULES
 *   - Period names are conventional, not precise start/end dates. Where a year
 *     is given it is one already recorded in this repository's verified data
 *     (CCP 1966, PETA 1967, Ballet Philippines 1969, Tanghalang Pilipino 1987,
 *     NCCA/RA 7356 in 1992, Philippine independence in 1946).
 *   - No tradition is described as "the Filipino" tradition. Dance, music and
 *     theater belong to named communities, and the page says so.
 *   - Every external link below already appears in this feature's verified
 *     source set (`data/content.ts`). Nothing new was invented for this page.
 */

export interface HistoryPeriod {
  id: string;
  era: string;
  title: string;
  summary: string;
  points: string[];
}

export interface HistoryThread {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  points: string[];
}

export interface HistoryFigure {
  name: string;
  role: string;
  note: string;
}

export interface HistoryInstitution {
  name: string;
  note: string;
  href: string;
}

export interface HistorySource {
  label: string;
  publisher: string;
  href: string;
  note: string;
}

export const HISTORY_PERIODS: HistoryPeriod[] = [
  {
    id: 'indigenous',
    era: 'Before colonial rule',
    title: 'Indigenous and community traditions',
    summary:
      'The archipelago’s many communities developed performance traditions tied to ritual, work, courtship, celebration and conflict. These traditions are specific to the communities who hold them; they are not a single national style waiting to be discovered.',
    points: [
      'Kulintang gong ensembles are documented among Maranao, Maguindanao, Tausug, Sama-Bajau and other communities of Mindanao and the Sulu Archipelago.',
      'Tinikling is associated with the Visayas and is danced between bamboo poles. Singkil is a Maranao tradition from the Lake Lanao region, not a generic “folk dance”.',
      'Epic chanting, song, dance and drama were carried orally. Their meanings, ownership and protocols remain specific to the communities concerned.',
    ],
  },
  {
    id: 'spanish',
    era: '16th–19th centuries',
    title: 'Spanish colonial rule',
    summary:
      'Spanish rule reshaped public performance through Christian liturgy, town fiestas and imported theater forms. Filipino artists did not simply receive these forms; they adapted them, wrote in local languages, and folded existing movement and music into them.',
    points: [
      'Religious and civic festivals became major venues for music, procession and dance across the colony.',
      'Komedya and moro-moro staged Christian–Muslim conflict, while the sarsuwela (zarzuela) brought sung dialogue and social commentary to town theaters.',
      'Indigenous and folk forms persisted alongside these imports, especially in communities outside the main urban centers.',
    ],
  },
  {
    id: 'american',
    era: '1898–1946',
    title: 'American colonial period',
    summary:
      'American rule expanded public education and English-language institutions, while commercial entertainment grew in Manila. A new generation of writers, composers and performers worked across Filipino and English, and across stage and screen.',
    points: [
      'Bodabil (vaudeville) and English-language plays became popular in Manila, alongside continuing sarsuwela productions.',
      'Public schools and universities became important training grounds for music, theater and dance.',
      'Kundiman and rondalla remained widely loved, while composers and writers began building a consciously national repertoire.',
    ],
  },
  {
    id: 'postwar',
    era: '1946–1960s',
    title: 'Postwar nation-building',
    summary:
      'After independence in 1946, cultural institutions and professional companies took shape. Folk-dance research and presentation became a way of asserting a national culture, even as regional traditions retained their own local meanings.',
    points: [
      'Folk-dance companies, including Bayanihan, researched and staged regional traditions for audiences in the Philippines and abroad.',
      'Universities and conservatories formalized training in music, theater and dance.',
      'The state increasingly treated cultural heritage as a resource for nation-building, a direction that later institutions would formalize.',
    ],
  },
  {
    id: 'contemporary',
    era: '1970s–present',
    title: 'Contemporary institutions and independent practice',
    summary:
      'The Cultural Center of the Philippines (CCP, created in 1966) and the National Commission for Culture and the Arts (NCCA, created by Republic Act No. 7356 in 1992) gave the sector permanent venues, resident companies and a national policy framework. Independent companies, festivals and competitive scenes grew alongside them.',
    points: [
      'Ballet Philippines (founded 1969) and Tanghalang Pilipino (established 1987) became CCP resident companies; PETA (founded 1967) built a lasting theater-in-education and workshop practice.',
      'The Order of National Artists recognized dance practitioners including Francisca Reyes Aquino, Ramon Obusan, Alice Reyes, Lucrecia Reyes-Urtula and Leonor Orosa-Goquingco.',
      'Today, established institutions share the field with independent producers, regional festivals, university companies, and competitive street-dance and choral circuits.',
    ],
  },
];

export const HISTORY_THREADS: HistoryThread[] = [
  {
    id: 'dance',
    title: 'Dance',
    icon: Footprints,
    summary:
      'Philippine dance spans community ritual, folkloric staging, classical and contemporary concert dance, and competitive street styles.',
    points: [
      'Folk and indigenous forms are rooted in specific communities and are often tied to ritual, harvest, courtship or celebration.',
      'Folkloric companies adapted these forms for proscenium stages and international tours, which also changed how they were seen at home.',
      'Ballet and contemporary companies professionalized concert dance, while street and hip-hop crews built a separate competitive circuit.',
    ],
  },
  {
    id: 'music',
    title: 'Music',
    icon: Music4,
    summary:
      'The archipelago’s music ranges from gong ensembles and epic chant to kundiman, rondalla, choral singing and orchestral work.',
    points: [
      'Kulintang ensembles anchor the music of several Mindanao and Sulu communities; the instruments and repertoire are not interchangeable between groups.',
      'Kundiman, a Tagalog love song, and the rondalla string ensemble became widely recognized Filipino forms, especially in the early twentieth century.',
      'Choral foundations, conservatories and competition committees now sustain a large amateur and professional choral scene.',
    ],
  },
  {
    id: 'theater',
    title: 'Theater',
    icon: Drama,
    summary:
      'Theater in the Philippines moves between ritual and festival performance, colonial-era imported forms, and a modern sector built on original Filipino writing.',
    points: [
      'Komedya, moro-moro and sarsuwela were central to colonial-era public theater and remain subjects of revival and study.',
      'Bodabil and English-language productions expanded commercial entertainment in the American period.',
      'Resident companies and independent producers now stage Filipino-language drama, musicals, devised work and festival productions.',
    ],
  },
];

export const HISTORY_FIGURES: HistoryFigure[] = [
  {
    name: 'Francisca Reyes Aquino',
    role: 'Dance researcher and educator · National Artist for Dance',
    note: 'Documented Philippine folk dances and helped bring them into the school curriculum.',
  },
  {
    name: 'Ramon Obusan',
    role: 'Choreographer, researcher and archivist · National Artist for Dance',
    note: 'Built one of the largest moving-image archives of Philippine dance through the Ramon Obusan Folkloric Group.',
  },
  {
    name: 'Alice Reyes',
    role: 'Choreographer · National Artist for Dance',
    note: 'Co-founded Ballet Philippines in 1969 and shaped its classical-contemporary repertoire.',
  },
  {
    name: 'Lucrecia Reyes-Urtula',
    role: 'Choreographer and folk-dance researcher · National Artist for Dance',
    note: 'Developed folkloric choreography grounded in field research and regional movement.',
  },
  {
    name: 'Leonor Orosa-Goquingco',
    role: 'Choreographer · National Artist for Dance',
    note: 'Known for staging Philippine history and legend in concert dance.',
  },
  {
    name: 'Cecile Guidote-Alvarez',
    role: 'Theater founder and director',
    note: 'Founded PETA in 1967 and established its theater-education and workshop practice.',
  },
];

export const HISTORY_INSTITUTIONS: HistoryInstitution[] = [
  {
    name: 'Cultural Center of the Philippines (CCP)',
    note: 'Principal performing-arts complex, created in 1966, with resident dance, theater and music companies.',
    href: 'https://culturalcenter.gov.ph/about/',
  },
  {
    name: 'National Commission for Culture and the Arts (NCCA)',
    note: 'Policy-making, coordinating and grants-giving agency created by Republic Act No. 7356 in 1992.',
    href: 'https://www.ncca.gov.ph/',
  },
  {
    name: 'National Museum of the Philippines',
    note: 'Holds ethnology collections documenting material and intangible heritage across cultural communities.',
    href: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
  },
  {
    name: 'Bayanihan Philippine National Folk Dance Company',
    note: 'Designated the Philippine National Folk Dance Company by Republic Act No. 8626.',
    href: 'https://culturalcenter.gov.ph/resident-companies/bayanihan-dance-company/',
  },
  {
    name: 'Ballet Philippines',
    note: 'Founded in 1969 and the first resident company of the CCP.',
    href: 'https://www.ballet.ph/about-us/',
  },
  {
    name: 'PETA Theater',
    note: 'Founded in 1967; its workshop programs remain a significant entry point for theater education.',
    href: 'https://petatheater.com/',
  },
  {
    name: 'Tanghalang Pilipino',
    note: 'Established in 1987 as the CCP’s resident drama company, staging Filipino-language work.',
    href: 'https://culturalcenter.gov.ph/resident-companies/tanghalang-pilipino/',
  },
  {
    name: 'Ramon Obusan Folkloric Group',
    note: 'CCP resident company dedicated to folk dance and music, and to its founder’s documentary work.',
    href: 'https://rofg1972.com/',
  },
  {
    name: 'Philippine Folk Dance Society',
    note: 'Has organized national folk-dance workshops for decades with NCCA, CCP and local governments.',
    href: 'https://www.philippinefolkdancesociety.com/milestone',
  },
];

export const HISTORY_SOURCES: HistorySource[] = [
  {
    label: 'Republic Act No. 7356 (NCCA charter)',
    publisher: 'Supreme Court E-Library',
    href: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3186',
    note: 'Primary legal text creating the National Commission for Culture and the Arts.',
  },
  {
    label: 'Republic Act No. 8626 (Bayanihan designation)',
    publisher: 'Supreme Court E-Library',
    href: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4966',
    note: 'Primary legal text designating the Philippine National Folk Dance Company.',
  },
  {
    label: 'About the Cultural Center of the Philippines',
    publisher: 'CCP',
    href: 'https://culturalcenter.gov.ph/about/',
    note: 'Institutional history and mandate; created in 1966 as a public trust.',
  },
  {
    label: 'CCP Digital Archives',
    publisher: 'CCP',
    href: 'https://digitalarchives.culturalcenter.gov.ph/',
    note: 'Digitized programmes, photographs and production records.',
  },
  {
    label: 'CCP Performing Arts Directory',
    publisher: 'CCP',
    href: 'https://artseducation.culturalcenter.gov.ph/ccpdirectory',
    note: 'Official directory of performing-arts groups, schools and practitioners.',
  },
  {
    label: 'National Artists of the Philippines',
    publisher: 'NCCA',
    href: 'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/',
    note: 'Authoritative list of National Artists, with disciplines and citations.',
  },
  {
    label: 'Philippine Dance Research and Documentation',
    publisher: 'NCCA',
    href: 'https://www.ncca.gov.ph/about-ncca-3/subcommissions/subcommission-on-the-arts-sca/dance/philippine-dance-research-and-documentation/',
    note: 'Context for dance research, documentation and safeguarding.',
  },
  {
    label: 'Ethnology collections',
    publisher: 'National Museum of the Philippines',
    href: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
    note: 'Catalogued material from 50 cultural communities, including intangible heritage.',
  },
  {
    label: 'About Ballet Philippines',
    publisher: 'Ballet Philippines',
    href: 'https://www.ballet.ph/about-us/',
    note: 'Company history, founding and repertoire.',
  },
  {
    label: 'About PETA',
    publisher: 'PETA Theater',
    href: 'https://petatheater.com/',
    note: 'Company history, productions and workshop programs.',
  },
  {
    label: 'Tanghalang Pilipino',
    publisher: 'CCP',
    href: 'https://culturalcenter.gov.ph/resident-companies/tanghalang-pilipino/',
    note: 'Resident drama company profile and mandate.',
  },
  {
    label: 'Philippine Folk Dance Society milestones',
    publisher: 'Philippine Folk Dance Society',
    href: 'https://www.philippinefolkdancesociety.com/milestone',
    note: 'Workshop and training history.',
  },
];

export const HISTORY_LEARNING_PATHS: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Read the primary legal texts',
    description:
      'Start with RA 7356 and RA 8626 to see how the state defines its cultural mandate and the National Folk Dance Company.',
    href: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3186',
    icon: Library,
  },
  {
    title: 'Use institutional archives',
    description:
      'The CCP Digital Archives and the National Museum’s ethnology collections hold programmes, photographs and object records.',
    href: 'https://digitalarchives.culturalcenter.gov.ph/',
    icon: Landmark,
  },
  {
    title: 'Follow company histories',
    description:
      'Ballet Philippines, PETA, Tanghalang Pilipino and the Ramon Obusan Folkloric Group publish their own institutional histories.',
    href: 'https://www.ballet.ph/about-us/',
    icon: Theater,
  },
  {
    title: 'Study with practitioners',
    description:
      'NCCA, CCP, the Philippine Folk Dance Society and university programs publish workshops, calls and training opportunities.',
    href: '/performing-arts-philippines#events',
    icon: GraduationCap,
  },
];

export const HISTORY_TOPICS: Array<{ label: string; icon: LucideIcon; target: string }> = [
  { label: 'Dance', icon: Footprints, target: '#disciplines' },
  { label: 'Music', icon: Music4, target: '#disciplines' },
  { label: 'Theater', icon: Drama, target: '#disciplines' },
  { label: 'Artists', icon: Users, target: '#people' },
  { label: 'Institutions', icon: Landmark, target: '#people' },
  { label: 'Learning resources', icon: BookOpen, target: '#learn' },
];
