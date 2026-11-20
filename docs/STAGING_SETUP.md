# GroovePH — Staging Environment Setup Guide

> 2026-11-19 · Phase 6 Task 1; extended Phase 7 (STEP 1–2). **Status: no staging environment exists.** Nothing in the repository, docs, or deployment configuration provisions one. Vercel *preview* deployments (one per push) are not a staging environment — they share the production Supabase backend unless configured otherwise, and they are not controlled QA targets.
>
> This guide is the owner's runbook for creating staging. Everything marked 🔒 requires manual owner action; nothing below writes to production. See **docs/STAGING_MIGRATION_RUNBOOK.md** for the executable rehearsal of STEP 3–4 below.

## 0. Repository audit — what staging must touch (Phase 7 STEP 1)

| Component | File(s) | What staging needs | Note |
|---|---|---|---|
| Request boundary | `proxy.ts` + `lib/supabase/middleware.ts` | Nothing changed; reads `NEXT_PUBLIC_*` at request time | Route classification is env-independent; staging behavior differs only via env values |
| Supabase browser client | `lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (staging values) | Anon key is public-by-design; RLS is the authority |
| Supabase server client | `lib/supabase/server.ts` | same two + `SUPABASE_SERVICE_ROLE_KEY` (staging) | Placeholder detection guards missing keys; never copy production values |
| Service-role factory | `lib/supabase/serviceClient.ts` | same service-role key | Used by discipline read/write paths + scripts; fails over to anon fallback |
| Auth callback | `app/auth/callback/route.ts` | `NEXT_PUBLIC_APP_URL` = staging URL | Redirect allowlist is path-based (no env); recovery → `/reset-password` |
| Registration/Google | `lib/googleRegistration.ts`, `components/shared/GoogleSignInButton.tsx` | staging Google OAuth client + URLs (🔒 owner) | Button stays disabled until `PHASE 6` Task 5 passes |
| Auth SMTP | Supabase dashboard (no repo files) | staging SMTP (default Supabase SMTP OK for testing; Resend sandbox for app mail) | 🔒 owner |
| Route handlers | `app/api/**` | nothing code-wise; keys consumed at request time | `/api/health` can be the uptime probe |
| Migrations | `supabase/migrations/00–41` (+ `schema.sql`, 2 manual scripts) | apply in proven order to the staging project | see `docs/STAGING_MIGRATION_RUNBOOK.md` |
| Storage buckets | created by SQL (02, 06, 25, media_posts, storage_policies) | automatic via migration rehearsal | never reuse production buckets |
| Vercel config | `vercel.json` (5 crons, inert outside production), `next.config.ts` (headers, images, `optimizePackageImports`) | deploy the same config to the staging project/branch | do not change production settings; Node version: match repo (≥22; repo develops on 24) |
| CI workflow | `.github/workflows/ci.yml` | works unchanged on a `staging` branch (no secrets, no env) | runs on push to any branch listed in the file |
| next.config | `headers()` adds cache headers (Phase 5) | identical for staging | `images.remotePatterns` allowlists needed for staging image hosts (none new expected) |

## 0.1 Environment separation — the design contract (Phase 7 STEP 2)

Three isolated environments. **Production is not touched in any way** by this design.

| | Development | Staging | Production |
|---|---|---|---|
| Where | `next dev` on the workstation | separate Vercel deployment (project or branch) | existing Vercel deployment (unchanged) |
| Supabase | a dedicated **dev** Supabase project or local `supabase start` — never production data | **new, isolated Supabase project** (free tier) | existing project (untouched) |
| Data | scratch/seed only | synthetic only (`@example.invalid`) | real member data |
| Auth redirect URLs | `http://localhost:3000/auth/callback` | `https://<staging-domain>/auth/callback` (+localhost for dev testing) | `https://<production-domain>/auth/callback` (unchanged) |
| Storage | dev buckets | staging buckets (created by migrations) | production buckets |
| Email | none/sandbox | Resend sandbox/test mode — never real inboxes | production Resend domain |
| Crons | n/a | never fire (Vercel); manual `curl` triggers only | production schedules |
| Secrets | `.env.local` (git-ignored) | staging-scoped Vercel env vars | production env vars |
| Keys | any | **freshly generated, never reused from production** | existing |

**Golden rules enforced by the runbook:**
1. No key from production is copied to staging (and vice versa).
2. Staging database starts empty; seeded only with synthetic data (`supabase/staging-seed.sql` or app registration flow).
3. `ADMIN_EMAIL` in staging is a staging-only address; the SQL `is_admin()` literal must match it (migration 40 hardcodes it — align env + SQL + seed for the staging project).
4. Production variables are never read by tooling and never printed.

## 1. What exists today vs what is needed

| Component | Today | Needed for staging |
|---|---|---|
| Vercel production deployment | ✅ (owner's account) | Separate **staging** Vercel project or a protected branch (`staging`) wired to a staging Supabase project |
| Supabase project | one — production (implied) | A second Supabase project (`grooveph-staging`), free tier works |
| Environment variables | set on production Vercel only | Independent set on the staging project/branch — see §4 |
| Migrations | manual SQL application, order 00→41 proven runnable | Applied to staging in order (see `docs/DATABASE_AND_SUPABASE.md` §7) |
| Cron jobs | `vercel.json` (5 jobs; production-only execution) | Staging: either leave crons disabled (they never fire outside production — verified Vercel behavior) or set `CRON_SECRET` on staging and trigger them manually |
| Email delivery | Resend (production domain) | A Resend **test mode/sub-domain or verified sandbox domain** (e.g. `staging.example.com`) so test mail cannot reach real users |
| Storage buckets | production buckets | Staging buckets created by running the migrations in order (buckets are created by `02`, `06`-repaired, `25`); policies come from SQL files |
| Test accounts | none | Dedicated staging client / coach / admin — see §5 |

## 2. Do not reuse production data

- Never seed staging from a production dump without owner sign-off (PII export risk).
- The staging database starts empty; seed it with `supabase/seed.sql` (safe defaults) + `supabase/seed_admin.sql` (requires `SET app.seed_admin_password = '<strong passphrase>'`) + a few **fictional** members (e.g. via the registration flow with `@example.invalid` addresses).

## 3. Vercel side (owner) 🔒

1. Create a new Vercel project `grooveph-staging` linked to the same repository, tracking branch `staging` (or a separate branch `staging` is enough with one project + branch-specific env vars if the plan supports it).
2. Set staging environment variables (see §4) on that project/branch — **not** on production.
3. Node runtime version: match local (Node 22+, repo builds on 24).
4. `npm run build` must pass; `vercel.json` crons are ignored outside production — safe to deploy as-is.
5. Confirm the staging URL is not indexed: consider `X-Robots-Tag: noindex` via a `staging`-only config or leave it unlisted (basic auth on the deployment is the strongest simple gate — Vercel supports Deployment Protection on Pro plans; document choice).

## 4. Environment variables on staging 🔒

Mirror every name in `.env.example` (21 keys) to **staging-scoped** values:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging Supabase project URL + anon key.
- `SUPABASE_SERVICE_ROLE_KEY` → staging service role key (never the production one).
- `ADMIN_EMAIL` — decide explicitly: staging pin should be a **staging-only address** (e.g. `admin+staging@gmail.com`), and the `is_admin()` SQL literal must match (migration 40 uses a hardcoded literal — see M-3: one value must be chosen and aligned in env + SQL + seeds).
- `ADMIN_PASSWORD` / `ADMIN_PASSCODE` — staging-only passphrases.
- `CRON_SECRET` / `INGEST_API_KEY` — fresh random secrets for staging (e.g. `openssl rand -hex 32`).
- `RESEND_API_KEY` + `RESEND_FROM_ADDRESS` → staging domain (or Resend test mode).
- `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` — staging keys (separate billing/quota).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` + `_MAP_ID` — referrer-restricted to the staging domain; `GOOGLE_PLACES_API_KEY` — same owner key is fine (usage is tiny in staging).
- `NEXT_PUBLIC_APP_URL` → the staging URL (used by `metadataBase` + email links).
- `ANTHROPIC_API_KEY` — staging, if discipline agents will be exercised.
- `YOUTUBE_API_KEY` — staging (only if music features are exercised).

**Never** point staging at production Supabase “just to test”. That defeats the exercise and breaks the migration rehearsal.

## 5. Test accounts (dedicated, staging-only) 🔒

Create **three** accounts via the staging registration flow with `@example.invalid` addresses:

| Role | Email (example) | Purpose |
|---|---|---|
| client | `qa-client@example.invalid` | booking creation/cancel, agreement signing, messaging, notifications |
| coach | `qa-coach@example.invalid` | verification flow, booking accept/decline, agreement countersign |
| admin | staging `ADMIN_EMAIL` pin | user management, verifications, audit log |

Do not create them via Supabase Auth dashboard shortcuts that bypass triggers; use the app so `handle_new_user` behaves as in production.

## 6. Migration rehearsal on staging (do this first)

1. On the empty staging project, run in the Supabase SQL Editor, in order:
   `supabase/schema.sql` → `supabase/admin_hardening.sql` → `supabase/verification_workflow.sql` → `supabase/migrations/00 … 41`.
2. Every file must complete without error (Phase 6 scratch-replay proved this exact order on Postgres 16; the only intended no-op is 29).
3. Then run the **verification queries** in `docs/DB_SECURITY_VERIFICATION.md` and record results — this is the *only* proof the live staging database matches the repository's intended security posture.

## 7. Email in staging 🔒

- Resend: create a verified sandbox/test domain or enable test mode; never send to real addresses.
- Supabase Auth SMTP (if overridden): point at the staging Resend account; verify `from:` matches the verified domain.
- Password reset, registration confirmation, and the app's `/api/send-email` welcome flow should each be exercised against the staging mailbox.

## 8. Cron in staging

Vercel crons do not fire on non-production deployments. To test the ingest/reminder paths:

- `curl -X POST https://<staging>/api/cron/<job> -H "Authorization: Bearer $CRON_SECRET"`
- Confirm `agent_runs` rows appear (and codify `agent_runs` into a numbered migration before relying on it — it currently exists only in production).
- Keep staging cron emails (Resend test domain) out of real inboxes.

## 9. Storage consistency

Staging buckets are created by migrations `02` (contract-signatures), `25` (payment-qr-codes), `badged` in `media_posts.sql` (media-posts), `storage_policies.sql`, `28` — apply all of them; policies come from the same files. No manual bucket creation is needed beyond what the SQL does.

## 10. What cannot be decided from the repository

- Whether the owner wants a separate Vercel project vs branch (plan limits).
- Whether staging gets its own Google OAuth client (it should — see `docs/AUTH_EMAIL_VERIFICATION.md`).
- Cost: staging Supabase free tier + Vercel hobby/pro; no paid service should be provisioned without owner approval.
