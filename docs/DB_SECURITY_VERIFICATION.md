# GroovePH — Database Security Verification (Staging)

> 2026-11-19 · Phase 6 Task 3; §0 runnable script added Phase 7. **These queries are read-only.** Run them on STAGING, never in production. Compare results against the "expected" column. Nothing here proves itself — paste outputs next to each section when executed.
>
> Method note: every expectation below was reproduced on a throwaway Postgres 16 scratch initialized from this repository (Phase 6–7 replays). The live staging database must match it (run the script); the production database is explicitly out of scope.

## 0. Runnable verification script

`scripts/verify-db-security.sql` — the read-only counterpart of §1–§13, written for `psql`:

```bash
psql "$STAGING_DB_URL" -f scripts/verify-db-security.sql
```

Validated on the Phase 7 scratch: it prints RLS status per table (all 33 `t`), policies, definers + `proconfig`, publication membership, uniques/FKs/CHECKs, buckets and storage policies. Save the output as `docs/staging-verification-<date>.txt` and paste section results into the release checklist.

**Expected highlights captured from the replay (your staging must match):**
- §4: all 32 SECURITY DEFINER functions carry a `search_path` (empty-string paths are the strongest, not missing).
- §8: publication = `agreements, appointments, booking_events, messages, system_settings` — **profiles absent**.
- §12/§13: all buckets private; storage policies owner/admin-scoped with filename-shape checks.

## 0.1. Pre-flight (must run first)

```sql
SELECT tablename, policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, policyname;

SELECT oid::regprocedure AS function, prosecdef, proconfig
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
 ORDER BY proname;

SELECT t.tgname, c.relname AS table_name, t.tgenabled
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal
 ORDER BY c.relname, t.tgname;

SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## 1. RLS enabled on every table

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;
```
**Expected:** `relrowsecurity = true` for **all** rows (~41 in schema+migrations). Zero exceptions tolerated.

## 2. Profiles / coach_profiles / client_profiles privacy

```sql
SELECT policyname, cmd, qual FROM pg_policies
 WHERE tablename IN ('profiles','coach_profiles','client_profiles')
 ORDER BY 1,2;
```
**Expected after migration 41 + §E review:**
- `profiles`: member self row, admin full access, **no `USING (true)` SELECT policy** (this is the §C-2 upgrade — requires the dependency checks in §5 first).
- `coach_profiles`/`client_profiles`: owner+admin read paths; `valid_id_path`/`id_selfie_path` not world-readable.

⚠️ Base-schema drift check: confirm there is **no** policy literally named
`Public can view profiles` / `Public can view coach profiles` / `Public can view client profiles` / `Public can view feedback` / `Public can view community posts` / `Public can view comments`.
If any exist, §E-1/§E-2 of migration 41 were never applied — record and plan the drop with the owner.

## 3. Notifications INSERT is scoped

```sql
SELECT policyname, with_check FROM pg_policies
 WHERE tablename = 'notifications' AND cmd = 'INSERT';
```
**Expected:** exactly one row — `Members can notify people they share a record with` with the shared-appointment/shared-message/`is_admin()`/self `WITH CHECK`. No `WITH CHECK (true)` anywhere on notifications.

## 4. Achievement RPCs require a caller

```sql
SELECT proname, prosecdef, proconfig
  FROM pg_proc
 WHERE proname IN ('update_user_achievement_progress','ensure_user_achievements');
```
**Expected:** both `prosecdef = true` and `proconfig` contains `search_path=public, pg_temp`.
Runtime proof (execute as a throwaway authenticated user): the stranger call returns `Not authorized`; self call succeeds; `progress` is clamped ≤ 100. (Proven on scratch.)

## 5. Cron/service-only RPCs are restricted

```sql
SELECT proname, proacl FROM pg_proc
 WHERE proname IN ('expire_past_bookings','send_booking_reminders','fn_reminder_once');
```
**Expected:** `proacl` grants EXECUTE only to `service_role` (+ owner), never to `PUBLIC`/`anon`/`authenticated`.

## 6. SECURITY DEFINER functions set search_path

```sql
SELECT proname FROM pg_proc
 WHERE prosecdef AND pronamespace = 'public'::regnamespace
   AND (proconfig IS NULL OR NOT (proconfig::text ILIKE '%search_path%'));
```
**Expected:** **zero rows** (migration 41 §A retrofits all; spot-check `is_admin`, `guard_*`, `notify_booking_parties`).

## 7. Triggers present and enabled

```sql
SELECT t.tgname, c.relname, t.tgenabled
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE t.tgname IN ('guard_booking_transition','guard_agreement_edit_scope',
                    'guard_agreement_signature','guard_verification_fields',
                    'guard_verification_approval','guard_role_assignment',
                    'handle_new_user','on_auth_user_created')
 ORDER BY 1;
```
**Expected:** all rows present, `tgenabled = 'O'` (origin — fires always). `guard_booking_transition` on `appointments` BEFORE UPDATE OF status.

## 8. Realtime publication scope

```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
**Expected:** `messages`, `appointments`, `agreements`, `booking_events`, `system_settings`(? per migration 39 intent), **NOT `profiles`** (PII broadcast — H-8). If `profiles` is present, record as finding; do not remove live without the presence/UX decision in writing.

## 9. Uniqueness constraints the schema relies on

```sql
SELECT indexname, tablename, indexdef FROM pg_indexes
 WHERE indexname IN ('agreements_appointment_id_key','booking_reminders_appointment_kind_sent_by_key',
                     'post_reacts_post_id_user_id_key','user_achievements_user_id_achievement_id_key');
```
**Expected:** all present.

## 10. Foreign keys on hot references

```sql
SELECT conrelid::regclass AS table_name, conname, confrelid::regclass AS referenced
  FROM pg_constraint
 WHERE contype = 'f' AND conrelid::regclass::text IN ('notifications','appointments','agreements','messages','booking_events','feedbacks');
```
**Expected:** notifications.user_id→profiles, .appointment_id→appointments; agreements.appointment_id→appointments (unique); booking_events.appointment_id→appointments; messages sender/receiver→profiles; feedbacks.appointment_id→appointments.

## 11. CHECK constraints

```sql
SELECT conrelid::regclass, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE contype = 'c'
   AND conrelid::regclass::text IN ('appointments','feedbacks','post_reacts','user_achievements',
                                    'singing_updates','acting_updates','theater_updates','dance_updates')
 ORDER BY 1,2;
```
**Expected:** rating 1..5 on appointments/feedbacks; progress ≥ 0 (and ≤ 100 after migration 41); category/region/status checks on the updates tables.

## 12. Service-role posture

```sql
SHOW role;                 -- connected as postgres/owner via SQL Editor (not anon key!)
SET ROLE authenticated;    -- then re-run §4/§5 to confirm the DENY paths
RESET ROLE;
```

## 13. Scratch-replay result (Phase 6–7 verification)

| Step | Result |
|---|---|
| `schema.sql` + `admin_hardening.sql` + `verification_workflow.sql` | ✅ apply clean |
| Migrations 00–41 | ✅ **all apply clean** (exit 0) |
| Migration 41 semantics (self allowed / stranger denied / service_role allowed / forged notification RLS-blocked) | ✅ proven with simulated roles |
| Latent defects found and repaired by replay | `02` `EXCLUDED` typo · `04` double-quoted regex ×2 + policy name mismatch · `24` drop-before-recreate `get_user_badge_status` (7→8 cols) · `26` drop-before-recreate views · `27` idempotent policies · `05` ambiguous `oid` · `14` drop-before-recreate function · `29` superseded no-op |
| `verification_workflow.sql` / `admin_hardening.sql` bare-SELECT sanity blocks | repaired (they always errored as written) |

**Anything above not reproducible on staging must be investigated before any production approval.**
