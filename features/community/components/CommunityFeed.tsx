'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Trash2,
  Pencil,
  Check,
  X as CancelIcon,
  Image as ImageIcon,
  ImageOff,
  Send,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';
import { CommunityPost, Comment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import { cn } from '@/components/shared/cn';
import { type Community } from '../utils/community';
import {
  isVideoPath,
  signCommunityMediaBatch,
  uploadCommunityMedia,
  validateMedia,
} from '../utils/communityMedia';

interface CommunityFeedProps {
  currentUser?: Profile | null;
  /**
   * The signed-in member's community, derived from their own profile. Supplied by
   * the page because the detail row that holds it (client_profiles / coach_profiles)
   * is already loaded there. Required for posting and for reading the feed: RLS
   * only exposes a member's own community, so there is no cross-community mode.
   */
  community?: Community | null;
}

export default function CommunityFeed({ currentUser, community }: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing. `editingId` is null when nothing is being edited; `editDraft` holds
  // the in-progress caption. Kept out of the post objects so an abandoned edit
  // cannot leak into the feed.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // New Post State. The community is no longer chosen here: RLS requires a post's
  // `talent` to equal the author's own community, so offering a picker produced
  // a control whose other options were guaranteed to fail on save.
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** True only while bytes are in flight, so the UI can say "Uploading…" exactly
   *  when it is true rather than guessing from `submitting`. */
  const [uploading, setUploading] = useState(false);

  // Resolved signed URLs, keyed by the stored path. The feed stores PATHS (the
  // bucket is private), so something has to turn each one into a URL the <img>
  // can actually load. Keyed by path rather than by post id so one signing round
  // trip covers every image on the page.
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  /** Paths that exist but could not be signed — rendered as an explicit state. */
  const [mediaBroken, setMediaBroken] = useState<Record<string, boolean>>({});

  // Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Failures shown to the member. Supabase errors are plain objects, not Errors,
  // so a bare `console.error` was the only place they ever surfaced.
  const [postError, setPostError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    // No community yet: querying would return another community's posts on a
    // misconfigured RLS, and an empty result on a correct one. Waiting is honest.
    if (!community) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      // Scoped to the member's own community. RLS enforces the same rule, so
      // this is not the security boundary — it just avoids asking for rows the
      // database will refuse.
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('talent', community)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check reactions for currentUser
      if (currentUser && data) {
        const { data: reacts } = await supabase
          .from('post_reacts')
          .select('post_id')
          .eq('user_id', currentUser.id);

        const reactedPostIds = new Set(reacts?.map((r) => r.post_id) || []);
        const postsWithReaction = data.map((p) => ({
          ...p,
          user_has_reacted: reactedPostIds.has(p.id),
        }));
        setPosts(postsWithReaction);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [community, currentUser]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ---- resolve stored media paths to signed URLs ----------------------------
  //
  // community_posts.media_path holds a storage PATH, not a URL, because the
  // bucket is private. Rendering the raw path as an <img src> is why images did
  // not appear even when an upload had succeeded.
  //
  // Keyed on the joined set of paths so a new post re-signs only what is new.
  useEffect(() => {
    const paths = posts.map((p) => p.media_path).filter((p): p is string => Boolean(p));
    // No paths: return WITHOUT clearing. Setting state here would be a
    // synchronous setState in an effect, which the react-hooks lint rule rejects
    // for good reason. Stale entries are harmless anyway — the maps are keyed by
    // path, so nothing looks up a path no post has.
    if (paths.length === 0) return;

    let cancelled = false;
    void (async () => {
      const signed = await signCommunityMediaBatch(paths);
      if (cancelled) return;
      setMediaUrls(signed);
      // Anything requested but not returned could not be signed — usually RLS
      // refusing, which for a member means the media is in another community.
      setMediaBroken(
        Object.fromEntries(paths.filter((p) => !signed[p]).map((p) => [p, true]))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [posts]);

  // Release the preview object URL when the component goes away.
  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
    // Intentionally only on unmount: clearMedia and handleMediaChange revoke the
    // previous URL at the point it is replaced, so revoking here again would be
    // a double-free of a URL already gone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateMedia(file);
    if (!check.ok) {
      setPostError(check.reason);
      // Reset the input so picking the same rejected file again re-fires change.
      e.target.value = '';
      return;
    }

    // Revoke the previous object URL. Leaking one per selection is a real memory
    // leak over a long session of picking images.
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);

    setPostError(null);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!caption.trim() && !mediaFile) return;

    // Refused here rather than at the database, so the member gets an
    // explanation instead of a failed save. RLS would reject it regardless.
    if (!community) {
      setPostError(
        'Your profile has no talent set yet, so there is no community to post into. Add your discipline in your profile settings first.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setPostError(null);
      setUploading(true);
      const supabase = createClient();
      let media_path: string | null = null;

      if (mediaFile) {
        // Throws with a readable message on any failure. The old code caught
        // nothing here and fell through to a text-only post, so an upload that
        // never happened looked like a successful one.
        try {
          media_path = await uploadCommunityMedia(mediaFile, currentUser.id, community);
        } catch (uploadErr) {
          // A failed upload aborts the whole post rather than silently dropping
          // the image: a caption-only post is not what the member asked for.
          throw new Error(
            uploadErr instanceof Error
              ? uploadErr.message
              : 'The file could not be uploaded. Please try again.'
          );
        } finally {
          setUploading(false);
        }
      }

      const { data: newPost, error: insertErr } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUser.id,
          caption,
          media_path,
          // The member's own community. Not a user choice: RLS requires this to
          // equal my_community(), so any other value would be rejected on save.
          talent: community,
        })
        .select(`*, author:profiles(*)`)
        .single();

      if (insertErr) throw insertErr;

      setPosts([newPost, ...posts]);
      setCaption('');
      clearMedia();
    } catch (err) {
      // Surfaced rather than only logged. Supabase returns a plain object here,
      // so `instanceof Error` is false and the message has to be read off the
      // object — the same trap that hid the verification failures.
      const e = err as { message?: string; code?: string };
      setPostError(e?.message ? `${e.code ? e.code + ': ' : ''}${e.message}` : 'Your post could not be saved.');
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
      setEditError(e?.message ? `${e.code ? e.code + ': ' : ''}${e.message}` : 'Your change could not be saved.');
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

    // Optimistic update
    setPosts(
      posts.map((p) =>
        p.id === post.id
          ? { ...p, user_has_reacted: !hasReacted, reacts_count: newReactCount }
          : p
      )
    );

    if (hasReacted) {
      await supabase
        .from('post_reacts')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id);

      await supabase
        .from('community_posts')
        .update({ reacts_count: newReactCount })
        .eq('id', post.id);
    } else {
      await supabase
        .from('post_reacts')
        .insert({ post_id: post.id, user_id: currentUser.id });

      await supabase
        .from('community_posts')
        .update({ reacts_count: newReactCount })
        .eq('id', post.id);
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
    if (!confirm('Are you sure you want to delete this post?')) return;

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
    <div className="space-y-6">
      {/* Community Showcase Banner */}
      <div className="flex flex-col gap-3 rounded-[22px] border border-border bg-card p-5 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-accent-text">
              Community Showcase
            </h3>
          </div>
          <p className="text-base font-bold text-foreground">
            {community ? (
              <>
                <span className="text-foreground">{community}</span> Performing Arts Circle
              </>
            ) : currentUser ? (
              'Set your discipline in profile to join'
            ) : (
              'Sign in to explore your creative community'
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {community
              ? `Rehearsal highlights, choreography routines, and updates from ${community} artists in Bulacan.`
              : 'Connect with dancers, vocalists, actors, and directors across Region III.'}
          </p>
        </div>

        {community && (
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent-text shadow-sm">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              {community} Circle
            </span>
          </div>
        )}
      </div>

      {/* Create Post Box (if logged in) */}
      {currentUser && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-[22px] border border-border bg-card p-5 shadow-[var(--shadow-sm)] space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-foreground">
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.firstname}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{getInitials(currentUser.firstname, currentUser.lastname)}</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <textarea
                rows={2}
                placeholder={`Share a choreography video, vocal snippet, or rehearsal thought, ${currentUser.firstname}...`}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent-border focus:bg-card focus:outline-none transition"
              />

              {/* Preview of selected media */}
              {mediaPreview && mediaFile && (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-black/40">
                  {mediaFile.type.startsWith('video') ? (
                    <video
                      src={mediaPreview}
                      controls
                      playsInline
                      className="mx-auto max-h-64 w-full bg-black object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Selected media preview"
                      className="mx-auto max-h-64 w-full object-contain"
                    />
                  )}

                  <div className="flex items-center justify-between border-t border-border bg-card/90 px-3.5 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 truncate">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                      <span className="truncate">{mediaFile.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={clearMedia}
                    disabled={uploading}
                    aria-label="Remove selected media"
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-xs text-white backdrop-blur transition hover:bg-black disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-divider pt-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted">
                <ImageIcon className="h-4 w-4 text-accent-text" />
                <span>Add Media</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                />
              </label>

              {community && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Posting to: <strong className="text-foreground">{community}</strong>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (!caption.trim() && !mediaFile) || !community}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{uploading ? 'Uploading…' : submitting ? 'Posting…' : 'Share Post'}</span>
            </button>
          </div>

          {postError && (
            <p role="alert" className="text-xs text-danger">
              {postError}
            </p>
          )}
        </form>
      )}

      {/* Feed List */}
      {loading ? (
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[22px] border border-border bg-card p-5 sm:p-6 space-y-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center gap-3">
                <div className="g-skeleton h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <div className="g-skeleton h-4 w-36" />
                  <div className="g-skeleton h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="g-skeleton h-3.5 w-full" />
                <div className="g-skeleton h-3.5 w-4/5" />
              </div>
              <div className="g-skeleton aspect-[16/9] w-full rounded-2xl" />
              <div className="pt-3 border-t border-divider flex gap-3">
                <div className="g-skeleton h-8 w-20 rounded-full" />
                <div className="g-skeleton h-8 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center rounded-[22px] border border-dashed border-border bg-card p-8 space-y-3.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">
            {!currentUser
              ? 'Sign in to see your community'
              : !community
                ? 'No community set on your profile'
                : `No showcase posts in ${community} yet`}
          </h4>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
            {!currentUser
              ? 'Your community showcase is only visible to signed-in members.'
              : !community
                ? 'Add your discipline in your profile settings to join a community and start sharing.'
                : 'Be the first to share a choreography routine, vocal performance, or rehearsal clip with the circle!'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-[22px] border border-border bg-card p-5 sm:p-6 space-y-4 shadow-[var(--shadow-sm)] transition-all hover:border-border-strong"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-bold text-xs text-foreground">
                    {post.author?.photo_url ? (
                      <img
                        src={post.author.photo_url}
                        alt={post.author.firstname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(post.author?.firstname ?? 'A', post.author?.lastname ?? '')}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <span>
                        {post.author?.firstname} {post.author?.lastname}
                      </span>
                      <span className="rounded-full border border-accent-border/50 bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                        {post.author?.role || 'Performer'}
                      </span>
                    </h4>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-accent-text">{post.talent}</span>
                    </p>
                  </div>
                </div>

                {currentUser && currentUser.id === post.author_id && (
                  <div className="flex items-center gap-1">
                    {editingId !== post.id && (
                      <button
                        onClick={() => startEdit(post)}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Edit post"
                        aria-label={`Edit your post: ${post.caption.slice(0, 40)}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                      title="Delete post"
                      aria-label={`Delete your post: ${post.caption.slice(0, 40)}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Caption */}
              {editingId === post.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground outline-none focus:border-accent-border"
                    aria-label="Edit post text"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/70"
                    >
                      <CancelIcon className="h-3.5 w-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(post.id)}
                      disabled={savingEdit || !editDraft.trim()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
                    >
                      {savingEdit ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                  {editError && (
                    <p role="alert" className="text-xs text-danger">
                      {editError}
                    </p>
                  )}
                </div>
              ) : (
                post.caption && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {post.caption}
                  </p>
                )
              )}

              {/* Media */}
              {post.media_path &&
                (mediaUrls[post.media_path] ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-black/40 shadow-inner">
                    {isVideoPath(post.media_path) ? (
                      <video
                        src={mediaUrls[post.media_path]}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-[520px] w-full bg-black object-contain mx-auto"
                      />
                    ) : (
                      <img
                        src={mediaUrls[post.media_path]}
                        alt={`Shared by ${post.author?.firstname ?? 'a member'}: ${post.caption?.slice(0, 80) || 'post media'}`}
                        className="max-h-[520px] w-full object-contain mx-auto bg-black/20"
                        loading="lazy"
                      />
                    )}
                  </div>
                ) : mediaBroken[post.media_path] ? (
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
                    <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      Media unavailable
                    </p>
                    <p className="max-w-xs text-[11px] text-muted-foreground">
                      This file could not be loaded or belongs to a different community.
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex h-44 items-center justify-center rounded-2xl border border-border bg-muted/40"
                    role="status"
                    aria-label="Loading media"
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                  </div>
                ))}

              {/* Interaction Bar */}
              <div className="flex items-center justify-between border-t border-divider pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReact(post)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      post.user_has_reacted
                        ? 'border border-accent-border/60 bg-accent-soft text-accent-text font-bold'
                        : 'border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Heart
                      className={cn(
                        'h-3.5 w-3.5 transition-transform active:scale-125',
                        post.user_has_reacted ? 'fill-accent text-accent' : ''
                      )}
                    />
                    <span>{post.reacts_count || 0}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{post.comments_count || 0} Comments</span>
                  </button>
                </div>
              </div>

              {/* Expanded Comments Drawer */}
              {activeCommentsPostId === post.id && (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4 text-xs">
                  {loadingComments ? (
                    <div className="py-3 text-center text-muted-foreground">Loading comments...</div>
                  ) : commentsMap[post.id]?.length === 0 ? (
                    <p className="py-2 text-center text-muted-foreground">
                      No comments yet. Start the conversation!
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 g-scroll">
                      {commentsMap[post.id]?.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[10px] font-bold text-foreground">
                            {cmt.user?.photo_url ? (
                              <img
                                src={cmt.user.photo_url}
                                alt={cmt.user.firstname}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(cmt.user?.firstname ?? 'A', cmt.user?.lastname ?? '')}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-bold text-foreground">
                              {cmt.user?.firstname} {cmt.user?.lastname}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{cmt.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentUser && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write a supportive comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent-border focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newComment.trim()}
                        aria-label="Send comment"
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
