/**
 * Presence — the one definition of what an account's `status` means.
 *
 * The column already exists: `public.profiles.status`, a `user_status` enum
 * declared in supabase/schema.sql as
 *   ('active','pending','suspended','offline','online','busy','away')
 * Nothing here adds a column or a table; this module only interprets the one
 * that is already there.
 *
 * WHY ONLY FOUR OF THE SEVEN ARE USER-ASSIGNABLE
 *   `pending` and `suspended` are lifecycle states owned by verification
 *   (rejecting a submission sets `pending`) and moderation. `active` is the enum
 *   default rather than a choice. Exposing those would let a member overwrite a
 *   state another subsystem owns — and moderation reads `status = 'suspended'`
 *   to cut an account off, so a self-assignable `suspended` would be a lockout
 *   primitive. So SELF_ASSIGNABLE is exactly the four presence values.
 *
 * `displayStatus` still handles all seven, because an admin list must render
 * whatever a moderator or the signup flow actually wrote.
 */

import type { UserStatus } from '@/lib/types';

export type Presence = 'online' | 'away' | 'busy' | 'offline';

export interface StatusMeta {
  value: Presence;
  label: string;
  /** What this status means, for the tooltip and the menu hint. */
  hint: string;
  /**
   * Whether the person can be reached right now. `offline` and `busy` are both
   * present-but-unavailable, which is what `canBeMessaged`-style logic wants;
   * only `offline` is the absence of presence.
   */
  available: boolean;
}

/** Most-available first — the order a person scans. */
export const SELF_ASSIGNABLE: StatusMeta[] = [
  {
    value: 'online',
    label: 'Online',
    hint: 'Visible and open to messages',
    available: true,
  },
  { value: 'away', label: 'Away', hint: 'Here, but not taking bookings', available: true },
  { value: 'busy', label: 'Busy', hint: 'Do not disturb', available: false },
  { value: 'offline', label: 'Offline', hint: 'Not available', available: false },
];

const BY_VALUE = new Map(SELF_ASSIGNABLE.map((m) => [m.value, m]));

export function isSelfAssignable(value: unknown): value is Presence {
  return typeof value === 'string' && BY_VALUE.has(value as Presence);
}

/**
 * Normalise any stored enum value to something presence UI can render.
 *
 * A value outside the four presence states (`pending`, `suspended`, `active`,
 * or a row written before the enum) is shown as `offline`. That is deliberate:
 * the alternative is to invent a fifth colour for lifecycle states, which would
 * make "offline" mean two different things.
 */
export function displayStatus(value: UserStatus | string | null | undefined): Presence {
  return isSelfAssignable(value) ? value : 'offline';
}

export function statusMeta(value: UserStatus | string | null | undefined): StatusMeta {
  return BY_VALUE.get(displayStatus(value))!;
}

/** Human label for any stored value, including lifecycle ones. */
export function statusLabel(value: UserStatus | string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return 'Unknown';
  if (isSelfAssignable(text)) return statusMeta(text).label;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Whether the account can currently be messaged.
 *
 * Mirrors the rule the messages contact list already applies — a suspended
 * account is barred — and extends it to presence, so a card and the inbox agree.
 */
export function canBeMessaged(value: UserStatus | string | null | undefined): boolean {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'suspended') return false;
  return statusMeta(raw).available;
}