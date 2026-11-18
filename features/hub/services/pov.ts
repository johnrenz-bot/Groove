/**
 * Hub POV banner — pure selection logic, shared by the mini tracker and the
 * unit tests.
 *
 * The banner answers exactly one question for the viewer:
 *   "What do I do next — or who am I waiting on?"
 *
 * It is derived from the same `availableActions` the rest of the app uses.
 * The first primary action is the viewer's move; when there is none, the
 * sentence names the counterpart and the current status. Nothing here is
 * invented copy: `actions` arrive already role- and guard-aware.
 */

import type { HubRole } from '../types';

export interface PovAction {
  action: string;
  label: string;
  /** 'primary' is the move to feature; outline/ghost actions are overflow. */
  variant?: string;
}

export interface PovInput {
  status: string | null | undefined;
  role: HubRole;
  /** Display name of the opposite party, e.g. "Juan Dela Cruz". */
  counterpartName: string;
  /** Actions available to the viewer at this status (from bookingStatus). */
  actions: readonly PovAction[];
}

export interface PovResult {
  /** Full sentence, e.g. "Your turn: sign the agreement" or "Waiting on Coach One — agreement required". */
  headline: string;
  /** True when the viewer has an action to take right now. */
  isYourTurn: boolean;
  /** The primary action label, or null when none applies. */
  primaryAction: string | null;
}

const TERMINAL_OFF_PATH = ['declined', 'cancelled', 'expired', 'no_show'] as const;

export function povHeadline(input: PovInput): PovResult {
  const { status, counterpartName, actions } = input;

  if (status === 'completed') {
    return { headline: 'Session complete.', isYourTurn: false, primaryAction: null };
  }
  if (status && (TERMINAL_OFF_PATH as readonly string[]).includes(status)) {
    return {
      headline: 'This case is closed.',
      isYourTurn: false,
      primaryAction: null,
    };
  }

  const primary =
    actions.find((a) => a.variant === 'primary') ?? actions[0] ?? null;
  if (primary) {
    return {
      headline: `Your turn: ${primary.label}`,
      isYourTurn: true,
      primaryAction: primary.label,
    };
  }

  return {
    headline: `Waiting on ${counterpartName} - ${(status ?? 'in progress').replace(/_/g, ' ')}.`,
    isYourTurn: false,
    primaryAction: null,
  };
}
