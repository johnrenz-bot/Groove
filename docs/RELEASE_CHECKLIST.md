# GroovePH — Production Release Checklist

> 2026-11-19 · Phase 6 Task 7. Statuses: **VERIFIED** (evidence produced this pass) · **MANUAL VERIFICATION REQUIRED** (steps exist, not executed) · **BLOCKED** (cannot proceed without an external decision/configuration) · **NOT IMPLEMENTED** · **NOT APPLICABLE**.
>
> Evidence rules: "VERIFIED" names *what* was verified and *how*. "MANUAL VERIFICATION REQUIRED" names the exact procedure (usually in a companion doc). Nothing reaches production approval while a **gate item** is not VERIFIED.

## 0. Gate items (all must be VERIFIED before approval)

| # | Item | Status | Evidence / method |
|---|---|---|---|
| G1 | Zero known CRITICAL/HIGH security findings unremediated **in code** | **VERIFIED** | `docs/SECURITY_AUDIT.md`: C-1/H-2 fixed in code; C-2/C-3, H-1/H-3/H-6/H-7 mitigated in `migrations/41` (validated on scratch replay — see §3); H-5 superseded; H-8 staged (blocked on owner decision) |
| G2 | Migration chain provably replayable | **VERIFIED (scratch) / MANUAL VERIFICATION REQUIRED (staging)** | Phase 6+7 scratch replay: `schema.sql → admin_hardening.sql → verification_workflow.sql → 00–41` all exit 0; `scripts/verify-db-security.sql` produced §1–§13 catalog evidence; `supabase/staging-seed.sql` rehearsed end-to-end. Staging application pending owner action (G6) — scratch evidence never substitutes for staging |
| G3 | Backup & recovery path exists | **BLOCKED** | `docs/BACKUP_RECOVERY.md`: restore drill not run; no proof backups exist for the live project; PITR availability unknown. **Owner must confirm in Supabase dashboard** |
| G4 | Auth recovery flow works | **VERIFIED (code)** / **MANUAL VERIFICATION REQUIRED (live)** | H-2 fix (`/reset-password` reachable by recovery session) built + typechecked; email round-trip not run (blocked on staging mail) — see `docs/AUTH_EMAIL_VERIFICATION.md` |
| G5 | Full test suite green | **VERIFIED** | `npm test` 2026-11-19: encoding (756 files) · booking 147 · masking 7 suites · studios 115/115 · discipline-data · groovey · send-email · unit **126/126**; `tsc` 0 errors; `eslint` 0 errors; build 76/76 pages |
| G6 | Staging environment exists and rehearsed | **BLOCKED** | `docs/STAGING_SETUP.md`: none exists; Vercel previews ≠ staging. Owner decision + two env sets required |
| G7 | Google OAuth verified end-to-end | **BLOCKED** | Consent screen, redirect URIs, session creation, role routing — never tested (`docs/AUTH_EMAIL_VERIFICATION.md` §1) |

## 1. Build & automated verification

| Item | Status | Evidence |
|---|---|---|
| Production build passes | **VERIFIED** | `npm run build` — 76/76 pages, Next 16.4.6, encoding gate clean |
| TypeScript strict | **VERIFIED** | `tsc --noEmit` 0 errors |
| ESLint | **VERIFIED** | 0 errors (243 pre-existing warnings) |
| Dependency vulnerabilities | **VERIFIED** | `npm audit` — **0** (after Next 16.3.3→16.4.6 + `audit fix`) |
| Unit/integration suites | **VERIFIED** | 126/126 (`tests/unit.test.ts`, `tests/cronAuth.test.ts`, `tests/ingestAuth.test.ts`) |
| Existing app suites preserved | **VERIFIED** | test:booking 147, test:masking 7 suites, test:studios 115/115, test:discipline-data, test:groovey, test:send-email — all pass via `npm test` |
| E2E | **NOT IMPLEMENTED** | Playwright not installed; authenticated flows cannot be automated without staging accounts (see Task 5 blockers). Public-surface prod smoke VERIFIED (200s, 307 portal redirects, 404 QA routes) |
| CI pipeline | **VERIFIED** | `.github/workflows/ci.yml` — npm ci → npm test → npm run build |

## 2. Security verification

| Item | Status | Evidence |
|---|---|---|
| Dependency audit | **VERIFIED** | 0 vulnerabilities |
| Security headers (CSP/HSTS/XFO/nosniff/Referrer/Permissions-Policy) | **VERIFIED** | `next.config.ts`; unchanged behavior; immutable caching added for static dirs (verified live `Cache-Control` on fonts) |
| Cron guard fail-closed | **VERIFIED** | `lib/cron/auth.ts` — SHA-256 + `timingSafeEqual`; 7 regression tests (`tests/cronAuth.test.ts`) |
| Ingest guard constant-time | **VERIFIED** | `lib/ingest/auth.ts`; 7 regression tests (`tests/ingestAuth.test.ts`) |
| Migration 41 (hardening) | **VERIFIED (static + scratch)** | Applies clean; semantics proven; per-section rollback documented; awaits staging rehearsal before production application |
| Live RLS policy inventory | **BLOCKED** | `docs/DB_SECURITY_VERIFICATION.md` §0–§11 written; nothing has been run against the live database; repo cannot prove manual migrations were applied |
| Secrets scan (tracked files) | **VERIFIED** | No committed keys found (Phase 1 + re-scan this phase); `.env*` untracked |
| Public attack surface | **VERIFIED (public pages)** | `/` 200; auth pages 200; portals 307 → `/login`; `/studio-qa`,`/preview-mini` 404; `/api/health` public by design (L-1 noted) |
| Admin authorization | **VERIFIED (code)** | proxy → layout → `requireAdmin()` → `is_admin()`+email pin — unchanged, consistent, code-reviewed |
| Second factor (`verify-passcode`) | **NOT IMPLEMENTED** | Dead end that grants nothing; unthrottled (M-4). Enforce or delete — owner decision |
| Rate limits: `/api/studios`, `/api/ai/coach-assistant` | **NOT IMPLEMENTED** | M-1/M-2 — unauthenticated billed calls / unthrottled quota burn |
| CSP nonce-based `script-src` | **NOT IMPLEMENTED** | M-9 — `'unsafe-inline'` remains (documented) |

## 3. Database & migrations

| Item | Status | Evidence |
|---|---|---|
| Migration chain replayable (schema→00→41) | **VERIFIED (scratch)** | All exit 0; defects repaired en route (docs/DATABASE_AND_SUPABASE.md) |
| `verification_workflow.sql` codification | **MANUAL VERIFICATION REQUIRED** | Applied in scratch only; must be folded into numbered migrations or applied manually before production; migration 29 is a documented no-op |
| Migration 41 applied to staging | **BLOCKED** | Awaits staging project (G6) |
| Migration 41 applied to production | **BLOCKED** | Only after staging rehearsal + §6 checks (M-5) |
| `agent_runs` table codification | **NOT IMPLEMENTED** | Exists only in production today (audit finding); needs `42_agent_runs.sql` |
| Double-booking exclusion | **NOT IMPLEMENTED** | `(coach_id, date, start_time)` unconstrained; proposal + detection query in migration 41 §E-3 |
| Feedbacks UNIQUE(appointment_id,user_id) | **NOT IMPLEMENTED** | Needs duplicate cleanup + owner sign-off (§E-3) |
| Agreement INSERT scoping / INSERT status clamp | **NOT IMPLEMENTED** | M-13/M-14 — see migration 41 §E-4 |
| Migration 41 rollback | **VERIFIED** | Per-section rollback documented in file header |

## 4. Environment & deployment configuration

| Item | Status | Evidence |
|---|---|---|
| `.env.example` completeness | **VERIFIED** | All 21 variable names documented; names only, no values read |
| `.env`/`.env.local` untracked | **VERIFIED** | git-ignored; never read by tooling |
| `NEXT_PUBLIC_APP_URL` for metadataBase | **VERIFIED** | `app/layout.tsx` now sets it (falls back to localhost) |
| Vercel project config | **MANUAL VERIFICATION REQUIRED** | Node version, env scoping preview-vs-production, function region — owner review; branch `staging` for staging (G6) |
| `vercel.json` crons | **VERIFIED (config)** | 5 jobs; inert outside production; staging needs `CRON_SECRET` + manual trigger |

## 5. Authentication

| Item | Status | Evidence |
|---|---|---|
| Email/password flows | **MANUAL VERIFICATION REQUIRED** | Register/login/forgot/reset on staging with mailbox — `docs/AUTH_EMAIL_VERIFICATION.md` §2; H-2 fixed in code |
| Session handling & expiry | **VERIFIED (code)** | `@supabase/ssr` cookies; proxy refresh-on-navigation; stale-session sign-out; loop-safe redirects |
| Password recovery bounce (H-2) | **VERIFIED (code)** | Fixed this release candidate; recovery lands on `/reset-password` |
| Google OAuth | **BLOCKED** | See `docs/AUTH_EMAIL_VERIFICATION.md` §1 — not ready; the login button must stay disabled until verified |
| Admin pin consistency | **MANUAL VERIFICATION REQUIRED** | `ADMIN_EMAIL` (env) vs `is_admin()` SQL literal vs seeds — M-3: pick one value, align everywhere, redeploy |
| Role-based redirects | **VERIFIED (code)** | proxy role gates + loop-safe redirects; no `user_metadata` trust |

## 6. Email delivery

| Item | Status | Evidence |
|---|---|---|
| Resend domain verified | **BLOCKED** | Owner config; staging domain/test mode required |
| SPF/DKIM/DMARC | **BLOCKED** | Owner DNS records |
| Reset & welcome mail end-to-end | **BLOCKED** | `docs/AUTH_EMAIL_VERIFICATION.md` §2 |
| Abuse controls | **VERIFIED (code)** | 3/min + 20/day per-IP limiter; origin check; honest failure paths (send-email is owner WIP — assessed, untouched) |
| Supabase Auth SMTP | **MANUAL VERIFICATION REQUIRED** | Default rate limits apply; document or override |

## 7. Storage

| Item | Status | Evidence |
|---|---|---|
| Private buckets (verification-documents, contract-signatures, media-posts, payment-qr-codes) | **VERIFIED** | Policies + MIME/size limits + filename-shape enforcement (reviewed; 28/06 repaired & replay-proven) |
| Storage policy replay | **VERIFIED (scratch)** | `06_hotfix_signature_storage.sql` applies clean post-repair; `media_posts.sql` syntax fixed |
| Signed URL expiry | **VERIFIED** | 30–60 min by code review (`lib/utils.ts`, gcashQrService) |
| Storage bytes backup | **MANUAL VERIFICATION REQUIRED** | Not in Postgres backups; quarterly export recommended — `docs/BACKUP_RECOVERY.md` §5 |
| Anonymous uploads | **VERIFIED** | tickets only; allowlisted types, ≤5 MB, unguessable names, `tickets/` prefix |

## 8. Backup & recovery

| Item | Status | Evidence |
|---|---|---|
| Documented restore procedure | **VERIFIED (doc)** | `docs/BACKUP_RECOVERY.md` — steps, RPO/RTO targets, staging drill |
| Backup automation enabled | **BLOCKED** | Supabase dashboard — owner; retention/PITR plan-dependent |
| Restore drill executed | **NOT IMPLEMENTED** | Recommended staging drill; never run |
| Migration recovery plan | **VERIFIED** | All migrations re-runnable in order; 41 documented with per-section rollback |

## 9. Operations & monitoring

| Item | Status | Evidence |
|---|---|---|
| Health endpoint | **VERIFIED** | `/api/health` → 200/503 with env+DB checks |
| Uptime monitoring | **NOT IMPLEMENTED** | `docs/OBSERVABILITY_PLAN.md` Tier 0 — free, 10 minutes, owner |
| Error tracking | **NOT IMPLEMENTED** | Sentry plan documented (costs, privacy scrubbing) — decision pending |
| Log review cadence | **MANUAL VERIFICATION REQUIRED** | Weekly `console.error` review until Tier 1 lands |
| On-call/escalation | **NOT IMPLEMENTED** | Owner = single point of contact today |

## 10. Deployment & release process

| Item | Status | Evidence |
|---|---|---|
| Release branch/tag strategy | **MANUAL VERIFICATION REQUIRED** | Uncommitted work pending owner's git decision; `dc3079d` is current HEAD — decide baseline before release |
| Pre-release QA sign-off | **BLOCKED** | `docs/QA_REGRESSION_CHECKLIST.md` requires staging accounts (G6, G7) |
| Rollback plan | **VERIFIED (doc)** | Redeploy previous Vercel deployment; DB rollback per-migration documented (41 §rollback); maintenance flag available |
| Post-release monitoring | **NOT IMPLEMENTED** | 48h log watch + `/api/health` probe — Tier 0 |
| Communication plan | **NOT IMPLEMENTED** | Owner decision (announce maintenance?) |

## 11. Sign-off sequence

1. Owner approves staging setup (G6) → staging project + env vars → apply chain 00→41 (script in `DATABASE_AND_SUPABASE.md` §7) → run `DB_SECURITY_VERIFICATION.md` queries → paste results into this file.
2. Owner creates test accounts → run `QA_REGRESSION_CHECKLIST.md` → file defects; fix or waive in writing.
3. Email + OAuth verification (`AUTH_EMAIL_VERIFICATION.md`) → enable Google OAuth only if §1 passes.
4. Backup verification on staging (restore drill) → RTO evidence recorded.
5. Release: merge/tag per owner's git decision → deploy → 30-minute smoke per §1 of this file → monitor `/api/health` + logs for 48h.
6. If ANY gate item regresses during release → execute rollback (§10) → post-mortem.
