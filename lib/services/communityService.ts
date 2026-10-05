import { SupabaseClient } from '@supabase/supabase-js';
import { CommunityPost } from '@/lib/types';

export async function getCommunityFeed(
  supabase: SupabaseClient,
  currentUserId?: string
): Promise<CommunityPost[]> {
  const { data: posts, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:author_id(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !posts) return [];

  // Fetch reactions and comments count for each post
  const postsWithMeta = await Promise.all(
    posts.map(async (post) => {
      const [{ count: reactsCount }, { count: commentsCount }, { data: userReact }] =
        await Promise.all([
          supabase
            .from('post_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id),
          supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id),
          currentUserId
            ? supabase
                .from('post_reactions')
                .select('*')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      return {
        ...post,
        reacts_count: reactsCount || 0,
        comments_count: commentsCount || 0,
        user_has_reacted: !!userReact,
      } as CommunityPost;
    })
  );

  return postsWithMeta;
}
