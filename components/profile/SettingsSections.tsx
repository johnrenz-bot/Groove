'use client';

/**
 * Settings sections shared by the coach and client Settings pages.
 *
 *   - Account   : the identity fields (email/username) plus the change-password
 *                 form, using the registration password rules.
 *   - Profile   : a pointer to the role's Profile page, not a second editor.
 *   - Appearance: the ONE existing global ThemeToggle — no second theme control
 *                 is introduced anywhere in this app.
 *   - Notifications: rendered only when the caller passes notification content,
 *                 because this platform has no stored notification preferences.
 *   - Danger Zone: destructive actions, gated behind a confirm step.
 *
 * The section chrome lives here so both roles render identical Settings.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  LogOut,
  Mail,
  Moon,
  Palette,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  UserCog,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/FormField';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { Modal } from '@/components/ui/Modal';
import { validatePasswordChange, type ProfileFieldErrors } from '@/components/profile/ProfileFormSections';
import { isValidEmail, isValidUsername, VALIDATION_MESSAGES } from '@/lib/profileFields';

/* ------------------------------------------------------------------ */
/* Section shell                                                      */
/* ------------------------------------------------------------------ */

export function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="g-card p-6">
      <header className="mb-5 flex items-start gap-3 border-b border-divider pb-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Account — email, username, password                                */
/* ------------------------------------------------------------------ */

export function AccountSettings({
  email,
  username,
  userId,
  customId,
  onSaved,
}: {
  email: string;
  username: string;
  userId: string;
  customId?: string | null;
  onSaved: (next: { email: string; username: string }) => void;
}) {
  const [emailValue, setEmailValue] = useState(email);
  const [usernameValue, setUsernameValue] = useState(username);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaved(null);
    setFailure(null);

    // Same rules as registration: nothing looser here.
    const nextErrors: ProfileFieldErrors = {};
    if (!isValidEmail(emailValue)) nextErrors.email = VALIDATION_MESSAGES.email;
    if (usernameValue.trim().length < 3) {
      nextErrors.username = VALIDATION_MESSAGES.usernameShort;
    } else if (!isValidUsername(usernameValue)) {
      nextErrors.username = VALIDATION_MESSAGES.usernameChars;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const normalizedUsername = usernameValue.trim().toLowerCase();

      // Email is the sign-in identifier, so it is changed through Supabase Auth
      // first and then mirrored onto `profiles`. If the auth call fails the
      // profile row is left untouched.
      if (emailValue.trim() !== email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: emailValue.trim(),
        });
        if (authError) throw new Error(authError.message);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ email: emailValue.trim(), username: normalizedUsername })
        .eq('id', userId);

      if (error) throw new Error(error.message);

      onSaved({ email: emailValue.trim(), username: normalizedUsername });
      setSaved('Account details updated.');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Could not save your account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      icon={<Mail className="h-4 w-4" />}
      title="Account"
      description="Your sign-in email and username. These are the same fields collected at registration."
    >
      <form onSubmit={handleSaveIdentity} className="space-y-4">
        <FormError message={failure} />
        {saved && <FormSuccess>{saved}</FormSuccess>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="g-label" htmlFor="set-email">
              Email Address <span className="text-accent-text">*</span>
            </label>
            <input
              id="set-email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              autoComplete="email"
              required
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'set-email-error' : undefined}
              className="g-input"
            />
            {errors.email && (
              <p id="set-email-error" className="g-field-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="g-label" htmlFor="set-username">
              Username <span className="text-accent-text">*</span>
            </label>
            <input
              id="set-username"
              type="text"
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value.toLowerCase())}
              autoComplete="username"
              required
              aria-invalid={errors.username ? 'true' : undefined}
              aria-describedby={errors.username ? 'set-username-error' : undefined}
              className="g-input"
            />
            {errors.username && (
              <p id="set-username-error" className="g-field-error" role="alert">
                {errors.username}
              </p>
            )}
          </div>
        </div>

        {customId && (
          <p className="text-xs text-muted-foreground">
            Groove ID <span className="font-semibold text-foreground">#{customId}</span>
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            {saving ? 'Saving…' : 'Save account details'}
          </Button>
        </div>
      </form>

      <div className="mt-8 border-t border-divider pt-6">
        <ChangePasswordForm />
      </div>
    </SettingsSection>
  );
}

/**
 * Password change. Validation reuses the registration password rules, and the
 * Supabase Auth call is the same one the old edit pages used.
 */
export function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFailure(null);

    const nextErrors = validatePasswordChange(password, confirm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setMessage('Password updated successfully.');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-accent-text" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">Change Password</h3>
      </div>

      <FormError message={failure} />
      <FormSuccess>{message}</FormSuccess>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordInput
          id="set-password"
          name="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={errors.password}
        />
        <PasswordInput
          id="set-password-confirm"
          name="password_confirmation"
          label="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
          error={errors.password_confirmation}
          hint="Both passwords must match."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Profile pointer                                                     */
/* ------------------------------------------------------------------ */

export function ProfileSettingsLink({
  href,
  description,
}: {
  href: string;
  description: string;
}) {
  return (
    <SettingsSection
      icon={<UserCog className="h-4 w-4" />}
      title="Profile"
      description={description}
    >
      <Link href={href}>
        <Button variant="secondary">Open profile settings</Button>
      </Link>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/* Appearance — the single global theme control                        */
/* ------------------------------------------------------------------ */

export function AppearanceSettings() {
  return (
    <SettingsSection
      icon={<Palette className="h-4 w-4" />}
      title="Appearance"
      description="Dark or light mode. This setting applies across Groove on this device."
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Moon className="h-4 w-4 text-accent-text" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">
            Theme applies immediately and is remembered on this device.
          </span>
        </div>
        {/* The one ThemeToggle in the app. Not re-implemented here. */}
        <ThemeToggle variant="pill" />
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications — only when the role actually supports them           */
/* ------------------------------------------------------------------ */

export function NotificationsSettings({ children }: { children: React.ReactNode }) {
  return (
    <SettingsSection
      icon={<Bell className="h-4 w-4" />}
      title="Notifications"
      description="In-app alerts for bookings, messages, and announcements."
    >
      {children}
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ */
/* Danger Zone                                                         */
/* ------------------------------------------------------------------ */

/**
 * Destructive actions.
 *
 * Sign-out-all uses the existing Supabase Auth sign-out — the same call the
 * dashboard and navbar already make. Account deletion is NOT implemented: there
 * is no deletion endpoint in this codebase, so rather than pretend, the action
 * is offered as a support request, which is the platform's existing channel.
 */
export function DangerZone({
  onSignOutAll,
  onDeleteAccount,
}: {
  onSignOutAll: () => Promise<void>;
  onDeleteAccount?: () => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState<'signout' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const runSignOut = async () => {
    setBusy(true);
    try {
      await onSignOutAll();
      setConfirmOpen(null);
      router.push('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[20px] border border-danger/30 bg-danger-soft/40 p-6">
      <header className="mb-5 flex items-start gap-3 border-b border-danger/20 pb-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger"
        >
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">Danger Zone</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            These actions affect your access to Groove. Review before continuing.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LogOut className="h-4 w-4 text-danger" aria-hidden="true" />
              Sign out of this device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ends your current session. Your profile and bookings are untouched.
            </p>
          </div>
          <Button variant="outline" onClick={() => setConfirmOpen('signout')} className="shrink-0">
            Sign out
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
              Delete account
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Requests permanent deletion of your profile and personal data through Groove
              support.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => (onDeleteAccount ? onDeleteAccount() : setConfirmOpen('delete'))}
            className="shrink-0"
          >
            Request deletion
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen !== null}
        onClose={() => setConfirmOpen(null)}
        title={confirmOpen === 'delete' ? 'Request account deletion' : 'Sign out of this device?'}
        description={
          confirmOpen === 'delete'
            ? 'A support ticket will be created so an administrator can review and action your request. Your account stays active until then.'
            : 'You will be returned to the sign-in page.'
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(null)}>
              Cancel
            </Button>
            {confirmOpen === 'delete' && (
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  setBusy(true);
                  await onDeleteAccount?.();
                  setBusy(false);
                  setConfirmOpen(null);
                }}
                loading={busy}
              >
                Send request
              </Button>
            )}
            {confirmOpen === 'signout' && (
              <Button variant="primary" size="sm" onClick={runSignOut} loading={busy}>
                Sign out
              </Button>
            )}
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-danger">
            {confirmOpen === 'delete'
              ? 'Bookings, contracts, and reviews tied to your account are retained for the other party. Support will confirm before anything is removed.'
              : 'You can sign back in at any time with your username or email.'}
          </p>
        </div>
      </Modal>
    </section>
  );
}

/** Small confirmation tile reused by the summary grids. */
export function InlineConfirm({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-success">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </p>
  );
}