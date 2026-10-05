'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Calendar, Clock, MapPin, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { FullCoach, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { bookingGate, coachBookingGate, type VerificationGate } from '@/lib/verification';
import { Button } from '@/components/ui/Button';

interface BookingModalProps {
  coach: FullCoach;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingModal({ coach, isOpen, onClose, onSuccess }: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [sessionType, setSessionType] = useState('Face to Face Rehearsal');
  const [talent, setTalent] = useState(coach.coach_profile?.talents?.split(',')[0] || 'Dance');
  const [experience, setExperience] = useState('Beginner');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');

  // The booking gate, resolved from real profile rows.
  //
  // The cards already block unverified users before this modal opens, but that is
  // only a UI affordance — a direct call, a stale card, or an account whose
  // verification was revoked since the page loaded would all still land here. So
  // the modal resolves both participants itself and refuses to submit unless both
  // are verified. The appointments RLS policy and `guard_booking_confirmation`
  // enforce the same rule at the data layer; this is the message the user sees.
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [gateResolved, setGateResolved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (!cancelled) setClientProfile((profile as Profile) ?? null);
      } catch {
        // A failed lookup must not read as "verified": leave the profile null,
        // which the gate treats as blocked.
        if (!cancelled) setClientProfile(null);
      } finally {
        if (!cancelled) setGateResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Until the lookup resolves, the form must not be submittable — otherwise the
  // first render would flash a form for an account whose state is still unknown.
  if (isOpen && !gateResolved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="g-spin h-6 w-6 text-accent" aria-hidden="true" />
          <span>Checking verification status…</span>
        </div>
      </div>
    );
  }

  const clientCheck = bookingGate(clientProfile);
  const coachCheck = coachBookingGate(coach);
  const gate: VerificationGate = !clientCheck.allowed
    ? clientCheck
    : !coachCheck.allowed
      ? {
          allowed: false,
          reason:
            'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.',
          ctaHref: null,
        }
      : { allowed: true, reason: null, ctaHref: null };

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

      if (!user) {
        throw new Error('Please login to book an appointment.');
      }

      // Fetch client profile
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const clientName = clientProfile
        ? `${clientProfile.firstname} ${clientProfile.lastname}`.trim()
        : user.email || 'Client';

      // Re-checked against the freshly-read row, not the state loaded when the
      // modal opened: verification can be revoked in between, and the write below
      // is rejected by the database in that case with a message no user can act on.
      const submitGate = bookingGate((clientProfile as Profile) ?? null);
      if (!submitGate.allowed) {
        throw new Error(submitGate.reason ?? 'Your account is not verified yet.');
      }
      if (!coach.account_verified) {
        throw new Error(
          'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.'
        );
      }

      // appointments.email is NOT NULL with no database default. Supabase Auth
      // already holds the authoritative address, so it is read from the session
      // rather than invented by the database or typed into a form field the
      // member might get wrong.
      //
      // Guarded rather than defaulted to '' on purpose: an empty string would
      // satisfy NOT NULL and quietly store a booking with no email, which is
      // worse than refusing it, and an unguarded undefined would surface as an
      // opaque not-null violation the member cannot act on.
      if (!user.email) {
        throw new Error(
          'Your account has no email address, which is required for a booking. Please add one in your profile settings.'
        );
      }

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert({
          coach_id: coach.id,
          client_id: user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          session_type: sessionType,
          talent,
          experience,
          purpose,
          message,
          address,
          contact,
          status: 'pending',
          name: clientName,
          email: user.email,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for coach
      await supabase.from('notifications').insert({
        user_id: coach.id,
        title: 'New Session Request Received',
        message: `${clientName} sent a booking request for ${talent} on ${date} at ${startTime}.`,
        cta_url: '/coach/appointments',
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create appointment.';
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
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl text-foreground"
      >
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Book Session with Coach {coach.firstname}</h3>
              <p className="text-xs text-muted-foreground">
                Rate: ₱{coach.coach_profile?.service_fee ?? 500} / session • San Jose del Monte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close booking modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Blocked state. Shown in place of the form rather than as a toast, so
            the modal cannot be submitted into a guaranteed failure. */}
        {!gate.allowed && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning-soft text-warning">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-foreground">Booking unavailable</h4>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {gate.reason}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {gate.ctaHref && (
                <Link href={gate.ctaHref}>
                  <Button icon={<ShieldCheck className="h-4 w-4" />}>
                    Go to my profile
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {error && gate.allowed && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl border border-danger/30/30 bg-danger/10 text-danger dark:text-danger text-xs sm:text-sm flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-success/15 border border-success/30/25 flex items-center justify-center mx-auto text-success dark:text-success animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-success dark:text-success">Appointment Request Sent!</h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Coach {coach.firstname} will review your rehearsal request. Track your session status under Appointments.
            </p>
          </div>
        ) : gate.allowed ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Session Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-muted border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none transition cursor-pointer"
                >
                  <option value="Face to Face Rehearsal">Face to Face Rehearsal</option>
                  <option value="Online 1-on-1 Coaching">Online 1-on-1 Coaching</option>
                  <option value="Studio Workshop">Studio Workshop</option>
                  <option value="Choreography Routine">Choreography Routine</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Talent Category
                </label>
                <select
                  value={talent}
                  onChange={(e) => setTalent(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none transition cursor-pointer"
                >
                  <option value="Dance">Dance</option>
                  <option value="Singing">Singing</option>
                  <option value="Acting">Acting</option>
                  <option value="Theater">Theater</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                  Your Experience Level
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none transition cursor-pointer"
                >
                  <option value="Beginner">Beginner (First time / basic)</option>
                  <option value="Intermediate">Intermediate (Practicing / 1-3 yrs)</option>
                  <option value="Advanced">Advanced (Performing / 3+ yrs)</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                Preferred Studio or Location (San Jose del Monte) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Star Studio, Tungkong Mangga, San Jose del Monte"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                Contact Number *
              </label>
              <input
                type="tel"
                required
                placeholder="09123456789"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                Session Purpose &amp; Goals *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Audition prep, learning specific choreography, vocal range extension..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
                Additional Notes / Message (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any special requests, audio tracks, or guidelines for the coach..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none transition text-sm"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted text-foreground font-semibold text-xs transition cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 disabled:opacity-50 transition cursor-pointer min-h-[40px] shadow-md"
              >
                {loading ? 'Submitting Request...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
export default BookingModal;
