/**
 * Hub board — pure transition rules, shared by the board and the unit tests.
 *
 * The board mirrors migration 37's guard (intersected with the actor policy),
 * never the other way around: a drop is only honoured when `canRoleDrop`
 * agrees, and the same matrix powers the keyboard-accessible "Move to..."
 * menu inside each card. Accept and Send agreement are the same action;
 * agreement creation is never a raw UPDATE.
 */
import type { HubRole } from '../types';

export interface BoardColumn {
  id: string;
  title: string;
  /** appointments.status values that belong to this column. */
  match: readonly string[];
  hint: string;
}

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  { id: 'requested', title: 'Requested', match: ['pending'], hint: 'New requests from clients' },
  { id: 'accepted', title: 'Accepted', match: ['accepted'], hint: 'Coach said yes - agreement being prepared' },
  { id: 'agreement', title: 'Agreement', match: ['agreement_required'], hint: 'Waiting for both signatures' },
  { id: 'confirmed', title: 'Confirmed', match: ['confirmed'], hint: 'Both sides signed' },
  { id: 'in_progress', title: 'In progress', match: ['in_progress'], hint: 'Session started' },
  { id: 'completed', title: 'Completed', match: ['completed'], hint: 'Sessions done' },
  { id: 'closed', title: 'Closed', match: ['declined', 'cancelled', 'expired', 'no_show'], hint: 'Declined, cancelled, expired, no-show' },
] as const;

export function bucketOf(status: string | null | undefined): string {
  for (const col of BOARD_COLUMNS) {
    if (status && col.match.includes(status)) return col.id;
  }
  return 'closed';
}

export function canRoleDrop(status: string | null | undefined, target: string, role: HubRole): boolean {
  if (!status) return false;
  const col = BOARD_COLUMNS.find((c) => c.id === target);
  if (!col) return false;

  if (role === 'coach') {
    // Mirror migration 37's guard CASE intersected with the actor policy:
    // pending → accepted|declined/cancelled; accepted → agreement_required|cancelled/declined;
    // agreement_required → confirmed|cancelled; confirmed → in_progress|completed|cancelled|no_show;
    // in_progress → completed|no_show. "Send agreement" is legal from accepted.
    if (status === 'pending') return target === 'accepted' || target === 'closed';
    if (status === 'accepted') return target === 'agreement' || target === 'closed';
    if (status === 'agreement_required') return target === 'confirmed' || target === 'closed';
    if (status === 'confirmed') return target === 'in_progress' || target === 'closed' || target === 'completed';
    if (status === 'in_progress') return target === 'completed' || target === 'closed';
    return false;
  }

  // Clients can only pull a live booking into Closed (cancel).
  if (['pending', 'accepted', 'agreement_required', 'confirmed'].includes(status)) {
    return target === 'closed';
  }
  return false;
}

export type MoveAction = 'accept' | 'decline' | 'start' | 'complete' | 'no_show' | 'cancel';

export interface MoveOption {
  target: string;
  label: string;
  action: MoveAction;
}

/**
 * Options for the card's "Move to..." keyboard menu. Mirrors canRoleDrop and
 * the button-driven flow: agreement creation stays button-driven, so the
 * agreement column is offered only via the Accept/Send agreement buttons.
 */
export function moveOptions(status: string | null | undefined, role: HubRole): MoveOption[] {
  if (!status) return [];
  const out: MoveOption[] = [];
  const push = (target: string, label: string, action: MoveAction) => {
    if (canRoleDrop(status, target, role)) out.push({ target, label, action });
  };

  if (role === 'coach') {
    if (status === 'pending') {
      push('accepted', 'Accept request', 'accept');
      push('closed', 'Decline request', 'decline');
    } else if (status === 'accepted') {
      push('closed', 'Decline request', 'decline');
    } else if (status === 'agreement_required') {
      push('closed', 'Cancel booking', 'cancel');
    } else if (status === 'confirmed') {
      push('in_progress', 'Start session', 'start');
      push('completed', 'Mark completed', 'complete');
      push('closed', 'Cancel booking', 'cancel');
    } else if (status === 'in_progress') {
      push('completed', 'Mark completed', 'complete');
      push('closed', 'Mark no-show', 'no_show');
    }
    return out;
  }

  // Client
  push('closed', 'Cancel booking', 'cancel');
  return out;
}
