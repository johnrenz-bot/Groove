# GroovePH — Database & Supabase Guide

> Verified against `supabase/` on 2026-11-19. The database is the **only** real authorization boundary for member data (RLS). Application code decides *who may enter*; Postgres decides *what rows they see*. **Read this before touching any data code.**

## 1. Layout of `supabase/` (63 entries)

```
supabase/
├── schema.sql                 ← canonical baseline (459 lines): tables, enums, handle_new_user trigger, RLS enable, is_admin() (original)
├── admin_hardening.sql        ← admin role/email pin in SQL + admin_activity_log + guard_role_assignment + guard_verification_fields…
├── storage_policies.sql       ← bucket policies (verification-documents, avatars, …)
├── messenger.sql, presence_realtime.sql, community_feed.sql, media_posts.sql, studios.sql, verification_workflow.sql
├── seed.sql, seed_admin.sql, seed_dance_orgs.sql, seed_dance_leagues.sql
├── migrations/                ← 41 numbered migrations, 00 → 40
│   00_appointment_reference.sql … 39_realtime_publication_system_settings.sql, 40_is_admin_stable.sql
└── .temp/                     ← Supabase CLI state (linked project ref, versions) — gitignored, not app config
```

There is **no** `config.toml`, **no** `functions/` (no Edge Functions), and **no** schema `.md`. Migrations are applied manually via the Supabase SQL editor; their order matters (00→41).

**Correct manual-apply order (proven end-to-end on Phase 6 scratch replay, Postgres 16):** `supabase/schema.sql` → `supabase/admin_hardening.sql` → `supabase/verification_workflow.sql` → then `supabase/migrations/00_…` … `41_…`. Every file exits 0 in this order. Migration 29 is an intentional no-op.

**Files repaired in Phase 6 (all were un-appliable or un-rerunnable as written):**
- `migrations/02_booking_schema.sql` — `EXCLUDED` typo (was `EXCLUDE`)
- `migrations/04_hotfix_user_status.sql` — double-quoted regex literals (×2) → dollar-quoted; policy drop name aligned (`Verified clients can book appointments`)
- `migrations/05_hotfix_foreach.sql` — ambiguous `oid` → `p.oid`
- `migrations/14_fix_badge_status_and_rls.sql` — drop-before-recreate `get_user_badge_status` (return type)
- `migrations/24_qualify_user_role_enum.sql` — drop-before-recreate `get_user_badge_status` (7→8 columns incl. `badge_image_url`)
- `migrations/26_personal_info_masking.sql` — drop-before-recreate `v_public_profiles`/`v_profiles_masked` (column type change)
- `migrations/27_admin_hardening.sql` + `supabase/admin_hardening.sql` — `DROP POLICY IF EXISTS` guards added (they duplicated each other; both are now re-runnable)
- `supabase/admin_hardening.sql` + `supabase/verification_workflow.sql` — bare `SELECT` in plpgsql sanity blocks (always errored); rewrote as `IF NOT EXISTS` checks
- `migrations/29_profiles_column_security.sql` — superseded → documented no-op (it previously could drop the self-update policy and then fail)
- `migrations/23`/`24` earlier truncation of non-SQL transcript tails; `migrations/41_security_hardening.sql` (new, Phase 5/6) — validated, applies clean

## 2. Tables (created by schema + migrations)

**Core (schema.sql):** `profiles`, `coach_profiles`, `client_profiles`, `appointments`, `agreements`, `messages`, `community_posts`, `comments`, `post_reacts`, `user_profile_posts`, `feedbacks`, `notifications`, `announcements`, `maintenance_notices`, `tickets`, `system_settings`

**Added later by migrations:**
`booking_events` (02), `profile_follows` (09), `achievements` + `user_achievements` (10), `music_playlists` (16), `crews`, `crew_members`, `crew_results` (17), `dance_updates` (18), `dance_orgs` (19), `gcash_profiles` (21, reworked in 25), `payment_transactions` (21), `admin_activity_log` (27), `singing_updates` (31), `acting_updates` (32), `theater_updates` (33), `booking_reminders` (37), studios-related dedup work (34), plus views (`15_public_profile_view.sql`), performance indexes (38), realtime publication (39), `is_admin()` → STABLE SQL (40).

**Cross-reference from code:** the five discipline/agent tables (`dance/singing/acting/theater_updates`, `agent_runs`), plus everything the app touches through `.from('…')` — counts observed: `profiles` 95, `appointments` 38, `coach_profiles` 15, `feedbacks` 14, `agreements` 14, `client_profiles` 10, `community_posts` 10, `notifications` 9, `messages` 9, `tickets` 9, `gcash_profiles` 7, `payment_transactions` 5, `maintenance_notices` 5, `agent_runs` 4, `comments` 4, `announcements` 4.

## 3. Storage buckets

| Bucket | Public? | Used by | Path convention |
|---|---|---|---|
| `verification-documents` | **private** | Registration ID uploads, verification review, tickets attachments | `clients/<uid>/<ts>_<id>.<ext>`, `coaches/<uid>/…`, `tickets/<uuid>-<name>` |
| `contract-signatures` | **private** | Agreement canvas signatures (drawn at signing time) | `contract-signatures/<appointment_id>/<party>-<unix>.png` |
| `payment-qr-codes` | **private** | GCash QR upload | `<uid>/<epoch>.<ext>` |
| `media-posts` | (policies in `media_posts.sql`) | Community post media | per-post paths |
| `avatars` | **public** | Avatar/cover (deterministic `avatars/<uid>/cover.jpg`) | public URL construction in `lib/profileCover.ts` |

Signed URLs are generated on demand (`SIGNED_URL_TTL_SECONDS = 1800` in `lib/utils.ts`). **Storage paths**, never signed URLs, are persisted in tables.

## 4. Authorization model

```mermaid
flowchart TD
    U[Browser client] -->|RLS as caller| T1[(all app tables)]
    S[Server (RSC/actions/API)] -->|cookie client, RLS as caller| T1
    S -->|service-role, RLS bypassed| T2[(admin lifecycle, agents, tickets fallback)]
    SQL[public.is_admin()] --- T1
    note[Every admin RLS policy uses is_admin()] --- SQL
```

- `profiles` RLS: row-level read by members; column-level privacy is enforced at the **application layer** via `PUBLIC_PROFILE_COLUMNS` (`lib/publicProfile.ts`) because RLS cannot restrict columns. Migrations `15`, `26`, `29` add masking/column-security hardening at the DB level where possible.
- `public.is_admin()` — `SECURITY DEFINER`, pinned to the admin address (literal in SQL; mirrors `ADMIN_EMAIL`). Converted to inlinable STABLE SQL in migration 40.
- Triggers: `handle_new_user` (auto-creates `profiles` on signup), `guard_booking_transition()` (booking state machine — enforced in DB; `lib/…bookingStatus.ts` mirrors it for UX), `guard_role_assignment`, `guard_verification_fields`, `guard_verification_approval`, `expire_past_bookings()` (+ cron in migration 37).

## 5. Key relationships (logical)

```
auth.users ──1:1── profiles ──1:1── client_profiles / coach_profiles
profiles ──< profile_follows >── profiles
profiles ──< appointments (client_id, coach_id) >── coach_profiles
appointments ──1:1── agreements (booking-scoped signatures)
appointments ──< booking_events ; agreements ──< booking_events
profiles ──< feedbacks (booking_id)
profiles ──< community_posts ──< comments , post_reacts
profiles ──< notifications , user_achievements
*_updates (dance/singing/acting/theater) ← agents + ingest API routes only
admin_activity_log ← /api/admin/audit
```

## 6. Environment variables (NAMES only — never values)

Defined in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PASSCODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `INGEST_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `YOUTUBE_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_PLACES_API_KEY` (and `GOOGLE_MAPS_API_KEY` consumed by `lib/config/env.ts`).

`.env` and `.env.local` exist in the working tree and are gitignored (`.env.*` excluded, `!.env.example` allowed). **Do not print, copy, or modify them.**

## 7. How to run a safe DB change (checklist for future work)

1. Never edit applied migrations; add a new numbered file.
2. `handle_new_user`/username-collision changes affect registration — pair with signup tests.
3. Changing the admin email ⇒ migration + env + redeploy together.
4. Anything touching `profiles` columns ⇒ check `PUBLIC_PROFILE_COLUMNS` (`lib/publicProfile.ts`) and `lib/masking.ts` in the same change.
5. Agent/ingest tables (`*_updates`) are written only by cron/ingest routes; do not allow ad-hoc client writes.
6. Booking transitions must stay in sync across three layers: SQL `guard_booking_transition` (authority), `features/appointments/services/bookingStatus.ts` + `scripts/test-booking-status.ts` (mirrors), and `features/booking/services/agreementStatus.ts` (display).

## 8. Migration inventory (quick index)

| # | File stem | Adds |
|---|---|---|
| 00 | appointment_reference | reference data for appointments |
| 01–08 | booking_enum…feedback_booking_reference | booking schema, enums, hotfixes |
| 09 | profile_follows | follow graph |
| 10 | achievements | achievements + user_achievements |
| 11–13 | suffix/barangay/badge description | fixes |
| 14 | badge_status_and_rls | RLS for badges |
| 15 | public_profile_view | masked public view |
| 16 | music_playlists | playlists |
| 17–20 | dance_… | crews, dance_updates, dance_orgs, image provenance |
| 21 | gcash_payment_system | gcash_profiles, payment_transactions |
| 22 | messenger_read_at | read receipts |
| 23 | handle_new_user_duplicate_username | signup trigger fix |
| 24 | qualify_user_role_enum | enum qualification |
| 25 | gcash_qr_codes | QR variant (recreates gcash_profiles) |
| 26 | personal_info_masking | masking layer |
| 27 | admin_hardening | admin_activity_log + pin |
| 28 | storage_verification_fix | bucket policy fix |
| 29 | profiles_column_security | column security |
| 30 | legacy_admin_investigation | audit of legacy admin |
| 31–33 | singing/acting/theater_updates | discipline content |
| 34 | performing_arts_dedup_composite | dedup |
| 35 | dance_league_registry | leagues |
| 36–37 | booking_lifecycle_enum/cron | lifecycle + expiry cron |
| 38 | performance_indexes | indexes |
| 39 | realtime_publication_system_settings | realtime publication |
| 40 | is_admin_stable | inlinable is_admin() |
| 41 | security_hardening | Phase 5: search_path retrofit (all definers), achievement RPC caller-authority guard + 0–100 clamp, participant-scoped notifications INSERT, REVOKE EXECUTE on cron RPCs (idempotent, additive, rollback per section) |

> Files `23`/`24` were repaired in Phase 5 (leaked non-SQL transcripts truncated); `29_profiles_column_security.sql` is **invalid SQL and must not be applied** — superseded by migration 41's guards (see `docs/SECURITY_AUDIT.md`). `media_posts.sql`'s broken comment was fixed. `seed.sql`/`seed_admin.sql` no longer contain credentials.

## 9. Scratch replay (Phase 6 verification)

A throwaway Postgres 16 container (localhost only, `:ro` repo mount, deleted after) was initialized with Supabase-compatibility stubs (auth schema, storage schema/objects/buckets, cron schema, `supabase_realtime` publication, roles `anon`/`authenticated`/`service_role`) and the repository's SQL was replayed in the §7 order. Result: **schema + 2 manual scripts + 42 migration files — all exit 0.** Migration 41's semantics were verified with simulated roles: stranger→achievement RPCs refused; self allowed; `authenticated` denied on cron RPCs; `service_role` allowed; forged notification INSERT blocked by RLS; self-INSERT allowed. The stub is **not** committed; any staging verification must use the staging project itself (`docs/DB_SECURITY_VERIFICATION.md`).

**Phase 7 re-verification:** the replay was repeated and `scripts/verify-db-security.sql` (read-only catalog dump) was executed against the replayed database — §1 shows all 33 public tables `relrowsecurity = t`; §3 shows the participant-scoped notifications INSERT policy; §4 shows every SECURITY DEFINER function carrying a `search_path`; §8 shows `supabase_realtime` = agreements/appointments/booking_events/messages/system_settings (**profiles not published**); §12/§13 show private buckets with owner/admin-scoped policies. `supabase/staging-seed.sql` was also rehearsed: both QA members created via the signup trigger (profiles + sub-profiles auto-created, unverified as required).

> **Do not apply `supabase/presence_realtime.sql`** — it publishes `profiles` to the publication (H-8). It is not part of the migration chain; see `docs/STAGING_MIGRATION_RUNBOOK.md` §1.

## 10. Data-access cheat sheet by feature

| Feature | Tables | Via |
|---|---|---|
| Auth/profile | `profiles`, `coach_profiles`, `client_profiles` | browser client (RLS) |
| Bookings | `appointments`, `agreements`, `booking_events`, `feedbacks` | browser + server actions + DB triggers |
| Messaging/Hub | `messages` | browser client + Realtime |
| Community | `community_posts`, `comments`, `post_reacts` | browser client |
| Studios | `studios` (+ Google Places) | route handler `/api/studios` (anon key by design) |
| Disciplines | `*_updates`, `agent_runs` | cron/agent/ingest only (service-role) |
| Admin | all (RLS + `is_admin()`), `admin_activity_log` | browser client; service-role for account lifecycle |
| Notifications | `notifications` | browser client + Realtime |
| Payments | `gcash_profiles`, `payment_transactions` | browser client; bucket `payment-qr-codes` |
