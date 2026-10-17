'use client';

/**
 * Modern Social Media Post Composer for Community Showcase.
 *
 * Placed directly above the feed:
 *   - Avatar and text input on the same row.
 *   - Clean bottom toolbar with Add Media, Posting Category, and Share Post.
 *   - Media preview with removal button.
 *   - Preserves all Supabase upload, RLS, and insert operations.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Send, Sparkles, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import type { CommunityPost, Profile } from '@/lib/types';
import type { Community } from '../utils/community';
import {
  uploadCommunityMedia,
  validateMedia,
} from '../utils/communityMedia';
import { cn } from '@/components/shared/cn';

function describeError(err: unknown, fallback: string): string {
  const e = err as { message?: string; code?: string } | null;
  if (e?.message) return `${e.code ? `${e.code}: ` : ''}${e.message}`;
  return fallback;
}

export interface UseCommunityComposerArgs {
  currentUser: Profile | null | undefined;
  community: Community | null;
  onCreated: (post: CommunityPost) => void;
}

export function useCommunityComposer({
  currentUser,
  community,
  onCreated,
}: UseCommunityComposerArgs) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

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
        'Your profile has no talent set yet. Please update your discipline in your profile settings to post into your community circle.'
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
  community: Community | null;
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
  const [isFocused, setIsFocused] = useState(false);
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

  return (
    <form
      onSubmit={handleCreatePost}
      className="rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-sm)] transition-all hover:border-border-strong sm:p-4"
    >
      {/* Row 1: Avatar and Text Input on the SAME row */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted text-xs font-bold text-foreground shadow-2xs">
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
          <label htmlFor="community-post-caption" className="sr-only">
            Share with your community
          </label>
          <textarea
            id="community-post-caption"
            ref={textareaRef}
            rows={isFocused || caption ? 3 : 2}
            placeholder={`Share a rehearsal moment, routine update, or stage highlight, ${currentUser.firstname}...`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full resize-none rounded-xl border bg-muted/30 px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground transition-all duration-200',
              'focus:bg-card focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
              isFocused || caption ? 'border-border shadow-inner' : 'border-border/50'
            )}
          />
        </div>
      </div>

      {/* Media Preview (if media selected) */}
      {mediaPreview && mediaFile && (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-border bg-black/40">
          {mediaFile.type.startsWith('video') ? (
            <video
              src={mediaPreview}
              controls
              playsInline
              className="mx-auto max-h-52 w-full bg-black object-contain"
            />
          ) : (
            <img
              src={mediaPreview}
              alt="Selected media preview"
              className="mx-auto max-h-52 w-full object-contain"
            />
          )}

          <div className="flex items-center justify-between border-t border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
              <span className="truncate">{mediaFile.name}</span>
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums">
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
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Clean Bottom Toolbar: Add Media, Posting Category, Share Post */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Media Button */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-border-strong hover:bg-muted active:scale-[0.98]">
            <ImageIcon className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Add Media</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="sr-only"
            />
          </label>

          {/* Posting Category Badge */}
          {community && (
            <span
              className={cn(
                'inline-flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                browsingTalentLabel && browsingTalentLabel !== community
                  ? 'border-warning/40 bg-warning-soft text-warning'
                  : 'border-border bg-muted/60 text-muted-foreground'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {browsingTalentLabel && browsingTalentLabel !== community ? (
                <span>
                  Posting to <strong className="font-semibold text-foreground">{community}</strong> Circle
                </span>
              ) : (
                <span>
                  Posting to: <strong className="font-semibold text-foreground">{community}</strong>
                </span>
              )}
            </span>
          )}
        </div>

        {/* Share Post Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
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
        <div role="alert" className="mt-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
    </form>
  );
}

export default PostComposer;