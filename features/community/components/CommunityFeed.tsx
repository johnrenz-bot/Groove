'use client';

/**
 * The Community Showcase feed.
 *
 * Refactored for the two-column Showcase layout. The behaviour is unchanged:
 * same query, same filters, same ordering, same reactions, comments, inline
 * edit, delete, and the same ownership gate. What changed is structure —
 * the composer and the post card now live in `PostComposer` and `PostCard`, and
 * the banner moved to `TalentBannerPanel` so both showcase pages share one
 * presentation.
 *
 * PROPS
 *   `community`      — the MEMBER'S OWN canonical community. This is what a new
 *                      post is written to and is never a user choice, because
 *                      RLS compares it to `my_community()`.
 *   `filterCommunity`— which circle the feed is FILTERED to. Defaults to
 *                      `community`. Browsing another circle is allowed; posting
 *                      into it is not, and `PostComposer` says so.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { CommunityPost, Comment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { type Community } from '../utils/community';
import { signCommunityMediaBatch } from '../utils/communityMedia';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';

export interface CommunityFeedProps {
  currentUser?: Profile | null;
  /**
   * The signed-in member's own community, derived from their profile. Supplied by
   * the page because the detail row that holds it (client_profiles /
   * coach_profiles) is already loaded there. Required for posting.
   */
  community?: Community | null;
  /**
   * Which circle to filter by. Defaults to `community`. RLS already scopes rows
   * to the member's community, so a different value can legitimately return
   * fewer or no rows — that is the database answering, not a client bug.
   */
  filterCommunity?: Community | null;
  /** The banner moved out to TalentBannerPanel; kept opt-in for other callers. */
  showBanner?: boolean;
  /** Human label of the circle being browsed, for the composer's warning state. */
  browsingLabel?: string | null;
}

export default function CommunityFeed({
  currentUser,
  community,
  filterCommunity,
  showBanner = false,
  browsingLabel,
}: CommunityFeedProps) {
  const activeFilter = filterCommunity ?? community ?? null;

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  /**
   * Which circle `posts` was loaded FOR. Compared during render rather than
   * cleared in an effect: a setState in an effect body re-renders a second time,
   * and more importantly it cannot be relied on to have run before paint, so the
   * previous circle's posts can flash under the new heading. Deriving it means
   * a mismatch is simply never rendered.
   */
  const [postsFor, setPostsFor] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);

  const isStale = postsFor !== activeFilter;
  const visiblePosts = isStale ? [] : posts;
  const showLoading = loading || isStale;

  // Editing. `editingId` is null when nothing is being edited; `editDraft` holds
  // the in-progress caption. Kept out of the post objects so an abandoned edit
  // cannot leak into the feed.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Resolved signed URLs, keyed by the stored path. The feed stores PATHS (the
  // bucket is private), so something has to turn each one into a URL the <img>
  // can load. Keyed by path so one round trip covers the whole page.
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  /** Paths that exist but could not be signed — rendered as an explicit state. */
  const [mediaBroken, setMediaBroken] = useState<Record<string, boolean>>({});

  // Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [editError, setEditError] = useState<string | null>(null);

  /**
   * Guards against a stale response landing after the circle changed.
   *
   * The fetch is two sequential awaits, so switching circles quickly could let
   * the earlier query resolve last and repopulate the feed with the previous
   * circle's posts. Each run takes a ticket; only the newest run may write.
   */
  const fetchTokenRef = useRef(0);

  const fetchPosts = useCallback(async () => {
    const token = ++fetchTokenRef.current;

    // No circle to read: querying would ask for rows the database will refuse.
    if (!activeFilter) {
      setPosts([]);
      setPostsFor(null);
      setMediaUrls({});
      setMediaBroken({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('talent', activeFilter)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // A newer fetch started while this one was in the air — drop the result.
      if (token !== fetchTokenRef.current) return;

      if (currentUser && data) {
        const { data: reacts } = await supabase
          .from('post_reacts')
          .select('post_id')
          .eq('user_id', currentUser.id);

        if (token !== fetchTokenRef.current) return;

        const reactedPostIds = new Set(reacts?.map((r) => r.post_id) || []);
        setPosts(
          data.map((p) => ({
            ...p,
            user_has_reacted: reactedPostIds.has(p.id),
          })) as CommunityPost[]
        );
      } else {
        setPosts((data || []) as CommunityPost[]);
      }
      // Same batch as the posts themselves, so there is never a render where
      // fresh rows are shown against a stale circle.
      setPostsFor(activeFilter);
    } catch (err) {
      if (token === fetchTokenRef.current) console.error('Error fetching posts:', err);
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [activeFilter, currentUser]);

  // The open-comment id is deliberately NOT cleared here: it points at a post id
  // from the previous circle, which simply matches no post in the new one, so
  // no drawer can stay open. Clearing it would be a setState in an effect body.
  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // ---- resolve stored media paths to signed URLs ----------------------------
  useEffect(() => {
    const paths = visiblePosts
      .map((p) => p.media_path)
      .filter((p): p is string => Boolean(p));
    // No paths: return WITHOUT clearing. Setting state here would be a
    // synchronous setState in an effect, which the react-hooks lint rule rejects
    // for good reason. Stale entries are harmless — the maps are keyed by path.
    if (paths.length === 0) return;

    let cancelled = false;
    void (async () => {
      const signed = await signCommunityMediaBatch(paths);
      if (cancelled) return;
      setMediaUrls(signed);
      // Anything requested but not returned could not be signed — usually RLS
      // refusing, which for a member means the media is in another community.
      setMediaBroken(Object.fromEntries(paths.filter((p) => !signed[p]).map((p) => [p, true])));
    })();

    return () => {
      cancelled = true;
    };
  }, [visiblePosts]);

  const startEdit = (post: CommunityPost) => {
    setEditingId(post.id);
    setEditDraft(post.caption);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
    setEditError(null);
  };

  const saveEdit = async (postId: number) => {
    const next = editDraft.trim();
    if (!next) {
      setEditError('A post cannot be empty.');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      const supabase = createClient();

      // Scoped by author_id as well as id: RLS allows the update, but scoping the
      // query means a policy mistake cannot silently edit someone else's post.
      const { data, error } = await supabase
        .from('community_posts')
        .update({ caption: next })
        .eq('id', postId)
        .eq('author_id', currentUser?.id ?? '')
        .select('id, caption')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setEditError('That post could not be found, or it is not yours to edit.');
        return;
      }

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, caption: data.caption } : p)));
      cancelEdit();
    } catch (err) {
      const e = err as { message?: string; code?: string };
      setEditError(
        e?.message ? `${e.code ? e.code + ': ' : ''}${e.message}` : 'Your change could not be saved.'
      );
      console.error('Error updating post:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReact = async (post: CommunityPost) => {
    if (!currentUser) return;

    const supabase = createClient();
    const hasReacted = post.user_has_reacted;
    const newReactCount = Math.max(0, (post.reacts_count || 0) + (hasReacted ? -1 : 1));

    // Optimistic update. `prev` rather than the captured array so two quick
    // taps cannot drop the second one.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, user_has_reacted: !hasReacted, reacts_count: newReactCount }
          : p
      )
    );

    try {
      if (hasReacted) {
        await supabase
          .from('post_reacts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('post_reacts')
          .insert({ post_id: post.id, user_id: currentUser.id });
      }

      await supabase
        .from('community_posts')
        .update({ reacts_count: newReactCount })
        .eq('id', post.id);
    } catch (err) {
      console.error('Error reacting to post:', err);
    }
  };

  const toggleComments = async (postId: number) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }

    setActiveCommentsPostId(postId);
    if (!commentsMap[postId]) {
      try {
        setLoadingComments(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('comments')
          .select(`*, user:profiles(*)`)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setCommentsMap((prev) => ({ ...prev, [postId]: data }));
        }
      } catch (err) {
        console.error('Error loading comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!currentUser || !newComment.trim()) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          body: newComment.trim(),
        })
        .select(`*, user:profiles(*)`)
        .single();

      if (!error && data) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data],
        }));

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
          )
        );

        setNewComment('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (!error) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  return (
    <div className="space-y-4">
      {showBanner && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-text">
                Community Showcase
              </h3>
            </div>
            <p className="text-sm font-bold text-foreground">
              {activeFilter ? (
                <>
                  <span className="text-foreground">{activeFilter}</span> Performing Arts Circle
                </>
              ) : currentUser ? (
                'Set your discipline in profile to join'
              ) : (
                'Sign in to explore your creative community'
              )}
            </p>
          </div>

          {activeFilter && (
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-accent-border bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent-text shadow-sm sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              {activeFilter} Circle
            </span>
          )}
        </div>
      )}

      <PostComposer
        currentUser={currentUser}
        community={community ?? null}
        browsingTalentLabel={browsingLabel ?? null}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
      />

      {showLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2.5 rounded-[14px] border border-border bg-card p-3.5 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="g-skeleton h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="g-skeleton h-3 w-32" />
                  <div className="g-skeleton h-2.5 w-20" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="g-skeleton h-3 w-full" />
                <div className="g-skeleton h-3 w-4/5" />
              </div>
              <div className="g-skeleton aspect-[16/9] w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="space-y-3 rounded-[14px] border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-bold text-foreground">
            {!currentUser
              ? 'Sign in to see your community'
              : !community
                ? 'No community set on your profile'
                : !activeFilter
                  ? 'Choose a circle to browse'
                  : `No showcase posts in ${activeFilter} yet`}
          </h4>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
            {!currentUser
              ? 'Your community showcase is only visible to signed-in members.'
              : !community
                ? 'Add your discipline in your profile settings to join a community and start sharing.'
                : !activeFilter
                  ? 'Pick Dancer, Singer, Actor or Theater to see what your circle is working on.'
                  : 'Be the first to share a rehearsal clip with the circle!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              mediaUrl={post.media_path ? mediaUrls[post.media_path] : undefined}
              mediaBroken={post.media_path ? mediaBroken[post.media_path] : undefined}
              isEditing={editingId === post.id}
              editDraft={editDraft}
              savingEdit={savingEdit}
              editError={editError}
              isCommentsOpen={activeCommentsPostId === post.id}
              comments={commentsMap[post.id]}
              loadingComments={loadingComments}
              newComment={newComment}
              onStartEdit={() => startEdit(post)}
              onCancelEdit={cancelEdit}
              onEditDraftChange={setEditDraft}
              onSaveEdit={() => void saveEdit(post.id)}
              onDelete={() => void handleDeletePost(post.id)}
              onReact={() => void handleReact(post)}
              onToggleComments={() => void toggleComments(post.id)}
              onNewCommentChange={setNewComment}
              onAddComment={() => void handleAddComment(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}