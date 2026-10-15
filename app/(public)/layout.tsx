'use client';

import React from 'react';

/**
 * Public layout for landing page and auth routes (login, register, forgot/reset password).
 *
 * This layout forces the dark theme for all public pages by applying
 * `data-public-theme="dark"` to a wrapper div. The attribute selector
 * `[data-public-theme="dark"]` in globals.css has higher specificity (0,2,0)
 * than `.light` on <html> (0,1,0), so it wins even when the dashboard has
 * set the light theme.
 *
 * It does NOT use the ThemeProvider, does NOT read/write localStorage or
 * cookies for theme, and does NOT show a theme toggle. The visitor's saved
 * Light/Dark/System choice is untouched and the dashboards keep switching
 * normally.
 *
 * URLs are unchanged: `(public)` is a route group and contributes no path
 * segment, so /, /login, /register/*, /forgot-password and /reset-password
 * resolve exactly as before.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-public-theme="dark" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}