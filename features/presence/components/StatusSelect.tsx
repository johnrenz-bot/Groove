'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { SELF_ASSIGNABLE, statusMeta, type Presence } from '../utils/presence';
import { usePresence, useSetPresence } from '../hooks/usePresence';

/**
 * Presence selector for coaches and clients.
 *
 * This writes the column that already exists — `public.profiles.status`, a
 * `user_status` enum — rather than adding one. It is the same field the header
 * already touched on sign-out (`AppTopNav.handleLogout` writes `status:
 * 'offline'`), so this control completes a half-built feature instead of
 * introducing a parallel one.
 *
 * WHY ONLY FOUR OF THE SEVEN ENUM VALUES
 *   The enum carries seven values, but three of them are not presence:
 *   `pending` and `suspended` are lifecycle states owned by verification and
 *   moderation, and `active` is the enum default rather than something a user
 *   picks. A coach choosing "Active" would be writing a value that means
 *   something else to every other reader of the column. So the control offers
 *   exactly the four values a person can meaningfully set for themselves:
 *   online, away, busy, offline — in that order, most-available first.
 *
 * LIVE, NOT JUST SAVED
 *   The current value is read from the shared realtime store, so this selector
 *   agrees with every other presence surface in the app, and a change made in
 *   another tab or on another page is reflected here without a refresh.
 *
 * NOT OPTIMISTIC BEFORE THE WRITE
 *   The chosen value is applied only after Supabase confirms the row was really
 *   updated. A dot that says "Online" on a row the database refused is a lie, and
 *   the common failure here is permanent (an RLS policy), so a rollback would
 *   only flicker. While saving, every option is disabled so a double click cannot
 *   queue two writes.
 */

/** The indicator, shared by the option rows and the account trigger. */
export function PresenceDot({
  status,
  size = 'md',
}: {
  status: Presence | string | null | undefined;
  /** `sm` for the badge on an avatar, `md` for an option row. */
  size?: 'sm' | 'md';
}) {
  const meta = statusMeta(status);
  return (
    <span
      className={`g-presence-dot g-presence-dot--${meta.value}${
        size === 'sm' ? ' g-presence-dot-sm' : ''
      }`}
      role="img"
      aria-label={`Status: ${meta.label}`}
      title={`Status: ${meta.label}`}
    />
  );
}

/**
 * The collapsed presence control: one row showing ONLY the current status,
 * which opens the option list when activated.
 *
 * The previous version rendered all four options permanently. That is a lot of
 * permanent surface for a value that changes rarely, and it pushed the rest of
 * the account panel down. So the trigger is a single menu item — "● Online" —
 * and the four options only exist while the submenu is open.
 *
 * The trigger keeps `aria-haspopup` and `aria-expanded` so assistive tech
 * announces the relationship, and the option list is a real `radiogroup` with
 * roving tabindex, which is the honest pattern for "exactly one of these is
 * active".
 */
export function StatusSelect({
  userId,
  fallbackStatus,
}: {
  userId: string;
  /** The value from the caller's own fetched row, for the first paint. */
  fallbackStatus?: string | null;
}) {
  const current = usePresence(userId, fallbackStatus);
  const save = useSetPresence(userId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = statusMeta(current);

  const choose = async (next: Presence) => {
    if (next === current || saving) return;
    // Close immediately: the menu has done its job, and leaving it open over a
    // panel the user is about to leave is noise. The row keeps the spinner until
    // the write resolves, so the pending state is still visible on the trigger.
    setOpen(false);
    setSaving(true);
    setError(null);
    try {
      await save(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Your status could not be changed. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-presence">
      {/* The trigger. A <button> rather than a summary of a <details>, because
          the panel it opens is a radiogroup rather than a document section, and
          it needs to control its own open state for the Escape handling. */}
      <button
        type="button"
        className="g-presence-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={`Status: ${meta.label} — change`}
      >
        <PresenceDot status={current} />
        <span className="g-presence-trigger-label">{meta.label}</span>
        {saving ? (
          <Loader2 className="g-spin h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown
            className={`g-presence-caret ${open ? 'g-presence-caret-open' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="g-presence-menu" role="radiogroup" aria-label="Your status">
          {SELF_ASSIGNABLE.map(({ value, label, hint }) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                // One tab stop for the group; arrow keys move within it natively.
                tabIndex={active ? 0 : -1}
                onClick={() => void choose(value)}
                className="g-presence-option"
                data-active={active || undefined}
                title={hint}
              >
                <PresenceDot status={value} />
                <span className="g-presence-label">{label}</span>
                {active && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {/* role="status" so a failure is announced without stealing focus. */}
      {error && (
        <p role="status" className="g-presence-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default StatusSelect;