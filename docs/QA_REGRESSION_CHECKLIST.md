# GroovePH — Authenticated QA Regression Checklist

> Phase 4 Task 6; Phase 7 update: **staging-only execution header**. Use dedicated test accounts only (a test client, a test coach, and the admin account). Never create or modify production accounts without explicit authorization. Never bypass authentication or RLS to make a check pass — a failed check is a failed check and must be reported.

## Phase 7 staging execution protocol (read first)

**Environment:** the staging deployment (`https://<staging-domain>`) backed by the isolated staging Supabase project — **never** production. Sign in via `/login`.

**Accounts (created in staging only):**
- `qa-client@example.invalid` — role client (created via `supabase/staging-seed.sql` or app registration)
- `qa-coach@example.invalid` — role coach (same)
- pinned staging `ADMIN_EMAIL` account — role admin (via `seed_admin.sql`)

**Recording results:** for each item, fill in the comment column with PASS / FAIL / BLOCKED + evidence (screen name, console output, network response). Save as `docs/qa-results-staging-<date>.md`. Zero unchecked items before release sign-off.

**Verification order that exercises real RBAC:** sign up/coach creation does NOT grant verification — both QA accounts start unverified by design (`guard_verification_fields`). To run every gated flow, the staging admin must first approve both accounts through `/admin/verifications` — that flow itself is part of COACH/ADMIN testing. Do not work around it with SQL.

Environment: `npm run dev` (development, auth pages render against Supabase) or
`npm run build && npm start` (production build) — for staging use the staging deployment. Sign in via `/login`.

**Accounts required:** test client · test coach · platform admin (`ADMIN_EMAIL`).
Never reuse real names; use clearly fake identities (e.g. "Test Client").

## CLIENT

### Login
- [ ] Sign in with test-client credentials at `/login` → lands on `/client/home`.
- [ ] Wrong password → generic error, no user enumeration.
- [ ] Sign in with "username or email" both work.
- [ ] "Remember me" persists the identifier between visits.
- [ ] Half-created account (or missing profile row) → `account_not_ready` message, never a redirect loop.

### Dashboard
- [ ] `/client/home` renders Greeting, Quick Actions, widget grid, HeroBanner, Studio Locator.
- [ ] Widget numbers match the database (spot-check one against Supabase).
- [ ] Skeleton appears on first load; error card appears if the query fails (block the network request).

### Talent discovery
- [ ] `/client/talent` loads coach cards; search/location/fee filters narrow results.
- [ ] Coach card shows verified badge only for verified coaches.
- [ ] Booking button opens the BookingModal; unverified coach or unverified client gates correctly.

### Booking
- [ ] Send a booking request → coach receives it as `pending` and client gets a notification.
- [ ] Coach confirms → status moves to `accepted` → agreement terms derived → both parties sign.
- [ ] Second signature moves booking to `confirmed`; Live badge updates.
- [ ] Past date / double-booking rejected by DB guard (never bypassable from UI).
- [ ] Reschedule request → coach approves → times update.

### Agreement signing
- [ ] Agreement PDF/signature flow renders both parties' signature slots.
- [ ] Client signs → status line reads "Signed by you. Waiting for <coach>".
- [ ] Both sign → booking moves to `confirmed`; agreement read-only for both.
- [ ] Signed agreement downloadable/viewable from the agreement card.

### Messages
- [ ] `/client/messages` renders the Hub; inbox rows show partner, snippet, unread badge.
- [ ] Sending a message delivers instantly to the other party (Realtime).
- [ ] Board view (`?view=board`) shows the booking status columns.

### Notifications
- [ ] Header bell shows unread count; clicking marks read; "Mark all read" clears badge.
- [ ] New notification arrives live (Realtime INSERT) with the wiggle animation.
- [ ] Notification click-through lands on the right destination.

### Sign-out
- [ ] Avatar menu → Sign out → `profiles.status='offline'`, session cleared, `/login`.
- [ ] Protected routes immediately redirect to `/login?redirectTo=…`.
- [ ] `/` for the signed-out account shows landing (not the portal).

## COACH

### Login
- [ ] Coach sign-in lands on `/coach/home` (not `/client/home`).
- [ ] Admin pin rule: role `admin` + `ADMIN_EMAIL` → `/admin/dashboard`, else `/client/home`.

### Dashboard
- [ ] `/coach/home` renders CoachWidgetGrid (BookingRequests, SessionsPanel, StudentsPanel, RecommendedCoaches).
- [ ] BookingRequests accept/decline refreshes the grid without a full page reload.
- [ ] Widget empty states render when the coach has no data — never invented numbers.

### Profile
- [ ] Edit bio/rates/genres/duration/notice windows → saved → reload shows persisted values.
- [ ] Fee and duration validation blocks nonsense (negative numbers, empty fee if configured).
- [ ] Gear/portfolio sections save.

### Verification
- [ ] Upload/replace ID + selfie + credentials → status flips to pending → admin receives it in `/admin/verifications`.
- [ ] Rejected submission returns with a reason; re-upload allowed.
- [ ] Unverified coach cannot accept bookings (accept button disabled with reason, or booking gate blocks).

### Booking requests
- [ ] Inbound requests appear in CoachWidgetGrid and `/coach/messages?view=board`.
- [ ] Accept → agreement flow starts; Decline → client notified.
- [ ] Completed session → feedback prompt; rating averages appear on the coach card.

### Agreements
- [ ] Agreements list under `/coach/messages` shows status correctly (awaiting you / waiting / confirmed / completed).
- [ ] Both-signature flow works end-to-end between test client and test coach.
- [ ] Agreement card and booking card never disagree on status (both read `agreementStatusView`).

### Messages
- [ ] Same as CLIENT Messages checklist, from the coach side.

### Sign-out
- [ ] Same as CLIENT Sign-out checklist, from the coach side.

## ADMIN

### Login
- [ ] Admin (role=admin + `ADMIN_EMAIL`) opens `/admin/dashboard` without bouncing.
- [ ] Admin with role=admin but wrong email → bounced to `/client/home` (never the console).
- [ ] Client/coach accounts redirected away from `/admin/*` (proxy + server layout + RLS).

### Admin access gate
- [ ] `/admin/*` renders only for the pinned admin; other accounts never see the console.
- [ ] `/admin/verify-passcode` (if configured): wrong passcode rejected with generic message; passcode set in env, not code.

### User management
- [ ] `/admin/users` lists users with role/status filters; create user → appears immediately.
- [ ] Cannot create/delete the pinned admin or the last admin (server guards).
- [ ] Suspend → suspended account can sign in but cannot write (RLS/guard).
- [ ] Role change → sub-profile (coach_profiles/client_profiles) created or left alone correctly.

### Verification management
- [ ] `/admin/verifications` lists pending documents; approving sets `account_verified=true`; rejecting returns with reason and `missing_verification_documents`.
- [ ] Approved coach becomes bookable (client sees verified badge).
- [ ] Rejected ID never appears publicly (private bucket only; signed URLs expire).

### Booking management
- [ ] `/admin/bookings` lists all bookings; filter by status; delete/mark-status.
- [ ] Admin override actions are audit-logged (`admin_activity_log`).

### Audit logging
- [ ] Every admin write action produces an `admin_activity_log` row with the correct action/entity.
- [ ] Audit rows are immutable from the client (no client-side insert/update path).

### Sign-out
- [ ] "Sign out" everywhere (header, drawer, settings) returns to `/login` with session gone.
- [ ] After sign-out, `/admin/*` → `/login` (no stale admin access).

## Expected results

| Area | Expected |
|---|---|
| Auth | Redirects always land on `/login?redirectTo=<path>` for anonymous hits; never loop |
| Authorization | Admin console unreachable without pinned admin identity |
| Data integrity | Booking transitions only through `guard_booking_transition()` legal moves |
| Persistence | Every save survives reload; widget numbers match SQL |
| Sign-out | Session terminated; presence flips offline; portals locked |

Report failures with: route, account role, action taken, expected vs actual, console
and network errors. Do not file bugs against production data you don't own.
