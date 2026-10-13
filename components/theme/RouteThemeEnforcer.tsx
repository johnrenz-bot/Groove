'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyGlobalTheme, resolveInitialGlobalTheme } from './ThemeProvider';

/**
 * There are no longer any route-pinned palettes.
 *
 * Previously `/`, `/login`, `/register/coach` and `/register/client` were forced
 * dark by this component *and* by a `!important` block of `.dark-only-page`
 * tokens in globals.css — two mechanisms for one rule, which meant a visitor who
 * chose cream was still served near-black on the landing page and every auth
 * screen, with no way to tell the theme had been overridden.
 *
 * Light and dark are now the same token set with two different values, so the
 * one stored preference applies everywhere. The only surfaces that stay dark in
 * both themes are the ones sitting on top of photography, and those are a CSS
 * concern in globals.css, not a route concern here.
 *
 * `isDarkOnlyRoute` is kept as an exported predicate because
 * `<PlatformThemeSync />` imports it — it now always answers `false`, so the
 * admin platform theme is applied uniformly instead of being skipped on a
 * subset of routes.
 */
export const DARK_ONLY_ROUTES: readonly string[] = [];

// The signature is kept so existing callers keep compiling; the answer is a
// constant by design. See the note above.
export function isDarkOnlyRoute(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pathname: string | null | undefined
): boolean {
  return false;
}

/**
 * Re-asserts the resolved theme on navigation.
 *
 * Client-side navigation does not re-run the pre-paint script in app/layout.tsx,
 * so this is what guarantees the palette survives a soft navigation. It writes
 * exactly what is already in storage, which is a no-op visually — the value of
 * running it is that it repairs any drift a component or a third-party script
 * may have introduced on `<html>`.
 */
export function RouteThemeEnforcer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyGlobalTheme(resolveInitialGlobalTheme());
  }, [pathname]);

  return null;
}

export default RouteThemeEnforcer;