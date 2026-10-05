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
} from 'lucide-react';
import { CommunityPost, Comment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { type Community } from '@/lib/community';
import {
  isVideoPath,
  signCommunityMediaBatch,
  uploadCommunityMedia,
  validateMedia,
} from './communityMedia';

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
      {/* Community header. This replaces the old cross-community talent pills:
          RLS only exposes a member's own community, so the pills could not have
          worked any more, and leaving them would have implied browsing that the
          database forbids. */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Community Showcase
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {community ? (
              <>
                You are viewing the <span className="text-accent-text">{community}</span>{' '}
                community
              </>
            ) : currentUser ? (
              'No community set on your profile'
            ) : (
              'Sign in to join your community'
            )}
          </p>
        </div>
        {community && (
          <span className="shrink-0 rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
            {community}
          </span>
        )}
      </div>

      {/* Create Post Box (if logged in) */}
      {currentUser && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 border border-border flex items-center justify-center shrink-0">
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.firstname}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold text-xs text-primary">
                  {currentUser.firstname?.[0]}
                  {currentUser.lastname?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                rows={2}
                placeholder={`Share your choreography, vocal session, or thoughts, ${currentUser.firstname}...`}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-transparent border-0 focus:ring-0 text-sm outline-none resize-none text-foreground placeholder:text-foreground/40"
              />

              {/* Preview of the selected file, before it is uploaded. Rendered from a local
                  object URL, so it is instant and costs no network. */}
              {mediaPreview && mediaFile && (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/60">
                  {mediaFile.type.startsWith('video') ? (
                    <video
                      src={mediaPreview}
                      controls
                      playsInline
                      className="mx-auto max-h-60 w-full bg-black object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Selected media preview"
                      className="mx-auto max-h-60 w-full object-contain"
                    />
                  )}

                  {/* Filename and size, so a member can confirm they picked the
                      right file before committing to an upload. */}
                  <div className="flex items-center gap-2 border-t border-border bg-card/80 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
                    <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{mediaFile.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={clearMedia}
                    disabled={uploading}
                    aria-label="Remove selected media"
                    className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-xs text-white backdrop-blur transition hover:bg-black disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-divider pt-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted hover:bg-muted cursor-pointer text-foreground/80">
                <ImageIcon className="h-4 w-4 text-success" />
                <span>Media</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                />
              </label>

              {/* Community is shown, not chosen. A picker here would offer
                  options RLS refuses, so it was removed rather than disabled. */}
              {community && (
                <span className="px-3 py-1.5 rounded-xl border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  {community}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (!caption.trim() && !mediaFile) || !community}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 font-semibold text-primary-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {/* Says "Uploading…" only while bytes are actually moving, which
                  for a large file is most of the wait. */}
              <span>{uploading ? 'Uploading…' : submitting ? 'Posting…' : 'Post'}</span>
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
        <div className="py-12 text-center text-foreground/60 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-xs">Loading community showcase...</p>
        </div>
      ) : posts.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-divider bg-card p-8 space-y-3">
                <Sparkles className="h-10 w-10 text-primary mx-auto opacity-50" />
                <h4 className="text-base font-semibold">
                  {!currentUser
                    ? 'Sign in to see your community'
                    : !community
                      ? 'No community set on your profile'
                      : `No posts in ${community} yet`}
                </h4>
                <p className="text-xs text-foreground/60">
                  {!currentUser
                    ? 'Your community showcase is only visible to signed-in members.'
                    : !community
                      ? 'Add your discipline in your profile settings to join a community and start sharing.'
                      : 'Be the first to share your performance video or showcase your craft!'}
                </p>
              </div>
            ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-lg"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 border border-border flex items-center justify-center font-bold text-xs text-primary">
                    {post.author?.photo_url ? (
                      <img
                        src={post.author.photo_url}
                        alt={post.author.firstname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {post.author?.firstname?.[0]}
                        {post.author?.lastname?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <span>
                        {post.author?.firstname} {post.author?.lastname}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-card/10 text-foreground/70">
                        {post.author?.role || 'Performer'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-foreground/50">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · <span className="text-primary font-medium">{post.talent}</span>
                    </p>
                  </div>
                </div>

                {currentUser && currentUser.id === post.author_id && (
                  <div className="flex items-center gap-1">
                    {editingId !== post.id && (
                      <button
                        onClick={() => startEdit(post)}
                        className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted transition cursor-pointer"
                        title="Edit post"
                        aria-label={`Edit your post: ${post.caption.slice(0, 40)}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-foreground/50 hover:text-danger hover:bg-danger/10 transition cursor-pointer"
                      title="Delete post"
                      aria-label={`Delete your post: ${post.caption.slice(0, 40)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Caption — inline editor while this post is being edited. */}
              {editingId === post.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-border"
                    aria-label="Edit post text"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/70 transition cursor-pointer"
                    >
                      <CancelIcon className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(post.id)}
                      disabled={savingEdit || !editDraft.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                    >
                      {savingEdit ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
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
                  <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {post.caption}
                  </p>
                )
              )}

              {/* Media. `media_path` is a storage path in a private bucket, so the src is
                  the SIGNED url resolved above — using the raw path is what made
                  images invisible. Three explicit states, because a silently
                  broken image reads as "the upload never worked" with no way to
                  tell that apart from a network failure. */}
              {post.media_path &&
                (mediaUrls[post.media_path] ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                    {isVideoPath(post.media_path) ? (
                      <video
                        src={mediaUrls[post.media_path]}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-[520px] w-full bg-black object-contain"
                      />
                    ) : (
                      <img
                        src={mediaUrls[post.media_path]}
                        alt={`Shared by ${post.author?.firstname ?? 'a member'}: ${post.caption?.slice(0, 80) || 'post media'}`}
                        className="max-h-[520px] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ) : mediaBroken[post.media_path] ? (
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center">
                    <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      Media unavailable
                    </p>
                    <p className="max-w-xs text-[11px] text-subtle-foreground">
                      This file could not be loaded. It may belong to a different
                      community, or the media bucket may not be configured yet.
                    </p>
                  </div>
                ) : (
                  // Still signing. A placeholder rather than a spinner so the
                  // card does not reflow when the image lands.
                  <div
                    className="flex h-40 items-center justify-center rounded-2xl border border-border bg-muted/50"
                    role="status"
                    aria-label="Loading media"
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                  </div>
                ))}

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-divider pt-3 text-xs text-foreground/70">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleReact(post)}
                    className={`flex items-center gap-1.5 py-1 transition cursor-pointer ${
                      post.user_has_reacted
                        ? 'text-pink-500 font-semibold'
                        : 'hover:text-foreground'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        post.user_has_reacted ? 'fill-pink-500 text-pink-500' : ''
                      }`}
                    />
                    <span>{post.reacts_count || 0}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 py-1 hover:text-foreground transition cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments_count || 0} Comments</span>
                  </button>
                </div>
              </div>

              {/* Expanded Comments */}
              {activeCommentsPostId === post.id && (
                <div className="border-t border-divider pt-3 space-y-3 text-xs">
                  {loadingComments ? (
                    <div className="py-2 text-center text-foreground/50">Loading comments...</div>
                  ) : commentsMap[post.id]?.length === 0 ? (
                    <p className="text-foreground/50 py-1">
                      No comments yet. Start the conversation!
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {commentsMap[post.id]?.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="flex items-start gap-2.5 p-2 rounded-xl bg-muted border border-border"
                        >
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {cmt.user?.photo_url ? (
                              <img
                                src={cmt.user.photo_url}
                                alt={cmt.user.firstname}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{cmt.user?.firstname?.[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold text-foreground/90">
                              {cmt.user?.firstname} {cmt.user?.lastname}:{' '}
                            </span>
                            <span className="text-foreground/80">{cmt.body}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentUser && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border focus:border-primary outline-none text-xs text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newComment.trim()}
                        className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
