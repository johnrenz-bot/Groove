'use client';

/**
 * Modern Social Media Post Card for Community Showcase.
 *
 * STRUCTURE:
 *   1. Author avatar + role + timestamp + THREE-DOT MENU (⋮) in top-right.
 *   2. Post text caption / inline editor + media (images/videos).
 *   3. Engagement counts (Reactions & Comments summary row).
 *   4. React and Comment action buttons.
 *   5. Comments drawer (when toggled).
 *
 * THREE-DOT MENU (⋮):
 *   - Edit Post (authorized author only)
 *   - Delete Post (authorized author only, with confirmation dialog)
 *   - Post Information (public details for all viewers)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Heart,
  ImageOff,
  Info,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  X as CancelIcon,
} from 'lucide-react';

import type { Comment, CommunityPost } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { isVideoPath } from '../utils/communityMedia';
import { cn } from '@/components/shared/cn';

const MEDIA_MAX_H = 'max-h-[420px]';

export interface PostCardProps {
  post: CommunityPost;
  /** The signed-in viewer. Used for ownership checks and comment entry. */
  currentUser: { id: string; firstname?: string | null; lastname?: string | null; photo_url?: string | null } | null | undefined;
  /** Resolved signed URL for post.media_path */
  mediaUrl?: string;
  /** True when the path exists but could not be signed */
  mediaBroken?: boolean;
  /** True when this post is being edited */
  isEditing: boolean;
  editDraft: string;
  savingEdit: boolean;
  editError: string | null;
  /** Open comment drawer state */
  isCommentsOpen: boolean;
  comments: Comment[] | undefined;
  loadingComments: boolean;
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
  const captionPeek = (post.caption || '').trim();

  // Three-dot menu and dialog states
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  // Formatted date string
  const createdDate = new Date(post.created_at);
  const formattedDate = createdDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const fullDateTime = createdDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-border-strong sm:p-5">
      {/* 1. Header: author/avatar + role + timestamp + three-dot menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted text-xs font-bold text-foreground shadow-2xs">
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
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate text-sm font-bold text-foreground">
                {post.author?.firstname} {post.author?.lastname}
              </h4>
              <span className="shrink-0 rounded-full border border-accent-border/60 bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                {post.author?.role || 'Performer'}
              </span>
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{formattedDate}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-accent-text">{post.talent} Circle</span>
            </p>
          </div>
        </div>

        {/* Top-Right: ONE Three-Dot Menu (⋮) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Post options"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onStartEdit();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5 text-accent-text" />
                    <span>Edit Post</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDeleteModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Post</span>
                  </button>

                  <div className="my-1 border-t border-border/60" />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowInfoModal(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5 text-accent-text" />
                <span>Post Information</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Post Text / Caption & Editor */}
      <div className="mt-3">
        {isEditing ? (
          <div className="space-y-2.5">
            <textarea
              value={editDraft}
              onChange={(e) => onEditDraftChange(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/40 p-3 text-xs sm:text-[13px] leading-relaxed text-foreground outline-none focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/15"
              aria-label="Edit post text"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={savingEdit}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/70 active:scale-95"
              >
                <CancelIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={savingEdit || !editDraft.trim()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50 active:scale-95"
              >
                {savingEdit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Save Changes</span>
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
            <p className="whitespace-pre-line break-words text-xs sm:text-[13px] leading-relaxed text-foreground/90">
              {post.caption}
            </p>
          )
        )}
      </div>

      {/* Media Attachment */}
      {post.media_path &&
        (mediaUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black/40 shadow-inner">
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
                alt={`Shared by ${post.author?.firstname ?? 'a performer'}: ${captionPeek.slice(0, 80) || 'community media'}`}
                className={cn('mx-auto w-full max-w-full bg-black/20 object-contain', MEDIA_MAX_H)}
                loading="lazy"
              />
            )}
          </div>
        ) : mediaBroken ? (
          <div className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
            <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-semibold text-muted-foreground">Media unavailable</p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              This file could not be loaded or belongs to a different community.
            </p>
          </div>
        ) : (
          <div
            className="mt-3 flex h-40 items-center justify-center rounded-xl border border-border bg-muted/40"
            role="status"
            aria-label="Loading media"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ))}

      {/* 3. Engagement Counts Row (Above React and Comment actions) */}
      <div className="mt-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Heart className="h-3 w-3 fill-accent text-accent" />
          </span>
          <span className="font-semibold text-foreground">{post.reacts_count || 0}</span>
          <span>{post.reacts_count === 1 ? 'reaction' : 'reactions'}</span>
        </span>

        <button
          type="button"
          onClick={onToggleComments}
          className="cursor-pointer text-muted-foreground transition hover:text-foreground hover:underline"
        >
          <span className="font-semibold text-foreground">{post.comments_count || 0}</span>{' '}
          {post.comments_count === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* 4. Action Buttons: React and Comment */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border/70 pt-2">
        <button
          type="button"
          onClick={onReact}
          aria-pressed={Boolean(post.user_has_reacted)}
          className={cn(
            'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all active:scale-98',
            post.user_has_reacted
              ? 'border border-accent-border/70 bg-accent-soft text-accent-text font-bold'
              : 'border border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              post.user_has_reacted ? 'fill-accent text-accent scale-110' : 'text-muted-foreground'
            )}
            aria-hidden="true"
          />
          <span>{post.user_has_reacted ? 'Reacted' : 'React'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleComments}
          aria-expanded={isCommentsOpen}
          className={cn(
            'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all active:scale-98',
            isCommentsOpen
              ? 'border border-border-strong bg-muted text-foreground'
              : 'border border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
          )}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>Comment</span>
        </button>
      </div>

      {/* 5. Comments Drawer */}
      {isCommentsOpen && (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/30 p-3.5 text-xs sm:p-4 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between pb-1 border-b border-border/50">
            <h5 className="font-bold text-foreground text-xs">
              Comments ({post.comments_count || 0})
            </h5>
            <button
              type="button"
              onClick={onToggleComments}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
            >
              Hide comments
            </button>
          </div>

          {loadingComments ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span>Loading comments…</span>
            </div>
          ) : comments?.length === 0 ? (
            <p className="py-3 text-center text-muted-foreground">
              No comments yet. Start the conversation!
            </p>
          ) : (
            <div className="g-scroll max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {comments?.map((cmt) => (
                <div
                  key={cmt.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-2xs"
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
                    <p className="truncate font-bold text-foreground text-xs">
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
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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
                className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={onAddComment}
                disabled={!newComment.trim()}
                aria-label="Send comment"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${post.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 id={`delete-title-${post.id}`} className="text-sm font-bold text-foreground">
                  Delete Post?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete this community post? This action will permanently remove it from the showcase and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-border bg-muted/50 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete();
                }}
                className="rounded-lg bg-danger px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-danger/90 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Information Modal */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`info-title-${post.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-border/60 bg-accent-soft text-accent-text">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 id={`info-title-${post.id}`} className="text-sm font-bold text-foreground">
                    Post Information
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Public showcase details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="Close"
              >
                <CancelIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Author</span>
                <span className="font-semibold text-foreground">
                  {post.author?.firstname} {post.author?.lastname}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Role</span>
                <span className="rounded-full border border-accent-border/60 bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                  {post.author?.role || 'Performer'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Community Circle</span>
                <span className="font-semibold text-foreground">{post.talent} Circle</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Published Date</span>
                <span className="font-medium text-foreground">{fullDateTime}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-center">
                  <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Total Reactions</span>
                  <span className="text-sm font-bold text-accent-text">{post.reacts_count || 0}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-center">
                  <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Total Comments</span>
                  <span className="text-sm font-bold text-foreground">{post.comments_count || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Media Attached</span>
                <span className="font-medium text-muted-foreground">
                  {post.media_path ? (isVideoPath(post.media_path) ? 'Video attachment' : 'Image attachment') : 'No media attached'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground font-medium">Post ID</span>
                <span className="font-mono text-[11px] text-muted-foreground">#{post.id}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent-hover transition shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default PostCard;