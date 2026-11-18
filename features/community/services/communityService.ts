import { SupabaseClient } from '@supabase/supabase-js';
import { CommunityPost } from '@/lib/types';

/**
 * Feed for a community circle.
 *
 * Three straight reads, batched — not the old shape, which fanned out two
 * count queries and a maybeSingle per post (3N + 1 round trips) and queried
 * tables that do not exist (`post_reactions`, `post_comments`) so every count
 * silently came back zero. Everything is keyed off the real tables
 * (`post_reacts`, `comments`) in at most three queries.
 */
export async function getCommunityFeed(
  supabase: SupabaseClient,
  currentUserId?: string,
  limit = 30
): Promise<CommunityPost[]> {
  const { data: posts, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:author_id(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !posts || posts.length === 0) return [];

  const postIds = posts.map((post) => post.id as number);

  const [reactsRes, commentsRes, mineRes] = await Promise.all([
    supabase.from('post_reacts').select('post_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds),
    currentUserId
      ? supabase
          .from('post_reacts')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] as Array<{ post_id: number }> }),
  ]);

  const reactsCount = new Map<number, number>();
  for (const row of reactsRes.data ?? []) {
    const id = (row as { post_id: number }).post_id;
    reactsCount.set(id, (reactsCount.get(id) ?? 0) + 1);
  }

  const commentsCount = new Map<number, number>();
  for (const row of commentsRes.data ?? []) {
    const id = (row as { post_id: number }).post_id;
    commentsCount.set(id, (commentsCount.get(id) ?? 0) + 1);
  }

  const mine = new Set<number>(
    (mineRes.data ?? []).map((row) => (row as { post_id: number }).post_id)
  );

  return posts.map(
    (post) =>
      ({
        ...post,
        reacts_count: reactsCount.get(post.id) ?? 0,
        comments_count: commentsCount.get(post.id) ?? 0,
        user_has_reacted: mine.has(post.id),
      }) as CommunityPost
  );
}
