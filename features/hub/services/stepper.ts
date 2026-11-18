'use client';
/**
 * Sign-offs stepper - pure derivation.
 *
 * Seven semantic steps per role over the booking lifecycle. The authority is
 * the guard's transition table (migration 37) as mirrored by `buildTimeline`;
 * this module only maps it into POV steps and NEVER invents state:
 *
 *   - A step is 'done' when its stage was actually reached (stamped, or ahead
 *     of a skip on the happy path).
 *   - A step is 'current' when it is the first not-yet-done happy step.
 *   - A step is 'upcoming' beyond that.
 *   - A step is 'terminal' when the booking failed before reaching it - and in
 *     that case it is the ONLY red step; every later step is 'notApplicable'.
 *   - A step is 'skipped' when the booking completed with no session start
 *     stamp (the guard has no such transition, so this means manual fill).
 *
 * Timestamps come from booking stamps (preferred, stamped by the guard) or,
 * for the request step, appointments.created_at, or the agreement's own
 * client/coach signature timestamps for the signature step.
 */
import type { HubRole } from '../types';
import { buildTimeline, type AppointmentStatus } from '../../appointments/services/bookingStatus.ts';
import { SEP_DOT } from '../../../lib/typography.ts';
export type StepState = 'done' | 'current' | 'upcoming' | 'skipped' | 'terminal' | 'notApplicable';
export type StepId =
  | 'request'
  | 'review'
  | 'agreement'
  | 'signed'
  | 'confirmed'
  | 'session'
  | 'outcome';
export interface StepperAgreementShape {
  created_at?: string | null;
  client_signed_at?: string | null;
  coach_signed_at?: string | null;
  countersigned_at?: string | null;
}
export interface StepperInput {
  status: string | null | undefined;
  /** Stamps keyed by stage name (accepted, agreement_required, ...). */
  stamps: Partial<Record<string, string | null>>;
  /** appointments.created_at - for the request step. */
  createdAt: string | null;
  agreement: StepperAgreementShape | null;
  /** appointments.feedback presence implies the client left a review. */
  feedback?: string | null;
  /** names by participant id for the actor line. */
  names?: Readonly<Record<string, string>>;
  clientId: string;
  coachId: string;
  viewerId: string;
}
export interface StepperStep {
  id: StepId;
  label: string;
  actorName: string;
  /** ISO timestamp the step reached, or null. */
  at: string | null;
  state: StepState;
  /** Which participant's photo renders (system steps render the Groove tone). */
  avatarRole: 'client' | 'coach' | 'system';
  /** Optional hint rendered under the label for the current/terminal step. */
  hint: string | null;
}
const TERMINAL_NEGATIVE = new Set(['declined', 'cancelled', 'expired', 'no_show']);
export const STEPPER_LABELS: Record<HubRole, readonly string[]> = {
  client: ['Request sent', 'Coach review', 'Agreement', 'Signed', 'Confirmed', 'Session', 'Review'],
  coach: ['Request received', 'Review', 'Agreement', 'Signed', 'Confirmed', 'Session', 'Completed'],
} as const;
export function deriveStepperSteps(input: StepperInput): StepperStep[] {
  const { status, stamps, createdAt, agreement, feedback, names, clientId, coachId, viewerId } = input;
  const role: HubRole = viewerId === coachId ? 'coach' : 'client';
  const clientName = nameOf(names, clientId, 'Client');
  const coachName = nameOf(names, coachId, 'Coach');
  const timeline = buildTimeline(status, stamps);
  const reached = new Map(timeline.map((s) => [s.status, s.reached] as const));
  const terminal = Boolean(status && TERMINAL_NEGATIVE.has(status));
  const requestAt = createdAt ?? null;
  const acceptedAt = stamps.accepted ?? null;
  const agreementAt = stamps.agreement_required ?? agreement?.created_at ?? null;
  const signedAt =
    agreement?.client_signed_at && agreement?.coach_signed_at
      ? maxIso(agreement.client_signed_at, agreement.coach_signed_at)
      : stamps.confirmed ?? null;
  const confirmedAt = stamps.confirmed ?? null;
  const sessionAt = stamps.in_progress ?? stamps.completed ?? null;
  const completedAt = stamps.completed ?? null;
  const template: Array<Omit<StepperStep, 'state' | 'hint'>> = role === 'coach'
    ? [
        { id: 'request', label: STEPPER_LABELS.coach[0], actorName: clientName, at: requestAt, avatarRole: 'client' },
        { id: 'review', label: STEPPER_LABELS.coach[1], actorName: coachName, at: acceptedAt, avatarRole: 'coach' },
        { id: 'agreement', label: STEPPER_LABELS.coach[2], actorName: coachName, at: agreementAt, avatarRole: 'coach' },
        { id: 'signed', label: STEPPER_LABELS.coach[3], actorName: `${clientName} ${SEP_DOT} ${coachName}`, at: signedAt, avatarRole: 'client' },
        { id: 'confirmed', label: STEPPER_LABELS.coach[4], actorName: 'Groove System', at: confirmedAt, avatarRole: 'system' },
        { id: 'session', label: STEPPER_LABELS.coach[5], actorName: coachName, at: sessionAt, avatarRole: 'coach' },
        { id: 'outcome', label: STEPPER_LABELS.coach[6], actorName: coachName, at: completedAt, avatarRole: 'coach' },
      ]
    : [
        { id: 'request', label: STEPPER_LABELS.client[0], actorName: clientName, at: requestAt, avatarRole: 'client' },
        { id: 'review', label: STEPPER_LABELS.client[1], actorName: coachName, at: acceptedAt, avatarRole: 'coach' },
        { id: 'agreement', label: STEPPER_LABELS.client[2], actorName: coachName, at: agreementAt, avatarRole: 'coach' },
        { id: 'signed', label: STEPPER_LABELS.client[3], actorName: `${clientName} ${SEP_DOT} ${coachName}`, at: signedAt, avatarRole: 'coach' },
        { id: 'confirmed', label: STEPPER_LABELS.client[4], actorName: 'Groove System', at: confirmedAt, avatarRole: 'system' },
        { id: 'session', label: STEPPER_LABELS.client[5], actorName: coachName, at: sessionAt, avatarRole: 'coach' },
        { id: 'outcome', label: STEPPER_LABELS.client[6], actorName: clientName, at: feedback || status === 'completed' ? completedAt : null, avatarRole: 'client' },
      ];
  // Per-step happy-stage gate. null -> decided by doneFor's own rules.
  const doneByStage: Array<AppointmentStatus | null> = [
    null,
    'accepted',
    'agreement_required',
    'confirmed',
    'confirmed',
    'in_progress',
    status === 'completed' ? 'completed' : null,
  ];
  const doneFor = (index: number): boolean => {
    if (index === 0) return true;
    if (index === 3) return Boolean(signedAt);
    // Session done when it started - or the guard marked the case complete.
    if (index === 5) return Boolean(reached.get('in_progress')) || status === 'completed';
    // Outcome: coach is done at completion; the client's Review step only
    // closes when feedback exists.
    if (index === 6) {
      if (role === 'coach') return status === 'completed';
      return status === 'completed' ? Boolean(feedback) : false;
    }
    const stage = doneByStage[index];
    return stage ? Boolean(reached.get(stage)) : false;
  };
  const firstOpen = firstOpenIndex(template.length, doneFor);
  const out: StepperStep[] = [];
  let terminalInserted = false;
  for (let i = 0; i < template.length; i += 1) {
    const step = template[i];
    if (!terminal) {
      const done = doneFor(i);
      const skipped = i === 5 && status === 'completed' && !stamps.in_progress;
      out.push({
        ...step,
        state: skipped ? 'skipped' : done ? 'done' : i === firstOpen ? 'current' : 'upcoming',
        hint: skipped ? 'No start stamp on file.' : null,
      });
      continue;
    }
    // Terminal-negative: exactly one red step at the point of failure.
    const stage = doneByStage[i];
    const wasReached = stage ? Boolean(reached.get(stage)) : i === 0;
    if (wasReached && !terminalInserted) {
      out.push({ ...step, state: 'done', hint: null });
      continue;
    }
    if (!terminalInserted) {
      terminalInserted = true;
      out.push({
        ...step,
        at: stamps[String(status)] ?? completedAt ?? null,
        state: 'terminal',
        hint: terminalHint(status),
      });
      continue;
    }
    out.push({ ...step, at: null, state: 'notApplicable', hint: null });
  }
  return out;
}
function firstOpenIndex(len: number, doneFor: (i: number) => boolean): number {
  for (let i = 0; i < len; i += 1) if (!doneFor(i)) return i;
  return len; // everything done
}
function nameOf(
  names: StepperInput['names'],
  id: string | null | undefined,
  fallback: string
): string {
  return (id && names?.[id]) || fallback;
}
function maxIso(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}
function terminalHint(status: string | null | undefined): string {
  switch (status) {
    case 'declined':
      return 'The coach declined this request.';
    case 'cancelled':
      return 'This booking was cancelled.';
    case 'expired':
      return 'The time passed without a response.';
    case 'no_show':
      return 'The student did not show up.';
    default:
      return 'This case is closed.';
  }
}
