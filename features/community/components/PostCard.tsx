'use client';

/**
 * One Showcase post.
 *
 * Extracted from `CommunityFeed`'s inline `posts.map(...)` body. Every behaviour
 * is preserved: author, role badge, timestamp, circle label, caption, media with
 * its three states, reactions, comments, inline edit, and delete.
 *
 * WHAT CHANGED VERSUS THE INLINE ORIGINAL
 *   • Tighter padding, gaps and type scale; the card radius joins the rest of the
 *     app on the shared 14px scale rather than the old one-off 22px.
 *   • Media is capped at 420px on desktop (was 520px) and stays
 *     `object-contain`, so nothing important is cropped or distorted — a cropped
 *     full-body dance clip loses the feet, which is the whole point of the post.
 *   • Long captions, links and filenames wrap instead of pushing the card wide.
 *
 * OWNERSHIP IS UNCHANGED
 *   Edit and delete are still gated on `currentUser.id === post.author_id` and on
 *   nothing else — there is no admin bypass here, and the data layer keeps its
 *   author-scoped UPDATE. See `CommunityFeed` for the handlers.
 */

import React from 'react';
import {
  Check,
  Clock,
  Heart,
  ImageOff,
  Loader2,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X as CancelIcon,
} from 'lucide-react';

import type { Comment, CommunityPost } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { isVideoPath } from '../utils/communityMedia';
import { cn } from '@/components/shared/cn';

/** Desktop cap for post media, per the brief. */
const MEDIA_MAX_H = 'max-h-[420px]';

export interface PostCardProps {
  post: CommunityPost;
  /** The signed-in viewer. Used only for the ownership gate and comment entry. */
  currentUser: { id: string; firstname?: string | null } | null | undefined;
  /** Resolved signed URL for `post.media_path`, when it could be signed. */
  mediaUrl?: string;
  /** True when the path exists but could not be signed. */
  mediaBroken?: boolean;
  /** True when this post's caption is being edited. */
  isEditing: boolean;
  editDraft: string;
  savingEdit: boolean;
  editError: string | null;
  /** Open comment drawer state. */
  isCommentsOpen: boolean;
  comments: Comment[] | undefined;
  loadingComments: boolean;
  /** The comment draft is one shared field for the whole feed — unchanged. */
  newComment: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReact: () => void;
  onToggleComments: () => void;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
}

export function PostCard({
  post,
  currentUser,
  mediaUrl,
  mediaBroken,
  isEditing,
  editDraft,
  savingEdit,
  editError,
  isCommentsOpen,
  comments,
  loadingComments,
  newComment,
  onStartEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onDelete,
  onReact,
  onToggleComments,
  onNewCommentChange,
  onAddComment,
}: PostCardProps) {
  const isOwner = Boolean(currentUser && currentUser.id === post.author_id);
  // A caption can be empty when the post is media-only; the aria-label helpers
  // below must not throw on that.
  const captionPeek = (post.caption || '').trim();

  return (
    <article className="rounded-[14px] border border-border bg-card p-3.5 shadow-[var(--shadow-sm)] transition-colors hover:border-border-strong sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-bold text-foreground">
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
          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span className="truncate">
                {post.author?.firstname} {post.author?.lastname}
              </span>
              <span className="shrink-0 rounded-full border border-accent-border/50 bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-text">
                {post.author?.role || 'Performer'}
              </span>
            </h4>
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate font-semibold text-accent-text">{post.talent}</span>
            </p>
          </div>
        </div>

        {/* Ownership gate — the only gate, exactly as before. */}
        {currentUser && isOwner && (
          <div className="flex shrink-0 items-center gap-0.5">
            {!isEditing && (
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Edit post"
                aria-label={`Edit your post: ${captionPeek.slice(0, 40) || 'media post'}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
              title="Delete post"
              aria-label={`Delete your post: ${captionPeek.slice(0, 40) || 'media post'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Caption / inline editor */}
      <div className="mt-2.5">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editDraft}
              onChange={(e) => onEditDraftChange(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground outline-none focus:border-accent"
              aria-label="Edit post text"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={savingEdit}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/70"
              >
                <CancelIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={savingEdit || !editDraft.trim()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
              >
                {savingEdit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Save</span>
              </button>
            </div>
            {editError && (
              <p role="alert" className="text-[11px] text-danger">
                {editError}
              </p>
            )}
          </div>
        ) : (
          post.caption && (
            // `break-words` keeps a long URL from widening the card.
            <p className="whitespace-pre-line break-words text-xs leading-relaxed text-foreground/90 sm:text-[0.8125rem]">
              {post.caption}
            </p>
          )
        )}
      </div>

      {/* Media — three states, unchanged logic */}
      {post.media_path &&
        (mediaUrl ? (
          <div className="mt-2.5 overflow-hidden rounded-xl border border-border bg-black/40 shadow-inner">
            {isVideoPath(post.media_path) ? (
              <video
                src={mediaUrl}
                controls
                playsInline
                preload="metadata"
                className={cn('mx-auto w-full max-w-full bg-black object-contain', MEDIA_MAX_H)}
              />
            ) : (
              <img
                src={mediaUrl}
                alt={`Shared by ${post.author?.firstname ?? 'a member'}: ${captionPeek.slice(0, 80) || 'post media'}`}
                className={cn('mx-auto w-full max-w-full bg-black/20 object-contain', MEDIA_MAX_H)}
                loading="lazy"
              />
            )}
          </div>
        ) : mediaBroken ? (
          <div className="mt-2.5 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
            <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-semibold text-muted-foreground">Media unavailable</p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              This file could not be loaded or belongs to a different community.
            </p>
          </div>
        ) : (
          <div
            className="mt-2.5 flex h-40 items-center justify-center rounded-xl border border-border bg-muted/40"
            role="status"
            aria-label="Loading media"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ))}

      {/* Reactions + comments */}
      <div className="mt-2.5 flex items-center justify-between border-t border-divider pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReact}
            aria-pressed={Boolean(post.user_has_reacted)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition',
              post.user_has_reacted
                ? 'border border-accent-border/60 bg-accent-soft font-bold text-accent-text'
                : 'border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
            )}
          >
            <Heart
              className={cn(
                'h-3.5 w-3.5 transition-transform active:scale-125',
                post.user_has_reacted ? 'fill-accent text-accent' : ''
              )}
              aria-hidden="true"
            />
            <span>{post.reacts_count || 0}</span>
          </button>

          <button
            type="button"
            onClick={onToggleComments}
            aria-expanded={isCommentsOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{post.comments_count || 0} Comments</span>
          </button>
        </div>
      </div>

      {/* Comments drawer */}
      {isCommentsOpen && (
        <div className="mt-2.5 space-y-2.5 rounded-xl border border-border bg-muted/40 p-3 text-xs">
          {loadingComments ? (
            <div className="py-3 text-center text-muted-foreground">Loading comments...</div>
          ) : comments?.length === 0 ? (
            <p className="py-2 text-center text-muted-foreground">
              No comments yet. Start the conversation!
            </p>
          ) : (
            <div className="g-scroll max-h-60 space-y-2 overflow-y-auto pr-1">
              {comments?.map((cmt) => (
                <div
                  key={cmt.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs"
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
                    <p className="truncate font-bold text-foreground">
                      {cmt.user?.firstname} {cmt.user?.lastname}
                    </p>
                    <p className="break-words text-xs leading-relaxed text-muted-foreground">
                      {cmt.body}
                    </p>
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
                onChange={(e) => onNewCommentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddComment();
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={onAddComment}
                disabled={!newComment.trim()}
                aria-label="Send comment"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default PostCard;