# GroovePH — Staging Implementation Plan (Pass 7, draft for owner approval)

> Status: **plan only — nothing external has been provisioned.** No staging Supabase project
> exists yet; no Vercel project has been created; no environment variables have been set
> anywhere outside code review. Do not apply this document to production.
>
> This plan synthesises the existing runbooks (`STAGING_SETUP.md`,
> `STAGING_MIGRATION_RUNBOOK.md`, `DATABASE_AND_SUPABASE.md`, `SECURITY_AUDIT.md`,
> `DB_SECURITY_VERIFICATION.md`, `BACKUP_RECOVERY.md`, `RELEASE_CHECKLIST.md`) and the
> current repository state (2026-11-20). It changes no files in the working tree.

## 1. Staging architecture (owner action required)

| Layer | Choice | Notes |
|---|---|---|
| Supabase | New project, e.g. `grooveph-staging`, free tier | NEVER production. Never a dump of production. |
| Vercel | New project `grooveph-staging` tracking branch `staging`, OR branch `staging` on the existing project with branch-scoped env if plan permits | Owner decision: project vs branch. |
| Domain | Vercel-generated or owner-chosen `staging.<domain>` | Suggest `X-Robots-Tag: noindex` or Vercel Deployment Protection (Pro) as the gate |
| DNS/auth | `https://<staging-host>/auth/callback` allowlisted | Production callback URL untouched |

## 2. Migration chain — proven order, current tree (43 files)

**Correction to `STAGING_MIGRATION_RUNBOOK.md`: it documents `00 → 41`, but the working
tree contains `41_security_hardening.sql` and `42_shirt_designs.sql` (both untracked,
part of the current redesign). Staging MUST apply 00 → 42.**

```
supabase/schema.sql
→ supabase/admin_hardening.sql
→ supabase/verification_workflow.sql
→ supabase/migrations/00 … 42  (sorted ascending)
```

- Exit-0 expected for all files. `29` notices are normal. `37` prints either
  "cron scheduled" (pg_cron present) or "pg_cron unavailable — skipping" (fine on staging).
- `42_shirt_designs.sql` requires `pgcrypto` (present) and `profiles(id)` (created by schema).
- Apply via SQL Editor or `psql "$STAGING_DB_URL"`. Stop on any error; do not push through.
- **Never run `supabase/presence_realtime.sql`** (H-8: publishes full profile rows).
- Seeds are MANUAL, after security verification: `seed.sql` → `seed_admin.sql`
  (requires `SET app.seed_admin_password`) → `staging-seed.sql` (requires
  `SET app.staging_client_password` / `SET app.staging_coach_password`, ≥12 chars, same session).
- `agent_runs` does not exist in any migration; staging ingest jobs will hit a missing
  table → codify as `43_agent_runs.sql` before enabling ingest agents.

### Post-apply verification (mandatory)

Run `scripts/verify-db-security.sql` (or paste sections of `docs/DB_SECURITY_VERIFICATION.md`)
and record every line. Any mismatch is an owner finding, not a waiver.

## 3. Environment variables — inventory vs current tree

Validated at boot by `lib/config/env.ts` (zod; required: the two Supabase public keys +
service-role key, else throw in production). CI `.github/workflows/ci.yml` builds without secrets (fetch fallbacks by design).

### A. Required public (browser)
- `NEXT_PUBLIC_SUPABASE_URL` — staging project URL (fresh).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — staging anon key (public by design; RLS is the authority).
- `NEXT_PUBLIC_APP_URL` — staging origin (metadataBase + email links + `NEXT_PUBLIC_APP_URL`).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — referrer-restricted to the staging origin.
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — same Maps project.

### B. Server-only secrets (never in client bundle)
- `SUPABASE_SERVICE_ROLE_KEY` — staging service role; placeholder detection in `lib/supabase/server.ts` fails closed without it.
- `CRON_SECRET` — staging-only random (`openssl rand -hex 32`); `/api/cron/*` → 503 in prod without it (by design, verified).
- `INGEST_API_KEY` — staging-only random (used by `/api/*/ingest`).
- `ADMIN_PASSWORD`, `ADMIN_PASSCODE` — staging-only.
- `ADMIN_EMAIL` — **must match the `is_admin()` STABLE literal in `migrations/40_is_admin_stable.sql`** (pinned email); choose one value for env + SQL + seeds. See §5.
- `RESEND_API_KEY` — staging/sandbox account (or test mode); `RESEND_FROM_ADDRESS` — verified staging sender (e.g. `GroovePH Staging <hello@staging.example.com>`).

### C. AI providers (staging keys, separate quotas)
- `GEMINI_API_KEY` (also honours `GOOGLE_API_KEY` with lower precedence — but set `GEMINI_API_KEY`), `GEMINI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY` wins over `GOOGLE_API_KEY` when both set (code path logs a notice — expected).

### D. Maps / Places
- `GOOGLE_PLACES_API_KEY` — server-side Places; owner's existing key is acceptable (tiny staging volume), else referrer-restrict.
- `GOOGLE_MAPS_API_KEY` — server-side geocode fallback (used by `lib/config/env.ts` schema).

### E. YouTube / media
- `YOUTUBE_API_KEY` — only if music features are exercised in staging; otherwise omit.

### F. Staging gaps found vs `.env.example`
1. `GOOGLE_API_KEY` is read (fallback) but absent from `.env.example` — document or remove usage.
2. `GOOGLE_MAPS_API_KEY` is read (env schema) and absent from `.env.example` — add to docs or drop from schema.
3. `.env.example` contains `ADMIN_PASSWORD` (used only by local seeding; not validated) — keep, documented as local-only.
4. No value in any of these is committed to the repo — verified via `.gitignore` + `git ls-files` (only `.env.example` tracked, placeholders only).

## 4. Vercel staging deployment plan (owner actions)

1. Create project `grooveph-staging` (same repo, branch `staging`) **or** add `staging` branch with branch-scoped env.
2. Node 24 (matches CI/local; `engines` not pinned — owner choice, do not change now).
3. Set env vars per §3A–E (staging values only). Do NOT copy any production value.
4. `npm run build` must pass on that project; crons in `vercel.json` do not fire outside production (Vercel behavior) — staging crons exercised only via manual `curl -H "Authorization: Bearer $CRON_SECRET"`.
5. `images.remotePatterns` and `optimizePackageImports` in `next.config.ts` are fine unchanged.
6. Pin `X-Robots-Tag: noindex` (or Vercel Deployment Protection) for the staging URL.
7. `/api/health` usable as the uptime probe.

## 5. Security separation assessment (static code review — NOT live DB verification)

| Control | Evidence | Status |
|---|---|---|
| No production credentials in tree | `git ls-files`: only `.env.example` (placeholders); `.gitignore` blocks `.env*` | OK |
| RLS authority | RLS documented + enforced in migrations (00–42); RPCs security-definer | Code OK; live verification required (§2 post-steps) |
| Portal guards | middleware 307s unauthenticated visitors to `/login` (verified 2026-11-20) | OK |
| Cron fail-closed | `lib/cron/auth.ts`: missing `CRON_SECRET` → 503 in production | OK |
| Email route hardening | `app/api/send-email/route.ts`: rate-limit + same-origin; from-address env-driven | OK |
| Client bundle hygiene | `@google/genai` server-only (`lib/ai/providers/gemini.ts`); no key reaches client chunks | OK |
| Admin gate | `ADMIN_EMAIL` env + `is_admin()` SQL literal must match exactly | **Owner decision + single alignment required** |
| No RLS bypass | scripts use service-role only server-side; signup trigger verified on scratch replay | OK |
| Storage policies | buckets created by migrations; policies from SQL (02/06/25/28/media_posts) | Code OK; verify on staging |

**What static review CANNOT prove:** RLS misconfiguration under live queries, storage policy edge cases, trigger behavior with real JWTs. These are exactly what §2's post-apply verification is for.

## 6. Synthetic test accounts (owner-verified, staging only)

| Account | Address (example.invalid) | Creation path | Verification |
|---|---|---|---|
| client | `qa-client@example.invalid` | `supabase/staging-seed.sql` (auth.users ONLY — profiles auto-created by trigger) | Verified via app by the staging admin at `/admin/verifications` |
| coach | `qa-coach@example.invalid` | same script, `app.staging_coach_password` | same |
| admin | pinned `ADMIN_EMAIL` (e.g. `admin+staging@example.invalid`-style or owner's mailbox you control) | `supabase/seed_admin.sql` (`app.seed_admin_password`) | `is_admin()` literal must equal this address |

Passwords: ≥12 chars, generated, stored in the owner's password manager — never in repo/docs/CI logs.
No account is created in production; no SQL flips verification fields (`guard_verification_fields()`).

## 7. Rollback / reset

- Staging is disposable: drop the project & recreate; re-run §2 order. Do **not** reset production.
- Production recovery: `docs/BACKUP_RECOVERY.md` (owner runbook). Never rehearse on production.
- If a migration fails mid-chain on staging: stop, export the DB dump if any data worth keeping (synthetic only), fix, re-apply from clean — all seeds are synthetic.

## 8. Release order when staging goes green

1. §2 chain applied, §2 verification table recorded with zero mismatches.
2. §6 accounts created; client/coach/admin smoke pass (register → verify → book → sign → message → pay → admin actions).
3. `docs/RELEASE_CHECKLIST.md` walk-through.
4. Production deploy only with explicit owner approval.

## 9. Known gaps requiring owner action (blocking)

1. Provision the staging Supabase project (free tier).
2. Provision the Vercel staging project/branch + env vars (§3A–E).
3. Decide and align ONE staging admin email across `.env.example` docs, `ADMIN_EMAIL`, `migrations/40_is_admin_stable.sql`, and seeds.
4. Choose Resend sandbox/staging domain + verify sender.
5. Google Maps keys: staging-scoped + referrer restrictions.
6. Confirm `41_security_hardening.sql` + `42_shirt_designs.sql` are intended for the rehearsed chain (they are untracked in this tree).
7. `agent_runs` codification (`43_agent_runs.sql`) before enabling any ingest cron in staging.
8. Decide Deployment Protection / `X-Robots-Tag` for the staging origin.

---
*File created by the Release readiness pass. Nothing here grants production access. Every action in this document is owner-executed and owner-approved.*
