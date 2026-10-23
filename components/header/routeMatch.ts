/**
 * Route matching shared by the dropdown, the drawer and the palette.
 *
 * A hash is part of the destination, not decoration: the client dashboard links
 * to `/client/talent#showcase` and `/client/talent#directory`, two different
 * sections of one page. Comparing only the pathname made both rows render as
 * current. When the href carries a fragment, the fragment must match too — and
 * an empty fragment matches neither, which is the honest result for "you are on
 * the page but not at either section".
 */

export function splitHref(href: string): { path: string; hash: string } {
  const [path, hash = ''] = href.split('#');
  return { path, hash };
}

export function isRouteActive(href: string, pathname: string, hash = ''): boolean {
  const target = splitHref(href);
  const onPath = pathname === target.path || pathname.startsWith(`${target.path}/`);
  if (!onPath) return false;
  if (!target.hash) return true;
  return hash.replace(/^#/, '') === target.hash;
}
