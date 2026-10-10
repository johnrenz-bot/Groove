'use client';

import React, { useState } from 'react';
import { X, Star, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface FeedbackModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FeedbackModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Please log in.');

      // Insert the review.
      //
      // appointment_id is appointments.id — the BIGINT identity primary key.
      // It was previously `appointment.appointment_id || appointment.id`, which
      // referenced the 5-digit human-facing booking reference and failed with
      // PGRST204 because public.feedbacks had no such column at all. The `||`
      // was also dead: both values are truthy for a real booking, so the
      // fallback could never be reached.
      const { data: feedbackData, error: insertError } = await supabase.from('feedbacks').insert({
        appointment_id: appointment.id,
        coach_id: appointment.coach_id,
        user_id: user.id,
        rating,
        comment,
      }).select('id').single();

      if (insertError) throw insertError;
      const feedbackId = feedbackData?.id;

      // Mirror the review onto the booking so the coach's session list shows it.
      //
      // This write's error was previously discarded entirely, which allowed a
      // half-finished review: the row in feedbacks existed while the booking
      // showed no rating, and retrying created a SECOND feedbacks row because
      // there is no unique constraint on the pair.
      //
      // So the two outcomes are reported honestly and separately. If this fails
      // the review is already saved and must not be retried blindly.
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          rating,
          feedback: comment,
        })
        .eq('id', appointment.id);

      if (appointmentError) {
        throw new Error(
          `Your review was saved, but the session summary could not be updated (${appointmentError.message}). Please contact support — do not submit the review again, or it will be recorded twice.`
        );
      }

      // Notify the coach. Best-effort: the review is already durable, so a
      // failed notification must not present the whole action as failed. It is
      // logged so it is still visible.
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: appointment.coach_id,
        title: 'New Session Review Received',
        message: `Client ${appointment.name} left you a ${rating}-star review with feedback.`,
        cta_url: '/coach/profile',
      });
      if (notifyError) {
        console.error('Review saved, but the coach notification failed:', notifyError.message);
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      // Update achievements after review submission
      const isFiveStar = rating === 5;
      try {
        const { updateAchievementsAfterReviewSubmitted } = await import('@/app/actions/achievements');
        await updateAchievementsAfterReviewSubmitted(user.id, 'client', feedbackId, isFiveStar);
        // Also update coach achievements if it's a 5-star review
        if (isFiveStar) {
          await updateAchievementsAfterReviewSubmitted(appointment.coach_id, 'coach', feedbackId, true);
        }
      } catch (e) {
        console.error('Failed to update achievements:', e);
      }

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md transition-opacity duration-200 sm:p-5 animate-in fade-in select-none sm:select-text"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Leave Session Feedback"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl animate-in zoom-in-95 duration-200 sm:rounded-3xl">
        {/* Fixed Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-divider bg-card px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-warning-soft text-warning shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">
                Leave Session Review
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {appointment.session_type || 'Coaching Session'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="g-scroll flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-success/30 bg-success-soft text-success shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-foreground">Review Submitted!</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Thank you for supporting our performing arts coaches on the Groove Platform.
              </p>
            </div>
          ) : (
            <form id="feedback-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center space-y-2">
                <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Rate your experience
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'fill-amber-400 text-warning'
                            : 'text-border'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-accent-text">
                  {rating === 5 && 'Outstanding! ⭐⭐⭐⭐⭐'}
                  {rating === 4 && 'Great Experience! ⭐⭐⭐⭐'}
                  {rating === 3 && 'Good Session ⭐⭐⭐'}
                  {rating === 2 && 'Needs Improvement ⭐⭐'}
                  {rating === 1 && 'Poor ⭐'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Your Testimonial &amp; Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share how the coach helped you improve your technique, choreography, vocal range..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="g-input w-full p-3 resize-none text-xs leading-relaxed"
                />
              </div>
            </form>
          )}
        </div>

        {/* Sticky Footer */}
        {!success && (
          <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-divider bg-muted/40 px-5 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="feedback-form"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:bg-accent-hover disabled:opacity-50 transition cursor-pointer min-h-[38px] shadow-sm flex items-center gap-1.5"
            >
              {loading ? 'Submitting...' : 'Post Review'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
