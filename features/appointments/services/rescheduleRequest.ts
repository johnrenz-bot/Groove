/**
 * The reschedule REQUEST format.
 *
 * WHY THIS EXISTS
 *   The database has `appointments.changes_requested_at` and
 *   `appointments.requested_changes_note` (migration 02) but no
 *   `rescheduled` status in `appointment_status`, and no reschedule RPC. The
 *   honest frontend implementation is therefore a REQUEST: the client records
 *   the time they would like, and the coach approves it by updating the
 *   booking's date/time through the participant UPDATE policy.
 *
 *   The note column is free text, so the request is stored as a small tagged
 *   JSON object. That keeps the desired time machine-readable for the coach's
 *   approve control, and falls back to showing the raw note if an older row (or
 *   a future hand-written note) is not in this format.
 *
 * Nothing here writes to the database; see `requestReschedule` and
 * `approveReschedule` in bookingService.ts.
 */

export const RESCHEDULE_PREFIX = 'GROOVE_RESCHEDULE_V1:';

export interface RescheduleRequest {
  requestedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  /** Kept so approval can update `duration_minutes` in step with the end time. */
  durationMinutes: number | null;
  reason: string | null;
  requestedAt: string | null;
}

export interface RescheduleDraft {
  requestedDate: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  reason: string;
}

export function encodeRescheduleRequest(
  draft: RescheduleDraft,
  requestedAt: string
): string {
  return (
    RESCHEDULE_PREFIX +
    JSON.stringify({
      date: draft.requestedDate,
      start: draft.startTime,
      end: draft.endTime,
      duration: draft.durationMinutes ?? null,
      reason: draft.reason.trim() || null,
      requested_at: requestedAt,
    })
  );
}

/**
 * Read a stored note. Returns null when the note contains no usable request.
 * A plain-text legacy note is still surfaced as a reason, with no date — the UI
 * then says "the requested time was not recorded" rather than guessing one.
 */
export function parseRescheduleRequest(
  note: string | null | undefined,
  requestedAt?: string | null
): RescheduleRequest | null {
  if (!note || !note.trim()) return null;

  if (note.startsWith(RESCHEDULE_PREFIX)) {
    try {
      const parsed = JSON.parse(note.slice(RESCHEDULE_PREFIX.length)) as Record<
        string,
        unknown
      >;
      const date = typeof parsed.date === 'string' ? parsed.date.slice(0, 10) : null;
      const start = typeof parsed.start === 'string' ? parsed.start : null;
      const end = typeof parsed.end === 'string' ? parsed.end : null;
      const duration =
        typeof parsed.duration === 'number' &&
        Number.isFinite(parsed.duration) &&
        parsed.duration > 0
          ? Math.round(parsed.duration)
          : null;
      const reason = typeof parsed.reason === 'string' ? parsed.reason : null;
      const stamp =
        typeof parsed.requested_at === 'string' ? parsed.requested_at : requestedAt ?? null;

      if (!date && !start && !reason) return null;
      return {
        requestedDate: date,
        startTime: start,
        endTime: end,
        durationMinutes: duration,
        reason,
        requestedAt: stamp,
      };
    } catch {
      // Fall through to the legacy plain-text path.
    }
  }

  return {
    requestedDate: null,
    startTime: null,
    endTime: null,
    durationMinutes: null,
    reason: note.trim(),
    requestedAt: requestedAt ?? null,
  };
}

/** True when the booking carries an unanswered request. */
export function hasPendingReschedule(appointment: {
  changes_requested_at?: string | null;
  requested_changes_note?: string | null;
}): boolean {
  return Boolean(appointment.changes_requested_at || appointment.requested_changes_note);
}
