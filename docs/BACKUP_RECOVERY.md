# GroovePH — Backup & Recovery Plan

> 2026-11-19 · Phase 6 Task 6. **Nothing here authorizes a production restore.** A restore drill is recommended on *staging* only. Plan availability is a Supabase dashboard/billing question — verify per project; prices and entitlements change.

## 1. What must be backed up

| Layer | Contents | Mechanism |
|---|---|---|
| Postgres | all tables (schema, auth triggers, RLS, functions) | Supabase managed backups / PITR (plan-dependent) |
| Storage | buckets `verification-documents`, `contract-signatures`, `media-posts`, `payment-qr-codes`, `studios-media`(?), `tickets/*` objects | Supabase storage (not covered by Postgres backups) — **owner must export/verify separately** |
| Auth | Supabase Auth users (separate schema, `auth.users`) | Included in Postgres backups of the `auth` schema |
| Realtime/cron config | `cron.job`, publication config | Included in Postgres backups (cron.job lives in the `cron` schema) |

## 2. Target objectives (owner to confirm)

| Metric | Target | Notes |
|---|---|---|
| RPO | ≤ 24 h (daily backups) or ≤ 5 min with PITR | Bookings/agreements are the business-critical records; set by owner |
| RTO | ≤ 4 h | Restore-to-new-project + DNS/env cutover; rehearse on staging |

## 3. What Supabase provides (verify in dashboard — plan-dependent) 🔒

- **Free tier**: historically daily backups with limited retention; **point-in-time recovery is a paid add-on**. Treat Free as “no usable backups for recovery” until verified — check the project's Dashboard → Database → Backups.
- **Pro plan**: daily backups (7-day retention typically) + optional PITR add-on (WAL archiving, 2-minute RPO).
- Restores on hosted Supabase create a **new project** (or restore in place with data loss since snapshot). Understand the exact semantics before relying on them.

## 4. Restore procedure (documented, not executed)

1. Freeze writes: set the app into maintenance mode (`system_settings.maintenance_mode` — the app has a maintenance-notice banner infrastructure; or block writes at the proxy).
2. In Supabase Dashboard → Database → Backups: pick the closest backup **before** the incident; or PITR to a timestamp.
3. Restore to a **new project** (safest): new project → note URL/keys.
4. Re-point the app: update `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` on Vercel (this is why `.env.example` is exhaustive) → redeploy.
5. Storage: buckets are separate — either copy objects via `supabase storage cp` between projects, or keep the original project's buckets if only the DB was lost (restore-to-new-project breaks object URLs if buckets don't move).
6. Validate: run the **verification queries** in `docs/DB_SECURITY_VERIFICATION.md` against the restored project; then run the QA checklist against it.
7. Redirect/unfreeze only after smoke tests pass; keep the pre-restore project read-only for forensics until the incident is closed.

## 5. Storage recovery (the gap nobody plans for)

- Buckets' object metadata is in `storage.objects` (Postgres, backed up); the **bytes** live in Supabase's object storage (not in nightly DB dumps in the same simple sense).
- Action: confirm with Supabase support/docs how object storage is replicated (S3-compatible backing); schedule a quarterly export of `verification-documents` + `contract-signatures` (signed URLs expire; the export must be done with service role or a signed manifest) to an owner-controlled bucket/archive.
- Document the restore path for storage objects (re-upload from export) and test it once on staging.

## 6. Migration-specific recovery

- Every migration file in this repo is **re-runnable** (Phase 6 scratch-replay: all apply clean in order; the only no-op is 29).
- Recovery from a bad migration: restore the pre-migration backup (staging first!); then re-apply 00→N-1; fix the offending file; re-apply N.
- Migration 41 is non-destructive by design (per-section rollback documented in its header) — but it tightens privileges; rolling *back* 41 means re-granting PUBLIC EXECUTE and re-opening the notifications policy: do it only if 41 breaks a verified staging flow, and record why.
- `docs/DATABASE_AND_SUPABASE.md` §7 describes the safe-change checklist; keep it.

## 7. Staging restore drill (recommended, owner-approved)

1. On staging: snapshot now (or after a known seed).
2. Corrupt something **non-sensitive** on the staging DB (e.g. delete a test booking via SQL).
3. Restore from the snapshot to a new staging project; re-point a staging env branch at it.
4. Verify: §DB_SECURITY_VERIFICATION passes; QA checklist (client flows) passes; measure elapsed time → that's your RTO evidence.
5. Delete the drill project.

## 8. What is NOT backed up and must be accepted

- Vercel build artifacts — rebuildable from source; not backed up (correct).
- `.env*` files — not in git by design; **the owner must hold them in a password manager**; losing them = rebuilding all keys (Resend, Gemini, etc.) from vendor consoles.
- Vercel/Next deployment config — `vercel.json` is in git; project settings are dashboard-side; document them after any change.

## 9. Monthly owner checklist (5 minutes)

- [ ] Dashboard → Backups: latest backup < 48 h old (Free) / < 24 h (Pro) / PITR enabled.
- [ ] One signed URL re-generated successfully (proves storage + auth path).
- [ ] `agent_runs` rows increasing (proves cron + service role work).
- [ ] Restore drill on staging at least once per quarter.
