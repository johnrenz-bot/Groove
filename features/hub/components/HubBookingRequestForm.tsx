'use client';

/**
 * Request a booking — client-only inline form.
 *
 * Same contract as the existing booking modal: one row in `appointments`
 * with status 'pending', same field meanings. The ONLY additions are:
 *   - autosave (localStorage, per coach) so an abandoned draft survives reloads
 *   - a live "Needs info" checklist (drives validation copy + the submit gate)
 *   - validation that matches the booking modal (gate + email + address)
 *
 * Nothing here runs on the server: the RLS owns who may insert; this form
 * only owns helping the user get a row that passes it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Circle, AlertCircle, Loader2, Send } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { createClient } from '@/lib/supabase/client';
import { bookingGate, verificationStatusOf } from '@/features/verification/services/verification';
import { explainBookingError } from '@/features/appointments/services/bookingService';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import { formatBookingDate, formatClock } from '@/features/appointments/services/bookingTime';
import type { Profile } from '@/lib/types';

export interface RequestDraft {
  talent: string;
  purpose: string;
  date: string;
  startTime: string;
  address: string;
  isOnline: boolean;
  experience: string;
  message: string;
}

const EMPTY: RequestDraft = {
  talent: '',
  purpose: '',
  date: '',
  startTime: '09:00',
  address: '',
  isOnline: false,
  experience: '',
  message: '',
};

const TALENT_SUGGESTIONS = ['Dance', 'Singing', 'Acting', 'Theater', 'Music', 'Speech'];

export function HubBookingRequestForm({
  clientProfile,
  coach,
  onCreated,
  onCancel,
}: {
  clientProfile: Profile;
  coach: Profile;
  onCreated: (reference: number | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RequestDraft>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const { notifySuccess } = useSuccessNotifications();

  // Autosave restore — scoped to this coach so drafts don't bleed across.
  const storageKey = `groove-hub-request-draft:${coach.id}`;
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          setDraft({ ...EMPTY, ...JSON.parse(raw) });
          setRestored(true);
        }
      } catch {
        /* private mode or corrupt blob — start clean */
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.id]);

  // Tiny debounced autosave — good enough; the platform is the source of truth.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        /* quota — draft does not persist; no error raised to the user */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [draft, storageKey]);

  // The coach's public service area, if published.
  const coachAddress = useMemo(() => {
    const c = coach as unknown as Record<string, string | null>;
    const parts = [c.city_name, c.province_name].map((p) => p?.trim()).filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(', ') : c.address_summary ?? '';
  }, [coach]);

  const gate = bookingGate(clientProfile);
  const coachName = [coach.firstname, coach.lastname].filter(Boolean).join(' ') || coach.username || 'this coach';
  const isDraftEqual = useMemo(() => JSON.stringify(draft) === JSON.stringify(EMPTY), [draft]);

  const checklist = useMemo(() => {
    const items = [
      { key: 'talent', label: 'Discipline chosen', done: Boolean(draft.talent.trim()) },
      { key: 'purpose', label: 'Goal stated', done: draft.purpose.trim().length >= 8 },
      { key: 'date', label: 'Date picked', done: Boolean(draft.date) },
      { key: 'time', label: 'Time picked', done: Boolean(draft.startTime) },
      { key: 'place', label: draft.isOnline ? 'Online confirmed' : 'Place stated', done: draft.isOnline || Boolean(draft.address.trim()) },
      { key: 'experience', label: 'Experience level chosen', done: Boolean(draft.experience.trim()) },
      { key: 'notes', label: 'Goal notes (optional)', done: Boolean(draft.message.trim()) },
    ];
    return items;
  }, [draft]);
  const missing = checklist.slice(0, 6).filter((i) => !i.done);
  const canSend = missing.length === 0 && gate.allowed && !submitting;

  const submit = async () => {
    if (!canSend) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to send a booking request.');

      const { data: clientRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const email = (clientRow as Record<string, string | null> | null)?.email ?? user.email ?? '';
      if (!email) throw new Error('Your account has no email address.');

      const finalAddress = draft.isOnline ? 'Online session' : draft.address.trim();
      const durationMinutes = 60; // matches the 1-hour default in the booking modal
      const [hh, mm] = draft.startTime.split(':').map(Number);
      const endHh = String(Math.floor(((hh ?? 9) * 60 + (mm ?? 0) + durationMinutes) / 60)).padStart(2, '0');
      const endMm = String(((mm ?? 0) + 0) % 60).padStart(2, '0');

      const { data: inserted, error: insertError } = await supabase
        .from('appointments')
        .insert({
          client_id: user.id,
          coach_id: coach.id,
          name:
            [clientRow?.firstname, clientRow?.lastname].filter(Boolean).join(' ').trim() ||
            clientRow?.username ||
            'Client',
          email,
          contact: email,
          experience: draft.experience.trim(),
          talent: draft.talent.trim(),
          session_type: 'Lesson',
          purpose: draft.purpose.trim(),
          message: draft.message.trim() || null,
          date: draft.date,
          start_time: draft.startTime,
          end_time: `${endHh}:${endMm}`,
          duration_minutes: durationMinutes,
          address: finalAddress,
          rate: null,
          location: draft.isOnline ? 'Online' : finalAddress,
          is_online: draft.isOnline,
          status: 'pending',
        })
        .select('id, appointment_id')
        .single();

      if (insertError) throw new Error(explainBookingError(insertError));

      const ref = typeof inserted?.appointment_id === 'number' ? inserted.appointment_id : null;

      // Notify the coach — same shape as the booking modal's insert.
      await supabase.from('notifications').insert({
        user_id: coach.id,
        title: 'New Session Request',
        message: `${clientRow?.firstname ?? 'A client'} requested a ${draft.talent} session on ${formatBookingDate(draft.date)} at ${formatClock(draft.startTime)}.`,
        cta_url: '/coach/messages',
      });

      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* storage blocked — fine */
      }
      notifySuccess({
        title: 'Booking request sent',
        description: `${coachName} has been notified for ${formatBookingDate(draft.date)}.${
          ref !== null ? ` Reference #${String(ref).padStart(5, '0')}.` : ''
        }`,
        icon: <Send className="h-4 w-4" aria-hidden="true" />,
        dedupeKey: `hub-request-${inserted?.id ?? ref ?? `${coach.id}-${draft.date}`}`,
        duration: 6000,
      });
      onCreated(ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          New booking request
        </p>
        <h2 className="mt-1 text-base font-bold text-foreground">Book a session with {coachName}</h2>
        {restored && (
          <p className="mt-1 text-[10px] text-accent-text">Restored your unsent draft.</p>
        )}
      </header>

      {!gate.allowed && (
        <div role="alert" className="mt-3 rounded-2xl border border-border bg-warning-soft px-3 py-2.5 text-[11px] leading-relaxed text-warning">
          Booking changes are locked.{' '}
          {verificationStatusOf(clientProfile) === 'rejected'
            ? 'Your verification was rejected — fix the documents in your profile so an administrator can review them again.'
            : 'Your account is not verified yet — complete verification from your profile before requesting sessions.'}
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Needs info checklist">
        {checklist.map((item) => (
          <li
            key={item.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold',
              item.done ? ' bg-success-soft text-success' : ' border border-border bg-muted text-muted-foreground'
            )}
          >
            {item.done ? <Check className="h-3 w-3" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
            {item.label}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Discipline</span>
          <input
            list="hub-talent-options"
            value={draft.talent}
            onChange={(e) => setDraft({ ...draft, talent: e.target.value })}
            placeholder="e.g. Dance"
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="hub-talent-options">
            {TALENT_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">What do you want to work on?</span>
          <textarea
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
            rows={2}
            minLength={8}
            placeholder="e.g. Get stage-ready for the barangay fiesta performance"
            className="mt-1 w-full resize-none rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Preferred date</span>
          <input
            type="date"
            value={draft.date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Time</span>
          <input
            type="time"
            value={draft.startTime}
            onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <fieldset className="block sm:col-span-2">
          <legend className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Where</legend>
          <div className="mt-1 flex gap-3 text-[11px]">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="hub-req-mode" checked={!draft.isOnline} onChange={() => setDraft({ ...draft, isOnline: false })} /> In person
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="hub-req-mode" checked={draft.isOnline} onChange={() => setDraft({ ...draft, isOnline: true })} /> Online
            </label>
          </div>
          {!draft.isOnline ? (
            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder={coachAddress || 'e.g. Star Studio, Tungkong Mangga'}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">The coach will send a link after accepting.</p>
          )}
        </fieldset>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Level (optional)</span>
          <select
            value={draft.experience}
            onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose…</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Professional">Professional</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notes (optional)</span>
          <textarea
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            rows={2}
            placeholder="Anything else they should know"
            className="mt-1 w-full resize-none rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl border border-border bg-danger-soft px-3 py-2 text-[11px] text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={onCancel} className="h-11 cursor-pointer rounded-full border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-accent px-4 text-xs font-bold text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {submitting ? 'Sending…' : 'Send request'}
        </button>
      </div>
      {isDraftEqual && (
        <p className="mt-2 text-[10px] text-subtle-foreground">Drafts save automatically as you type.</p>
      )}
    </div>
  );
}

