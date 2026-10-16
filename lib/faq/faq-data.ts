/**
 * THE FAQ CONTENT — one array, grouped into categories.
 *
 * WHY THIS IS DATA AND NOT JSX
 *   The same entries are rendered by two different components: the full
 *   browser at `/faq` (search + category filter + accordion) and the compact
 *   teaser on the landing page. If the questions were written into the JSX,
 *   the teaser would be a hand-picked copy that drifts out of date the first
 *   time an answer is corrected. One array, two views.
 *
 * A GROUND RULE FOR ANSWERS
 *   Every answer below describes something that is actually implemented in this
 *   repository. Where the code does not do a thing, the answer says so instead
 *   of describing a planned one. Specifically, do not add claims about
 *   payments or subscriptions, ratings and reviews written by members, push or
 *   email notifications, or achievement/badge progression — none of those are
 *   wired up. The badge components under `components/achievements/` are not
 *   imported by any route, so there is no achievement system to describe.
 *
 *   When you change a behaviour, change the string here. Both views follow.
 */

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  /** Extra words the search should match on that are not in the text. */
  keywords?: string[];
}

export interface FaqCategory {
  id: string;
  label: string;
  /** One line for the category, shown in the filter bar. */
  blurb: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'about',
    label: 'About Groove System',
    blurb: 'What the platform is, who it serves, and where it operates.',
    items: [
      {
        id: 'about-what',
        question: 'What is Groove System?',
        answer:
          'Groove System is a performing-arts platform built for San Jose del Monte, Bulacan. It connects performers with coaches, helps them find studios, and keeps bookings, contracts and messaging in one place instead of across scattered messages and notebooks.',
      },
      {
        id: 'about-who',
        question: 'Who can use Groove System?',
        answer:
          'Three kinds of account: clients (performers and students), coaches, and administrators. Visitors can also browse the public parts of the site — the landing page, the community discipline pages, the member directory and the Frequently Asked Questions — without signing in.',
      },
      {
        id: 'about-free',
        question: 'Is Groove System free to use?',
        answer:
          'Creating an account and browsing the directory are free. Groove System does not process payments on the site: rates for coaching sessions are agreed directly between you and your coach. Nothing in this platform takes a fee for introducing the two sides.',
      },
      {
        id: 'about-area',
        question: 'Is Groove System only for Bulacan?',
        answer:
          'It was built for and around San Jose del Monte, Bulacan, and the directory and studio tools reflect that local scene. The platform is not restricted to Bulacan — members from elsewhere in the Philippines can register and use it.',
      },
      {
        id: 'about-contact',
        question: 'How do I reach Groove System?',
        answer:
          'Use the contact details in the footer of any page, or email Groove1152000@gmail.com. If you already have an account, the fastest route is a support request through Inquiries in the admin console, which is where support tickets are tracked.',
      },
    ],
  },

  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'Choosing an account type and signing up for the first time.',
    items: [
      {
        id: 'start-which-account',
        question: 'Should I create a client account or a coach account?',
        answer:
          'Choose client / performer if you are looking for a coach, booking sessions, or managing your own availability. Choose coach / choreographer if you are teaching, taking bookings, and managing a roster of students. You can change the details on your profile later, but the account type decides which dashboard you get.',
      },
      {
        id: 'start-sign-up',
        question: 'How do I create an account?',
        answer:
          'Use "Get started" in the header, or go directly to /register/client or /register/coach. Registration asks for your details and a password, then sends a confirmation email. You finish the last step at /register/complete.',
      },
      {
        id: 'start-first-login',
        question: 'It says my email is not confirmed. What now?',
        answer:
          'Open the confirmation email Groove sent you and follow the link in it, then try signing in again. Until the address is confirmed, Groove refuses the sign-in and says so explicitly rather than failing with a generic error. If the email never arrived, request a password reset from the sign-in page and the confirmation will follow.',
      },
      {
        id: 'start-forgot',
        question: 'I forgot my password.',
        answer:
          'Use the "Forgot password?" link on the sign-in page. Groove emails a reset link to the address on your account; opening it takes you to /reset-password, where you set a new one. The reset link is time-limited.',
      },
      {
        id: 'start-welcome',
        question: 'What is the welcome tour I see after signing in?',
        answer:
          'The first time a client or coach signs in, Groove shows a short welcome modal that points out the main parts of the dashboard. It is a one-time introduction and does not reappear once you have seen it.',
      },
    ],
  },

  {
    id: 'client',
    label: 'Client accounts',
    blurb: 'What a performer or student can do after signing in.',
    items: [
      {
        id: 'client-areas',
        question: 'What can I do from a client account?',
        answer:
          'Browse and book coaches, manage your appointments and calendar, message coaches and other members directly, view and edit your profile, and change your account settings. Clients also get access to Groovey, the built-in assistant you can ask performing-arts questions.',
      },
      {
        id: 'client-find-coach',
        question: 'How do I find a coach?',
        answer:
          'Use "Find Coaches" in the dashboard to browse the directory of coaches and open a profile. The same directory is reachable at /users, and the Showcase is the community page where members post what they are working on.',
      },
      {
        id: 'client-booking',
        question: 'How do bookings work?',
        answer:
          'You send a booking or appointment request for a session, and the coach responds from their side. Your requests live under Appointments; confirmed sessions also appear on your Calendar. Rates and exact arrangements are agreed directly between you and the coach.',
      },
      {
        id: 'client-groovey',
        question: 'What is Groovey?',
        answer:
          'Groovey is Groove System\'s in-platform assistant. It answers questions about the performing arts — technique, repertoire, training, and the local scene — from inside the client dashboard under "Groovey AI". It is available to client accounts.',
      },
      {
        id: 'client-cannot-see',
        question: 'Why can\'t I open the coach or admin pages?',
        answer:
          'By design. Each role is allowed into its own area only: clients into /client, coaches into /coach, administrators into /admin. Opening another role\'s URL sends you back to a page you are allowed to see rather than showing you a screen you cannot use.',
      },
    ],
  },

  {
    id: 'coach',
    label: 'Coach accounts',
    blurb: 'Teaching tools, bookings, verification and your public page.',
    items: [
      {
        id: 'coach-areas',
        question: 'What can I do from a coach account?',
        answer:
          'Coach accounts get their own dashboard: manage incoming booking requests, maintain a calendar and availability, message clients, edit a profile, and change account settings. Coaches also get Talents — your public page and your student roster.',
      },
      {
        id: 'coach-bookings-label',
        question: 'Why does the same menu say "Bookings" for me and "Appointments" for a client?',
        answer:
          'It is one destination shown under the name that fits the role. From your side you are handling bookings that people send you; from a client\'s side they are appointments they have made. The page and the data behind it are the same.',
      },
      {
        id: 'coach-verification',
        question: 'How does coach verification work?',
        answer:
          'Groove administrators review pending coach credentials on the Verification Documents page in the admin console. A coach is listed as verified once an administrator has reviewed those documents. Verification is what separates a reviewed coach from an unverified profile in the directory.',
      },
      {
        id: 'coach-talents',
        question: 'What is the Talents page?',
        answer:
          'It is your public-facing page: the profile clients browse, together with your roster of students. It is the coach-side equivalent of the Showcase a client manages.',
      },
      {
        id: 'coach-contract',
        question: 'How are contracts handled?',
        answer:
          'Agreements between a coach and a client are recorded against the session and reviewed in the admin console under Contracts & Reviews. Each contract has its own page, and a signature is captured by drawing it in the signature pad on that page — a signature cannot be saved empty.',
      },
    ],
  },

  {
    id: 'admin',
    label: 'Admin responsibilities',
    blurb: 'What the console is for and who can reach it.',
    items: [
      {
        id: 'admin-access',
        question: 'Who can use the admin console?',
        answer:
          'Only an account whose role on the profile record is administrator AND whose email matches the address pinned as the platform admin. Both conditions are checked server-side on every request, so hiding the menu is not what is keeping the console closed — the request itself is refused.',
      },
      {
        id: 'admin-people',
        question: 'What does the console manage?',
        answer:
          'People: verification documents, users and directory, coaches and clients. Operations: bookings, inquiries and support tickets, message oversight, contracts and reviews, and system control with emergency toggles and audit logs. Platform: announcements, maintenance mode, appearance and system settings.',
      },
      {
        id: 'admin-appearance',
        question: 'Can an admin change the theme for everyone?',
        answer:
          'Yes. The Appearance page sets the platform theme and palettes, including seasonal accents, and it is pushed to connected browsers automatically. A visitor\'s own saved choice still takes priority — the platform theme applies as the default for people who have not chosen one, so the console never overwrites a personal preference.',
      },
      {
        id: 'admin-lockout',
        question: 'What do the emergency toggles and maintenance mode do?',
        answer:
          'System Control holds emergency toggles and the audit log; Maintenance holds the platform lockout and maintenance status. They exist so an operator can pause the platform or switch behaviour off without touching the database.',
      },
      {
        id: 'admin-inquiries',
        question: 'How are support requests handled?',
        answer:
          'They arrive on the Inquiries & Tickets page in the console, where they are tracked and answered. If you have already sent one, that is the place it lands — quoting the same email address makes it easier to match to your account.',
      },
    ],
  },

  {
    id: 'community',
    label: 'Dance communities & disciplines',
    blurb: 'The public community pages and the updates they carry.',
    items: [
      {
        id: 'community-access',
        question: 'Do I need an account to browse the community pages?',
        answer:
          'No. The discipline pages — dance, singing, acting and theater — and the Performing Arts PH hub are public. You can read them, browse the directory, and read the FAQs while signed out. Signing in only adds the ability to post and interact.',
      },
      {
        id: 'community-dance',
        question: 'What is on the dance community page?',
        answer:
          'Upcoming events with league filters, a Latest Updates feed of verified competition dispatches with search and filters, and a Featured Crews section of crew dossiers with region filters, match records and verified sources.',
      },
      {
        id: 'community-updates',
        question: 'Where do the Latest Updates come from?',
        answer:
          'They are compiled from public sources and every dispatch links back to its official source. The page tells you to check the official source for final details — treat the feed as a pointer, not as the authority.',
      },
      {
        id: 'community-report',
        question: 'I found something wrong on an update.',
        answer:
          'Use the "Report issue" link on the card. It opens a report addressed to the Groove team with the item already identified, so a correction can be traced to the exact dispatch.',
      },
      {
        id: 'community-crews',
        question: 'What counts as a "verified" crew?',
        answer:
          'A crew dossier is built only from verified competition results and official media, and each entry links to its source. The Featured Crews section filters by region and lets you open a dossier per crew.',
      },
    ],
  },

  {
    id: 'studios',
    label: 'Studios',
    blurb: 'The studio locator on the landing page.',
    items: [
      {
        id: 'studios-locator',
        question: 'How do I find a studio?',
        answer:
          'The landing page has a Studio Locator in the Studios section. It is public — you can use it without signing in.',
        keywords: ['venue', 'location', 'rehearsal space'],
      },
      {
        id: 'studios-booking',
        question: 'Can I book a studio through Groove?',
        answer:
          'Studio enquiries are handled with the studio directly. Groove System does not take studio bookings or payments on the site.',
      },
      {
        id: 'studios-listing',
        question: 'How does a studio get listed?',
        answer:
          'Studios appear through the locator on the public landing page. To have one added or corrected, contact the Groove team through the details in the footer.',
      },
    ],
  },

  {
    id: 'coaches-directory',
    label: 'Finding a coach',
    blurb: 'The member directory and coach profiles.',
    items: [
      {
        id: 'directory-what',
        question: 'What is in the member directory?',
        answer:
          'The directory lists members — coaches and clients — so you can find the right person before you approach them. It is reachable at /users from the public header.',
        keywords: ['members', 'search', 'browse'],
      },
      {
        id: 'directory-open',
        question: 'Who can open a profile in the directory?',
        answer:
          'Profiles are reached from the directory, which is linked in the header for signed-in members. Profile pages are inside the signed-in area, so you need an account to open one.',
      },
      {
        id: 'directory-verified',
        question: 'How do I tell a verified coach from an unverified one?',
        answer:
          'Verification is decided by an administrator reviewing credential documents. A coach shown as verified in the directory has been through that review.',
      },
    ],
  },

  {
    id: 'messaging',
    label: 'Messaging',
    blurb: 'Direct messages between members.',
    items: [
      {
        id: 'messages-where',
        question: 'Where are my messages?',
        answer:
          'Messages is its own area at /messages, reachable from the dashboard menu for both clients and coaches. Conversations are direct between members.',
      },
      {
        id: 'messages-who',
        question: 'Who can I message?',
        answer:
          'Other members on the platform — clients and coaches. Administrators can see message threads in the console under Client Messages for support and safety purposes.',
      },
      {
        id: 'messages-keep',
        question: 'Where should I keep the record of an agreement?',
        answer:
          'Messages are for conversation. Anything you intend to rely on should be captured as a contract on its own page, where the signature is recorded and an administrator can review it.',
      },
      {
        id: 'messages-notify',
        question: 'Will I get an email when I get a message?',
        answer:
          'No. Groove does not send email notifications for new messages; check the Messages area and the notification indicator in the header for new activity.',
      },
    ],
  },

  {
    id: 'security',
    label: 'Account security',
    blurb: 'Passwords, roles, sessions and what Groove will never ask for.',
    items: [
      {
        id: 'security-password-rules',
        question: 'What makes a valid password?',
        answer:
          'At least 8 characters, with one lowercase letter, one uppercase letter and one number. The registration form checks each rule live and shows which ones are still unmet. A longer passphrase scores stronger than a short one that only just passes.',
      },
      {
        id: 'security-role',
        question: 'Who decides what I can access?',
        answer:
          'The role stored on your profile record on the server. It is not read from anything the browser sends, so a role cannot be changed by editing a request — and it is checked on the server before a protected page is allowed to render.',
      },
      {
        id: 'security-redirect',
        question: 'I was sent to the sign-in page. Why?',
        answer:
          'The page you asked for belongs to a signed-in area. Groove sends you to /login and remembers where you were going, so signing in takes you to the page you originally wanted instead of the dashboard home.',
      },
      {
        id: 'security-never-ask',
        question: 'Will Groove ever ask for my password by message?',
        answer:
          'No. There is no in-platform support agent that asks for a password, and no administrator can see yours. Anyone who messages you claiming to be Groove staff and asking for a password is not Groove.',
      },
      {
        id: 'security-theme-storage',
        question: 'Where is my theme choice saved?',
        answer:
          'In your own browser, under a single saved preference that can be Light, Dark or follow the system. It is restored when you return, sign in, or sign out, and it is applied before the page paints so the screen never flashes the wrong theme.',
      },
      {
        id: 'security-language',
        question: 'Can I change the language?',
        answer:
          'Yes. A language switcher is available in the navigation and in your account menu, covering English and Wika.',
      },
    ],
  },

  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    blurb: 'Common problems and what to try first.',
    items: [
      {
        id: 'trouble-signin',
        question: 'My password is right but it says invalid email/username or password.',
        answer:
          'Check the identifier first — Groove accepts either your username or your email, and a username that does not match a profile will fail exactly this way. Then confirm your email address has been verified, and try once more without stray spaces in either field.',
      },
      {
        id: 'trouble-redirect-loop',
        question: 'I keep getting bounced back to the sign-in page.',
        answer:
          'That usually means the session is no longer valid but the page you are on is inside a signed-in area. Sign in again. If signing in succeeds and the next request still bounces you, your stored preference may be stale — try a private window to rule out a cached session.',
      },
      {
        id: 'trouble-wrong-area',
        question: 'I am signed in but I land on the wrong dashboard.',
        answer:
          'Your account has one role and it decides your dashboard. Clients land on the client home, coaches on the coach home, and administrators on the console. If the role is not the one you expect, contact the Groove team rather than trying to work around it.',
      },
      {
        id: 'trouble-theme-flash',
        question: 'The page flashes the wrong colour before it settles.',
        answer:
          'It should not. Your theme is applied before the page paints, and it is re-applied after you navigate. If you are seeing a flash, it is worth reporting with the page name and your browser — that is a genuine bug, not expected behaviour.',
      },
      {
        id: 'trouble-missing-page',
        question: 'A link in the footer gives me a 404.',
        answer:
          'Some footer entries point at pages that have not been built yet. Use the community pages, the directory and this FAQ in the meantime, or contact the Groove team and they will point you at what you need.',
      },
      {
        id: 'trouble-still-stuck',
        question: 'None of this helped.',
        answer:
          'Send the team a support request through the contact details in the footer, or through Inquiries if you are already a member. Include the page you were on and what you expected to happen — it is usually enough to resolve things quickly.',
      },
    ],
  },
];

/** Every entry, flattened. Used for the total count and for the landing teaser. */
export const ALL_FAQS: Array<FaqItem & { categoryId: string; categoryLabel: string }> =
  FAQ_CATEGORIES.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      categoryId: category.id,
      categoryLabel: category.label,
    }))
  );

/**
 * Case-insensitive match across the question, the answer and any extra
 * keywords. Splitting the query on whitespace means every word has to appear
 * somewhere, which is what people expect from a filter box — typing "coach
 * password" should not surface every question that merely mentions one of them.
 */
export function matchesFaq(
  entry: FaqItem & { categoryLabel: string },
  query: string
): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    entry.question,
    entry.answer,
    entry.categoryLabel,
    ...(entry.keywords ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
