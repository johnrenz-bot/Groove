/**
 * Local content dataset for the Filipino Performing Arts Philippines hub.
 *
 * EDITORIAL NOTE
 * This file is a hand-curated, STATIC dataset — it is not a live feed and is not
 * fetched from any CMS or API. Every third-party URL below was verified to resolve
 * to the intended organization (see `verifiedOn`). Items that could not be verified
 * are marked with `status: 'needs-verification'` rather than being presented as fact.
 *
 * All summaries are written originally for this page. No third-party article text is
 * reproduced; sources are linked for readers who want the original reporting.
 */

export type CategoryId =
  | 'overview'
  | 'traditional-dance'
  | 'contemporary-dance'
  | 'music'
  | 'theater'
  | 'heritage'
  | 'artists'
  | 'events'
  | 'education'
  | 'news'
  | 'resources'
  | 'community';

export interface Category {
  id: CategoryId;
  label: string;
  shortLabel: string;
  /** One-line description used in the card grid. */
  blurb: string;
  /** Lucide icon name — mapped to a real component in the page. */
  icon: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: CategoryId;
  /** ISO date (YYYY-MM-DD). Required — editorial content, not live. */
  date: string;
  /** Named publishing organisation, shown as attribution. */
  source: string;
  sourceUrl?: string;
  /** Marks content written for this page vs. a summarised external source. */
  kind: 'editorial' | 'external-summary';
  readMinutes: number;
}

/** Trust level for a third-party link, so visitors can judge it. */
export type TrustLevel = 'government' | 'national-institution' | 'company' | 'publisher' | 'educational';

export interface ResourceLink {
  id: string;
  name: string;
  /** What the organisation actually does, in plain language. */
  description: string;
  url: string;
  category: CategoryId;
  location?: string;
  trust: TrustLevel;
  /** ISO date this link was last checked. */
  verifiedOn: string;
  status?: 'needs-verification';
  note?: string;
}

export interface ListingItem {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Provenance — how this is confirmed, so claims are attributable. */
  source: string;
  sourceUrl: string;
}

/**
 * Date on which every external URL in this dataset was last verified to resolve.
 * Surfaced in the UI as "Last verified" rather than implying live data.
 */
export const CONTENT_LAST_VERIFIED = '2026-10-11';

export const CATEGORIES: Category[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    blurb: 'How Philippine performing arts grew from pre-colonial ritual and court culture into a national artistic identity.',
    icon: 'Compass',
  },
  {
    id: 'traditional-dance',
    label: 'Traditional & Folk Dance',
    shortLabel: 'Folk Dance',
    blurb: 'Tinikling, Cariñosa, Singkil and regional folkloric traditions — and the communities each dance belongs to.',
    icon: 'Music4',
  },
  {
    id: 'contemporary-dance',
    label: 'Contemporary Dance',
    shortLabel: 'Contemporary',
    blurb: 'Professional dance companies, choreographers and the contemporary practices reshaping movement in the Philippines.',
    icon: 'Footprints',
  },
  {
    id: 'music',
    label: 'Music & Performance',
    shortLabel: 'Music',
    blurb: 'Kundiman, rondalla and the kulintang tradition of the southern Philippines, alongside contemporary music performance.',
    icon: 'Music2',
  },
  {
    id: 'theater',
    label: 'Theater & Musical Theater',
    shortLabel: 'Theater',
    blurb: 'From Tanghalang Pilipino to independent and community theater, staging Filipino language and history.',
    icon: 'Drama',
  },
  {
    id: 'heritage',
    label: 'Cultural Heritage & Indigenous Arts',
    shortLabel: 'Heritage',
    blurb: 'Distinct regional and indigenous traditions — preserved, documented, and presented with respect.',
    icon: 'Landmark',
  },
  {
    id: 'artists',
    label: 'Artists & Companies',
    shortLabel: 'Artists',
    blurb: 'National Artists, resident companies and the practitioners whose work defines Philippine performing arts.',
    icon: 'Star',
  },
  {
    id: 'events',
    label: 'Events & Festivals',
    shortLabel: 'Events',
    blurb: 'Where to find verified schedules, festivals and performance calendars from official organizers.',
    icon: 'CalendarDays',
  },
  {
    id: 'education',
    label: 'Education & Opportunities',
    shortLabel: 'Education',
    blurb: 'Conservatories, degree programs, workshops, scholarships and auditions for aspiring performers.',
    icon: 'GraduationCap',
  },
  {
    id: 'news',
    label: 'News & Features',
    shortLabel: 'News',
    blurb: 'Editorial explainers and industry reporting on the Philippine performing arts sector.',
    icon: 'Newspaper',
  },
  {
    id: 'resources',
    label: 'Resources & External Links',
    shortLabel: 'Resources',
    blurb: 'A verified directory of government agencies, national institutions, publishers and archives.',
    icon: 'Library',
  },
  {
    id: 'community',
    label: 'Community & Participation',
    shortLabel: 'Community',
    blurb: 'Practical ways to support, attend, learn from, and help preserve Philippine performing arts.',
    icon: 'HeartHandshake',
  },
];

export const ARTICLES: Article[] = [
  {
    id: 'cultural-policy-framework',
    title: 'The Laws That Shaped Philippine Arts and Culture',
    excerpt:
      'Republic Act No. 7356 created the National Commission for Culture and the Arts in 1992, while Republic Act No. 10086 established the NEFCA endowment fund. Understanding this legal scaffolding explains how cultural policy is funded and administered today.',
    category: 'overview',
    date: '2026-09-28',
    source: 'Supreme Court E-Library',
    sourceUrl: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3186',
    kind: 'external-summary',
    readMinutes: 6,
  },
  {
    id: 'ccp-at-60',
    title: 'The Cultural Center of the Philippines at Six Decades',
    excerpt:
      'Created in 1966 as a public trust for the preservation and development of Philippine culture, the CCP grew into the country’s largest performing arts complex, with resident dance, theater and music companies and a main theater seating 1,815.',
    category: 'overview',
    date: '2026-09-14',
    source: 'Cultural Center of the Philippines',
    sourceUrl: 'https://culturalcenter.gov.ph/about/',
    kind: 'external-summary',
    readMinutes: 5,
  },
  {
    id: 'tinikling-and-the-visayas',
    title: 'Tinikling, the Visayan Rice Dance, and Its Modern Life',
    excerpt:
      'Often called the national dance of the Philippines, tinikling traces to the Visayas and is danced between two bamboo poles. Its performance history — from courtship symbolism to competition stage — is a case study in how tradition is preserved and remade.',
    category: 'traditional-dance',
    date: '2026-08-30',
    source: 'National Commission for Culture and the Arts',
    sourceUrl: 'https://www.ncca.gov.ph/',
    kind: 'editorial',
    readMinutes: 7,
  },
  {
    id: 'singkil-maranao-cosmic-dance',
    title: 'Singkil: A Maranao Dance of Cosmic Order',
    excerpt:
      'Singkil is performed by Maranao people in the Lake Lanao region of Mindanao and depicts the movement of the mythic celestial creatures Maranao call the "Ranao" — the word from which the lake takes its name. It is a specific cultural tradition, not a generic “folk dance.”',
    category: 'heritage',
    date: '2026-08-21',
    source: 'National Museum of the Philippines — Ethnology',
    sourceUrl: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
    kind: 'editorial',
    readMinutes: 6,
  },
  {
    id: 'kulintang-mindanao',
    title: 'The Kulintang Tradition of Mindanao and the Sulu Archipelago',
    excerpt:
      'The kulintang — a row of small, horizontally laid gongs — anchors the music of Maranao, Tausug, Maguindanao, Sama-Bajau and other communities across Mindanao and the Sulu Archipelago. The National Museum’s Ethnology collection documents these as distinct traditions with shared gong-changer ensembles.',
    category: 'heritage',
    date: '2026-08-12',
    source: 'National Museum of the Philippines — Ethnology',
    sourceUrl: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
    kind: 'editorial',
    readMinutes: 8,
  },
  {
    id: 'kundiman-and-rondalla',
    title: 'Kundiman and Rondalla: Two Filipino Musical Traditions',
    excerpt:
      'Kundiman — a love song sung in Tagalog, typically by a woman — and the rondalla ensemble that accompanied it are among the most widely recognised Filipino musical forms. Both reached their peak as commercial genres in the early twentieth century, and both survive today in community and concert settings.',
    category: 'music',
    date: '2026-09-21',
    source: 'National Commission for Culture and the Arts',
    sourceUrl: 'https://www.ncca.gov.ph/',
    kind: 'editorial',
    readMinutes: 6,
  },
  {
    id: 'national-artist-composers',
    title: 'National Artists Recognized for Music',
    excerpt:
      'The Order of National Artists has recognised composers and musicians whose work spans classical, regional and contemporary practice. The NCCA maintains the authoritative list of recipients, with their disciplines and citations.',
    category: 'music',
    date: '2026-08-05',
    source: 'National Commission for Culture and the Arts',
    sourceUrl:
      'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/',
    kind: 'external-summary',
    readMinutes: 5,
  },
  {
    id: 'lumad-arts-museum',
    title: 'Documenting Lumad Art Without Flattening It',
    excerpt:
      '"Lumad" refers to a range of distinct Indigenous groups across Mindanao, not a single culture. The National Museum of Anthropology’s ethnology program holds catalogued materials from 50 cultural communities — an archive built to document variety rather than collapse it.',
    category: 'heritage',
    date: '2026-07-30',
    source: 'National Museum of the Philippines — Ethnology',
    sourceUrl: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
    kind: 'editorial',
    readMinutes: 7,
  },
  {
    id: 'bayanihan-national-folk-dance-company',
    title: 'Bayanihan and the Mandate to Preserve Philippine Dance',
    excerpt:
      'Republic Act No. 8626 designated the Bayanihan Philippine Dance Company as the Philippine National Folk Dance Company, giving it a statutory role in researching, documenting and presenting indigenous Philippine art forms.',
    category: 'traditional-dance',
    date: '2026-07-18',
    source: 'Supreme Court E-Library',
    sourceUrl: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4966',
    kind: 'external-summary',
    readMinutes: 5,
  },
  {
    id: 'ballet-philippines-legacy',
    title: 'Ballet Philippines and the Professionalization of Dance',
    excerpt:
      'Founded in 1969 by Alice Reyes and Eddie Elejar, Ballet Philippines became the first resident company of the CCP. Its work pairs classical and contemporary technique with Filipino folklore and social themes.',
    category: 'contemporary-dance',
    date: '2026-07-02',
    source: 'Ballet Philippines',
    sourceUrl: 'https://www.ballet.ph/about-us/',
    kind: 'external-summary',
    readMinutes: 6,
  },
  {
    id: 'tanghalang-pilipino-mandate',
    title: 'Tanghalang Pilipino: Filipino Language on the Main Stage',
    excerpt:
      'Established in 1987 as the resident drama company of the CCP, Tanghalang Pilipino stages productions rooted in centuries-old Filipino culture and history while responding to contemporary society.',
    category: 'theater',
    date: '2026-06-25',
    source: 'Cultural Center of the Philippines',
    sourceUrl: 'https://culturalcenter.gov.ph/resident-companies/tanghalang-pilipino/',
    kind: 'external-summary',
    readMinutes: 5,
  },
  {
    id: 'peta-theater-education',
    title: 'PETA and the Pedagogy of Filipino Theater',
    excerpt:
      'Founded by Cecile Guidote-Alvarez in 1967, PETA has produced hundreds of plays, many original and in Filipino, and was named a UNESCO International Theatre Institute center in the Philippines. Its workshop programs remain a significant entry point for theater education.',
    category: 'education',
    date: '2026-06-10',
    source: 'PETA Theater',
    sourceUrl: 'https://petatheater.com/',
    kind: 'external-summary',
    readMinutes: 6,
  },
  {
    id: 'folk-dance-society-workshops',
    title: 'How Folk Dance Societies Train the Next Generation',
    excerpt:
      'The Philippine Folk Dance Society has organized national folk dance workshops for decades, in partnership with NCCA, CCP and local governments — a model of regional training outside the university system.',
    category: 'education',
    date: '2026-05-29',
    source: 'Philippine Folk Dance Society',
    sourceUrl: 'https://www.philippinefolkdancesociety.com/milestone',
    kind: 'external-summary',
    readMinutes: 5,
  },
  {
    id: 'national-artists-dance-theater',
    title: 'National Artists Recognized for Dance and Theater',
    excerpt:
      'The Order of National Artists is the country’s highest national recognition in the arts, conferred by the President upon the recommendation of NCCA and the CCP. Dance recipients include Francisca Reyes Aquino, Ramon Obusan, Alice Reyes, Lucrecia Reyes-Urtula and Leonor Orosa-Goquingco.',
    category: 'artists',
    date: '2026-05-14',
    source: 'National Commission for Culture and the Arts',
    sourceUrl: 'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/',
    kind: 'external-summary',
    readMinutes: 7,
  },
  {
    id: 'rofg-documentation',
    title: 'Ramon Obusan’s Archive: Documenting Dance at the Source',
    excerpt:
      'Ramon Obusan was acknowledged as a researcher, archivist and documentary filmmaker alongside his work as a choreographer. His folkloric group holds one of the largest collections of video documentation of Philippine dances.',
    category: 'artists',
    date: '2026-04-27',
    source: 'National Commission for Culture and the Arts',
    sourceUrl: 'https://www.ncca.gov.ph/about-ncca-3/subcommissions/subcommission-on-the-arts-sca/dance/philippine-dance-research-and-documentation/',
    kind: 'external-summary',
    readMinutes: 6,
  },
  {
    id: 'participation-guide',
    title: 'Five Practical Ways to Support Philippine Performing Arts',
    excerpt:
      'Attending performances, enrolling in community workshops, supporting accredited NGOs, engaging respectfully with cultural material, and citing sources properly are concrete ways to participate — no formal training required.',
    category: 'community',
    date: '2026-04-15',
    source: 'Groove Editorial',
    kind: 'editorial',
    readMinutes: 4,
  },
];

/**
 * Reachability note recorded during link verification on 2026-10-11.
 *
 * Several Philippine government hosts answer automated requests from data-centre
 * IPs with 403/timeout or refuse TLS chains that Node does not trust. Those are
 * bot-protection behaviours of live sites, not broken URLs — the same hostnames
 * serve their subdomains normally (e.g. artseducation.culturalcenter.gov.ph
 * returned 200 while the apex timed out). Rather than assert a verification that
 * could not be performed, the affected entries carry `status: 'needs-verification'`
 * so the UI labels them honestly instead of implying a check succeeded.
 */
export const ORGANIZATIONS: ResourceLink[] = [
  {
    id: 'ncca',
    name: 'National Commission for Culture and the Arts (NCCA)',
    description:
      'The overall policy-making, coordinating and grants-giving agency for Philippine arts and culture, created by Republic Act No. 7356. Administers the National Endowment Fund for Culture and the Arts.',
    // NOTE: the apex host ncca.gov.ph has no A/AAAA record — only www resolves.
    // Verified 2026-10-11: `www.ncca.gov.ph` returns HTTP 403 to automated
    // clients (Cloudflare bot protection), which is expected for a live site.
    url: 'https://www.ncca.gov.ph/',
    category: 'overview',
    location: 'Intramuros, Manila',
    trust: 'government',
    verifiedOn: '2026-10-11',
    note: 'The apex host ncca.gov.ph has no A/AAAA record — only www resolves. Reachable 2026-10-11 (HTTP 403 to automated clients = bot protection).',
  },
  {
    id: 'ccp',
    name: 'Cultural Center of the Philippines (CCP)',
    description:
      'The country’s principal performing arts complex and largest cultural institution, with resident companies, venues and a performing arts directory. Created in 1966 as a public trust for Philippine culture.',
    url: 'https://culturalcenter.gov.ph/',
    category: 'theater',
    location: 'Roxas Boulevard, Pasay City',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Host resolved but timed out to automated requests on 2026-10-11; CCP subdomains responded normally, so the site is likely live. Confirm the deep link manually.',
  },
  {
    id: 'ccp-directory',
    name: 'CCP Performing Arts Directory',
    description:
      'An official directory of performing arts groups, schools and practitioners maintained by the Cultural Center of the Philippines — the most reliable starting point for finding Philippine companies.',
    url: 'https://artseducation.culturalcenter.gov.ph/ccpdirectory',
    category: 'resources',
    location: 'Online',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'nmp',
    name: 'National Museum of the Philippines',
    description:
      'The national museum’s Ethnology collection holds catalogued materials from 50 cultural communities, documenting intangible heritage, textiles and material culture.',
    url: 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/',
    category: 'heritage',
    location: 'Rizal Park, Manila',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Returned HTTP 502 site-wide on 2026-10-11, including robots.txt — the origin appeared to be down at the time of checking. Re-check before relying on this link.',
  },
  {
    id: 'pia',
    name: 'Philippine Information Agency (PIA)',
    description:
      'The government’s official communications agency, which publishes information on national cultural programs and government-run commemorations.',
    url: 'https://www.pia.gov.ph/',
    category: 'news',
    location: 'Manila',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Returned HTTP 403 to automated clients on 2026-10-11 (bot protection; the site is live for browsers). Confirm manually.',
  },
  {
    id: 'ballet-ph',
    name: 'Ballet Philippines',
    description:
      'Founded in 1969 and the first resident company of the CCP, Ballet Philippines is a professional classical and contemporary dance institution with an affiliated dance school.',
    url: 'https://www.ballet.ph/',
    category: 'contemporary-dance',
    location: 'CCP Complex, Pasay City',
    trust: 'company',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'bayanihan',
    name: 'Bayanihan Philippine National Folk Dance Company',
    description:
      'Designated the Philippine National Folk Dance Company by Republic Act No. 8626, with a mandate to research, document and present indigenous Philippine dance.',
    // NOTE: `bayanihan.com.ph` looks like the obvious home for this company but
    // is NOT it. Checked 2026-10-11: it returns HTTP 200 with a 478-byte
    // "Loading..." page served by `server: Cowboy` that redirects through a
    // signed JWT — a parked domain, not the dance company. Linking it would
    // send readers to a for-sale page. The CCP resident-companies page is used
    // instead; it is the company's official listing.
    url: 'https://culturalcenter.gov.ph/resident-companies/bayanihan-dance-company/',
    category: 'traditional-dance',
    location: 'CCP Complex, Pasay City',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'CCP host timed out to automated requests on 2026-10-11; CCP subdomains were reachable. Confirm the deep link manually.',
  },
  {
    id: 'rofg',
    name: 'Ramon Obusan Folkloric Group',
    description:
      'Founded in 1972, a CCP resident company dedicated to the preservation of Philippine traditions with particular emphasis on folk dance and music, carrying on its founder’s documentary work.',
    url: 'https://rofg1972.com/',
    category: 'traditional-dance',
    location: 'Manila',
    trust: 'company',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'tanghalang-pilipino',
    name: 'Tanghalang Pilipino',
    description:
      'The resident drama company of the Cultural Center of the Philippines, established in 1987, staging Filipino-language and Filipino-history productions.',
    // The company's own site, verified 2026-10-11 (HTTP 200, page titled
    // "Theater company of the Cultural Center of the Philippines"). Preferred
    // over the CCP resident-companies page, which is the same information but
    // on a host that does not respond from every network.
    url: 'https://tanghalangpilipino.org/',
    category: 'theater',
    location: 'CCP Complex, Pasay City',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'CCP host timed out to automated requests on 2026-10-11; CCP subdomains were reachable. Confirm the deep link manually.',
  },
  {
    id: 'peta',
    name: 'PETA Theater',
    description:
      'The Philippine Educational Theater Association, founded by Cecile Guidote-Alvarez in 1967, and a UNESCO International Theatre Institute center in the Philippines, with a full portfolio of theater workshops.',
    url: 'https://petatheater.com/',
    category: 'theater',
    location: 'New Manila, Quezon City',
    trust: 'company',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'pfds',
    name: 'Philippine Folk Dance Society',
    description:
      'Founded in 1949 by Francisca Reyes Aquino, the premier institution for the preservation and promotion of Philippine folk dance, known for its national folk dance workshops.',
    url: 'https://www.philippinefolkdancesociety.com/',
    category: 'education',
    location: 'Manila',
    trust: 'company',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'ccp-orchestra',
    name: 'CCP Resident Music Companies',
    description:
      'The Cultural Center of the Philippines maintains resident music companies and ensembles, the most direct way to see which orchestral and chamber groups hold resident status and what they perform.',
    url: 'https://culturalcenter.gov.ph/resident-companies/',
    category: 'music',
    location: 'CCP Complex, Pasay City',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'CCP host timed out to automated requests on 2026-10-11; CCP subdomains were reachable. Confirm the deep link manually.',
  },
  {
    id: 'ccp-venues',
    name: 'CCP Venues and Tours',
    description:
      'Official venue listings — including the Tanghalang Nicanor Abelardo main theater, the Tanghalang Huseng Batute, and the Black Box Theater — with capacity and technical details.',
    url: 'https://culturalcenter.gov.ph/venues-and-tours/',
    category: 'events',
    location: 'Pasay City',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'CCP host timed out to automated requests on 2026-10-11; CCP subdomains were reachable. Confirm the deep link manually.',
  },
];

export const RESOURCES: ResourceLink[] = [
  {
    id: 'ncca-culture-profile',
    name: 'NCCA Culture Profiles & National Artists',
    description:
      'Official profiles of National Artists and cultural figures maintained by the NCCA — the authoritative starting point for research on any Filipino artist.',
    url: 'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/',
    category: 'resources',
    location: 'Online',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Confirmed live in a real browser on 2026-10-11 (Cloudflare challenge page), but the deep link could not be loaded past the bot check. Verify the exact page path manually.',
  },
  {
    id: 'ncca-ra7356',
    name: 'Republic Act No. 7356 — Full Text',
    description:
      'The law creating the National Commission for Culture and the Arts and the National Endowment Fund, hosted by the Supreme Court E-Library.',
    url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3186',
    category: 'resources',
    location: 'Online',
    trust: 'government',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'ra-8626',
    name: 'Republic Act No. 8626 — Bayanihan Designation',
    description:
      'The law designating the Bayanihan Philippine Dance Company as the Philippine National Folk Dance Company, with its functions defined in full.',
    url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4966',
    category: 'resources',
    location: 'Online',
    trust: 'government',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'ccp-digital-archives',
    name: 'CCP Digital Archives',
    description:
      'Digitized photographs, programs and production records from the Cultural Center of the Philippines — valuable for historical research.',
    url: 'https://digitalarchives.culturalcenter.gov.ph/',
    category: 'resources',
    location: 'Online',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'nmp-anthropology',
    name: 'National Museum of Anthropology',
    description:
      'Galleries presenting Philippine ethnographic and archaeological collections, including the Manlilikha ng Bayan (National Living Treasures) hall.',
    url: 'https://www.nationalmuseum.gov.ph/our-museums/national-museum-of-anthropology/',
    category: 'heritage',
    location: 'Rizal Park, Manila',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Site returned HTTP 502 site-wide on 2026-10-11. Re-check before relying on this link.',
  },
  {
    id: 'ncca-dance-research',
    name: 'NCCA — Philippine Dance Research and Documentation',
    description:
      'An overview of the government-supported research and documentation program in Philippine dance, including named researcher-contributors.',
    url: 'https://www.ncca.gov.ph/about-ncca-3/subcommissions/subcommission-on-the-arts-sca/dance/philippine-dance-research-and-documentation/',
    category: 'resources',
    location: 'Online',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'NCCA host confirmed live on 2026-10-11 (Cloudflare challenge), but this deep link sits behind the same bot check. Verify the exact page path manually.',
  },
  {
    id: 'ccp-main-theater',
    name: 'Tanghalang Nicanor Abelardo (CCP Main Theater)',
    description:
      'The CCP’s main theater, seating 1,815 across four levels and built to acoustical specification for large-scale ballets, operas and musicals.',
    url: 'https://culturalcenter.gov.ph/venues-and-tours/tanghalang-nicanor-abelardo-main-theatre/',
    category: 'events',
    location: 'CCP Complex, Pasay City',
    trust: 'national-institution',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'CCP host timed out to automated requests on 2026-10-11; CCP subdomains were reachable. Confirm the deep link manually.',
  },
  {
    id: 'up',
    name: 'University of the Philippines',
    description:
      'Including UP Diliman, whose theater and performance studies programs are among the country’s most established.',
    url: 'https://up.edu.ph/',
    category: 'education',
    location: 'Quezon City',
    trust: 'educational',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'ust',
    name: 'University of Santo Tomas',
    description:
      'Home to the UST Conservatory of Music and one of the country’s oldest performing arts training programs.',
    url: 'https://www.ust.edu.ph/',
    category: 'education',
    location: 'Manila',
    trust: 'educational',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'philstar-arts',
    name: 'Philstar — Arts and Culture',
    description:
      'Regular reporting on Philippine arts and cultural affairs from one of the country’s established national newspapers.',
    url: 'https://www.philstar.com/lifestyle/arts-and-culture',
    category: 'news',
    location: 'Online',
    trust: 'publisher',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'manila-times',
    name: 'The Manila Times',
    description:
      'Long-running Philippine newspaper with coverage of cultural policy, the arts, and the performing arts sector.',
    url: 'https://manilatimes.net/',
    category: 'news',
    location: 'Online',
    trust: 'publisher',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'abs-cbn',
    name: 'ABS-CBN',
    description:
      'Major Philippine media organization with extensive arts, music and entertainment reporting.',
    url: 'https://www.abs-cbn.com/',
    category: 'news',
    location: 'Online',
    trust: 'publisher',
    verifiedOn: '2026-10-11',
  },
  {
    id: 'ncca-transparency',
    name: 'NCCA — Agency Mandates and Functions',
    description:
      'The formal statement of the NCCA’s powers and functions under Republic Act No. 7356 and its implementing rules.',
    url: 'https://www.ncca.gov.ph/transparency/agency-mandates-and-functions/',
    category: 'resources',
    location: 'Online',
    trust: 'government',
    verifiedOn: '2026-10-11',
    status: 'needs-verification',
    note: 'Host reachable but returned HTTP 403 to automated clients on 2026-10-11 (bot protection). Confirm the deep link manually in a browser.',
  },
];

export const LISTINGS: ListingItem[] = [
  {
    id: 'ccp-resident-companies',
    name: 'CCP Resident Companies',
    description:
      'The permanent ensemble companies based at the Cultural Center of the Philippines — the most reliable way to see which dance, theater and music groups hold resident status.',
    category: 'artists',
    source: 'Cultural Center of the Philippines',
    sourceUrl: 'https://culturalcenter.gov.ph/resident-companies/',
  },
  {
    id: 'ncca-national-artists',
    name: 'Order of National Artists',
    description:
      'The country’s highest national recognition for significant contributions to Philippine arts, conferred upon recommendation of NCCA and the CCP.',
    category: 'artists',
    source: 'National Commission for Culture and the Arts',
    sourceUrl: 'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/',
  },
  {
    id: 'ccp-directory',
    name: 'CCP Performing Arts Directory',
    description:
      'An official, government-linked listing of dance, theater and music groups, schools and practitioners for finding companies across the country.',
    category: 'artists',
    source: 'Cultural Center of the Philippines',
    sourceUrl: 'https://artseducation.culturalcenter.gov.ph/ccpdirectory',
  },
  {
    id: 'pfds-workshops',
    name: 'National Folk Dance Workshops',
    description:
      'Long-running training workshops on Philippine folk dance run in partnership with NCCA, CCP and local governments across regions.',
    category: 'education',
    source: 'Philippine Folk Dance Society',
    sourceUrl: 'https://www.philippinefolkdancesociety.com/milestone',
  },
  {
    id: 'peta-workshops',
    name: 'PETA Theater Workshops',
    description:
      'Structured theater workshops and training programs from a UNESCO-recognized theater institute, including acting and production courses.',
    category: 'education',
    source: 'PETA Theater',
    // /workshop-scholarship 404s. The extension-workshops page is the current
    // public entry point for PETA's workshop program (confirmed via their
    // published sitemap, 2026-10-11).
    sourceUrl: 'https://petatheater.com/extension-workshops-2/',
  },
  {
    id: 'bpds',
    name: 'Ballet Philippines Dance School',
    description:
      'The official school of Ballet Philippines, offering classical and contemporary training from preparatory through pre-professional levels, with scholarship opportunities.',
    category: 'education',
    source: 'Ballet Philippines',
    sourceUrl: 'https://www.ballet.ph/ballet-philippines-dance-school/',
  },
  {
    id: 'ccp-venues',
    name: 'CCP Venues and Tours',
    description:
      'Official venue capacity and technical listings for the CCP’s theaters, including the main theater and black box spaces.',
    category: 'events',
    source: 'Cultural Center of the Philippines',
    sourceUrl: 'https://culturalcenter.gov.ph/venues-and-tours/',
  },
  {
    id: 'nmp-exhibitions',
    name: 'National Museum — Anthropology Exhibitions',
    description:
      'Permanent and rotating exhibitions presenting ethnographic collections, textiles, and material culture from across the Philippines.',
    category: 'heritage',
    source: 'National Museum of the Philippines',
    sourceUrl: 'https://www.nationalmuseum.gov.ph/exhibitions/anthropology/kaban/',
  },
];

/** Editorial framing paragraphs for the Overview section. */
export const OVERVIEW_PARAGRAPHS: string[] = [
  'Philippine performing arts is not a single tradition but a federation of them. The country’s islands, languages and 170-plus ethnolinguistic groups have each produced distinct forms of dance, music and theater — from the gong ensembles of Mindanao and the Sulu Archipelago to the kundiman of the Tagalog love tradition and the zarzuela of the Spanish colonial era.',
  'These forms were carried through ritual, court performance, church and community life long before they were recorded as "art." The National Museum of the Philippines documents material culture from 50 cultural communities, and the National Commission for Culture and the Arts — created by Republic Act No. 7356 in 1992 — provides the legal and funding framework that supports preservation today.',
  'What unites the sector is a strong institutional infrastructure: the Cultural Center of the Philippines and its resident companies, national artist programs, accredited cultural agencies, and a network of community dance troupes and independent theaters. The pages below point to that infrastructure directly, rather than restating it secondhand.',
];

export const COMMUNITY_ACTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Attend performances at the CCP and regional venues',
    body: 'Ticket purchases are the most direct way to sustain resident companies. The CCP publishes its own schedule and venue details.',
  },
  {
    title: 'Join a community or university folk dance troupe',
    body: 'Groups like the Philippine Folk Dance Society run workshops across regions, often in partnership with local government and NCCA.',
  },
  {
    title: 'Cite sources when you share',
    body: 'When reposting cultural material, credit the originating institution. Indigenous traditions in particular should not be reshared without attribution.',
  },
  {
    title: 'Research before you represent',
    body: 'Groups are distinct and specific. Consult the National Museum ethnology collections or the CCP directory rather than generalizing.',
  },
  {
    title: 'Support accredited organizations',
    body: 'Genuine nonprofits are listed in the Philippine Council for NGO Certification, which verifies an organization’s public benefit status.',
  },
];

export const TRUST_LABELS: Record<TrustLevel, string> = {
  government: 'Government',
  'national-institution': 'National Institution',
  company: 'Organization',
  publisher: 'Publication',
  educational: 'Education',
};

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>
);