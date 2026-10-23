'use client';

import React from 'react';

/**
 * Public layout for the landing page and auth routes (login, register,
 * forgot/reset password).
 *
 * `data-public-theme="dark"` IS INERT.
 *
 * The docblock here used to claim the attribute "forces the dark theme" via a
 * `[data-public-theme="dark"]` selector in `globals.css` with specificity
 * `(0,2,0)` that beats `.light` on `<html>`. There is no such selector —
 * `data-public-theme` does not appear in `globals.css` at all. Every public page
 * actually follows the visitor's saved Light/Dark/System choice like every other
 * route, because `<RouteThemeEnforcer />` and `ThemeProvider` (both in the root
 * layout) own the palette. The attribute is left in place because it is still
 * used as a marker by the landing page's own `.groove-landing` rules, but it
 * forces nothing and this comment no longer pretends otherwise.
 *
 * The guest header no longer renders a theme toggle; the palette still follows
 * the saved Light/Dark/System choice because `<ThemeProvider>` lives in the root
 * layout.
 *
 * URLs are unchanged: `(public)` is a route group and contributes no path
 * segment, so /, /about, /faq, /login, /register/*, /forgot-password,
 * /reset-password, /terms, /privacy and /performing-arts-philippines resolve
 * exactly as before.
 *
 * This layout no longer mounts a `<ThemeProvider>` — see `components/shared/
 * PublicLayout.tsx` for why there is only one, in the root layout.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-public-theme="dark" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}