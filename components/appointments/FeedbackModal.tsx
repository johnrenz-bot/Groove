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
      const { error: insertError } = await supabase.from('feedbacks').insert({
        appointment_id: appointment.id,
        coach_id: appointment.coach_id,
        user_id: user.id,
        rating,
        comment,
      });

      if (insertError) throw insertError;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl text-foreground"
      >
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-bold text-foreground">Leave Session Feedback</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl border border-danger/30/30 bg-danger/10 text-danger dark:text-danger text-xs flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-success/15 border border-success/30/25 flex items-center justify-center mx-auto text-success dark:text-success animate-bounce">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="text-lg font-bold text-success dark:text-success">Review Submitted!</h4>
            <p className="text-xs text-muted-foreground">
              Thank you for supporting our performing arts coaches on Groove.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-2">
              <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Rate your coaching experience
              </label>
              <div className="flex items-center justify-center gap-2 py-2">
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
                      className={`h-8 w-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-warning'
                          : 'text-border'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-warning dark:text-warning">
                {rating === 5 && 'Outstanding! ⭐⭐⭐⭐⭐'}
                {rating === 4 && 'Great Experience! ⭐⭐⭐⭐'}
                {rating === 3 && 'Average / Good ⭐⭐⭐'}
                {rating === 2 && 'Needs Improvement ⭐⭐'}
                {rating === 1 && 'Poor ⭐'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                Your Testimonial &amp; Constructive Feedback *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Share how the coach helped you improve your performance, communication, technique..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none text-sm transition"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-warning text-black font-bold text-xs hover:bg-warning disabled:opacity-50 transition cursor-pointer min-h-[40px] shadow-sm"
              >
                {loading ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
