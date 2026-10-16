import type { Metadata } from 'next';
import { GrooveErrorScreen } from '@/components/ui/GrooveErrorScreen';

/**
 * 404 — Page not found.
 *
 * Before this file existed, an invalid URL in a Groove deployment rendered
 * Next.js's stock "404 | This page could not be found", with no logo, no way
 * home except the browser's back button, and no indication that the site around
 * it still works. That is the single most-seen screen in most apps that have
 * not built one, and it was the largest gap in the error surface.
 *
 * `not-found.tsx` is rendered for a URL that does not resolve to a route. It is
 * NOT rendered for a resource that 404s inside a page — those need their own
 * inline empty state (`<EmptyState>`), which is why `/users/[id]` and friends
 * should not point users at this page.
 *
 * `robots: { index: false }` because a URL that does not exist should not be
 * invited back by a crawler.
 *
 * ONE ACTION ONLY. The page used to offer "Back to home" and a second link to
 * `/users`. The second is gone — not replaced by anything. With no `actions`
 * prop, `GrooveErrorScreen` falls back to its default, which is the identical
 * "Back to home" link, so the rendered output is unchanged apart from the
 * button that was removed.
 */
export const metadata: Metadata = {
  title: 'Page not found · Groove',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <GrooveErrorScreen
      code={404}
      title="We couldn't find that page"
      description="The link may be out of date, or the page may have moved. Try searching from the directory, or head back to where you started."
    />
  );
}