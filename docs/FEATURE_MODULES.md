# GroovePH — Feature Modules (`features/`)

> Module-by-module map: **Page → Component → Logic → API/DB → Service**. Verified against the tree on 2026-11-19. Only features that exist in the repo are listed; planned/missing features are at the end.

Legend: ✅ live · 💤 dead code · ⚠️ partial

## 1. Authentication & registration

- `/login` → `components/auth/ui/*` (+`AuthLayout`) → `lib/supabase/client` + `lib/admin/access` → Supabase Auth + `profiles` ✅
- `/register/client` | `/register/coach` → `RegistrationFormFields`, `AddressSelector`, `AuthWizard`, `auth/ui/*` → `lib/uploadValidation`, `lib/profileFields` → Supabase Auth + `profiles`, `client_profiles`/`coach_profiles`, Storage `verification-documents` ✅
- `/register/complete` (Google) → `components/shared/GoogleRegisterButton` → `lib/googleRegistration` → Supabase Auth + profiles ✅
- `/forgot-password`, `/reset-password` → Supabase Auth recovery ✅
- Role-selection cards (`features/auth/`) → **💤 dead** (0 references)

## 2. Client portal — `app/(client)/client/`

| Page | Chain | Data |
|---|---|---|
| `home` | shared `HomeDashboard` (role-parameterized; `app/(client|coach)/{client,coach}/home/page.tsx` are thin wrappers) ← `ClientWidgetGrid` / `CoachWidgetGrid` ← `config/dashboard-widgets.ts` ← widgets (`features/home/components/widgets/*`) ← `homeService.ts` | `profiles`, `appointments`, `feedbacks`, `agreements`, `community_posts`, `post_reacts`, `messages` |
| `talent` | `Coach directory` (hash tabs) + `ShowcaseShell` + `BookingModal` + AI assistant | `/api/users`-style public reads, `appointments` insert, `coach_profiles` |
| `calendar` | `AppointmentCalendar` (5 views) ← appointments of the client | `appointments` |
| `messages` | `HubView role="client"` (unified inbox/board/list/calendar/case) | `messages`, `appointments`, `profiles`; realtime |
| `appointments` | legacy → redirect `?view=board` | — |
| `profile` + `settings` | `ProfileFormSections`, `SettingsSections`, `ProfileHero`, verification docs upload, achievements | `profiles`, sub-profiles, `user_achievements`, `profile_follows` |
| `groovey` | `GrooveyMain` | `/api/groovey/*` (Gemini) |
| `performing-arts-philippines` | `HubRoute role="client"` | static content |
| `about` | static info | — |

## 3. Coach portal — `app/(coach)/coach/`

Mirror of client, with: `profile` (rates/skills/genres/fee; 1,077 lines; verification-gated), `talents` (Showcase), `talent/` alias, `home` (coach widget grid), `messages` (`HubView role="coach"`).
Coach-specific domains: `coach_profiles` (fees, notice windows, skills), verification requirements (portfolio + ID + selfie), `verified` badges (`VerifiedBadge`).

## 4. Admin console — `app/admin/`

| Page | Chain | Notes |
|---|---|---|
| `dashboard` | stat cards + lists | browser reads via `lib/admin/service.ts` |
| `users` (+`clients`/`coaches`) | `UserDirectory` + `AdminTable` + `AdminUserDrawer` + `AdminCreateUserModal` | writes → `/api/admin/users` (service-role) |
| `verifications` | `VerificationReviewPanel` | `profiles` verification columns |
| `bookings` | admin bookings table | `appointments` |
| `inquiries` | support inbox | `tickets` |
| `announcements` | broadcast → `notifications` | |
| `maintenance` | `maintenance_notices` CRUD + emergency stop | banner on all dashboards |
| `messages` | admin↔client console | `messages` |
| `settings` | `system_settings` store + activity log | |
| `theme` | platform accent/seasonal theme + lock | `system_settings` |
| `transactions` | agreements + reviews delete | `agreements`, `feedbacks` |
| `control` | **legacy** combined console (announcements+maintenance+settings) | superseded by the three above |
| `verify-passcode` | optional 2nd factor | `ADMIN_PASSCODE` |

## 5. Bookings & agreements (core domain)

```
client/coach UI (BookingModal, BookingRequests widget, hub form)
  → insert appointments (+ notifications)
    → coach accepts (hubActions → bookingService.transitionBooking)
      → agreement terms derived (features/appointments/services/agreementTerms)
        → parties sign (AgreementSignature; private bucket contract-signatures)
          → booking_events logged (DB triggers guard_booking_transition)
            → completed → FeedbackModal (feedbacks) → achievements
```
- Reschedules: tagged JSON stored in `appointments.requested_changes_note` (no native table).
- State machines mirrored in three places: SQL trigger (authority), `bookingStatus.ts` (UX), `agreementStatus.ts` (display). `scripts/test-booking-status.ts` transcribes the SQL CASE.
- **💤 Dead code in this module**: `appointmentService.ts` (legacy), `BookingCard.tsx` (1,027 lines!), `BookingSummaryStrip`, `CoachAvailabilitySnapshot`, `RescheduleDialog`, `StatusFilterBar`, `rescheduleApproval.ts`, booking's `AgreementThread`/`ConversationAgreements`/`ContactOverview`/`AgreementTermsForm`. (`RescheduleDialog`, `BookingCard` etc. have **zero** importers anywhere.)

## 6. Messaging & notifications

- Hub (`features/hub/`): deep-linkable `?view=inbox|board|list|calendar|case&section&booking`; member-facing partner filter (`adminExclusion.ts` — excludes admins/test accounts); realtime + 60 s polling fallback (`useBookingsLive`).
- Admin messages: `/admin/messages` (separate admin console page).
- Notifications: DB-backed (`notifications`), dropdown with Realtime (`NotificationDropdown` → `features/notifications/services/notificationService.ts`, Phase 4 — list/subscribe/mark-read/mark-all/admin-broadcast, RLS-bounded), admin broadcast via `AdminContext.notifyUsers()` → the same service.
- Presence: `profiles.status` + Realtime `presence:<uid>` channel; `PresenceBridge` at root; `StatusSelect` in header.

## 7. Groovey AI

`GrooveyMain` (pages) + `GrooveyFloatingAssistant` (every dashboard via `DashboardLayout`) + `CoachAIAssistantModal` (profile pages) → `ChatContext` → `/api/groovey/chat(/stream)` (rate-limited, Gemini w/ Groq→OpenRouter fallback) → Streamed markdown UI. Server: `features/groovey/server/gemini.ts` is now a **compat shim** (re-exports + injects the Grooveyy default `systemInstruction`, so the in-progress chat routes import it unchanged); the actual provider stack lives in `lib/ai/providers/gemini.ts` (key resolution, retry/backoff, quota cooldown) and the persona prompt in `features/groovey/server/prompts/grooveySystemInstruction.ts`. Knowledge: `lib/groovey/groovePhKnowledge.ts` (from `lib/config/projectInfo.ts`). Dependency direction (Phase 4): `lib/openrouter.ts` → `lib/ai/providers/gemini`; lib never imports features. `lib/ai/{types,errors,config,index}.ts` re-export the provider contract; fallback providers accept an optional `systemInstruction`.

## 8. Discipline communities (dance/singing/acting/theater)

Public hubs at `/community/performing-arts/{dance,singing,acting,theater}` + `/history` + `[discipline]`:
`app community pages → features/discipline/components/DisciplineCommunityPageServer.tsx (shared, Phase 4) → *CommunityView.tsx (client; fetches /api/<discipline>/updates) → static data + live DB feed`.

**The four modules are now thin shims over a shared core** (Phase 4): `features/discipline/` holds the types, scalar config, the generic `createDisciplineService` / `createDisciplineBeatAgent` factories (`services/`), and 16 shared components (`components/`). The per-discipline modules keep only their factory instantiation + any discipline-specific surfaces (dance: league registry view + `OrgLogoBar`/`UpdateCard`/`UpcomingEventsSection`). 18 cloned files deleted; zero import-site changes (Node scripts keep `./file.ts` relative imports). Content ingestion: Anthropic Claude agents on Vercel cron; `scripts/verify-discipline-data.ts` (`npm run test:discipline-data`) gates data quality.

## 9. Studios locator

`StudioLocator` (2,132 lines; biggest file in the repo) + `StudioLocatorMap` (748) → `/api/studios` (Google Places New + `studios` table + curated fallback + dedupe + quota tracking) + `lib/googleMaps.ts` (Maps JS loader) + `lib/nominatim.ts` (geocode fallback) + `lib/studios/*` (sweep/cities/dedupe). Compact variant on dashboards; full version embedded on home pages.

## 10. Community showcase & achievements

- Showcase: `ShowcaseShell` → `CommunityFeed` (posts/reactions/comments; bucket `media-posts`) + `CommunityLeaderboard` + `DancerCircleRules` + `TambayanPulseCard`; also `userprofile/[id]` and talent pages use `ProfileMediaGrid`.
- Achievements/badges: `lib/achievements/*` engine (pure requirement evaluation shared client/server) + `app/actions/achievements.ts` (self/participant-only) + UI in `components/achievements/*` and `components/badges/*`.
- Follows & directory: `/users` (public member directory, `/api/users`, masked) + `lib/profileFollows.ts` + `lib/publicProfile.ts` (column allowlist).

## 11. Payments (GCash)

**Live**: `GCashQrCard` on both profile pages → `features/payments/services/gcashQrService.ts` → bucket `payment-qr-codes` + `gcash_profiles`. The unwired payment-request subtree was deleted in Phase 2 (verified zero importers).

## 12. Shared infra

- Music player (`features/music/`) — global YouTube-backed player (root layout) + mini player + playlist. (Dead `curatedTracks.ts`, `config/genres.ts` and legacy `types.ts` removed in Phase 2.)
- Sound (`features/sound/`) — click sound bridge; present.
- Theme system (`components/theme/`) — dark/light + seasonal (classic/halloween/christmas); `PlatformThemeSync` (admin platform default via `system_settings` + Realtime).
- i18n (`lib/i18n/`) — EN/TL chrome strings.
- Achievements, verification (`verification.ts` — pure rules; `VerifiedBadge` used everywhere).
- **Sign-out**: `lib/auth/signOut.ts#signOutEverywhere(userId?)` (Phase 3) — one canonical implementation used by header/chrome/settings; clears presence + welcome flag, ends the session.
- **Session**: `components/providers/SessionProvider.tsx` (Phase 3) — the one session source, mounted at root; consumed by app, components, and features.
- **Loading**: `components/ui/LoadingState.tsx` (Phase 3) — canonical inline loading state + `RouteSkeleton` for route segments (`loading.tsx` files import from here).
- **Error contract** (Phase 4): `lib/errors/` — `AppError` with `errorCodes`, `errorResponse()`; `lib/errors.ts`/`lib/api/errors.ts` are back-compat shims. Discipline API routes migrated; other handlers audited and deliberately kept on their documented contracts (see AUDIT §"Phase 4 execution status").
- **Unit tests** (Phase 4): `tests/unit.test.ts` — 48 pure-logic tests (`node:test`), wired into `npm test` (see PROJECT_STRUCTURE §6).

## 13. Present but out of active scope

- `app/studio-qa/*` and `app/preview-mini/*` — **production-404 (Phase 2)**: both call `notFound()` in production; reachable only in development.
- `app/community/performing-arts/[discipline]` — dynamic fallback route; static discipline pages take precedence.

## 14. Planned/incomplete (named but not built or wired)

- Payment flows beyond QR showcase (see §11).
- Google sign-in on `/login` (implementation exists, unwired; §5 of AUTH doc).
- Enforced admin second factor (passcode page exists; not required on entry).
- ≈70 dead files were deleted in Phase 2; the count above reflects the tree at audit time. Phase 3/4 removed 18 cloned discipline components and consolidated the shared core — see AUDIT "Phase 2/3/4 execution status".
