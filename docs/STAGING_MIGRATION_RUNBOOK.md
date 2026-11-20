# GroovePH — Staging Migration Runbook

> 2026-11-19 · Phase 7 STEP 3. Executable script for rehearsing the database chain on **staging only**. The chain was replay-proven on a throwaway Postgres 16 scratch in Phase 6 (schema → admin_hardening → verification_workflow → 00…41, all exit 0).
>
> **DO NOT run any of this against production.** Every step here writes schema/data. If the connection you use is not provably the staging project, stop.

## 0. Owner confirmation required before starting 🔒

- [ ] A Supabase project named e.g. `grooveph-staging` exists (free tier is fine) and is **not** the production project. Note its ref in the Vercel staging env.
- [ ] You have the staging **SQL Editor** access or a `psql` connection string with the **postgres** role (service access, not the anon key).
- [ ] You understand the apply order (§2). Files applied out of order fail by design.
- [ ] Staging is empty (fresh project). If you ran anything in it before, note it here — the order in §2 tolerates re-runs (all migrations are idempotent or re-runnable post-Phase-6), but counts in your verification report should match expectations.

## 1. Preconditions the files assume

| Requirement | Satisfied by |
|---|---|
| `auth.users`, `auth.uid()`, `auth.role()` | Supabase platform (all hosted projects) |
| `storage.buckets`, `storage.objects`, `storage.foldername/filename/extension()` | Supabase platform |
| Roles `anon`, `authenticated`, `service_role` | Supabase platform (hosted) — when hand-running on vanilla Postgres you must emulate them (see Phase 6 stubs) |
| Extensions `pgcrypto`, `uuid-ossp`, `btree_gist` | available in Supabase hosted Postgres |
| `supabase_realtime` publication | Supabase hosted |
| `pg_cron` extension | offered by Supabase but **optional** — `37` detects absence and degrades to computed-on-read expiry with a NOTICE; staging may run without it |

> **Do NOT apply `supabase/presence_realtime.sql`** as part of the chain — it publishes `profiles` to the `supabase_realtime` publication, broadcasting full rows (email, phone, birthdate, address) to every authenticated socket (H-8). If live presence is needed, migrate to Supabase Presence first (owner decision); the repo's publication must stay at agreements/appointments/booking_events/messages/system_settings.

## 2. Apply order (proven)

Via the Supabase **SQL Editor**, open and run each file **in order**, or via `psql`:

```bash
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/admin_hardening.sql
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/verification_workflow.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Expected: **zero errors** through all 42 numbered migrations + the 3 manual files. Migration 29 prints a NOTICE (no-op by design). Migration `41` prints NOTICE lines for `search_path` retrofits and executor restrictions. `37` prints either "cron scheduled" or "pg_cron unavailable … skipping" — both are acceptable on staging.

If any file errors: **stop**. Do not "push through". Record the exact error line and file; compare with `docs/DATABASE_AND_SUPABASE.md` §1 (known-repaired defects) and `docs/SECURITY_AUDIT.md` §11. A file failing on staging that repaired cleanly in Phase 6 means the staging database is *not* fresh — restore/reset it or reconcile manually.

## 3. Duplicate & overlap analysis (what the rehearsal will prove)

| Overlap | Files | Behavior |
|---|---|---|
| Admin policies ×2 | `supabase/admin_hardening.sql` + `migrations/27_admin_hardening.sql` (copies) | Both now drop-then-create every policy (Phase 6 repair) — apply **both**, order irrelevant between them |
| Achievement badge RPC | `migrations/10` → `14` → `24` | 14 drops+recreates `get_user_badge_status` (fix); 24 drops+recreates it again (adds `badge_image_url`). Final shape = 24's 8-column version |
| `handle_new_user` | `schema.sql` → `23` → `24` | 23 restores search_path; 24 fully qualifies + empty search_path. Final = 24 |
| dance vs singing/acting/theater updates | `18` / `31`–`34` | CHECK-constraint drift (dance excludes `metro-manila`/`asia` and lacks `'rejected'` status; siblings allow both) — **pre-existing, documented, not "fixed"** in this phase; flag for Phase 8 |
| `is_admin()` ×3 | `schema.sql` → `27`/`admin_hardening.sql` → `40` | Final = migration 40 (STABLE, pinned email, `search_path` set) |
| Seeds | `seed.sql`, `seed_admin.sql` | **Manual, not part of §2.** Run only after §2 + §4 pass; both fail closed without `app.seed_admin_password` |
| `agent_runs` | **absent from all migrations** | Ingest logs depend on a table that exists only in production. Either create it manually in staging (`CREATE TABLE` matching prod) or accept `[ingest] Database upsert notice` warnings; codification is queued as `42_agent_runs.sql` (Phase 8) |

## 4. Post-apply verification (mandatory)

1. Run `scripts/verify-db-security.sql` against staging (read-only) — or paste the sections of `docs/DB_SECURITY_VERIFICATION.md` §1–§13 into the SQL Editor.
2. Record actual outputs; every check must match its expected value. Any mismatch is a finding for the owner, not something to waive silently.
3. Then apply seeds (§5) and create the three test accounts through the app registration flow — **after** M41 verification, because the registration trigger and achievements RPCs are exercised by signup.

## 5. Seeding staging safely (manual, synthetic-only)

- `supabase/seed.sql` — safe defaults (theme/app_name, welcome announcement). Neutral; no personal data.
- `supabase/seed_admin.sql` — **requires** `SET app.seed_admin_password = '<≥12 chars>';` first; seeds only the pinned admin identity.
- `supabase/staging-seed.sql` — creates `qa-client@example.invalid` and `qa-coach@example.invalid` (auth.users only; `profiles` + sub-profiles are auto-created by the signup trigger; verified end-to-end on the scratch replay). Requires `SET app.staging_client_password` / `SET app.staging_coach_password` (both ≥ 12 chars) **in the same session** — forgot them and the script aborts cleanly with nothing created. Accounts start **UNVERIFIED**; verify them through the app with the pinned staging admin (`/admin/verifications`) — `guard_verification_fields()` blocks any other writer, even postgres. Do not try to flip verification with SQL.
- The admin for staging is `seed_admin.sql` (pinned address). A seeded `qa-admin` would clamp to `client` at signup and could never reach `/admin/*`.
- Never `pg_dump` production into staging.
- Staging stays synthetic permanently — do not "promote" it to hold real member data.

## 6. Execution checklist (print this)

- [ ] §0 confirmations done (staging exists, empty, connection in hand)
- [ ] `schema.sql` — exit 0
- [ ] `admin_hardening.sql` — exit 0
- [ ] `verification_workflow.sql` — exit 0
- [ ] `00`–`41` — all exit 0 (record any NOTICEs)
- [ ] `scripts/verify-db-security.sql` — §1–§13 all match expected
- [ ] `seed.sql` — exit 0
- [ ] `seed_admin.sql` (with `app.seed_admin_password`) — exit 0
- [ ] staging-seed or app-registration path for qa-client/qa-coach — done
- [ ] QA_REGRESSION_CHECKLIST.md executed against staging — all rows pass/fail with evidence
- [ ] `docs/RELEASE_CHECKLIST.md` updated with actual results (date, operator, outputs)

## 7. Rollback

- Before first seed: staging is disposable — if anything fails, delete and recreate the Supabase project, start from §1. 5 minutes.
- After seed: same — do not repair a polluted staging by hand; recreate it.
- Production rollback for a bad migration: restore the pre-migration backup (see `docs/BACKUP_RECOVERY.md`); never "fix forward" on prod.
