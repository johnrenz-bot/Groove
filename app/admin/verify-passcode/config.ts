/**
 * Server-only configuration for the admin second factor.
 *
 * Its own module — not `actions.ts` — because a `'use server'` file may only
 * export async functions, and the page needs to know whether a passcode is
 * configured before it decides whether to render a form at all.
 *
 * Not a `'use server'` module, so nothing here is automatically exposed as a
 * callable endpoint. Nothing imports it into a client component: `page.tsx` and
 * `actions.ts` are both server-side, and `PasscodeForm.tsx` imports only the
 * `PasscodeResult` type, which is erased at compile time.
 */
export interface PasscodeResult {
  ok: boolean;
  error?: string;
}

/**
 * `ADMIN_PASSCODE` is the single source of truth for what the form accepts.
 *
 * Exposed through a function rather than a constant so the value cannot be
 * read at module scope by something that later gets pulled into the browser
 * bundle.
 */
export function getConfiguredPasscode(): string | null {
  const value = process.env.ADMIN_PASSCODE?.trim();
  return value && value.length > 0 ? value : null;
}