# GroovePH — Production Readiness Checklist

> 2026-11-19 · Phase 5. Honest status per item. Legend:
> ✅ **Verified** (machine-checked this pass) · ⚠️ **Needs manual verification** (documented; requires the live environment) · ❌ **Not implemented** · 🔒 **Blocked by external configuration**
>
> "Verified" here never means "tested against production with real accounts" — see `docs/QA_REGRESSION_CHECKLIST.md` for the authenticated manual pass. A green build is **not** proof of readiness.

## A. Application & build

| Item | Status | Evidence |
|---|---|---|
| Production build compiles | ✅ | `npm run build` — 76/76 pages, Next 16.4.6 |
| TypeScript strict, zero errors | ✅ | `tsc --noEmit` |
| Lint zero errors (243 pre-existing warnings) | ✅ | `npm run lint` |
| Unit/integration suites | ✅ | `npm test` — encoding (752 files) · booking 147 · masking 7 suites · studios 115 · discipline-data · groovey · send-email · unit **119/119** |
| Encoding gate (no mojibake) | ✅ | `scripts/check-mojibake.ts` |
| Dependency vulnerabilities | ✅ | `npm audit` — **0** (was 1 critical + 3 high; see SECURITY_AUDIT §1) |
| Bundle/content-security posture | ✅ | CSP + HSTS + X-Frame-Options + nosniff + Referrer-Policy + Permissions-Policy (`next.config.ts`); immutable cache headers for `/fonts`,`/image`,`/media` etc. |
| Lazy loading of below-fold heavy code | ✅ | StudioLocator + react-easy-crop now `next/dynamic` (home −145 KB raw; profiles −171 KB raw) |
| Landing aggregate stats cached 5 min | ✅ | `unstable_cache(readLandingStats, revalidate: 300)` — public counts, no personalized data |
| CI pipeline | ✅ | `.github/workflows/ci.yml` — `npm ci` → `npm test` → `npm run build` (no secrets) |
| Health endpoint | ✅ | `/api/health` (env + DB probe, 200/503) |
| Graceful DB-failure behavior | ✅ | All server reads degrade to fallback content or explicit errors; verified in code review |

## B. Runtime configuration (per environment)

| Item | Status | Notes |
|---|---|---|
| `.env.example` documents every variable | ✅ | 21 keys (names only) — keep it in sync when adding variables |
| `.env` / `.env.local` git-ignored | ✅ | Verified; never committed |
| `CRON_SECRET` set in production | 🔒 | Without it, `/api/cron/*` returns 503 (fail-closed). Set in Vercel env; required for the 5 pg_cron/Vercel cron jobs |
| `INGEST_API_KEY` set | 🔒 | Gates the four discipline ingest endpoints |
| `SUPABASE_SERVICE_ROLE_KEY` set | 🔒 | Required for admin console + tickets fallback + ingest writes. App degrades gracefully without it (fallback to anon reads) but admin functions 503 |
| `RESEND_API_KEY` + verified domain | 🔒 | Welcome/notification email; without it `/api/send-email` reports the failure honestly |
| `GEMINI_API_KEY` (+ `GROQ_API_KEY` / `OPENROUTER_API_KEY` fallbacks) | 🔒 | Groovey AI; chat returns labeled fallback messages when providers fail |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (+ `_MAP_ID`) | 🔒 | StudioLocator map; referrer-restricted per `.env.example` |
| `GOOGLE_PLACES_API_KEY` | 🔒 | Nationwide studio sweep (server-side); free-tier quota applies |
| `YOUTUBE_API_KEY` | 🔒 | Music player search quota |
| `ADMIN_EMAIL` pin consistent everywhere | ⚠️ | One source of truth: `lib/admin/access.ts` + `ADMIN_EMAIL` + `is_admin()` SQL literal (`admin@gmail.com`) + `ADMIN_PASSCODE`. The app reads `ADMIN_EMAIL` from env; the SQL does **not**. Mismatch = lockout or partial privilege (M-3). Decide one value and align env + SQL + seeds |
| `NEXT_PUBLIC_APP_URL` set | ⚠️ | Used for `metadataBase` (OG URLs) and email links; if unset, falls back to `http://localhost:3000` |

## C. Supabase (database & auth)

| Item | Status | Notes |
|---|---|---|
| RLS enabled on all tables | ✅ (repo) | 38/38 in migrations; live state ⚠️ verify with §6 queries in SECURITY_AUDIT |
| Storage buckets private + MIME/size limits | ✅ (repo) | verification-documents, contract-signatures, media-posts (after repairing its SQL), payment-qr-codes |
| Migration workflow | ⚠️ | **Manual, in-order application (schema → admin_hardening → verification_workflow → 00…41)**; no `config.toml`, no Edge Functions. Phase 6 proved the full chain replays cleanly on Postgres 16; migration 41 awaits staging rehearsal, then production application |
| Broken files repaired | ✅ | `23`/`24` tails truncated (leaked transcripts), `media_posts.sql` comment fixed, `29` superseded (do not run) |
| Migration 41 (hardening) applied | ⚠️ | Phase 6: **validated on a Postgres 16 scratch replay (applies clean; semantics proven)** — still awaits staging rehearsal then production application (see `docs/RELEASE_CHECKLIST.md` §3 and `docs/DB_SECURITY_VERIFICATION.md`) |
| Migration chain replayable | ✅ | Phase 6 scratch: schema + manual scripts + migrations 00–41 all exit 0 (eight latent file defects repaired; see DATABASE_AND_SUPABASE.md §1) |
| Migration 29 / verification_workflow codified | ⚠️ | `verification_workflow.sql` must become a numbered migration before its guards exist anywhere |
| Double-booking prevention | ❌ | No unique/exclusion constraint on `(coach_id, date, start_time)` — proposal + detection queries in migration 41 §E-3 |
| Agreement INSERT scoping / `status='pending'` clamp | ❌ | M-13/M-14 proposals; needs regression run of the booking flow |
| Seed data | ✅ | `seed.sql` now valid + neutral; `seed_admin.sql` requires explicit passphrase; weak credential removed; **rotate any account ever seeded with `Admin123!`** |
| Backups | ⚠️ | Supabase PITR/backups are a dashboard setting — owner must confirm daily backups + tested restore |
| Realtime publication scope | ⚠️ | `profiles` in the publication (H-8); consider removing after presence migration to Supabase Presence |

## D. Authentication & OAuth

| Item | Status | Notes |
|---|---|---|
| Email/password sign-in, sign-up, recovery | ✅ (code) | Recovery flow fixed (H-2): `/reset-password` now renders for authenticated recovery sessions |
| Password reset email delivery | 🔒 | Requires Resend/Supabase SMTP working + redirect URL allowed in Supabase Auth settings |
| Google OAuth | 🔒 | **Not production-ready.** Implementation exists (`lib/googleRegistration.ts`, `components/shared/GoogleSignInButton.tsx`) but must be verified end-to-end: Google Cloud OAuth consent screen, authorized redirect URIs (incl. Supabase callback), test-user allowlist, then a real sign-in with a real Google account. Do not advertise the button until verified |
| Session cookie security | ✅ | Supabase SSR cookies; `SameSite`/`Secure` defaults via `@supabase/ssr`; service role never inherits session cookies |
| Admin second factor | ❌ | `verify-passcode` grants nothing and is unthrottled (M-4); either enforce it or remove it |
| Stale-session handling | ✅ | Proxy clears broken sessions, redirects to `/login?redirectTo=`, loop-safe |

## E. Operations

| Item | Status | Notes |
|---|---|---|
| Logging | ⚠️ | Server errors logged to console (visible in Vercel logs); no structured log aggregation (Datadog/Logtail). Acceptable at current scale; add drain when multi-instance |
| Error tracking | ❌ | No Sentry/Rollbar; consider for beta |
| Uptime monitoring | ❌ | Add `/api/health` check (Better Uptime/UptimeRobot free tier) |
| Rate limiting | ⚠️ | Per-process in-memory (`lib/rateLimit.ts`) — adequate against single-instance abuse; for multi-instance, move to Upstash/Redis; `/api/studios` and `/api/ai/coach-assistant` lack limiters (M-1/M-2) |
| Email domain (SPF/DKIM/DMARC) | 🔒 | Resend domain verification is external config; required for deliverability |
| Backups & restore drill | ⚠️ | Owner task; see Supabase section |
| Migration rehearsal on staging | ⚠️ | Run 41 + the §E proposals on a branch/preview before production |
| Rollback plan | ⚠️ | App: redeploy previous Vercel deployment. DB: migration 41 documents per-section rollback; data-destructive rollbacks (DROP POLICY) are spelled out there |
| Capacity/quota watch | ⚠️ | Google Places quota, Gemini quota, Resend quota — monitor; app degrades honestly (fallbacks) but silently |

## F. Honest "could not verify" list

1. Live RLS policy set and trigger presence (manual application; repo cannot prove).
2. Any authenticated flow (client/coach/admin) — no test credentials; see QA_REGRESSION_CHECKLIST.md.
3. Google OAuth round-trip.
4. Email delivery (Resend) and Supabase Auth SMTP.
5. pg_cron jobs actually scheduled in the live project (`cron.job`).
6. Backup/restore drill.
7. Visual regression after the StudioLocator/PhotoCropModal lazy-load (code-level verified only: tsc/lint/build/prod smoke of public pages).
8. Lighthouse numbers — not measured this pass; measure on staging after deploy.

## G. Recommended pre-launch sign-off sequence

1. Apply migration 41 on staging → run QA_REGRESSION_CHECKLIST.md (client/coach/admin).
2. Rotate the seeded admin password; confirm `admin@gmail.com` recovery works.
3. Verify Google OAuth end-to-end or leave the button disabled.
4. Set `CRON_SECRET` + `INGEST_API_KEY`; confirm one cron run succeeds and `agent_runs` row appears (codify `agent_runs` into a migration afterwards — it exists only in production).
5. Add uptime monitor on `/api/health`; enable Supabase backups; test one restore to a scratch project.
6. Deploy; watch Vercel logs + Supabase logs for 48h before public launch.
