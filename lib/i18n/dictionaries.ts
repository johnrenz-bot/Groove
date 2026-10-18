/**
 * Groove dashboard dictionaries — English (default) + Tagalog.
 *
 * SCOPE: chrome and dashboard UI text only (nav, header, menus, home
 * dashboards, shared dashboard components). NEVER user-generated content:
 * names, messages, bios, database records and user-entered values are rendered
 * verbatim and must not pass through `t()`.
 *
 * CONVENTIONS
 * - Natural Filipino; common technical terms stay in English (Dashboard,
 *   Calendar, Messages, Profile, Settings) when that is how Filipinos use them.
 * - `en` is the complete reference. A missing `tl` key falls back to `en`
 *   at lookup time (see LanguageProvider), so partial coverage degrades to
 *   English rather than to a blank string.
 * - Nav entries are keyed by their stable `id` from navConfig and resolved
 *   with per-role variants, mirroring `labelByRole` / `descriptionByRole`.
 */

export type Language = 'en' | 'tl';

export const LANGUAGES: Array<{ value: Language; label: string; short: string }> = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'tl', label: 'Tagalog', short: 'TL' },
];

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'groove-language';

/** Nested string tree. Leaves are strings; branches are DictNodes. */
export interface DictNode {
  [key: string]: string | DictNode;
}

const en: DictNode = {
  header: {
    search: 'Search',
    searchLabel: 'Search pages and people',
    openNav: 'Open navigation',
    openAccountMenu: 'Open account menu',
    signIn: 'Sign In',
    getStarted: 'Get started',
    accountOf: 'Account menu for {name}',
    accountTitle: 'Account',
    profile: 'Profile',
    editProfile: 'Edit Profile',
    editClientProfile: 'Edit Client Profile',
    editCoachProfile: 'Edit Coach Profile',
    accountSettings: 'Account Settings',
    switchToClient: 'Switch to Client Portal',
    switchToCoach: 'Switch to Coach Portal',
    status: 'Status',
    appearance: 'Appearance',
    sound: 'Sound',
    signOut: 'Sign Out',
    logInLink: 'Log in',
    signUpLink: 'Sign up',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    themeLabel: 'Colour theme',
  },
  nav: {
    dashboard: 'Dashboard',
    community: 'Community',
    communityHeading: 'Performing Arts',
    about: 'About Groove',
    directory: 'Directory',
    coaches: 'Coaches',
    howItWorks: 'How it works',
    /* The admin console's four top-level entries. They were looked up
       dynamically by `section.id` in `NavDropdown` / `MobileDrawer`, so with
       no keys here the whole admin bar rendered in English even with Tagalog
       selected. Keys are the stable ids from `navConfig.ts`. */
    console: 'Overview',
    adminPeople: 'People',
    adminOperations: 'Operations',
    adminPlatform: 'Platform',
  },
  drawer: {
    mainNav: 'Main',
  },
  palette: {
    placeholder: 'Search pages and people…',
    noResults: 'No matches. Try a different word.',
    pages: 'Pages',
    people: 'People',
    navigate: 'to navigate',
    openHint: 'to open',
  },
  home: {
    roleCoach: 'Coach',
    clientEyebrow: 'Client Control Terminal',
    clientSubtitle: 'Find coaches, book rehearsals, and track your performance journey in Bulacan.',
    coachEyebrow: 'Coach Control Terminal',
    coachSubtitle:
      'Manage your appointments, organize rehearsal sessions, and review performer requests in Bulacan.',
    quickShowcase: 'Showcase Feed',
    quickMessages: 'Messages',
    quickCalendar: 'Calendar',
    quickBookings: 'Bookings',
    quickAppointments: 'Appointments',
    statBookings: 'Bookings',
    statBookingsSub: 'View your sessions',
    statCoaches: 'Coaches Nearby',
    statCoachesSub: 'Available in SJDM',
    statRegion: 'Platform Region',
    statRegionValue: 'SJDM, Bulacan',
    statRegionSub: 'Region III',
    statAccount: 'Account Status',
    statAccountValue: 'Verified Active',
    /* The Account Status card used to render `statAccountValue` for everyone,
       verified or not. These two are what it actually says now. */
    statAccountVerified: 'Verified Active',
    statAccountPending: 'Pending Review',
    statAccountNoId: 'No ID yet',
    statAppointments: 'Appointments',
    statAppointmentsSub: 'View upcoming requests',
    statStudents: 'Students in SJDM',
    statStudentsSub: 'Registered performers',
    statCoachStatus: 'Coach Status',
    heroClientEyebrow: 'Performer Workspace',
    heroClientTitle: 'Find your coach. Own the stage.',
    heroClientDesc:
      'Book sessions, share your showcases, and grow with a community of performers in Bulacan.',
    heroClientPrimary: 'Find a Coach',
    heroClientSecondary: 'My Schedule',
    heroCoachEyebrow: 'Coach Instructor for Workspace',
    heroCoachTitle: 'Inspire the next generation of performers',
    heroCoachDesc: 'Track sessions, manage contracts, and connect with talents in Bulacan.',
    heroCoachPrimary: 'Community Showcase',
    heroCoachSecondary: 'Manage Schedule',
    coachesPanel: 'Coaches in San Jose del Monte',
    coachesPanelSub: 'Local coaches open for mentorship',
    studentsPanel: 'Students in San Jose del Monte',
    sessionsPanel: 'Upcoming Sessions',
    sessionsPanelSubClient: 'Your booked rehearsals',
    sessionsPanelSubCoach: 'Your scheduled rehearsals',
    noSessions: 'No upcoming sessions.',
    studiosClientTitle: 'Rehearsal Studios Locator',
    studiosClientSub:
      'Performing arts spaces in San Jose del Monte and Bulacan — curated listings plus community-sourced results',
    studiosCoachTitle: 'Rehearsal Studios Directory',
    studiosCoachSub:
      'Dance and performing arts studios around San Jose del Monte, Bulacan — curated listings plus community-sourced results',
    loadingTerminal: 'Loading your coach terminal...',
  },
  common: {
    viewAll: 'View all',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Retry',
    loading: 'Loading…',
  },
  admin: {
    console: 'Admin Console',
    overview: 'Overview',
    people: 'People',
    verificationDocs: 'Verification Documents',
    usersDir: 'Users & Directory',
    coaches: 'Coaches',
    clients: 'Clients',
    operations: 'Operations',
    bookings: 'Bookings',
    inquiries: 'Inquiries & Tickets',
    clientMessages: 'Client Messages',
    contracts: 'Contracts & Reviews',
    sysControl: 'System Control',
    platform: 'Platform',
    announcements: 'Announcements',
    maintenance: 'Maintenance',
    appearance: 'Appearance',
    sysSettings: 'System Settings',
    menu: 'Menu',
    navigation: 'Navigation',
    closeNav: 'Close navigation',
  },
};

const tl: DictNode = {
  header: {
    search: 'Maghanap',
    searchLabel: 'Maghanap ng mga pahina at tao',
    openNav: 'Buksan ang nabigasyon',
    openAccountMenu: 'Buksan ang account menu',
    signIn: 'Mag-sign In',
    getStarted: 'Magsimula',
    accountOf: 'Account menu para kay {name}',
    accountTitle: 'Account',
    profile: 'Profile',
    editProfile: 'I-edit ang Profile',
    editClientProfile: 'I-edit ang Client Profile',
    editCoachProfile: 'I-edit ang Coach Profile',
    accountSettings: 'Account Settings',
    switchToClient: 'Lumipat sa Client Portal',
    switchToCoach: 'Lumipat sa Coach Portal',
    status: 'Status',
    appearance: 'Hitsura',
    sound: 'Tunog',
    signOut: 'Mag-sign Out',
    logInLink: 'Mag-log in',
    signUpLink: 'Mag-sign up',
    themeLight: 'Maliwanag',
    themeDark: 'Madilim',
    themeSystem: 'System',
    themeLabel: 'Tema ng kulay',
  },
  nav: {
    dashboard: 'Dashboard',
    community: 'Komunidad',
    communityHeading: 'Sining ng Pagtatanghal',
    about: 'Tungkol sa Groove',
    directory: 'Direktoryo',
    coaches: 'Mga Coach',
    howItWorks: 'Paano ito gumagana',
    /* Mirrors the `en` admin section keys — see the note there. */
    console: 'Pangkalahatang-ideya',
    adminPeople: 'Mga Tao',
    adminOperations: 'Mga Operasyon',
    adminPlatform: 'Platorma',
  },
  drawer: {
    mainNav: 'Pangunahin',
  },
  palette: {
    placeholder: 'Maghanap ng mga pahina at tao…',
    noResults: 'Walang tugma. Sumubok ng ibang salita.',
    pages: 'Mga Pahina',
    people: 'Mga Tao',
    navigate: 'upang mag-navigate',
    openHint: 'upang buksan',
  },
  home: {
    roleCoach: 'Coach',
    clientEyebrow: 'Client Control Terminal',
    clientSubtitle:
      'Humanap ng mga coach, mag-book ng rehearsal, at subaybayan ang iyong performance journey sa Bulacan.',
    coachEyebrow: 'Coach Control Terminal',
    coachSubtitle:
      'Pamahalaan ang iyong mga appointment, ayusin ang mga rehearsal session, at suriin ang mga kahilingan ng performer sa Bulacan.',
    quickShowcase: 'Showcase Feed',
    quickMessages: 'Mga Mensahe',
    quickCalendar: 'Kalendaryo',
    quickBookings: 'Mga Booking',
    quickAppointments: 'Mga Appointment',
    statBookings: 'Mga Booking',
    statBookingsSub: 'Tingnan ang iyong mga session',
    statCoaches: 'Mga Coach sa Malapit',
    statCoachesSub: 'Available sa SJDM',
    statRegion: 'Rehiyon ng Platform',
    statRegionValue: 'SJDM, Bulacan',
    statRegionSub: 'Region III',
    statAccount: 'Status ng Account',
    statAccountValue: 'Verified Active',
    statAccountVerified: 'Aktibong Na-verify',
    statAccountPending: 'Naghihintay ng Pagsusuri',
    statAccountNoId: 'Wala pang ID',
    statAppointments: 'Mga Appointment',
    statAppointmentsSub: 'Tingnan ang mga paparating na kahilingan',
    statStudents: 'Mga Estudyante sa SJDM',
    statStudentsSub: 'Mga rehistradong performer',
    statCoachStatus: 'Status ng Coach',
    heroClientEyebrow: 'Performer Workspace',
    heroClientTitle: 'Hanapin ang iyong coach. Angkinin ang entablado.',
    heroClientDesc:
      'Mag-book ng mga session, ibahagi ang iyong mga showcase, at lumago kasama ng komunidad ng mga performer sa Bulacan.',
    heroClientPrimary: 'Humanap ng Coach',
    heroClientSecondary: 'Aking Iskedyul',
    heroCoachEyebrow: 'Coach Instructor for Workspace',
    heroCoachTitle: 'Bigyang-inspirasyon ang susunod na henerasyon ng mga performer',
    heroCoachDesc:
      'Subaybayan ang mga session, pamahalaan ang mga kontrata, at kumonekta sa mga talento sa Bulacan.',
    heroCoachPrimary: 'Community Showcase',
    heroCoachSecondary: 'Pamahalaan ang Iskedyul',
    coachesPanel: 'Mga Coach sa San Jose del Monte',
    coachesPanelSub: 'Mga lokal na coach na bukas sa mentorship',
    studentsPanel: 'Mga Estudyante sa San Jose del Monte',
    sessionsPanel: 'Mga Paparating na Session',
    sessionsPanelSubClient: 'Ang iyong mga naka-book na rehearsal',
    sessionsPanelSubCoach: 'Ang iyong mga naka-iskedyul na rehearsal',
    noSessions: 'Walang paparating na mga session.',
    studiosClientTitle: 'Rehearsal Studios Locator',
    studiosClientSub:
      'Mga espasyo para sa performing arts sa San Jose del Monte at Bulacan — curated na mga listing at mga resulta mula sa komunidad',
    studiosCoachTitle: 'Direktoryo ng Rehearsal Studios',
    studiosCoachSub:
      'Mga studio ng sayaw at performing arts sa San Jose del Monte, Bulacan — curated na mga listing at mga resulta mula sa komunidad',
    loadingTerminal: 'Niloload ang iyong coach terminal...',
  },
  common: {
    viewAll: 'Tingnan lahat',
    cancel: 'Kanselahin',
    close: 'Isara',
    retry: 'Subukan muli',
    loading: 'Naglo-load…',
  },
  admin: {
    console: 'Admin Console',
    overview: 'Buod',
    people: 'Mga Tao',
    verificationDocs: 'Mga Dokumento sa Beripikasyon',
    usersDir: 'Mga User at Direktoryo',
    coaches: 'Mga Coach',
    clients: 'Mga Client',
    operations: 'Mga Operasyon',
    bookings: 'Mga Booking',
    inquiries: 'Mga Katanungan at Ticket',
    clientMessages: 'Mga Mensahe ng Client',
    contracts: 'Mga Kontrata at Review',
    sysControl: 'System Control',
    platform: 'Platform',
    announcements: 'Mga Anunsyo',
    maintenance: 'Maintenance',
    appearance: 'Hitsura',
    sysSettings: 'System Settings',
    menu: 'Menu',
    navigation: 'Nabigasyon',
    closeNav: 'Isara ang nabigasyon',
  },
};

export const dictionaries: Record<Language, DictNode> = { en, tl };

/**
 * Per-leaf nav text, mirroring navConfig's `labelByRole` / `descriptionByRole`
 * shape. Only translated leaves are listed; anything absent falls back to the
 * leaf's own hardcoded English at the call site.
 */
interface NavText {
  label?: string;
  label_client?: string;
  label_coach?: string;
  description?: string;
  description_client?: string;
  description_coach?: string;
}

const navEn: Record<string, NavText> = {};

const navTl: Record<string, NavText> = {
  showcase: { label: 'Showcase', description: 'Tingnan ang community showcase' },
  directory: { label: 'Direktoryo', description: 'Humanap ng mga coach, client at collaborator' },
  bookings: {
    label: 'Mga Booking',
    label_client: 'Mga Appointment',
    description: 'Ang aking mga booking at kahilingan sa session',
    description_coach: 'Pamahalaan ang mga papasok na kahilingan sa booking',
  },
  messages: { label: 'Mga Mensahe', description: 'Direktang pagmemensahe' },
  calendar: {
    label: 'Kalendaryo',
    description: 'Ang aking mga session at paparating na booking',
    description_coach: 'Ang aking availability at iskedyul',
  },
  'find-coaches': { label: 'Humanap ng mga Coach', description: 'Tumingin at mag-book ng verified na coach' },
  groovey: { label: 'Groovey AI', description: 'Tanungin si Groovey tungkol sa performing arts' },
  'pa-dance': { label: 'Sayaw', description: 'Hip-hop, contemporary at tradisyonal na choreography' },
  'pa-singing': { label: 'Pag-awit', description: 'Vocal coaching, harmonies at stage presence' },
  'pa-acting': { label: 'Pag-arte', description: 'Method acting, character work at scene study' },
  'pa-theater': { label: 'Teatro', description: 'Musical theatre, produksyon at staging' },
  'pa-hub': {
    label: 'Performing Arts PH',
    description: 'Mga organisasyon at resource sa performing arts sa Pilipinas',
  },
};

export const navDictionaries: Record<Language, Record<string, NavText>> = {
  en: navEn,
  tl: navTl,
};

export type { NavText };
