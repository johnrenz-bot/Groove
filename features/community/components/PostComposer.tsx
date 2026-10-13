'use client';

/**
 * The Showcase post composer.
 *
 * Extracted from `CommunityFeed` so it can be sized for the two-column Showcase
 * layout without duplicating any of the upload, validation or submit logic — all
 * of which lives in the `useCommunityComposer` hook below and is unchanged.
 *
 * WHAT CHANGED VERSUS THE INLINE ORIGINAL
 *   • 32px avatar (was 44px), tighter padding, one-row footer.
 *   • The textarea is one row tall until focused, then grows. Blur returns it to
 *     the compact height but NEVER clears text, media or the error, so a stray
 *     click cannot lose a half-written post.
 *   • The submit is guarded against double-firing with a ref, not only a
 *     `disabled` attribute.
 *
 * WHAT DID NOT CHANGE
 *   File validation, the 8 MB limit, the object-URL lifecycle, the upload, the
 *   insert, the error copy, and the fact that a post's `talent` is the member's
 *   own community — RLS refuses anything else.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Send, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import type { CommunityPost, Profile } from '@/lib/types';
import type { Community } from '../utils/community';
import {
  uploadCommunityMedia,
  validateMedia,
} from '../utils/communityMedia';
import { cn } from '@/components/shared/cn';

/** Supabase rejects with a plain object, not an Error — read it defensively. */
function describeError(err: unknown, fallback: string): string {
  const e = err as { message?: string; code?: string } | null;
  if (e?.message) return `${e.code ? `${e.code}: ` : ''}${e.message}`;
  return fallback;
}

export interface UseCommunityComposerArgs {
  currentUser: Profile | null | undefined;
  /**
   * The circle a new post is written to. Always the member's OWN community:
   * RLS compares `talent` to `my_community()`, so this is not a choice.
   */
  community: Community | null;
  onCreated: (post: CommunityPost) => void;
}

/**
 * All composer state and behaviour, lifted out of the component so the JSX stays
 * declarative and the logic stays in one testable place.
 */
export function useCommunityComposer({
  currentUser,
  community,
  onCreated,
}: UseCommunityComposerArgs) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** True only while bytes are in flight, so "Uploading…" is exact. */
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref-based in-flight guard: `disabled` alone still lets a fast double-click
  // through between renders.
  const inFlightRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Release the preview object URL when the composer goes away. `clearMedia` and
  // the change handler revoke at the point of replacement, so this runs on unmount
  // only and cannot double-free.
  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMedia = useCallback(() => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [mediaPreview]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateMedia(file);
    if (!check.ok) {
      setError(check.reason);
      // Reset so re-picking the same rejected file fires change again.
      e.target.value = '';
      return;
    }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setError(null);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || inFlightRef.current) return;
    if (!caption.trim() && !mediaFile) return;

    if (!community) {
      setError(
        'Your profile has no talent set yet, so there is no community to post into. Add your discipline in your profile settings first.'
      );
      return;
    }

    inFlightRef.current = true;
    setError(null);

    try {
      setSubmitting(true);
      const supabase = createClient();

      let media_path: string | null = null;
      if (mediaFile) {
        setUploading(true);
        try {
          media_path = await uploadCommunityMedia(mediaFile, currentUser.id, community);
        } catch (uploadErr) {
          throw new Error(describeError(uploadErr, 'The file could not be uploaded. Please try again.'));
        } finally {
          setUploading(false);
        }
      }

      const { data: newPost, error: insertErr } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUser.id,
          caption: caption.trim(),
          media_path,
          // The member's own community. Not a user choice: RLS requires this to
          // equal my_community(), so any other value would be rejected on save.
          talent: community,
        })
        .select(`*, author:profiles(*)`)
        .single();

      if (insertErr) throw insertErr;
      if (!newPost) throw new Error('Your post could not be saved.');

      onCreated(newPost as CommunityPost);
      setCaption('');
      clearMedia();
    } catch (err) {
      // Surfaced rather than only logged — the same trap that hid the original
      // upload failures.
      setError(describeError(err, 'Your post could not be saved.'));
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
      inFlightRef.current = false;
    }
  };

  const canSubmit = Boolean((caption.trim() || mediaFile) && community) && !submitting;

  return {
    caption,
    setCaption,
    mediaFile,
    mediaPreview,
    submitting,
    uploading,
    error,
    fileInputRef,
    canSubmit,
    handleMediaChange,
    handleCreatePost,
    clearMedia,
  };
}

export interface PostComposerProps {
  currentUser: Profile | null | undefined;
  /** The circle posts are written to — always the member's own. */
  community: Community | null;
  /**
   * Circle currently being browsed. When this differs from `community`, the
   * composer says so instead of pretending the post will land elsewhere.
   */
  browsingTalentLabel?: string | null;
  onCreated: (post: CommunityPost) => void;
}

export function PostComposer({
  currentUser,
  community,
  browsingTalentLabel,
  onCreated,
}: PostComposerProps) {
  const composer = useCommunityComposer({ currentUser, community, onCreated });
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!currentUser) return null;

  const {
    caption,
    setCaption,
    mediaFile,
    mediaPreview,
    submitting,
    uploading,
    error,
    fileInputRef,
    canSubmit,
    handleMediaChange,
    handleCreatePost,
    clearMedia,
  } = composer;

  // Blurring only collapses the box. Nothing is cleared — the point of the
  // compact state is to save space, not to reset a draft.
  const collapse = () => setExpanded(false);

  return (
    <form
      onSubmit={handleCreatePost}
      className="rounded-[14px] border border-border bg-card p-3 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-2.5">
        {/* 32px avatar, per the brief. */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-bold text-foreground">
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

        <div className="min-w-0 flex-1">
          <label htmlFor="showcase-post-caption" className="sr-only">
            Share something with your circle
          </label>
          <textarea
            id="showcase-post-caption"
            ref={textareaRef}
            rows={expanded ? 4 : 1}
            placeholder={`Share a rehearsal moment, ${currentUser.firstname}...`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onFocus={() => setExpanded(true)}
            onBlur={collapse}
            className={cn(
              'w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground transition',
              'focus:bg-card focus:outline-none focus:border-accent',
              expanded ? 'border-border' : 'border-transparent'
            )}
          />
        </div>
      </div>

      {/* Preview of selected media — unchanged behaviour, tighter frame. */}
      {mediaPreview && mediaFile && (
        <div className="relative mt-2.5 overflow-hidden rounded-xl border border-border bg-black/40">
          {mediaFile.type.startsWith('video') ? (
            <video src={mediaPreview} controls playsInline className="mx-auto max-h-48 w-full bg-black object-contain" />
          ) : (
            <img src={mediaPreview} alt="Selected media preview" className="mx-auto max-h-48 w-full object-contain" />
          )}

          <div className="flex items-center justify-between border-t border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <ImageIcon className="h-3 w-3 shrink-0 text-accent-text" aria-hidden="true" />
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
            className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white backdrop-blur transition hover:bg-black disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-divider pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-border-strong hover:bg-muted">
            <ImageIcon className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
            <span>Add Media</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="sr-only"
            />
          </label>

          {community && (
            <span
              className={cn(
                'hidden min-w-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium sm:inline-flex',
                browsingTalentLabel && browsingTalentLabel !== community
                  ? 'border-warning/40 bg-warning-soft text-warning'
                  : 'border-border bg-muted/60 text-muted-foreground'
              )}
            >
              {browsingTalentLabel && browsingTalentLabel !== community ? (
                <>
                  Posting to <strong className="font-semibold">{community}</strong> Circle
                </>
              ) : (
                <>
                  Posting to: <strong className="text-foreground">{community}</strong>
                </>
              )}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{uploading ? 'Uploading…' : submitting ? 'Posting…' : 'Share Post'}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export default PostComposer;