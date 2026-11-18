import { DanceCommunityView } from './DanceCommunityView';

/**
 * Server boundary for the dance community page.
 *
 * The league registry is static (features/dance/data/leagues.ts), so this is a
 * thin wrapper. Kept as its own Server Component so the page can wrap it in
 * <React.Suspense> and so future server-fetched props have a place to land.
 */
export function DanceCommunityPageServer() {
  return <DanceCommunityView />;
}

