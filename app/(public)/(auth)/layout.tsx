import React from 'react';

/**
 * Shared layout for all auth routes (login, register, forgot/reset password).
 *
 * The dark theme is now applied by the parent (public) layout via
 * `data-public-theme="dark"`. This layout is kept for any future auth-specific
 * shared UI (e.g., a common header/footer for auth pages).
 *
 * URLs are unchanged: `(auth)` is a route group and contributes no path
 * segment, so /login, /register/*, /forgot-password and /reset-password
 * resolve exactly as before.
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
