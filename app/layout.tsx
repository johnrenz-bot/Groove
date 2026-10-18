import type { Metadata } from 'next';
import { Inter, Source_Serif_4, Mr_De_Haviland } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';
import { SessionProvider } from '@/components/header/SessionProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { PagePatterns } from '@/components/layout/PagePatterns';
import { PlatformThemeSync } from '@/components/theme/PlatformThemeSync';
import { RouteThemeEnforcer } from '@/components/theme/RouteThemeEnforcer';
import { AppLoadingSplash } from '@/components/shared/AppLoadingSplash';
import { PresenceBridge } from '@/components/shared/PresenceBridge';
import { ClickSoundBridge } from '@/features/sound/components/ClickSoundBridge';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { PageTransition } from '@/components/layout/PageTransition';
import { BackToTopButton } from '@/components/shared/BackToTopButton';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

/**
 * Display face. Used only by `.g-display` / `.g-title` / `.font-display` — page
 * titles, greeting headlines and large section headings. Body copy, forms and
 * controls stay on Inter, which is what keeps the serif reading as editorial
 * rather than as a theme change.
 */
const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

/**
 * Script face for the "Art • Discipline • Community" tagline.
 * Used only in the Greeting component.
 */
const script = Mr_De_Haviland({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--font-script',
});

export const metadata: Metadata = {
  title: 'Groove — Performing Arts Platform',
  description:
    'Book verified coaches, collaborate on performing arts, and sign digital session agreements seamlessly.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

/**
 * Runs before first paint so a returning visitor never sees a flash of the
 * wrong palette. It duplicates ThemeProvider's resolution logic by design — it
 * must run before React does. Keep the two in sync; both use the same storage
 * keys and the same defaults.
 *
 * Resolution order on a first visit with nothing stored:
 *   1. an explicit saved mode (`groove-theme-mode`: light | dark | system)
 *   2. the operating system's `prefers-color-scheme`
 *   3. dark, as the token default
 *
 * Only the *stored* preference is applied here. The platform default pushed by
 * an admin is fetched after mount by <PlatformThemeSync />, which is a deliberate
 * trade: a network round trip cannot happen before paint, so the admin's chosen
 * default lands a moment after first render rather than never.
 *
 * There is no route-pinned dark mode any more: light and dark are the same token
 * set with different values, so every route honours this one decision.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var ACCENTS = ['unity', 'relief', 'sunburst'];
    var THEMES = ['dark', 'light', 'classic', 'halloween', 'christmas'];
    var MODES = ['dark', 'light', 'system'];
    var root = document.documentElement;

    var storedMode = localStorage.getItem('groove-theme-mode');
    if (MODES.indexOf(storedMode) === -1) {
      // Legacy: the pre-system-modes key only ever held a resolved colour.
      var legacy = localStorage.getItem('groove-theme');
      storedMode = legacy === 'light' || legacy === 'dark' ? legacy : null;
    }

    var theme;
    var activeGlobal;
    if (storedMode === 'system' || storedMode === null) {
      theme =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
      activeGlobal = theme;
    } else {
      theme = storedMode;
      activeGlobal = theme;
    }

    // A rich global theme (classic / seasonal) only overrides the base mode if
    // the visitor has not made an explicit choice of their own.
    if (!storedMode) {
      var storedGlobal = localStorage.getItem('groove-global-theme');
      if (THEMES.indexOf(storedGlobal) > -1 && storedGlobal !== theme) {
        activeGlobal = storedGlobal;
      }
    }

    var storedAccent = localStorage.getItem('groove-accent');
    var accent = ACCENTS.indexOf(storedAccent) > -1 ? storedAccent : 'unity';

    root.setAttribute('data-theme-mode', storedMode || 'system');
    root.setAttribute('data-theme', activeGlobal);
    root.classList.toggle('light', activeGlobal === 'light');
    root.classList.toggle('classic', activeGlobal === 'classic');
    root.classList.toggle('halloween', activeGlobal === 'halloween');
    root.classList.toggle('christmas', activeGlobal === 'christmas');
    root.style.colorScheme = theme;
    root.setAttribute('data-accent', accent);
  } catch (e) {
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the script above mutates <html> before React
    // hydrates, so the class here deliberately does not match it.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${script.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="isolate min-h-screen bg-background font-sans text-foreground antialiased">
        <LanguageProvider>
          {/* The session lives HERE, above every route, not inside the /coach and
              /client groups. It used to be read separately by each header, which
              is how a signed-in user ended up looking signed out on any page
              rendered by a different layout. One provider, one answer, for the
              dashboards and the public pages alike. */}
          <SessionProvider>
            {/* ONE theme provider for the whole app, for the same reason.
                It used to be mounted by each dashboard shell (client, coach,
                admin) and by PublicLayout — and by NOTHING on `/users`,
                `/messages`, `/userprofile/[id]` or `/contracts/[id]`, which
                mount <SiteHeader /> directly. On those four routes
                `useTheme()` returned the context default, whose setters are
                all no-ops, so the guest theme toggle in the bar and the
                Appearance control in the account menu did nothing at all:
                visible, clickable, inert. One provider here fixes that and
                removes three duplicate instances. */}
            <ThemeProvider>
              <PlatformThemeSync />
              <RouteThemeEnforcer />
              <AppLoadingSplash />
              {/* One presence subscription for the whole app, so /messages, coach
                  cards and the header all read the same live value. */}
              <PresenceBridge />
              {/* One click-sound listener for the whole app, mounted beside the
                  presence bridge for the same reason: every shell renders a
                  different subset of controls, so a per-shell or per-component
                  listener would leave some routes silent and some clicks doubled.
                  Renders nothing. */}
              <ClickSoundBridge />
              {/* The one shared four-corner decoration for Landing, Client, Coach
                  and Admin: fixed at z-0, behind everything. The page background
                  colour lives ONLY on <body> (see globals.css), every full-page
                  wrapper below is transparent, and all page content sits in the
                  `relative z-10` layer after this — see components/layout/PagePatterns.tsx. */}
              <SmoothScrollProvider>
                <PagePatterns />
                <PageTransition>
                  <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
                </PageTransition>
                <BackToTopButton />
              </SmoothScrollProvider>
            </ThemeProvider>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}