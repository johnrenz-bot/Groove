import { AlertCircle } from 'lucide-react';
import { PasscodeForm, PasscodeHeaderIcon } from './PasscodeForm';
import { getConfiguredPasscode } from './config';

/**
 * Admin second factor.
 *
 * `/admin` is already gated by `app/admin/layout.tsx` — a session, a
 * `profiles.role = 'admin'` row, and the pinned admin email. This page is the
 * extra step recorded in `MIGRATION_PLAN.md`.
 *
 * It used to render a six-box form whose handler built `passcode.join('')`,
 * checked that it was six characters long, and then redirected. It never
 * compared the string with anything, so the passcode was a decoration: any
 * administrator "verified" with `000000`. The check is now a server action
 * (`actions.ts`) and the page below refuses to show a form at all when
 * `ADMIN_PASSCODE` is not configured, instead of implying a control that is not
 * there.
 */
export default function AdminPasscodePage() {
  const configured = getConfiguredPasscode();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
        <PasscodeHeaderIcon />
        <h1 className="text-2xl font-bold text-foreground">Admin Verification</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter the 6-digit administrative passcode to open the Control Center.
        </p>

        {configured ? (
          <PasscodeForm />
        ) : (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-left text-xs text-warning"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Admin passcode verification is not configured on this deployment. Set{' '}
              <code className="font-mono">ADMIN_PASSCODE</code> to a six-digit code to enable
              it. Until then, administrators reach the console from the sign-in page.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}