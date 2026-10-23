'use client';

import React from 'react';

/**
 * Shared layout for all auth routes (login, register, forgot/reset password).
 *
 * This no longer forces dark theme — it now respects the visitor's
 * Light/Dark/System choice via the global ThemeProvider (mounted in root layout).
 * The AmbientBackground component handles both themes via CSS tokens.
 *
 * URLs are unchanged: `(auth)` is a route group and contributes no path
 * segment, so /login, /register/*, /forgot-password and /reset-password
 * resolve exactly as before.
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="groove-auth min-h-screen antialiased selection:bg-[var(--accent)]/30 selection:text-[var(--accent-foreground)]">
      {children}
    </div>
  );
}