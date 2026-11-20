# GroovePH — Complete Architecture Audit & Refactoring Roadmap

> Date: 2026-11-19 · Scope: entire repository (`app/`, `components/`, `features/`, `hooks/`, `lib/`, `config/`, `constants/`, `src/`, `scripts/`, `agent/`, `supabase/`, root configs) · Method: full static read of the request boundary, auth stack, layouts, admin tree, route handlers, plus four parallel module-level deep scans of `app/`, `components/`, `features/`, `lib/scripts/supabase/`; spot-verified with repo-wide reference scans and `git grep`. **No application code was modified.** Companion docs: `SYSTEM_OVERVIEW.md`, `PROJECT_STRUCTURE.md`, `AUTHENTICATION_FLOW.md`, `FRONTEND_BACKEND_ARCHITECTURE.md`, `DATABASE_AND_SUPABASE.md`, `API_ENDPOINTS.md`, `FEATURE_MODULES.md`.

## A. Executive summary

GroovePH/GrooveSystem is a genuinely engineered, security-conscious Next.js 16 + Supabase application — far beyond a typical student project. Its strongest assets:

1. **Defense-in-depth auth**: edge proxy → admin layout gate → `requireAdmin()` → `is_admin()` SQL + RLS, with the pinned-admin-address rule enforced consistently.
2. **Privacy**: column allowlists (`PUBLIC_PROFILE_COLUMNS`), PII masking (`lib/masking.ts`), private buckets + signed URLs, PostgREST escaping (`lib/postgrest.ts`), cron endpoints fail closed.
3. **Honest data**: server-side landing stats with hide-don't-invent semantics (modulo one fallback block, §C-2).
4. **A working feature set**: auth, portals, bookings with DB-enforced state machine, agreements with signatures, hub messaging, community feeds, four discipline content pipelines driven by AI agents, studio locator, Groovey AI.

Its weaknesses are structural, not functional:

1. **≈70 dead files (≈430 KB)**, including entire modules (`features/auth`, the GCash payment-request subtree) and a 1,027-line unused `BookingCard.tsx`.
2. **Layering inversions**: `SessionProvider` (app-wide session) lives inside `components/header` and is imported by features; `lib/openrouter.ts` imports a feature module; components import from `app/users/page`.
3. **Duplication**: four near-identical discipline modules; three copies of `cn()`-style helpers; two design systems for modals (`ui/Modal` vs `auth/ui/Modal`); duplicated skeleton/error/loading patterns in `client/home` vs `coach/home`; barrel files everywhere that nothing imports.
4. **Browser-first data access everywhere** (RLS) with only thin service-role islands — correct for this stack, but it means **authorization lives in Postgres**, and any DB mistake is a full app mistake. Migrations are manual; there is no schema doc.
5. **No tests runner** — only npm-script Node assertions; `npm test` covers 3 of 7 checked invariants plus typecheck/lint.

**Verdict:** the app is structurally sound and safe to extend — with the dead code and layering problems marked in this document, and with the roadmap in §E executed in order. The proposed target structure (§D) is a **convergence, not a rewrite**.

---

## B. Folder & file responsibility map (summary)

Detailed guide: `docs/PROJECT_STRUCTURE.md`. Summary responsibility table:

| Folder | Responsibility | Kind |
|---|---|---|
| `app/` | Routes, layouts, loading/error/404 boundaries, 30 route handlers, 2 server-action modules | Frontend (pages/layouts) + Backend (API/actions) |
| `components/` | Shared UI: design system (`ui/`), app chrome (`layout/`, `header/`, `shared/`), dashboard widgets, studio locator, admin building blocks | Frontend |
| `features/` | 20 feature modules (auth, home, hub, appointments, booking, calendar, community, showcase, dance/singing/acting/theater, performing-arts, groovey, music, payments, verification, presence, profile, sound) | Frontend + feature services (some server-only) |
| `lib/` | Supabase clients, auth/admin/guard, security helpers, config (env/site), i18n, dance contracts, achievements engine, utilities | Shared/Backend/Core |
| `hooks/` | App-wide hooks (3) | Frontend |
| `config/`, `constants/` | Static registries (widgets, player policy, roles; `routes.ts` dead) | Shared |
| `scripts/` | Node-based quality gates, seed/sync jobs, archived one-offs | Tooling |
| `agent/` | 4 CLI entry points for content agents (same code the cron routes run) | Tooling |
| `supabase/` | Migrations 00–40, baseline SQL, seeds, storage policies | Database |
| `public/` | ~170 MB assets | Static |
| `src/styles/` | `theme.css` (64 lines, minimal by design) | Styling |
| `docs/` | This audit + 6 companion docs + `archive/` (3 prior reports) | Docs |

### B.1 Frontend vs backend classification (by actual code)

- **Frontend**: all pages, layouts, `components/**` (166/204 client), feature components (175/273 client), hooks, theme/i18n providers.
- **Backend**: 30 `app/api/**/route.ts` handlers; `app/auth/callback/route.ts`; server actions (`app/actions/achievements.ts`, `verify-passcode/actions.ts`); server-only services (`features/*/services/*Service.ts` discipline writers used by cron; `features/groovey/server/gemini.ts`); admin identity/guard (`lib/admin/*`).
- **Shared/isomorphic**: pure modules (`bookingTime.ts`, `bookingStatus.ts`, `agreementStatus.ts`, `masking.ts`, `postgrest.ts`, `geo.ts`, `achievements/requirements.ts`, `publicProfile.ts`, `typography.ts`, `dance/*` contracts) — usable from Node strips and webpack alike.
- **Configuration**: root files, `lib/config/*`, `config/*`, `constants/*`.
- **Database**: `supabase/**`.
- **Gray zone / misfiled**: `components/users/UserGridCard.tsx` imports a **type** from an app page; `components/header/SessionProvider.tsx` is app infrastructure in a component; `features/appointments/services/bookingService.ts` is `'use client'` DB-write logic (effectively a client-side backend).

---

## C. Architectural problems, by severity

IDs are referenced by the roadmap. "Effort" is rough (S ≤ 1 day, M ≤ 1 week, L > 1 week).

### CRITICAL

**C-1. Public, unauthenticated QA/dev surfaces ship to production.**
`app/studio-qa/*` (fetch-mock harness that monkey-patches `window.fetch`), `app/preview-mini/*`. Neither is classified `admin|coach|client|shared` by the proxy ⇒ publicly reachable. Not exploitable for data (mocked responses only), but they leak internal UX state and undermine the "production-only" boundary. *Fix*: gate behind env flag or remove at release; no schema impact. (Effort S)

**C-2. Landing page renders invented numbers when the DB is silent.**
`components/landing/LandingPage.tsx` lines 27–31: `(stats.coaches > 0 ? stats.coaches : 18)`, `…studios : 6`, `…disciplines : 4` — hard-coded fallbacks, directly contradicting the repo's own "never invent a statistic" rule (`README.md`, `landingStats.server.ts` docblock, `lib/faq/faq-data.ts`) and the archived audit intent. Showing unverifiable marketing numbers on a production page is a trust bug, not a style issue. *Fix*: hide the stat block when zero (mirror `HeroStats` behavior). (Effort S)

**C-3. `/login` Google sign-in button is a dead control.**
`app/(public)/(auth)/login/page.tsx` (~246): `onClick={() => console.log('Google sign-in clicked')}`; the working implementation `components/shared/GoogleSignInButton.tsx` exists with **0 importers**, and the TODO comments in it admit Google OAuth is not enabled. Users clicking it get silence. *Fix*: either wire `startGoogleSignIn` or remove/hide the button until OAuth is verified. (Effort S)

### HIGH

**H-1. ≈70 dead source files (≈430 KB), including whole feature modules.**
Verified by repo-wide reference scan (three independent methods). Major groups:
- `features/auth/` (4 files) — dead parallel registration role-picker.
- `features/appointments/` — `BookingCard.tsx` (1,027 lines, 42 KB), `BookingSummaryStrip`, `CoachAvailabilitySnapshot`, `RescheduleDialog`, `StatusFilterBar`, `services/appointmentService.ts` (legacy), `services/rescheduleApproval.ts`.
- `features/booking/` — `AgreementThread`, `ConversationAgreements`, `ContactOverview` (620 lines), `AgreementTermsForm`.
- `features/payments/` — everything except `GCashQrField.tsx` (`GCashQrCard`), `gcashQrService.ts` and `types.ts`; a complete, unwired payment-request product (~9 files) incl. `gcashService.ts` with self-admitted silent-failure modes (localStorage mirror + base64 fallback) — *actively risky if ever half-wired*.
- `features/groovey/` — `GrooveyStudioLobby`, `GrooveyBottomNav` (self-described "replaced"), `InteractivePracticeBar` + `utils/audio.ts`.
- `features/music/` — `data/curatedTracks.ts`, `config/genres.ts`, legacy `types.ts`.
- `features/dance/` — `components/MatchRecapsSection.tsx`, `components/OrgTextPill.tsx`; `features/hub/components/HubSignoffs.tsx`; `features/hub/services/pov.ts` (used only by `scripts/test-hub-logic.ts`); `lib/dance/imageSources.ts`.
- `app/(coach)/coach/profile/components/CoachProfileShowcase.tsx` and `CoachProfileTabs.tsx` — the page imports `CoachProfileReviews` only (live).
- `components/` — `client/TalentCoachAssistant.tsx`, `shared/{ProfileHero,GoogleSignInButton,ImageCard,Sidebar,UserSearchResults,useScrollReveal}` (+`shared/GoogleSignInButton`), `layout/SiteHeader.tsx` (dead alias) and `layout/AppShell.tsx`, `dashboard/{StatCard,StatRow,MetricStatCard,CoachDashboardBackground,PhilippineBackdrop,PhilippineSun,BadgeMiniWidget,CoachAvatarRow,SupportCallout,UpcomingSessionsWidget}`, `landing/{Hero,HeroStats,FinalCta,StudiosPreview,SectionTransition,TextReveal,LandingScrollCoordinator,useSmoothScroll}`, `faq/{FaqTeaser,FaqTeaserSection}`, `ui/{Accordion,SelectCard,Stepper}`, `profile/bento/ProfileBento.tsx` + `profile/bento/ProfileIdentityBento.tsx`, `profile/ProfileMoreMenu.tsx`. (`ProfileTiles.tsx` is live — `CompletionTile` is used by both profile pages.)
- `constants/routes.ts` — created by a prior refactor, adopted by nothing.
- 14 of 16 feature `index.ts` barrels — imported as `@/features/<module>` by only 3 sites (2× groovey, 1× music); barrels that `export *` server-role services are import hazards.

*Fix*: staged deletion with reference-count verification (scripts-only usage noted above). (Effort M)

**H-2. Layering inversions instead of boundaries.**
1. `components/header/SessionProvider.tsx` is app-wide session state living in a header component; imported by app, components, and features (`features/hub/{HubView,useHubBadge}`, `features/groovey/context/ChatContext.tsx`, `features/presence/components/PresenceBridge.tsx`).
2. `features/groovey/context/ChatContext.tsx` re-derives/falls back to session instead of consuming context cleanly; `components/shared/DashboardLayout.tsx` → `@/features/groovey`; if any barrel ever re-exports a header-dependent feature, you get a cycle at scale.
3. `lib/openrouter.ts` (a lib) imports `features/groovey/server/gemini.ts` (a feature).
4. `components/users/UserGridCard.tsx` imports `type DirectoryUser` from `app/users/page.tsx`.
5. `features/*` import `@/components/*` pervasively (e.g. `components/shared/CoachCard`, `components/notifications/SuccessNotificationProvider`).
*Fix*: move session to `providers/SessionProvider.tsx` (or `lib/session/`), invert lib→feature imports, extract shared types to `lib/types.ts`. (Effort M)

**H-3. Four discipline modules are copy-paste clones.**
`dance/`, `singing/`, `acting/`, `theater/`: services within 2–5 lines of each other (all import `isUpcomingEvent` from dance), agents within 6 lines, ~420-line views, identical filter bars/cards/heroes/rosters, near-identical `*OrgsService.ts` (5 lines each) and `*Orgs.ts`. Any edit (a11y, copy, image rules, rate limit) must be made four times — guaranteed drift. (Effort M–L; strategy: parameterize via a shared `features/discipline/` core or data-driven config)

**H-4. Two parallel modal implementations & two design languages.**
`components/ui/Modal.tsx` (canonical; portal+focus-trap; ~40 importers) vs `components/auth/ui/Modal.tsx` (register-flow modals: `ConfirmLeaveModal`, `SuccessModal`, `TermsModal`; own overlay/focus code). Both ~500 lines; a11y behavior, scroll-lock, and z-index must be maintained twice. Similarly `AuthUI.tsx` re-implements buttons/fields already in `ui/`. (Effort M)

**H-5. `client/home` and `coach/home` are verified structural twins.**
~197 lines each with the same skeleton, error state, WelcomeModal pattern, data-fetch effect, redirect logic. Divergent behavior is achieved by copying, not composition — any dashboard fix lands twice. (Effort S–M)

**H-6. Landing page bypasses the design system entirely.**
`LandingPage.tsx` hand-rolls card JSX with hard-coded hex (`#FF9B2F`, `#121212`) while the app ships `GlassCard`/`Panel`/`ui/*`; `ui/SectionHeading.tsx` hard-codes white/`#DDAA55` (non-theme-aware). Dark-only landing is a deliberate product choice, but the duplication means the marketing surface silently diverges from the system. (Effort M)

### MEDIUM

**M-1. Barrels that are hazards, not conveniences.**
`export *` barrels in discipline modules re-export server-role-client services (`*Service.ts`, `danceService` w/ `serviceClient`); a stray client import would pull service-role-shaped code into the browser bundle chain. Zero upside observed (0 external barrel imports except 2–3). *Fix*: delete barrels or replace with explicit, typed public APIs; never re-export services. (Effort S)

**M-2. `cn()` duplicated**: `lib/utils.ts` and `components/shared/cn.ts` (re-export) — two import paths in live use (~40 sites use the back-compat path). Trivial to unify; keep one. (Effort S)

**M-3. Dual `LoadingState`** export: `components/loading/LoadingState.tsx` (full + `RouteSkeleton`) and `components/ui/Skeleton.tsx` (small local duplicate). (Effort S)

**M-4. Inconsistent state-machine copies.**
Booking status logic exists in three places (DB trigger = authority, `bookingStatus.ts` = UX mirror with test coverage, `agreementStatus.ts` = display union). Documented as "deliberate mirrors" in-file, but there is no single importable source; drift has already produced subtle wording/behavior differences. *Fix*: single `features/appointments/services/bookingStatus.ts` as the only TS source; display layer maps from it. (Effort S–M)

**M-5. Direct DB writes from dropdowns & menus.**
`NotificationDropdown.tsx` updates `notifications.read_at` and subscribes to the table directly; `PlatformThemeSync.tsx` writes nothing but reads `system_settings` + Realtime channel (fine); `SessionProvider` performs reads only. Acceptable under RLS but untestable in isolation; error handling is per-component (silent catches). *Fix*: funnel through `services/notificationService.ts`. (Effort S–M)

**M-6. No schema documentation; migrations applied by hand.**
`supabase/` has no `config.toml`, no `functions/`, no schema `.md`, and README's linked DB docs are dead. The migration header of file `40_is_admin_stable.sql` even documents manual PSGC application. Onboarding requires reverse-engineering 41 files. *Fix*: `docs/DATABASE_AND_SUPABASE.md` (created) + a generated `schema.sql` snapshot policy. (Effort M)

**M-7. Rate limiting is per-process** (`lib/rateLimit.ts`) — on serverless/multi-instance, limits reset per instance; documented in-file. Abuse is bounded but not precise. *Fix*: document limitation loudly or move to Upstash/DB-backed. (Effort M)

**M-8. Inconsistent error handling.**
Mix of: swallowed errors (`PresenceBridge`, catch-log-continue), inline messages, `AppError` (`lib/errors.ts`), `lib/api/errors.ts`, raw PostgREST `.message` echoed to users (e.g. registration profile-upsert failure "Your profile could not be saved: <pg message>" — leaks schema), `/api/send-email`'s well-designed classifier. No single error contract. *Fix*: adopt one shape (`{error: {code, message}}` or at least `lib/errors.ts` everywhere). (Effort M)

**M-9. Misleading "optimistic security" comments are the only spec in places; behavior lives in comments.**
Example: middleware's `account_not_ready` no-loop rule; the login Google no-op has only a TODO. These need tests or they regress silently. (Effort S)

**M-10. `studio-qa` harness and fetch-mock ship in the bundle** — covered in C-1.

**M-11. Large files with many responsibilities (verified line counts).**
`app/globals.css` (15,134) — unmaintainable single file; `StudioLocator.tsx` (2,132) — search/state/map/sheet in one; `AddressSelector.tsx` (1,252); `RegistrationFormFields.tsx` (1,341); `register/coach/page.tsx` (1,506) & `register/client/page.tsx` (821) — full pipelines inline; `googlePlaces.ts` (1,669); `BookingModal.tsx` (1,440); `ProfileFormSections.tsx` (849); `gemini.ts` (881); `ChatContext.tsx` (616); `HubCaseView.tsx` (611); `gcashService.ts` (614, dead); `about/*.tsx` (733/772 lines of static markup). Decomposition attempted twice before (per `docs/archive/REFACTOR_INVENTORY.md`) and partially reverted — approach with tests, not big-bang. (Effort L, ongoing)

**M-12. Public-figure data (`features/dance/data/crews.ts` 843 lines, dance updates/orgs, leagues) is hand-curated in the bundle.**
By design ("verified only"), but it means every content correction ships a deploy; acceptable for v1, worth a table later. (Effort M)

**M-13. Admin pages have no page-level auth checks.**
Correct by design (layout gate + RLS), but nothing in the file itself prevents misuse if a page is ever copied outside the gate (e.g. into `/preview-mini`). Defense-in-depth comment at minimum; `requireAdmin()` at data layer exists (`lib/admin/service.ts` calls no guards — it relies on RLS + `is_admin()`). (Effort S)

**M-14. `handle_new_user` username-collision handling** is a known fixed bug (migration 23); registration surfaces the raw error string to users in edge cases (e.g. "Your profile could not be saved: <message>"). (Effort S)

**M-15. Two large service-role entry points are invisible in app code review** — `scripts/sync-dance-logos.ts` reads `SUPABASE_SERVICE_ROLE_KEY` directly via raw client; `/api/cron/dance-logos` wraps it. Least privilege unclear. (Effort S)

### LOW

**L-1.** README "Further Documentation" links are dead (this suite fixes it). **L-2.** `docs/` had only archive files until this audit. **L-3.** `AGENTS.md` is a generic Next warning, not project conventions. **L-4.** `.vscode/` tracked in tree but gitignored elsewhere. **L-5.** `tsconfig.tsbuildinfo` committed before ignore? (present in tree, untracked? — it is gitignored `*.tsbuildinfo` and shows as untracked noise risk). **L-6.** Inconsistent file extensions: `.ts`/`.tsx` mixed for JSX-free files (harmless). **L-7.** `app/coach/talent/page.tsx` is a 1-line re-export alias — fine but undocumented. **L-8.** `components/achievements` vs `components/badges` overlap (AchievementModal vs BadgeModal). **L-9.** `StudioLocator` uses OSM Nominatim (client) + Google Places (server) — two geocoders, intentional but undocumented in code. **L-10.** `vercel.json` crons are UTC; Asia/Manila shift undocumented. **L-11.** Mixed quote/indent styles (4-space .editorconfig vs 2-space files). **L-12.** `public/` ~170 MB with no asset budget.

### Verified non-problems (explicit)

- `proxy.ts` matcher correctly excludes `api`, `_next/*`, static assets; API auth is per-handler.
- Service-role key placeholder detection in `lib/supabase/server.ts` is deliberate and sound.
- `tickets` endpoint is anonymous **by design** with layered abuse controls — not a leak.
- `/api/users` is public **by design** with masked columns + public-columns allowlist.
- `handle_new_user` self-INSERT restriction is honored by all client code paths (all use trigger-created rows + upsert/update).
- No `middleware.ts` exists; `proxy.ts` is the only boundary. ✅
- No `server-only` imports from client modules found. ✅
- No secrets found in tracked files. ✅

---

## D. Recommended target architecture (2026-standard, feature-oriented)

Adapted to this codebase's reality (Next.js 16 App Router, Supabase, existing conventions). **Convergence, not a rewrite.** Route URLs do not change; every move is behind the proxy.

```
app/                                ← unchanged URLs
  (public)/(marketing|legal|auth)/  ← group auth pages; keep route groups as-is
  (client)/client/…
  (coach)/coach/…
  admin/…                           ← unchanged URLs
  api/…                             ← unchanged URLs
  auth/callback/route.ts
components/
  ui/                               ← design system (single Modal/Card/Button family)
  layout/                           ← shells: DashboardShell (was DashboardChrome), StandaloneShell, PublicShell
  providers/                        ← NEW: SessionProvider, ThemeProvider, SmoothScrollProvider (moved from header/theme/parts)
  shared/                           ← app-wide widgets (FollowButton, NotificationDropdown, MaintenanceBanner…)
features/
  auth/                             ← DELETE or replace with real role-picker (currently dead)
  {home,hub,appointments,booking,calendar,community,showcase,dance,singing,acting,theater,performing-arts,groovey,music,payments,presence,profile,sound,verification}/
    components/  services/  hooks/  types.ts  data/  (no barrels)
lib/
  supabase/  auth? (keep admin/access+guard)  admin/  security/ (rateLimit, sendEmailSecurity, grooveyValidation, uploadValidation, masking)
  config/  i18n/  dance/  achievements/  api/
hooks/  types?  utils?  scripts/  supabase/  docs/
```

| Proposed folder | Purpose | Belongs | Never belongs | Connects to |
|---|---|---|---|---|
| `app/` | routing + RSC + gates only | pages, layouts, loading, error, API, actions | reusable UI, business logic >50 lines | `features/`, `components/`, `lib/` |
| `components/ui/` | the ONE design system | primitives (Button/Card/Panel/Modal/Input/Badge…) | app-specific widgets | all |
| `components/layout/` | shells & chrome | DashboardShell/StandaloneShell/PublicShell/IconRail/PagePatterns | data fetching | `features/` |
| `components/providers/` | root context stack | Session/Theme/Language/Music/SmoothScroll | presentation | `app/layout.tsx` |
| `components/shared/` | app-wide widgets | NotificationDropdown, FollowButton, WelcomeModal | one-off sections | `features/`, `app/` |
| `features/<name>/` | one feature, self-contained | its components/services/hooks/types | cross-feature imports (via events or lib only) | `app/`, `components/`, `lib/` |
| `lib/supabase/` | Supabase clients only | client/server/middleware/serviceClient | business logic | `app/`, `features/` |
| `lib/admin/` | admin identity + service | access/guard/service | member-facing UI | `app/admin`, `api/admin` |
| `lib/security/` | all abuse controls (NEW folder) | rateLimit, masking, postgrest, uploadValidation | framework code | `app/api`, `lib` |
| `lib/config/` | env/site config | env.ts, site.ts, skillsConfig, featuredLocations | components | build/boot |
| `lib/types.ts` | shared types | unions mirroring DB enums | interfaces local to a feature | all |
| `hooks/` | truly shared hooks | useProfile, useDebouncedValue | feature hooks | `app/` |
| `scripts/` | CI-able quality gates + jobs | booking/masking/studio/hub tests, sync jobs | app runtime imports (except tests) | supabase |

**Explicitly rejected for this repo** (would churn without payoff): moving to a `src/` root, introducing a state library, React Hook Form, server-component data fetching everywhere, tRPC/REST-for-members, and monorepo restructuring.

---

## E. Refactoring roadmap (prioritized, dependency-aware)

Order matters: nothing ships without the gates in Phase 1.

### Phase 1 — Documentation & visibility (this audit) ✅ done
- Files: `docs/SYSTEM_OVERVIEW.md`, `PROJECT_STRUCTURE.md`, `AUTHENTICATION_FLOW.md`, `FRONTEND_BACKEND_ARCHITECTURE.md`, `DATABASE_AND_SUPABASE.md`, `API_ENDPOINTS.md`, `FEATURE_MODULES.md`, `ARCHITECTURE_AUDIT.md`.
- Risk: none. Tests: none. Order: first.

### Phase 2 — Safety net & safe cleanup (no behavior change)
1. **Un-ship dev surfaces** (C-1): wrap `studio-qa` + `preview-mini` behind `process.env.NODE_ENV !== 'production'` guard returning `notFound()`. Files: 9 pages. Risk: low (dev-only). Tests: build must pass.
2. **Fix landing stat fallbacks** (C-2): `LandingPage.tsx` lines 27–31 → hide when zero. Risk: none.
3. **Fix or hide Google button** (C-3): wire `startGoogleSignIn` behind the existing `GOOGLE_OAUTH_ENABLED` flag **or** hide until verified. Files: login page, `GoogleSignInButton`. Risk: low.
4. **Delete dead code** (H-1): delete in dependency order: barrels → leaf components → features/auth → payment subtree. Each batch: `npm run typecheck && npm run lint && npm run build` + grep for references. Excludes: `pov.ts` (used by `test-hub-logic`), `scripts/archive/*`. Risk: medium (hidden refs — mitigate with 3-scan verification). Tests: full `npm test`. Order: after 1–3.
5. **Unify `cn()`** (M-2): `components/shared/cn.ts` → re-export or rewrite ~40 importers to `lib/utils.ts`. Risk: low.
6. **Remove `constants/routes.ts`** (H-1): zero refs. Risk: none.
7. **`docs/archive/README` fix**: correct README doc links to the new suite. Risk: none.

### Phase 3 — Shared components & duplicate logic
1. Merge `auth/ui/Modal` → `ui/Modal` (keep `ConfirmLeaveModal`/`SuccessModal`/`TermsModal` as `features/auth/components/*` composed on `ui/Modal`). Files: register pages, `FileUpload`, `AuthWizard`. Risk: **HIGH** (focus trap/scroll lock regression on register flow) — needs manual E2E of both wizards + a11y pass. Tests: extend `test-booking`-style Node assertions? No — manual QA + build.
2. Merge client/coach home into one parameterized `features/home/HomePage.tsx` (config differs). Files: 2 pages (-394 lines). Risk: medium.
3. Merge `DashboardChrome`/`AppHeader` duplicated presence+signOut into one `components/layout/chromeUtils.ts#signOutWithPresence(supabase, user)`. Risk: low.
4. De-duplicate `LoadingState` (M-3); unify error contract (M-8); funnel notification writes into `features/notifications/services/notificationService.ts` (M-5).

### Phase 4 — Feature-module organization
1. Extract shared discipline core (`features/discipline/`) from dance/singing/acting/theater (H-3): parameterize `disciplineConfig` (ids, copy, logos, tables). Files: ~90; delete ~60 cloned lines. Risk: **HIGH**. Tests: `verify-dance-data` + manual page checks ×4.
2. Move `SessionProvider` → `components/providers/` (H-2): update all imports (app/layout, header files, 4 features). Risk: medium (broad file edit). Tests: login/logout/welcome flows.
3. Move `lib/openrouter.ts` → `features/coach-assistant/services/` or break the import cycle properly. Risk: low.
4. Extract `UserGridCard` type into `lib/types.ts` or `app/users/types.ts` (H-2). Risk: none.
5. Collapse barrels (M-1): delete or replace with explicit `export {}`. Risk: low.
6. `StudioLocator` decomposition (M-11): extract `useStudioSearch`, `StudioResultsList`, `StudioBottomSheet`. Risk: high — defer behind feature flags.

### Phase 5 — Auth & backend separation improvements
1. Wire `startGoogleSignIn` properly OR delete the button + `GoogleSignInButton.tsx` + `GOOGLE_OAUTH_ENABLED` remnants. Risk: low.
2. Decide the admin second factor (M-13): enforce passcode **at entry** (verify-passcode gate before `AdminLayout` children) or mark it explicitly optional in docs. Risk: medium.
3. Rate-limit backends (M-7): document per-process limits in `README`; optionally Upstash. Risk: low.
4. Server-side error contract for forms (M-8): stop echoing PostgREST messages (e.g. registration upsert). Risk: low.
5. Add `server-only` package imports to `lib/supabase/server.ts`, `features/groovey/server/gemini.ts`, `lib/admin/*` — build fails if a client imports them. Risk: low, high value.

### Phase 6 — Testing & verification
1. Adopt a runner (Vitest) for the pure modules: `bookingTime`, `bookingStatus`, `agreementStatus`, `masking`, `postgrest`, `geo`, `achievements/requirements`. Target: ≥80% on those files. Risk: none.
2. Wire `test-groovey.ts` + `test-send-email.ts` (currently unwired) into `npm test`.
3. Document migration application as a checklist (`docs/DATABASE_AND_SUPABASE.md` §7) and keep 00→40 order.
4. Final verification: `npm run build && npm test` + manual regression of: register (client/coach), login redirects (incl. not_ready), admin gate, booking accept/sign cycle, hub realtime, Groovey streaming, landing stats.

**Recommended implementation order:** 1 → 2.1–2.3 → 2.4 (dead code) → 3.2 → 5.5 → 3.1 → 4.1 → 6.

---

## F. Current vs proposed — comparison

| Dimension | Today | Proposed | Delta |
|---|---|---|---|
| Request boundary | `proxy.ts` (Next 16) ✅ correct | unchanged | none |
| Route URLs | `(public)`, `(client)`, `(coach)`, `admin`, `api` | same | none |
| Session location | `components/header/SessionProvider.tsx` | `components/providers/SessionProvider.tsx` | H-2 fix |
| Barrels | 16 feature barrels, unused/hazardous | none (deep imports or explicit APIs) | M-1 fix |
| Dead files | ≈70 | 0 | H-1 fix |
| Discipline modules | 4 clones | 1 parameterized `features/discipline/` | H-3 fix |
| Modals | 2 parallel systems | 1 `ui/Modal` + feature compositions | H-4 fix |
| Homes | 2 near-twin pages | 1 parameterized | H-5 fix |
| Error contract | ad hoc | `AppError` everywhere at boundaries | M-8 fix |
| rate limiting | per-process | documented/Upstash | M-7 |
| DB docs | none | docs/DATABASE_AND_SUPABASE.md ✅ | M-6 fixed |
| Tests | 3 npm-script suites wired | Vitest on ~8 pure modules + existing scripts | Phase 6 |
| `server-only` enforcement | none (convention) | import `server-only` in 5 server modules | Phase 5 |
| Landing stats | hardcoded 18/6/4 fallback | hide when 0 | C-2 fixed |
| Google login button | inert | wired or removed | C-3 fixed |
| Dev/QA routes in prod | public | env-gated | C-1 fixed |
| Docs | README + 3 archive files | 8-doc suite | done ✅ |

---

## G. Files inspected (audit evidence)

Root: `package.json`, `tsconfig.json`, `next.config.ts`, `proxy.ts`, `instrumentation.ts`, `vercel.json`, `.env.example`, `.gitignore`, `eslint.config.mjs`, `postcss.config.mjs`, `.editorconfig`, `.vscode/*`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `AGENTS.md`.

`app/`: every file listed in tree.txt inventory (127) incl. `app/layout.tsx`, `proxy` helper semantics, all layouts, `app/(public)/page.tsx`, login/register pages (full), `reset-password`, `forgot-password`, `register/complete`, `app/auth/callback/route.ts`, all `app/api/**/route.ts` (heads+auth semantics), `app/actions/achievements.ts`, admin layout + `verify-passcode/*`, `app/(client|coach)/*/page.tsx` (samples incl. home, profile, settings, talent), error/not-found boundaries.

`components/`: all 204 files inventoried (heads); fully read: `ui/Modal.tsx` (exports), `auth/ui/Modal.tsx` (head), `shared/ProfileHero.tsx` (head), `shared/DashboardLayout.tsx`, `layout/DashboardChrome.tsx` (head), `landing/LandingPage.tsx` (24–89), `landing/landingStats.server.ts` (grep), `header/AppHeader.tsx` (logout), `users/UserGridCard.tsx`, `client/ClientLayout.tsx`, `landing/LandingPage.tsx`.

`features/`: all 274 inventoried (4 parallel scans) + read: `home/homeService` semantics, `hub/HubView.tsx` (imports), `appointments/services/bookingService.ts` (head), `groovey/server/gemini.ts` (head + export list), `payments/*` (heads), `music/*`, `verification/*`.

`lib/`: all 67 inventoried; fully read: `supabase/middleware.ts`, `supabase/server.ts`, `supabase/client.ts`, `admin/access.ts`, `admin/guard.ts`, `permissions.ts`, `config/env.ts`, `cron/auth.ts`, `lib/utils.ts` (exports), `lib/googleRegistration.ts`, `rateLimit.ts`, `sendEmailSecurity.ts`, `postgrest.ts`, `masking.ts`, `grooveyValidation.ts` (heads), `errors.ts`.

`supabase/`: `schema.sql` (head), migration headers via grep; full file lists.

`scripts/`, `agent/`: names + semantics via grep; `scripts/test-*` uns wired states confirmed.

Git: `git status` before/after (only pre-existing user changes + this `docs/` addition). `git grep` used for reference verification.

**Not inspected**: `.env`, `.env.local` (secret), `node_modules/`, `.next/`, `public/` binaries, full `globals.css` (header only), every one of 45k lines of features bodies — module scans + heads used, flagged as such in each agent report.

## H. Documentation created

`docs/SYSTEM_OVERVIEW.md` · `docs/PROJECT_STRUCTURE.md` · `docs/AUTHENTICATION_FLOW.md` · `docs/FRONTEND_BACKEND_ARCHITECTURE.md` · `docs/DATABASE_AND_SUPABASE.md` · `docs/API_ENDPOINTS.md` · `docs/FEATURE_MODULES.md` · `docs/ARCHITECTURE_AUDIT.md` (this file)

## I. Phase 1 (read-only audit) verification

> **UPDATE — 2026-11-19 (Phase 2 executed):** application source code **was** modified in Phase 2 by explicit instruction (dead-code deletion, import consolidation, QA-route gating, landing-stats honesty, Google sign-in button fix). See "Phase 2 execution status" below. The pre-existing uncommitted user work (`app/api/groovey/chat*.ts`, `app/api/send-email/route.ts`, `lib/grooveyValidation.ts`, `lib/sendEmailSecurity.ts`, `scripts/test-groovey.ts`, `scripts/test-send-email.ts`) remained byte-untouched throughout (verified via `git diff --stat`: 61/55/30/28 lines, 141 insertions, 33 deletions — identical to the pre-Phase-2 snapshot).

Phase 1 audit-time verification (2026-11-19, before Phase 2):

- `git status --short` before docs work showed 9 pre-existing paths (user's in-progress work). None of these were opened for edit or written by the audit.
- The only file created in the app tree was `tree.txt` (inventory artifact) — **deleted before final delivery**.
- All audit tooling (scans, greps) was read-only. No `npm install`, no `git commit`, no renames, no deletions, no schema changes, no env changes.
- New files existed **only** under `docs/`. `docs/archive/` untouched.

## Phase 2 execution status (2026-11-19)

| Roadmap item | Status |
|---|---|
| C-1 dev/QA routes gated | ✅ `studio-qa/*` and `preview-mini/*` now call `notFound()` in production (prerendered 404; verified in build + `next start` smoke test). Dev workflow unchanged (`next dev`). |
| C-2 landing fallback stats | ✅ `components/landing/LandingPage.tsx` hides zero/unknown stats (no invented 18/6/4); `landingStats.server.ts` returns 0 (hide) instead of 4 on DB failure. |
| C-3 inert Google button | ✅ Login page now uses `components/shared/GoogleSignInButton.tsx` — the honest "Coming Soon" disabled state wired to the same OAuth chain. Legacy dead exports (`GoogleButton`, `GoogleIcon`) removed from `components/auth/ui/AuthUI.tsx`. |
| H-1 dead code | ✅ **89 files deleted** after quoting-exact reference scans (alias + relative + barrels + scripts): feature/component barrels, `features/auth`, appointments/booking/payments/groovey/music/dance/hub dead code, landing/dashboard/ui/faq/shared/layout/profile dead components, coach-profile dead components, `constants/routes.ts`, `components/shared/cn.ts`. Two false-positive candidates kept after verification: `features/music/engine/youtube-types.d.ts` (ambient declarations) and `features/hub/services/pov.ts` + `lib/dance/imageSources.ts` (used by scripts). `features/music/{types.ts,config/genres.ts}` removed with the barrel's stale exports. `GoogleSignInButton.tsx` is now LIVE (imported by login). |
| M-2 `cn()` duplication | ✅ `components/shared/cn.ts` deleted; 162 imports rewritten to `@/lib/utils` (canonical); duplicate imports merged in 20 files; 4 relative `./cn` importers fixed. Zero references remain. |
| Verification | ✅ `tsc` 0 errors · `eslint` 0 errors (282 pre-existing warnings) · production build 76/76 pages · `npm test` all suites pass (147 booking-status, 7 masking, 115 studio-locator) + `test:hub` 81, `test:booking-ui` 92 · encoding gate clean · user's in-progress work preserved byte-for-byte. |

### Still open (not in scope for Phase 2)
- H-2 session provider relocation · H-3 discipline-module parameterization · H-4/H-5/H-6 dedup · M-1..M-15 (error contract, loading-state dup, etc.) — Phases 3–6.
- `app/api/groovey/chat*.ts`, `app/api/send-email/route.ts` etc. remain uncommitted user work — not mine to commit.

## Phase 3 execution status (2026-11-19)

| Item | Status |
|---|---|
| H-2 Session provider relocation | ✅ `components/header/SessionProvider.tsx` → `components/providers/SessionProvider.tsx` (plain move, zero behavior change). All 10 importers updated (`app/layout.tsx`, `AppHeader`, `DashboardChrome`, `StandaloneChrome`, `WelcomeModal`, `features/hub/{HubView,useHubBadge}`, `features/groovey/context/ChatContext.tsx`, `features/presence/PresenceBridge.tsx`, `hooks/usePlayerVisible.ts`). `components/providers/` now holds the app-wide providers (`SessionProvider`, `SmoothScrollProvider`). |
| M-3 LoadingState/RouteSkeleton duplication | ✅ `components/ui/LoadingState.tsx` created as the canonical module (inline `LoadingState` + `RouteSkeleton`); duplicate `LoadingState` removed from `components/ui/Skeleton.tsx`; `components/loading/LoadingState.tsx` deleted; 13 importers repointed and one untracked file repointed directly. (`Skeleton.tsx` still holds the skeleton placeholders: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable`, `SkeletonGrid`, `DashboardSkeleton`.) |
| H-2b sign-out duplication | ✅ `lib/auth/signOut.ts#signOutEverywhere(userId?)` — canonical presence→flag→`signOut()` sequence; used by `AppHeader#handleLogout`, `DashboardChrome#handleLogout`, and both Settings `DangerZone`s (settings pages previously omitted presence + welcome-flag cleanup and never wrote presence offline — now consistent). Menus/drawers (`ProfileMenuContent`, `MobileDrawer`) unchanged — they delegate via `onLogout`. Middleware's stale-session `signOut()` intentionally separate. |
| H-5 Client/Coach home twins | ✅ `features/home/components/HomeDashboard.tsx` — one role-parameterized dashboard for client and coach (~197-line twins eliminated); both `app/(client\|coach)/*/home/page.tsx` are now thin server wrappers. Client-only MaintenanceBanner and coach-only `onRefreshData` wiring preserved via `ROLE_CONFIG`. MaintenanceBanner remains client-only — flagged as a product decision to revisit. |
| H-4 modal systems | ✅ **Behaviour shared, visuals preserved.** `components/ui/Modal.tsx` now exports `FOCUSABLE_SELECTOR`, `lockBodyScroll`/`unlockBodyScroll`, and new `useDialogStack(open)` (product-wide dialog stack, top-most Escape/Tab). `useModalDismiss` and `Modal` consume it. `components/auth/ui/Modal.tsx` consumes the same primitives (its `rw-*` visual dialect, spring animation, capture-phase Escape with `stopPropagation` preserved; only top-most auth modal responds to Escape). Live browser QA: both systems verified (dialog roles/`aria-modal`/labelledby/describedby, Tab trap, Escape close, scroll-lock engage/release, focus restore). |
| Verification | ✅ `tsc` 0 errors · `eslint` 0 errors (282 pre-existing warnings) · production build 76/76 pages · `npm test` all suites pass + `test:hub` 81, `test:booking-ui` 92 · encoding gate clean · QA/preview routes still 404 in production; portals redirect unauthenticated users to `/login?redirectTo=…` |
| Not done (scope) | H-3 discipline clone parameterization · H-4 visual-layer unification (the `rw-*` dialect remains by design) · H-6 landing design-system bypass · M-4 triple state-machine (partially addressed in Phase 2 only) · M-5..M-15 — Phases 4–6 |

## Phase 4 execution status (2026-11-19)

| Item | Status |
|---|---|
| Task 1 — Discipline feature consolidation | ✅ New shared core `features/discipline/` (types, scalar config, generic `createDisciplineService`/`createDisciplineBeatAgent`, `DisciplineCommunityPageServer` + 16 shared components). The four discipline service modules and four beat agents are thin factory shims; dance keeps its own view (league registry) and its own `OrgLogoBar`/`UpdateCard`/`UpcomingEventsSection`. 18 cloned components deleted; 3 community pages + the `[discipline]` dynamic page now render through the shared `DisciplineCommunityPageServer`. Zero import-site changes (scripts keep `./file.ts` relative imports for `node --experimental-strip-types`). `scripts/verify-discipline-data.ts` gate added (`test:discipline-data`) — caught and fixed 3 non-https `source_url`s; all four disciplines report `source=fallback` only when live Supabase creds are absent (data path unchanged). |
| Task 2 — Standardized error contract | ✅ `lib/errors/` created: `errorCodes.ts` (canonical codes), `AppError.ts` (`AppError.database`/… helpers), `errorResponse.ts`, `index.ts`. `lib/errors.ts` and `lib/api/errors.ts` are back-compat shims (`'./errors/index'`). 12 discipline routes migrated (`*/updates`, `*/events/upcoming`, `*/ingest`). Every other handler audited and deliberately left on its existing contract with reasons recorded in the doc (health probe shape, `groovey/chat/*`, `send-email`, tickets on shim, studios shape, users' `users: []` compat, cron ops contract, admin safe messages, coach-assistant). No raw `message: error?.message` remains in `app/` outside server-side `console.*`. |
| Task 3 — AI dependency cleanup | ✅ `GROOVEYY_SYSTEM_INSTRUCTION` moved to `features/groovey/server/prompts/grooveySystemInstruction.ts`; provider stack moved verbatim to `lib/ai/providers/gemini.ts`; `features/groovey/server/gemini.ts` kept as a compat shim (re-exports + injects the Grooveyy default `systemInstruction` — the user's in-progress chat changes import it unchanged). `lib/openrouter.ts` now imports from `@/lib/ai/providers/gemini` (dependency direction fixed: lib no longer imports features). `lib/ai/{types,errors,config,index}.ts` re-export the provider contract; fallback providers accept optional `systemInstruction`; `formatFallbackMessages` added. |
| Task 4 — Centralize DB writes (notifications/theme) | ✅ New `features/notifications/services/notificationService.ts` (list, subscribe-to-INSERT Realtime, mark one/all read, admin broadcast insert; schema-validated columns, RLS-bounded, no service role) and `features/theme/services/platformThemeService.ts` (`system_settings` 4-key read, Realtime subscription, `resolvePlatformThemeId` narrowing; read-only). `NotificationDropdown`, `AdminContext#notifyUsers` (insert + `/api/admin/audit` fetch retained), and `PlatformThemeSync` refactored onto them; direct Supabase calls removed from those components. `SettingsSections` profile update left inline (forms are RLS-bounded, single-row). Client-side RLS writes elsewhere intentionally stay client-side. |
| Task 5 — Unit tests | ✅ **No new framework installed.** Built-in `node --test` + `node --experimental-strip-types` (matches how the repo already runs its scripts) covers 48 tests / 10 suites across `tests/unit.test.ts`: bookingStatus state machine (legal transitions incl. all DB-guard mirrors, `availableActions` suspension/verification gating, `stageIndex`, `statusMeta` fallback), `agreementStatusView` (terminal-state precedence — the original "Confirming…" bug class), masking PII + authorization, PostgREST escaping built from live function output, geo haversine/bounds, achievement requirements, presence normalisation. `npm run test:unit` wired into `npm test` after the user's suites. Verified: all suites pass from `npm test` (which now also enforces guard order). |
| Task 6 — QA regression checklist | ✅ `docs/QA_REGRESSION_CHECKLIST.md` — CLIENT (login/dashboard/talent/booking/agreement/messages/notifications/sign-out), COACH (incl. verification + two-sided agreement flow), ADMIN (gate, user management, verification management, booking management, audit logging, sign-out), expected-results table, failure-reporting protocol. **Authenticated flows were not machine-verified** (no test credentials; creating accounts writes to the live production database) — checklist is for manual execution with dedicated test accounts. |
| Verification | ✅ `tsc` 0 errors · `eslint` 0 errors (243 pre-existing warnings, down from 245 after refactor) · production build 76/76 pages · `npm test` end-to-end green (encoding → typecheck → lint → 147 booking → 7 masking suites → 115 studios → discipline-data → groovey → send-email → **48 unit tests**) · `test:hub` 81, `test:booking-ui` 92 · encoding gate clean (749 files) · user WIP preserved byte-for-byte (`git diff --stat` unchanged: 61/55/30/28, +141/−33). |
| Not done (scope) | M-4 triple state-machine unification (bookingStatus/agreementStatus/hub board columns — partially applied) · M-5..M-15 (globals.css 15k-line consolidation; `StudioLocator` split; landing design-system unification H-6) · error-contract migration of the deferred handlers (needs consumer audit) · service-role narrowing · live-DB end-to-end verification (blocked on dedicated test accounts, per §E Phase 6). |

## Phase 5 execution status (2026-11-19)

| Item | Status |
|---|---|
| Task 1 — Security audit | ✅ `docs/SECURITY_AUDIT.md`: 3 critical / 8 high / 14 medium / LOW inventoried with file:line evidence. **Fixed in code this phase:** cron guard now SHA-256 + `timingSafeEqual` (was a 32-bit toy hash with non-constant-time tail compare), `/reset-password` recovery bounce (H-2 — reset flow was unreachable), seed files scrubbed of the hardcoded weak `Admin123!` credential and personal emails (now fail-closed on `app.seed_admin_password`), leaked LLM transcripts truncated from migrations 23/24, broken `media_posts.sql` comment repaired, migration 29 marked superseded. **Fixed via new migration 41** (idempotent, additive, per-section rollback notes): `SET search_path` retrofit for every SECURITY DEFINER function missing one; caller-authority guard + 0–100 clamp on `update_user_achievement_progress` and `ensure_user_achievements`; notifications INSERT policy now participant-scoped (was `WITH CHECK (true)`); `fn_reminder_once` / `expire_past_bookings` / `send_booking_reminders` revoked from PUBLIC/anon/authenticated (pg_cron unaffected). **Staged, not applied blindly (migration 41 §E):** drop of the base-table `USING (true)` public-read policies (needs `/users` + landing + community dependency verification), community isolation originals, feedbacks UNIQUE index, double-booking exclusion index, agreement INSERT clamp, `profiles` out of the realtime publication. |
| Task 2 — Service role & DB reliability | ✅ 9 service-role sites inventoried and justified (4 admin routes after `requireAdmin`, 2 script-only, tickets guest path with MIME/size allowlist, discipline read/write under `INGEST_API_KEY`-gated ingest). 12 `search_path`-less definers retrofitted (migration 41 §A loops `pg_proc`). **Migration 41** ships the security rewrites; `agent_runs` table confirmed absent from all migrations (exists only in production) — codify + verify before relying on ingest logs. |
| Task 3 — Performance | ✅ Next.js **16.3.3 → 16.4.6** + `audit fix`: `npm audit` **0 vulnerabilities** (was 1 critical RCE + 3 high). Lazy-loaded `StudioLocator` (~145 KB raw off `/client/home` and `/coach/home` first load; `next/dynamic`) and `PhotoCropModal`/`react-easy-crop` (~171 KB raw off both profile routes) with `ssr:false` + skeleton. Immutable `Cache-Control` for `/fonts`/`/image`/`/media` (was `must-revalidate` for every repeat visit). Landing aggregate counts cached 5 min via `unstable_cache` (public, non-personalized). **Deferred with reasons:** Groovey panel split (72 KB; ~250 lines of coupled state — high churn, marginal payoff), unused-CSS purge (~176 KB / 26% of globals.css — needs class-by-class verification, never blind), root-layout framer-motion/lenis scope reduction (~400 KB; medium risk — QA pass required), StudioLocator file split (explicitly against findings). Every fix measured before/after; no personalized data cached. |
| Task 4 — State machines | ✅ Programmatic comparison: `boardRules.canRoleDrop` ≡ migration 37 guard ∩ actor policy (exactly); `availableActions` adds verification/suspension gating; no rules changed. **64 new regression tests** pin the equivalence + client policy + totality + `moveOptions ⊆ canRoleDrop` — total unit suite now **119/119** (`npm run test:unit`, globs `tests/`). |
| Task 5 — Integration & E2E | ✅ Existing chain preserved and extended (see Task 4 + cron guard tests). **Playwright not installed** — no E2E framework was present; adding one costs a browser download + a staging environment with dedicated test accounts that do not exist; authenticated flows are covered by `docs/QA_REGRESSION_CHECKLIST.md` for manual execution. Public-surface regression was machine-checked (prod smoke: `/` 200, auth routes 200, portals 307→/login, QA routes 404). |
| Task 6 — Frontend maintainability | ✅ `<img>` alt spot-check: no violations found (multi-line JSX; e.g. `SafeImage`/`SignedMedia` require `alt`). Raw `<img>` 25 vs `next/image` 29 — raw uses are signed/private media, appropriate. Landing remains server-rendered; font preloads deduplicated by browser (minor double-tag noted — manual `<head>` + Next hoisting). Duplicate preload tags + `metadataBase` warning fixed this phase. |
| Task 7 — Deployment readiness | ✅ `docs/PRODUCTION_READINESS.md`: per-item status (verified / needs manual verification / not implemented / blocked by external config) covering build, env, Supabase, auth/OAuth, operations, and a 6-step sign-off sequence. `.github/workflows/ci.yml` added (`npm ci` → `npm test` → `npm run build`). **Google OAuth is not production-ready** (config unverifiable from repo — button stays honest). |
| Verification | ✅ `tsc` 0 errors · `eslint` 0 errors (243 pre-existing warnings) · production build **76/76 pages** on Next 16.4.6 · `npm test` fully green (encoding 752 files · 147 booking · 7 masking suites · 115 studios · discipline-data · groovey · send-email · **119 unit**) · `test:hub` 81/81 · `test:booking-ui` 92/92 · prod smoke: `/` 200, `/login` `/reset-password` `/forgot-password` 200, portals 307 → `/login?redirectTo=…`, QA routes 404, `/fonts/*.woff2` serves `Cache-Control: immutable` · `npm audit` **0 vulnerabilities** · user WIP preserved (byte-identical: 61/55/30/28, +141/−33) |
| Not done (scope) | Live-DB policy application (migration 41 awaits owner; §6 pre-flight queries required) · Google OAuth end-to-end verification · dedicated staging accounts for authenticated E2E · `/api/studios` + coach-assistant rate limits (M-1/M-2) · CSP `'unsafe-inline'` removal w/ nonces (M-9) · passcode page enforcement or deletion (M-4) · agreement INSERT clamp (M-13/M-14) · globals.css unused-class purge · Groovey panel lazy split · root-layout third-party scope reduction (~400 KB) |

## Phase 6 execution status (2026-11-19)

| Item | Status |
|---|---|
| Task 1 — Staging environment audit | ✅ `docs/STAGING_SETUP.md`: no staging exists in repo/config (Vercel previews ≠ staging); owner runbook for a second Supabase project + separate env vars + `@example.invalid` test accounts + migration rehearsal order + Resend sandbox + cron caveats. Nothing provisioned automatically — every step is owner-config. |
| Task 2 — Migration 41 static validation | ✅ **Exceeds static: full replay proof.** A throwaway Postgres 16 container (localhost-only, repo mounted `:ro`, stubs for `auth`/`storage`/`cron`/roles/publication, destroyed after) applied `schema.sql → admin_hardening.sql → verification_workflow.sql → migrations 00–41` with **exit 0 everywhere**. Eight latent migration defects found and repaired (`02` EXCLUDED typo · `04` regex quoting ×2 + policy-name mismatch · `05` ambiguous `oid` · `14`/`24` CREATE OR REPLACE return-type change · `26` view column-type change · `27`+root `admin_hardening` now drop-then-create policies). Migration 41 reordered (create-before-drop §C) — validated after the fix. |
| Task 3 — Database security verification | ✅ `docs/DB_SECURITY_VERIFICATION.md` — 13 read-only query sections with expected outputs (RLS on all tables, no public-read base policies, notifications policy shape, achievement RPC guards, cron RPC restrictions, search_path retrofit, triggers, publication scope, FKs/uniques/checks). Live results pending staging (blocked on Task 1 owner actions); **scratch replay proved them on the repaired chain** (stranger denied / self allowed / service_role allowed / forged notification RLS-blocked). |
| Task 4 — Authenticated QA | ❌ **BLOCKED — could not be executed.** No staging environment, no test accounts; creating accounts writes to a live database, which is out of scope and unauthorized. Public surface machine-checked only: `/`, `/login`, `/reset-password`, `/forgot-password` → 200; portals → 307 `/login`; QA routes 404. `docs/QA_REGRESSION_CHECKLIST.md` remains the instrument; `docs/RELEASE_CHECKLIST.md` records the gap as a release gate (G6/G7). |
| Task 5 — Auth & email verification | ✅ `docs/AUTH_EMAIL_VERIFICATION.md`: Google OAuth end-to-end runbook (consent screen → Supabase callback → session → role routing → cancel/return flows with explicit pass criteria) — **not executed; OAuth remains disabled**. Email: Resend domain/SPF/DKIM/DMARC checklist + reset/welcome mail round-trips + abuse controls — all blocked on owner config; no mail sent to anyone. |
| Task 6 — Backup & recovery | ✅ `docs/BACKUP_RECOVERY.md`: backup inventory (Postgres incl. `auth` schema + `cron.job`; storage bytes are NOT in DB backups — separate export needed), RPO/RTO targets, documented restore procedure, staging restore drill, migration-recovery order, monthly owner checklist. **No restore executed** (never against production; staging drill pending owner approval). |
| Task 7 — Release checklist | ✅ `docs/RELEASE_CHECKLIST.md`: every item scored VERIFIED / MANUAL VERIFICATION REQUIRED / BLOCKED / NOT IMPLEMENTED with evidence or procedure; gate items G1–G7 identified (backup verification and staging rehearsal are the blocking gates). |
| Task 8 — Observability | ✅ `docs/OBSERVABILITY_PLAN.md`: tiered plan (free Tier 0: uptime probe + Resend/log review; paid Tier 1: Sentry with mandatory PII scrubbing, `sendDefaultPii:false`, header scrubbing, no session replay; Tier 2: OTel/Grafana) with costs, privacy implications (RA 10173), and monitoring priorities. **No SDK installed** — owner decision required. |
| Verification | ✅ `npm test` fully green after all Phase 6 edits (encoding 756 files · booking 147 · masking 7 suites · studios 115/115 · discipline-data · groovey · send-email · **126/126 unit**) · `tsc` 0 errors · `eslint` 0 errors · migration replay exit 0 on all 45 SQL files · user WIP byte-identical (61/55/30/28, +141/−33) · nothing staged/committed/pushed · scratch container + image removed · `.env`/`.env.local` never read |
| Not done (scope) | Task 4/5 execution (blocked on staging + owner config) · G3/G6/G7 release gates · observability tooling installation · staging rehearsal of migration 41 · live RLS inventory confirmation · Google OAuth enablement · `agent_runs` codification · E2E with dedicated accounts |

## Phase 7 execution status (2026-11-19)

| Item | Status |
|---|---|
| STEP 1 — Repository audit | ✅ Full inventory of everything staging touches: `proxy.ts`/`lib/supabase/middleware.ts` (route classification env-independent), `lib/supabase/{client,server,serviceClient}.ts` (anon/service-role split), `app/auth/callback/route.ts` (recovery→`/reset-password` per H-2; role allowlist; open-redirect-safe), CI workflow (no changes needed — secret-free, branch-agnostic), `vercel.json` (5 crons inert outside production), `next.config.ts` (headers/images/optimizePackageImports carry over unchanged). |
| STEP 2 — Environment separation | ✅ `docs/STAGING_SETUP.md` §0/§0.1: explicit 3-row separation contract (dev/staging/prod) — isolated Supabase project, separate Vercel deployment + env scoping, staging-only `ADMIN_EMAIL` (must match the `is_admin()` SQL literal — documented, with the alignment procedure), freshly generated secrets, never production values; 21 env vars enumerated by name for the owner to scope. |
| STEP 3 — Staging DB preparation | ✅ `docs/STAGING_MIGRATION_RUNBOOK.md`: **rehearsed again this phase** (scratch replay + `scripts/verify-db-security.sql` + `supabase/staging-seed.sql` all exercised end-to-end). Contains: owner-confirmation gate, preconditions (extensions/roles/platform objects), exact ordered apply sequence (schema → admin_hardening → verification_workflow → 00…41), duplicate-migration analysis (27↔root admin_hardening both idempotent now; 10→14→24 badge RPC with drop-before-recreate; dance-vs-siblings CHECK drift **documented and deliberately unfixed**), execution checklist, dispose-and-recreate rollback. Also flags `presence_realtime.sql` must NOT be applied (H-8). |
| STEP 4 — Database verification readiness | ✅ `scripts/verify-db-security.sql` — read-only catalog dump (RLS per table, policies, definers + proconfig, grants, triggers, publication, uniques/FKs/CHECKs, buckets, storage policies). Validated this phase: 33/33 tables RLS-enabled; notifications policy participant-scoped; publication excludes profiles; all 32 definers carry search_path; storage private + owner-scoped. **Live staging results still pending owner provisioning — the script exists to produce exactly that.** |
| STEP 5 — Vercel staging deployment readiness | ✅ Documented; **nothing deployed**: same repo/branch strategy documented (separate project or `staging` branch), Node ≥22 (repo on 24), `npm run build` verified, env separation table, `vercel.json` crons inert outside production, domain + auth redirects spelled out, Deployment Protection option noted. Production settings untouched. |
| STEP 6 — Test data & authentication readiness | ✅ `supabase/staging-seed.sql` creates qa-client/qa-coach (example.invalid, unroutable) via the **signup trigger** (tested — profiles + sub-profiles auto-created, unverified by design as `guard_verification_fields()` requires); admin via `seed_admin.sql` (pinned). Start-unverified is a feature: the QA flow exercises real admin verification through `/admin/verifications`. **No accounts created — owner action required.** |
| STEP 7 — Documentation | ✅ Updated: `STAGING_SETUP.md` (audit + separation), `STAGING_MIGRATION_RUNBOOK.md` (new), `DB_SECURITY_VERIFICATION.md` (runnable script + expected-evidence capture), `RELEASE_CHECKLIST.md` (G2 → VERIFIED(scratch)/MANUAL(staging)), `QA_REGRESSION_CHECKLIST.md` (staging execution protocol + evidence recording), `DATABASE_AND_SUPABASE.md` (§9 replay + presence_realtime ban), `ARCHITECTURE_AUDIT.md` (this section). |
| Verification | ✅ `npm test` green (126/126 unit; encoding 762 files) · `tsc` 0 errors · `eslint` 0 errors · build 76/76 pages (unchanged this phase — docs + SQL + seed only) · migration replay **45/45 exit 0** · `scripts/verify-db-security.sql` executed and correct · `staging-seed.sql` rehearsed · scratch container/image removed · WIP byte-identical (61/55/30/28, +141/−33) · nothing staged/committed/pushed |
| Not done (scope) | **Nothing staging exists yet** — G6 gate unchanged; production untouched by definition · staging Supabase project + Vercel deployment + env scoping = owner action 🔒 · staging migration rehearsal + live verification = owner action · test accounts + QA execution = owner action · Google OAuth + Resend staging = owner action · backup verification (G3) still blocked |
