import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { PlatformThemeSync } from '@/components/theme/PlatformThemeSync';
import { RouteThemeEnforcer } from '@/components/theme/RouteThemeEnforcer';
import { AppLoadingSplash } from '@/components/shared/AppLoadingSplash';
import { PresenceBridge } from '@/components/shared/PresenceBridge';
import { ClickSoundBridge } from '@/features/sound/components/ClickSoundBridge';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
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
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

/**
 * Runs before first paint so a returning visitor never sees a flash of the
 * wrong palette (or the default gold when they chose another). It duplicates
 * ThemeProvider's resolution logic by design — it must run before React does.
 * Keep the two in sync; both use the same storage keys and the same defaults.
 *
 * Only the *stored* preference is applied here. The platform default pushed by
 * an admin is fetched after mount by <PlatformThemeSync />, which is a deliberate
 * trade: a network round trip cannot happen before paint, so the admin's chosen
 * default lands a moment after first render rather than never.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var ACCENTS = ['gold', 'ember', 'ocean', 'orchid', 'jade', 'rose'];
    var MODES = ['dark', 'light', 'system'];
    var root = document.documentElement;

    var path = window.location.pathname;
    var isDarkOnly =
      path === '/' ||
      path === '/login' ||
      path === '/register/coach' ||
      path === '/register/client';

    // The user's preference, which may be 'system'. Falls back to the legacy
    // single key so an existing dark/light choice survives the upgrade.
    var storedMode = localStorage.getItem('groove-theme-mode');
    if (MODES.indexOf(storedMode) === -1) {
      storedMode = localStorage.getItem('groove-theme') === 'light' ? 'light' : 'dark';
    }

    var theme;
    if (isDarkOnly) {
      theme = 'dark';
    } else if (storedMode === 'system') {
      theme =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    } else {
      theme = storedMode;
    }

    var storedAccent = localStorage.getItem('groove-accent');
    var accent = ACCENTS.indexOf(storedAccent) > -1 ? storedAccent : 'gold';

    root.setAttribute('data-theme-mode', storedMode);
    root.classList.toggle('light', theme === 'light');
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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}