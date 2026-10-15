'use client';

import React from 'react';
import { Footer } from '@/components/shared/Footer';
import { Header } from '@/components/header/Header';

/**
 * Shell for every public page: the shared header + content + minimal footer.
 *
 * WHY THERE IS NO LONGER A PUBLIC NAVBAR
 *
 *   This used to render its own `PublicNavbar` — a separate bar that never
 *   queried the session and so always drew "Sign In / Get started". A user who
 *   was signed in, opened `/about` or `/community/performing-arts/dance`, and
 *   saw a logged-out header. It read as being signed out even though the session
 *   cookie was sitting there the whole time: nothing had logged anyone out, the
 *   page was simply drawing chrome that had never asked who you were. The
 *   Supabase middleware passes the session through untouched on public routes
 *   (`lib/supabase/middleware.ts`), so the session was never the problem — the
 *   chrome was.
 *
 *   The fix is not to teach the public navbar about sessions. It is to stop
 *   having two headers. This shell renders the same `<Header />` the dashboards
 *   do, which reads `<SessionProvider>` from the ROOT layout and therefore shows
 *   the signed-in bar for a signed-in visitor and the guest bar only for a real
 *   guest.
 *
 * `links`, `transparentNav` and `onCtaClick` are GONE rather than ignored. They
 * configured the old navbar, and leaving props that silently do nothing is how
 * the next person ends up debugging a menu that has no effect. Navigation now
 * comes from `components/header/navConfig.ts`, the single source of truth for
 * both the member and public bars.
 *
 * The header is `position: sticky` and stays in normal flow, so it occupies its
 * own 72px band and content begins beneath it — it cannot overlap the page.
 */
export function PublicLayout({
  children,
  showFooter = true,
  footerExtra,
}: {
  children: React.ReactNode;
  showFooter?: boolean;
  footerExtra?: React.ReactNode;
}) {
  return (
    /* No `bg-background` here by design (landing page included): the page
       colour lives only on <body>, so the fixed <PagePatterns /> layer stays
       visible through this transparent shell. Sections with their own
       surfaces (hero image, footer, cards) keep them. */
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      {showFooter && (
        <Footer className="mt-auto" showThemeToggle={false}>
          {footerExtra}
        </Footer>
      )}
    </div>
  );
}

export default PublicLayout;
