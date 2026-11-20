# GroovePH — Authentication & Email Verification (Staging)

> 2026-11-19 · Phase 6 Task 5. Nothing in this file has been executed — it is the checklist to run against staging (never production). Google OAuth must only be enabled for users after §1 passes end-to-end.

## 1. Google OAuth — end-to-end verification (🔒 blocked: external config)

**Goal:** a real Google account completes sign-up → session → correct portal routing, in staging.

### Configuration
- [ ] **Google Cloud Console** (staging project): OAuth consent screen — app name, support email, `@example.invalid` test users; scopes limited to `openid email profile`.
- [ ] **Authorized redirect URIs** include the Supabase callback: `https://<staging-supabase-ref>.supabase.co/auth/v1/callback` (and the production URI must NOT point at staging).
- [ ] **Authorized JavaScript origins** include `https://<staging-domain>` and `http://localhost:3000`.
- [ ] **Supabase Auth → Providers → Google**: enabled for the staging project; Client ID/Secret from the staging Google project (never the production one).
- [ ] Site URL + redirect URLs in Supabase Auth point to staging (`https://<staging-domain>`), including `http://localhost:3000/**` for local dev.
- [ ] Vercel staging env: `NEXT_PUBLIC_APP_URL` = staging URL (callback route derives base from it).

### Round-trip test
1. [ ] Hit `/login` on staging **as a signed-out visitor** → Google button renders (if shipped hidden, note).
2. [ ] Click → Google consent → pick a **test account**.
3. [ ] Callback lands on `/auth/callback` → session created → `profiles` row exists (created by `handle_new_user`).
4. [ ] Google account receives `role = client` (or coach via the register-coach path) — never `admin`.
5. [ ] Routing: new member → `/complete`-style onboarding or portal home per current flow; subsequent visits land on the correct portal.
6. [ ] Cancel the consent flow → lands back on `/login` with a readable error, no session, no console errors.
7. [ ] Sign out → `/login` → sign in again with the same Google account → lands as returning member, not as new registration.
8. [ ] Check Supabase Auth → Users: one row, `provider = google`, identity linked.

### Known risks / notes
- Google OAuth must not be enabled for the public until step 5 passes with a fresh account **and** step 7 passes with the same account.
- The button ships **disabled/honest** today ("Coming soon"); do not flip it until this checklist passes. Flipping it is a marketing + security decision — owner sign-off required.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unrelated to OAuth; do not confuse the two consoles.
- If registration role selection is in the Google path (`/register/complete`), verify the wizard end-to-end in staging — it is the least-tested surface in the app (no machine verification to date).

## 2. Email delivery (🔒 blocked: Resend/domain config)

### Domain & authentication
- [ ] Resend (or SES — current codebase uses Resend) domain verified for the **staging** domain (or Resend test-mode sandbox).
- [ ] **SPF** record present: `v=spf1 include:_spf.resend.com ~all` (exact include from Resend dashboard).
- [ ] **DKIM**: Resend-issued DKIM record(s) live on the staging domain; `dig`/`nslookup` returns them.
- [ ] **DMARC** record published (`p=none` at minimum during staging; `p=quarantine` or `p=reject` for production).
- [ ] The `from:` address used by `/api/send-email` and Supabase Auth SMTP is inside the verified domain.

### Application-level checks (staging mailbox)
- [ ] Password reset: request → email arrives < 1 min with the correct staging link → link opens `/reset-password` **while signed out** (per H-2 fix: the recovery session must be able to render the form) → new password set → sign in with new password → old session invalidated.
- [ ] Registration confirmation (if enabled): new account → confirmation mail → confirm link → account usable.
- [ ] Welcome/notification mail via `/api/send-email`: trigger from a staging action → arrives; content correctly escaped; failure path when recipient domain rejects (send to a nonexistent mailbox) → API returns honest error, UI shows generic message, no `2xx` on failure.
- [ ] Rate limiting observed: 4th send in a minute from one IP → `429` (proves the limiter works in staging config).
- [ ] Resend quota/logs reviewed after the tests; no unexpected sends.

### Supabase Auth SMTP (if overridden from default)
- [ ] Supabase Auth → SMTP settings point to the staging Resend account; sender matches verified domain.
- [ ] Reset-password email (not from app code — Supabase itself sends it) observed and working end-to-end. (Default Supabase SMTP is rate-limited to ~2/hour on free tier; document the limit.)

## 3. Failure handling (all must be observed, not assumed)

- [ ] Resend key missing on staging → `/api/send-email` returns 500/503 with generic message; no partial success claim.
- [ ] Network blackholed to Resend → timeout surfaces as error; no infinite hang (check `lib/sendEmailSecurity` timeout behavior).
- [ ] Invalid `to:` address → honest failure; server logs retain the error; no PII beyond the address itself in logs.
- [ ] Reset link for a nonexistent account → Supabase responds success-shaped (no enumeration) — confirm the app shows the same copy as for existing accounts.

## 4. Rollback / abort criteria

- Any real email reaching a non-test inbox during this phase → stop, investigate, report.
- Google consent error loops or redirect mismatch → revert provider enablement in Supabase; do not "fix forward" with production OAuth.
- Reset-password renders for only signed-in users (H-2 regression) → block release; re-verify middleware.
