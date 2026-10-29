'use client';

import React, { useState } from 'react';
import { Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal, ModalSection, ModalCard } from '@/components/ui/Modal';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';

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
  const { notifySuccess } = useSuccessNotifications();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

      const { data: feedbackData, error: insertError } = await supabase.from('feedbacks').insert({
        appointment_id: appointment.id,
        coach_id: appointment.coach_id,
        user_id: user.id,
        rating,
        comment,
      }).select('id').single();

      if (insertError) throw insertError;
      const feedbackId = feedbackData?.id;

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

      notifySuccess({
        title: 'Review submitted',
        description: `Your ${rating}-star review is saved and has been shared with your coach.`,
        icon: <Star className="h-4 w-4" fill="currentColor" aria-hidden="true" />,
        dedupeKey: `review-submitted-${appointment.id}-${user.id}`,
        duration: 6000,
      });

      if (onSuccess) onSuccess();

      const isFiveStar = rating === 5;
      try {
        const { updateAchievementsAfterReviewSubmitted } = await import('@/app/actions/achievements');
        await updateAchievementsAfterReviewSubmitted(user.id, 'client', feedbackId);
        if (isFiveStar) {
          await updateAchievementsAfterReviewSubmitted(appointment.coach_id, 'coach', feedbackId);
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
    <Modal
      open={isOpen}
      onClose={onClose}
      animated
      size="sm"
      title="Leave Session Review"
      description={appointment.session_type || 'Coaching Session'}
      footer={
        !success && (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="feedback-form"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Post Review'}
            </Button>
          </>
        )
      }
    >
      <ModalSection className="space-y-4">
        {error && (
          <ModalCard className="border-danger/30 bg-danger-soft text-danger">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </ModalCard>
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
            <ModalCard className="text-center space-y-2">
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
            </ModalCard>

            <div className="space-y-1.5">
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
      </ModalSection>
    </Modal>
  );
}
