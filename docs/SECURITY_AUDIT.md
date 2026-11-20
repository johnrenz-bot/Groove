# GroovePH — Phase 5 Security & Reliability Audit

> 2026-11-19 · Method: full code read (auth stack, guard, middleware, 30 route handlers, server actions, RLS policies, migrations 00–40, storage policies, env handling) + `npm audit`. **Application state of manual SQL scripts on the live database cannot be proven from this repo — items marked "verify on live DB" were not executed against it.** Companion: `PRODUCTION_READINESS.md`.

## 1. Executive summary

The application's **server-side** security model is genuinely strong: defense-in-depth auth gates (proxy → layout → `requireAdmin` → `is_admin()` + RLS), pinned-admin identity, masked public profiles, fail-closed cron guards (now with constant-time digest comparison), private storage buckets with shape-enforced paths, column allowlists, and a clean dependency audit after the framework upgrade.

The **database** is the weak flank, and almost none of it is provable from the repo because migrations are applied manually:

- Two **CRITICAL** self-service escalation paths (own-profile verification fields; agreement forgery chain) — one blocked by the lost `verification_workflow.sql`, one by missing INSERT scoping.
- A public World-readable `profiles` base-table policy that defeats the entire masking layer.
- Three dangerous `SECURITY DEFINER` RPCs callable by anyone (achievement forgery; notification injection; unauthenticated sweeper).
- Two migration files contained **leaked LLM transcripts** and could not run at all; one migration (29) is invalid SQL; one storage file was syntactically broken.
- The cron guard used a home-grown 32-bit "hash" for its timing-safe compare (fixed in Phase 5 code; digest now SHA-256 + `timingSafeEqual`).

**Fixes applied in Phase 5 (code):** cron guard constant-time comparison + 7 regression tests; `/reset-password` middleware bounce (recovery flow was unreachable); seed files scrubbed of hardcoded weak credentials and personal emails; broken SQL files repaired; Next.js 16.3.3 → 16.4.6 (critical RCE + 3 high-severity advisories) + transitive `sharp`/`zod`/`source-map-js` fixes; **`npm audit` now reports 0 vulnerabilities.**

**Fixes shipped as a new migration for manual application:** `supabase/migrations/41_security_hardening.sql` — search_path retrofit for every SECURITY DEFINER function, caller-authority guard + input clamp on the two achievement RPCs, participant-scoped notifications INSERT policy, `REVOKE EXECUTE` on the cron-only RPCs. Items that cannot be applied blindly (dropping the public-read base policies) are listed in §6 with pre-flight dependency checks.

## 2. CRITICAL

| ID | Where | Issue | Status |
|---|---|---|---|
| C-1 | `supabase/seed.sql`, `supabase/seed_admin.sql` | Hardcoded weak credential (`Admin123!`) seeding the platform admin; `seed.sql` also un-appliable (columns don't exist) and promotes any `username='admin'` to role admin | **Fixed in repo** — both seeds now require `app.seed_admin_password` (≥12 chars), fail closed otherwise, no personal addresses remain |
| C-2 | `schema.sql` "Public can view profiles/coach_profiles/client_profiles" `USING (true)` | Full PII (email/phone/birthdate/street + verification doc paths) world-readable; masking views are presentation-only; base table bypasses them | **Migration 41 §E-1** — staged with pre-flight dependency checks (public `/users`, `/api/users`, landing); NOT auto-applied |
| C-3 | `verification_workflow.sql` (never applied; migration 29 written to fix is invalid) | Own-row UPDATE lets any user set `account_verified`, `verification_status`, `approved_by` → booking-gate defeat | `verification_workflow.sql` needs to be codified as a numbered migration; **migration 29 is invalid and must not be run**; guard logic mirrored in migration 41 §B |

## 3. HIGH

| ID | Where | Issue | Status |
|---|---|---|---|
| H-1 | `migrations/10_achievements.sql:189` | `update_user_achievement_progress` — PUBLIC-callable definer; any caller may complete any user's achievement and unlock badges | **Fixed in migration 41 §B** — caller must be the target, a booking/feedback counterpart, the pinned admin, or service_role; progress clamped 0–100. `ensure_user_achievements` same treatment |
| H-2 | `lib/supabase/middleware.ts` | Authenticated recovery session bounced off `/reset-password` to the role home before the form could render — password reset was unreachable | **Fixed in code** — `/reset-password` exempt from the auth-route bounce |
| H-3 | `schema.sql:425` notifications `WITH CHECK (true)` | Any anon/authenticated caller could push arbitrary title/message/`cta_url` into any inbox (phishing channel with app branding) | **Fixed in migration 41 §C** — participant-scoped INSERT policy (self, pinned admin, shared appointment/message counterpart) |
| H-4 | `schema.sql:359,364` + H-1 | coach/client_profiles expose `valid_id_path`, `id_selfie_path`, `portfolio_path`, `payment_handle` publicly | **Migration 41 §E-1** — same staged fix as C-2 |
| H-5 | `migrations/29_profiles_column_security.sql` | `OLD`/`NEW` inside `CREATE POLICY` — cannot apply; self-service sensitive-column control exists in no form | **Superseded** — see migration 41 §B and the companion note; do not attempt to repair in place |
| H-6 | `migrations/37_booking_lifecycle_cron.sql` `fn_reminder_once` | PUBLIC definer; caller-chosen appointment + arbitrary title/body → notification injection into both booking parties, unlimited repeats | **Fixed in migration 41 §D** — REVOKE from PUBLIC/anon/authenticated, GRANT to service_role (pg_cron unaffected) |
| H-7 | `migrations/37:354` `expire_past_bookings`, `37:303` `send_booking_reminders` | Same exposure class as H-6 (bounded: expiry is idempotent) | **Fixed in migration 41 §D** |
| H-8 | `presence_realtime.sql` vs `39` | `profiles` in `supabase_realtime` publication → every UPDATE broadcasts **full row PII** to every authenticated socket, contradicting migration 39's own doctrine | **Needs live verification** — remove `profiles` from the publication (or move presence to Supabase Presence); not changed blindly since it powers the live badge/status UX |

## 4. MEDIUM

| ID | Where | Issue |
|---|---|---|
| M-1 | `/api/studios` | Unauthenticated; up to ~8 billed Google Places calls per nationwide sweep; 6h in-memory cache keyed on page query (defeated by distinct params). Add per-IP limiter + session requirement |
| M-2 | `/api/ai/coach-assistant` | Authenticated but **no rate limit** — burns AI quota; every other AI route caps spend |
| M-3 | `is_admin()` ×3 definitions | Base `schema.sql` unpinned role check vs hardened pinned copies (27/40); three sources of truth — keep migration 40 (STABLE, pinned, search_path) and never rely on base |
| M-4 | `/admin/verify-passcode` | Unthrottled 6-digit second factor that grants nothing (no cookie/flag; `/admin/*` doesn't consult it). Rate-limit + lockout, or delete |
| M-5 | manual SQL application path | `verification_workflow.sql`, `admin_hardening.sql`, `community_feed.sql` etc. applied by hand — repo cannot prove they are live; codify as numbered migrations |
| M-6 | `messenger.sql` recipient UPDATE policy | Recipient can rewrite sender's `message`/`media_path`; restrict to `read_at` via trigger or a `mark_message_read` RPC |
| M-7 | `/api/send-email` (user WIP — read-only assessment) | Anonymous-ish relay; missing `Origin` allowed; per-instance in-memory 3/min + 20/day; spoofable `x-forwarded-for`. Requires dedicated abuse analysis (user's in-progress work — do not touch) |
| M-8 | ingest routes `INGEST_API_KEY !==` | Non-constant-time compare; no body-size cap before `request.json()`; unify on digest compare + `MAX_BODY_BYTES` |
| M-9 | `next.config.ts` CSP | `'unsafe-inline'` in production `script-src` defeats CSP; `img-src https: http:` too broad; consider COOP/CORP; missing `worker-src` |
| M-10 | `migrations/21_gcash_payment_system.sql` | Recreates permissive "Anyone can view active gcash profiles" (is_active = true, 11-digit numbers). Superseded by 25; make 21 a no-op |
| M-11 | `lib/ai/providers/gemini.ts` | Reads `.env.local`/`.env` at request time and **file wins over process.env**; raw upstream error text reaches clients. Never echo provider bodies; map to stable codes (WIP routes already lean on this file — read-only assessment) |
| M-12 | `confirm_booking_when_both_signed` AFTER trigger | Assignments to `NEW` are discarded in AFTER triggers; works today only because `guard_booking_transition` force-UPDATEs agreements. Latent — move the two writes into a BEFORE trigger |
| M-13 | `guard_agreement_edit_scope` | Does not block `appointment_id` re-link, `status` flip, `countersigned_at` erasure — signing an agreement onto a different booking than was presented |
| M-14 | INSERT into appointments | No `BEFORE INSERT`/WITH CHECK forcing `status='pending'` — a crafted insert can create a pre-`confirmed` booking with no signatures, no audit row |

## 5. LOW (representative)

`/api/health` + `/api/groovey/health?fresh=true` are public and leak configuration fingerprint; `/api/users` is a public masked directory with no rate limit; cron `?key=` leaks into logs (Bearer preferred; **the `?key=` path is kept for Vercel Cron compatibility — see L-3 note in full report**); raw provider/Supabase messages echo to clients in several handlers (mapped generic copy recommended); `.env`/`.env.local` never committed (verified); no secrets found in tracked files; `verification-documents` bucket shares the `tickets/` prefix used for anonymous uploads (dedicated bucket preferred); `pg_cron` jobs not authenticated to any external caller (correct).

## 6. Fixes that need live-database verification before application

Run against production (read-only) **first**:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
SELECT oid::regprocedure, prosecdef, proconfig FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND prosecdef;
SELECT * FROM cron.job;  -- confirm the pg_cron jobs exist
```

Then, in order:

1. **Apply migration 41** (it is idempotent and non-destructive). Re-run §A/§D NOTICE output.
2. **Drop the masking-defeating base policies** (C-2/H-4) only after confirming every consumer (public `/users`, `/api/users`, landing page, community pages) reads through the views or server handlers. Proposed statements live in migration 41 §E-1 (commented).
3. **Community originals** (`Public can view community posts/comments`) — after confirming `/community/*` is member-only everywhere it matters.
4. **`guard_verification_fields` / `guard_verification_approval`** — codify `verification_workflow.sql` into a numbered migration (it closes C-3 end-to-end) and apply it; migration 29 must be discarded.
5. **Double-booking unique index** and **feedbacks UNIQUE(appointment_id,user_id)** — after duplicate-detection queries return zero rows (queries in migration 41 §E-3).
6. **`profiles` out of the realtime publication** (H-8) — after presence/UX verification.
7. **Agreement INSERT/UPDATE hardening** (M-13/M-14) — codify scoped policies + a `BEFORE INSERT` status clamp; requires an agreement-flow regression run.

## 7. Verified as correct (explicitly)

- Proxy/middleware gate: cookie-presence fast path → authoritative `getUser()` + `profiles` row; `/admin/**` requires session + role + pinned email; `user_metadata` never trusted for role; `account_not_ready` loop-safe; stale-session sign-out hygiene.
- Admin server gates: `app/admin/layout.tsx` re-checks identity per render; all `/api/admin/*` call `requireAdmin`; generic 403 copy; audit log written server-side from the verified session; admin DELETE refuses self and last-admin.
- Server actions (`app/actions/achievements.ts`) re-derive the actor and enforce self-or-participant before every mutation; `verify-passcode` action uses `timingSafeEqual` over SHA-256.
- Storage: buckets private with MIME/size limits and filename-shape policies; anti-traversal folder checks; owner-folder scoping; tickets upload is extension-from-MIME, ≤5 MB, `upsert:false`; signed URLs 30–60 min.
- RLS enabled on **every** table created in the repo (38/38); no `FOR ALL USING (true)`; no `auth.jwt()`/`raw_user_meta_data` authorization in any policy; achievements' old `USING (true)` policy dropped by migration 14.
- Cron guard: fail-closed in production; now constant-time; `?key=` accepted for scheduler compatibility.
- `.env`/`.env.local` git-ignored and never committed; `NEXT_PUBLIC_*` are browser-safe; service-role usage inventoried (see §8).
- `guard_booking_transition` UPDATE path: closed terminal states, two-signature `confirmed`, row-lock serialization, append-only audit — solid (its INSERT-side gap is M-14).
- `is_admin()` final form (migration 40): STABLE, pinned email, `search_path` set.

## 8. Service-role usage inventory (all sites, with why)

| Location | After what check | Why acceptable |
|---|---|---|
| `app/api/admin/users/route.ts` (4 sites) | `requireAdmin()` | auth.admin account management; RLS cannot do it; admin-only |
| `app/api/admin/audit/route.ts:43` | `requireAdmin()` | append-only audit; no client INSERT policy exists (by design) |
| `app/api/tickets/route.ts:89,124` | none (anonymous) | guest support tickets; fallback path only when RLS denies; upload into private bucket with allowlisted MIME/≤5 MB/no-overwrite; rate-limited 5/min/IP |
| `features/discipline/services/disciplineService.ts` (read) | none | read of published rows only; anon fallback equivalent |
| `features/discipline/services/disciplineService.ts` (write) | `INGEST_API_KEY`-gated cron route | ingest upserts; fail-closed; zod-validated; degraded to fallback on error |
| `lib/dance/globalImageDedup.ts` | build/cron script | script-only tooling |
| `scripts/sync-dance-logos.ts` | build/cron script | script-only tooling |

No service-role usage was found outside these; none was introduced in Phase 5. The dependency audit after the Next.js upgrade: **0 vulnerabilities**.

## 9. State-machine consistency (bookingStatus × hub board × SQL)

Compared the three implementations programmatically: `boardRules.canRoleDrop` ≡ migration 37's guard ∩ actor policy, exactly; `availableActions` adds verification/suspension gating and blocked reasons; `agreementStatusView` derives display only. **No rule was changed.** Added 64 regression tests (112 total with the Phase-5 cron suite: 119) pinning the equivalence, the client actor policy, `bucketOf` totality, and `moveOptions ⊆ canRoleDrop`. No shared universal abstraction was introduced (the granularities genuinely differ).

## 10. This document's limits

- The live database's policy/trigger inventory is unverified (manual application). Findings C-2/C-3/H-8/M-14 and the migration-41 plan must be validated with the queries in §6 before reliance.
- `app/api/send-email/route.ts` is the owner's in-progress work; assessed read-only (M-7) and never modified.
- No penetration testing, ZAP/nmap sweep, or auth-flow fuzzing was performed; dynamic testing needs staging credentials.

## 11. Phase 6 addendum — migration-chain replay & migration 41 validation (2026-11-19)

A throwaway Postgres 16 scratch (docker, localhost, `:ro` mount, destroyed after) was used to replay the repository's SQL from nothing. **Findings:**

1. The full chain (`schema.sql` → `admin_hardening.sql` → `verification_workflow.sql` → migrations 00–41) **now applies with exit 0 everywhere** — after repairing eight latent defects that had never been runnable: `02` (`EXCLUDED` typo), `04` (double-quoted regex ×2 + policy-name mismatch), `05` (ambiguous `oid`), `14`/`24` (CREATE OR REPLACE cannot change return type — `get_user_badge_status` grew a column in 24), `26` (view column-type change), `27` (CREATE POLICY without drop — collided with its root-script twin), and the two bare-`SELECT` plpgsql sanity blocks in the manual scripts (always errored as written). All repaired minimally, preserving semantics.
2. **Migration 41 validated**: applies clean; sections A–D work as designed — `SET search_path` retrofitted 8 definers with missing paths; both achievement RPCs refuse strangers (`Not authorized`); `authenticated` role gets `permission denied` on `expire_past_bookings`/`fn_reminder_once`; `service_role` unaffected; notifications INSERT policy blocks stranger inserts (`row-level security policy` violation) and permits self. §C was reordered to create-before-drop so no application path leaves the table without a policy.
3. **Migration 29 converted to a documented no-op** — it could never have applied (`OLD`/`NEW` in `CREATE POLICY`; and its step-1 DROP POLICY could have left members unable to update their own profiles if applied statement-by-statement). Its purpose is served by `verification_workflow.sql`'s triggers + migration 41 §B.
4. Newly repaired in Phase 6: `supabase/admin_hardening.sql`, `supabase/verification_workflow.sql` (the two manual scripts, both previously fatal).
5. **Still unverified from this machine:** what is actually present in the production Supabase project (policies, triggers, which files were applied, `pg_cron` jobs, publication membership, bucket contents). Run `docs/DB_SECURITY_VERIFICATION.md` on staging; never against production without owner approval.
6. The scratch stub emulated Supabase platform objects (auth schema, storage schema/buckets, cron schema, publication, roles). It is not a substitute for staging; validation is reported as *replay-clean + semantics-proven*, not as "production secure".

**Gate status after Phase 6:** code-level criticals are closed or mitigated; the single largest remaining risk is deployment discipline (G3/G6 in `docs/RELEASE_CHECKLIST.md` — backup verification and staging rehearsal), not code.
