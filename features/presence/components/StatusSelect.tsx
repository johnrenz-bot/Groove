'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const meta = statusMeta(current);

  const focusOption = useCallback((index: number) => {
    const count = SELF_ASSIGNABLE.length;
    const next = ((index % count) + count) % count;
    optionRefs.current[SELF_ASSIGNABLE[next].value]?.focus();
  }, []);

  /**
   * Open the list, focus the selected row, and dismiss on Escape or a click
   * outside. `role="radio"` on a button does not inherit native arrow handling,
   * so the menu below manages focus itself.
   */
  useEffect(() => {
    if (!open) return;
    const selected = SELF_ASSIGNABLE.findIndex((option) => option.value === current);
    const timer = window.setTimeout(() => focusOption(Math.max(0, selected)), 0);

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, current, focusOption]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = SELF_ASSIGNABLE.map((option) => optionRefs.current[option.value]).filter(
      (node): node is HTMLButtonElement => Boolean(node)
    );
    const active = buttons.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(active + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(active <= 0 ? SELF_ASSIGNABLE.length - 1 : active - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(SELF_ASSIGNABLE.length - 1);
        break;
    }
  };

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
    <div
      className="g-presence"
      ref={containerRef}
      onKeyDown={(event) => {
        // Handled here rather than on `document` so Escape closes the status
        // list first; the drawer's own document listener would otherwise close
        // the whole sheet at the same time.
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      {/* The trigger. A <button> rather than a summary of a <details>, because
          the panel it opens is a radiogroup rather than a document section, and
          it needs to control its own open state for the Escape handling. */}
      <button
        ref={triggerRef}
        type="button"
        className="g-presence-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
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
        <div
          className="g-presence-menu"
          role="radiogroup"
          aria-label="Your status"
          onKeyDown={onMenuKeyDown}
        >
          {SELF_ASSIGNABLE.map(({ value, label, hint }) => {
            const active = current === value;
            return (
              <button
                key={value}
                ref={(node) => {
                  optionRefs.current[value] = node;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                // One tab stop for the group; the arrow keys handled above move
                // focus within it and Enter/Space select.
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