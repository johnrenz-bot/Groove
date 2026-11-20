# GroovePH — Project Structure Guide

> Folder-by-folder, file-responsibility guide for a new engineer. Read this before opening any code. Every claim here was verified against the actual tree on 2026-11-19. See `docs/SYSTEM_OVERVIEW.md` for the big picture and `docs/ARCHITECTURE_AUDIT.md` for problems and the roadmap.

**Conventions**

- `@/*` in imports maps to the repository **root** (not `src/`). `'use client'` = Client Component; everything else is a Server Component by default.
- Next.js 16 renamed the `middleware.ts` convention to **`proxy.ts`** — there is no `middleware.ts` in this repo; the request boundary is root-level `proxy.ts`.
- Route groups in parentheses (e.g. `(public)`) do not appear in URLs.
- There is no `types/` or `utils/` folder — shared types live in `lib/types.ts` and feature-local `types.ts`; utilities live in `lib/utils.ts` and `lib/*.ts`.

---

## 1. Root files

| File | Responsibility |
|---|---|
| `package.json` | Scripts + dependencies. `npm run build` = encoding check → `next build`. `npm test` = encoding + typecheck + lint + three Node-based test scripts (`test-booking-status`, `test-masking`, `test-studio-locator`). No test runner (no Jest/Vitest). |
| `tsconfig.json` | `strict`, `moduleResolution: bundler`, path alias `@/* → ./*`, includes `.next/types`. |
| `next.config.ts` | Security headers (HSTS, CSP, X-Frame-Options…), image remote allowlist, `optimizePackageImports` for framer-motion/dnd-kit. **No routes/rewrites** — routing is file-based. |
| `proxy.ts` | **The request boundary.** Delegates to `updateSession()` in `lib/supabase/middleware.ts`. Excludes `api/` and static assets from its matcher. |
| `instrumentation.ts` | Boot hook: validates env via `lib/config/env.ts` on the Node runtime (warns in dev, throws in prod). |
| `vercel.json` | Cron schedules → `/api/cron/*` (see `docs/API_ENDPOINTS.md`). |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals + typescript; downgrades several rules to warn; ignores `scripts/archive/**`. |
| `README.md` | Product + developer docs. **Its "Further Documentation" links are dead** (`docs/architecture.md` etc. do not exist; only `docs/archive/*` and this suite). |
| `AGENTS.md` / `CLAUDE.md` | Next.js-16 agent rules only; no project conventions. |

---

## 2. `app/` — Routes (App Router)

129 files, ~1.5 MB. Classification by **actual code**, not folder name:

| Area | Files | Classification | Notes |
|---|---|---|---|
| `app/layout.tsx` | 256 lines | Server Component (root layout) | Owns `<html>`, font preloads, theme-init inline script, and **all providers**: `LanguageProvider → SessionProvider → ThemeProvider → SuccessNotificationProvider → PlatformThemeSync/RouteThemeEnforcer/AppLoadingSplash/TopProgressBar/PresenceBridge/ClickSoundBridge → SmoothScrollProvider → PagePatterns/PageTransition → MusicPlayerProvider → PlayerGate`. |
| `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` | boundaries | Client / Client / Server | Render `GrooveErrorScreen`. |
| `app/fonts.css` | Self-hosted `@font-face` | CSS | Inter, Source Serif 4, Mr De Haviland + metric-adjusted fallbacks. |
| `app/globals.css` | **678 KB / 15,134 lines** | CSS | ALL design tokens, `@theme` utilities, dark/light/classic/halloween/christmas themes, Lenis styles, component classes. The de-facto design system. |
| `app/(public)/` | layout, page, about, about-project, faq, performing-arts-philippines, privacy, support, terms + `(auth)/` subgroup | Mixed | `(public)/page.tsx` (Server) = front door with role redirect. Static content pages = Server; `privacy`/`terms` are Client. |
| `app/(public)/(auth)/` | login, register/client, register/coach, register/complete, forgot-password, reset-password, `layout.tsx`, `loading.tsx` | All Client pages | Register wizards: `client` (821 lines), `coach` (1,506 lines — heaviest page in repo). `layout.tsx` forces the dark auth backdrop. |
| `app/(client)/client/` | home, about, appointments, calendar, groovey, messages, performing-arts-philippines, profile (924-line), profile/edit (redirect), settings, talent (363 lines), layout, loading | Mixed | `layout.tsx` (Server) → `components/client/ClientLayout`. Pages are client-heavy; only `groovey/messages/performing-arts-philippines/appointments/profile/edit/talent` are thin Server wrappers/redirects. |
| `app/(coach)/coach/` | mirror of client + `talents/` (showcase) + `profile/` with `components/` (reviews, tabs, showcase) and `types/` | Mixed | `talent/page.tsx` is a 1-line re-export of `talents/page.tsx` (alias). |
| `app/admin/` | layout, loading + 15 pages + `verify-passcode/` (page, actions.ts, PasscodeForm.tsx, config.ts) | layout = Server gate; pages = Client | Admin pages fetch via `lib/admin/service.ts` (browser client + RLS); only `/api/admin/*` routes use service-role. `verify-passcode` = optional second factor, unlinked from navigation. |
| `app/api/` | 30 route handlers | Backend (route handlers) | Full inventory in `docs/API_ENDPOINTS.md`. All `export const dynamic = 'force-dynamic'`. Each handler authenticates itself. |
| `app/auth/callback/route.ts` | 68 lines | Backend (OAuth exchange) | `exchangeCodeForSession`, allowlists `next` (open-redirect guard) and `role` (`client|coach` only). Recovery type → `/reset-password`. |
| `app/actions/achievements.ts` | `'use server'` | Server Actions | Self-service/participant-only badge updates (achievements RPCs are `SECURITY DEFINER`, so the actions are the authorization boundary). |
| `app/community/performing-arts/` | dance, singing, acting, theater (+ `[discipline]/`, `history/`) + layout, loading | Server | Public editorial hubs; static pages win over the dynamic `[discipline]` route. |
| `app/contracts/[id]/` | 17 KB client page | Client | Signing surface for agreements (parties only, enforced by RLS). |
| `app/messages/`, `app/users/`, `app/userprofile/[id]/` | page.tsx | Mixed | Role-aware redirect (messages); member directory (users, 602 lines, client); public profile (userprofile, 848 lines, client). |
| `app/preview-mini/*`, `app/studio-qa/*` | dev/QA surfaces | Client/Server | `studio-qa/qa-frame.tsx` monkey-patches `window.fetch`. **Publicly reachable** — review before production. |
| `app/(public)/performing-arts-philippines/` | Server | Public discipline hub (`PerformingArtsHub role="public"`) |

**Portals & duplicates to know before editing:** `client/talent`, `coach/talent`, `coach/talents` are near-identical Showcase surfaces; `client/about` and `coach/about` are twins; `client/home` and `coach/home` are structural mirrors (~197 lines each, same skeleton/error/loading markup).

---

## 3. `components/` — Reusable UI (204 files, ~39.6k lines)

Organized by subject, not by page. Groups:

| Folder | What belongs there | Examples / notes |
|---|---|---|
| `ui/` | **The design system** — buttons, cards, modals, badges, forms, skeletons | `Button`, `Card`, `Panel`, `GlassCard`, `Modal.tsx` (canonical modal kit — exports shared `useDialogStack`/`FOCUSABLE_SELECTOR`/scroll-lock used by both modal systems), `LoadingState.tsx` (canonical inline loading state + `RouteSkeleton`), `FormField`, `Skeleton`, `StatCard`, `motion.ts`, `GrooveErrorScreen`. |
| `auth/` | Registration/login building blocks | `RegistrationFormFields.tsx` (1,341 lines), `AddressSelector.tsx` (1,252), `AuthWizard`, `AuthUI`, `sjdms.ts` (SJDM data, extracted), `auth/ui/Modal.tsx` (auth-wizard modal kit — **visual layer separate, behavior shared** with `ui/Modal`: same dialog stack, scroll lock, focusable selector). |
| `shared/` | Cross-app widgets (largest bucket) | `PublicLayout`, `DashboardLayout` (wrapper → `layout/DashboardChrome`), `FollowButton`, `ProfileFollowList`, `NotificationDropdown`, `MaintenanceBanner`, `WelcomeModal`, `LegalLayout`, `CoachAIAssistantModal`. (Dead files from the audit were removed in Phase 2.) |
| `header/` | **The app header** (consumes, doesn't own, the session) | `AppHeader.tsx`, `navConfig.ts`, `appHeaderConfig.ts`, `SessionProvider` relocated to `components/providers/` (Phase 3). |
| `providers/` | App-wide React context providers | `SessionProvider.tsx` (the one session source, mounted at root — 10+ consumers), `SmoothScrollProvider.tsx`. |
| `landing/` | Marketing page sections | `LandingPage.tsx` (used by `/`), `HeroSection`, `FaqSection`, `landingStats.server.ts` (server-only) + `landingStats.ts` (client-safe). (Dead hero/teaser files removed in Phase 2.) |
| `layout/` | Page chrome | `DashboardChrome.tsx` (the one dashboard shell — uses `lib/auth/signOutEverywhere`), `StandaloneChrome`, `PagePatterns`, `PageTransition`. (`SiteHeader`/`AppShell` deleted in Phase 2.) |
| `loading/` | Loading primitives | `LoadingScreen`, `LoadingModal`, `GrooveSpinner`, `TopProgressBar`, `AppLoadingSplash`. (Inline `LoadingState` + `RouteSkeleton` moved to `components/ui/LoadingState.tsx` in Phase 3.) |
| `admin/` | Admin console building blocks | `AdminContext` (cross-page state + audit pings), `AdminLayout`, `AdminTable`, `AdminStates`, `AdminUserDrawer`, `UserDirectory`. |
| `profile/` | Profile page sections | `ProfileFormSections.tsx` (849), `SettingsSections.tsx` (477), `ProfileHero` (the live one), `ProfileGallery`, `bento/ProfileTiles.tsx`, `PhotoCropModal`. |
| `dashboard/` | Dashboard widget kit | `Greeting`, `HeroBanner`, `QuickActions`, `PanelCard`. (Dead re-exports/pairs deleted in Phase 2.) |
| `directory/` | Coach-directory filter machinery | `useDirectoryFilters`, `DirectoryFilters`, `MobileFiltersSheet`, `LocationMenu`. |
| `theme/` | Theme system | `ThemeProvider` (root-mounted), `PlatformThemeSync` (admin platform theme), `ThemeToggle`, `ThemeModeSelect`. |
| `studio/` | Studio Locator | `StudioLocator.tsx` (**2,132 lines — biggest component**), `StudioLocatorMap.tsx` (748). |
| `achievements/` + `badges/` | Badge/gamification UI | Two sibling directories implementing one domain; `badges/BadgeCollection` reuses `achievements/AchievementModal`. `components/achievements/index.ts` barrel unused. |
| `faq/`, `about/`, `player/`, `search/`, `users/`, `groovey/`, `notifications/` | Misc | `search/useGlobalSearch` + `HeaderSearch`; `player/MiniPlayer` + `PlaylistPanel` + `PlayerGate`. (providers moved to own row above.) |

**Rule of thumb:** feature-specific UI belongs in `features/<name>/components/`, not here. `components/` is for things reused across ≥2 features or app-wide. Today many feature widgets still live under `features/*/components/` — that is correct — but the `shared/` vs `ui/` vs `layout/` split is inconsistent (see AUDIT).

---

## 4. `features/` — Feature modules (274 files, ~45k lines)

Self-contained modules: `components/`, `services/`, `data/`, `hooks/`, `types`. Barrels were removed in Phase 2 except `@/features/groovey` and `@/features/music`; app code deep-imports.

| Module | Purpose | Live entry points |
|---|---|---|
| `home/` | Dashboard widgets + data for client/coach portals | `HomeDashboard` (role-parameterized shared dashboard used by both `*/home/page.tsx` wrappers), `ClientWidgetGrid`, `CoachWidgetGrid`, `services/homeService` |
| `hub/` | The unified Messages+Bookings inbox ("Bookings Hub") | `HubView` — mounted by `app/(client|coach)/messages/page.tsx`; `useHubBadge` feeds the sidebar badge |
| `appointments/` | Booking lifecycle UI + pure state machine | `BookingModal`, `FeedbackModal`, `BookingAgreementPanel`; `bookingStatus.ts` mirrors migration 37 |
| `booking/` | Agreement signing inside threads | `SignAgreementModal`, `ViewAgreementModal`, `agreementStatus.ts` — consumed only by `appointments` |
| `calendar/` | Role-agnostic calendar (year/month/week/day/agenda) | `AppointmentCalendar` — client/coach calendar pages |
| `community/` | "Tambayan Circle" feed: posts, reactions, comments | `CommunityFeed`, `PostComposer`, `CommunityLeaderboard` via `showcase/ShowcaseShell` |
| `showcase/` | Talent showcase shell (banner carousel + embeds feed) | `ShowcaseShell` — `client/talent`, `coach/talents` |
| `dance/` + `singing/` + `acting/` + `theater/` | Four **thin service/agent shims** over the shared discipline core (`features/discipline/`) — zero duplicated pipeline code; dance keeps its own view (league registry) + `OrgLogoBar`/`UpdateCard`/`UpcomingEventsSection` | `*CommunityPageServer` → shared `DisciplineCommunityPageServer` at `/community/performing-arts/<discipline>` |
| `discipline/` | **Shared discipline core** (Phase 4): `services/disciplineService.ts` factory + `config`, `types`, `components/DisciplineCommunityPageServer` + 16 shared components | used by all four disciplines; 18 cloned files deleted |
| `notifications/` | Notification domain (Phase 4): `services/notificationService.ts` — list/subscribe/mark/broadcast, RLS-bounded, Realtime preserved | `NotificationDropdown`, `AdminContext#notifyUsers` |
| `theme/` | Platform appearance domain (Phase 4): `services/platformThemeService.ts` — read-only `system_settings` sync + Realtime | `PlatformThemeSync` |
| `performing-arts/` | Shared reference content + chrome for the discipline hubs | `PerformingArtsHub`, `HubRoute`, `data/*` (816-line `content.ts`) |
| `groovey/` | Groovey AI: chat UI + streaming Gemini backend + repertoire | `GrooveyMain` (pages), `server/gemini.ts` (**compat shim**, re-exports provider + injects Grooveyy default prompt), `server/prompts/grooveySystemInstruction.ts` |
| `music/` | Global YouTube/audio player + queue | `MusicPlayerProvider` (root layout), `PlayerGate`, `MiniPlayer` |
| `payments/` | GCash coach-client payments | **`GCashQrCard` (GCashQrField) is the only live surface.** A full payment-request/proof/review subtree (~10 files) is dead code — see AUDIT |
| `verification/` | Document-verification domain rules | `VerificationDocumentsUpload`, `VerificationReviewPanel`, `VerifiedBadge`, `bookingGate` |
| `presence/` | Live presence + status selects | `PresenceBridge` (root layout), `usePresence` |
| `profile/` | The one profile read/write path | `profileService.ts` — used only by `hooks/useProfile.ts` |
| `auth/` | Role-selection cards | **Entire module is dead** (0 references) |
| `sound/` | Click sound + toggle | `ClickSoundBridge` (root layout), `SoundToggle` |

Deep module notes live in `docs/FEATURE_MODULES.md`.

---

## 5. `lib/` — Shared libraries (67 files)

| Area | Contains | Notes |
|---|---|---|
| `supabase/` | `client.ts` (browser singleton), `server.ts` (cookie client + `createAdminClient` service-role w/ placeholder detection), `middleware.ts` (`updateSession` — the real proxy logic), `serviceClient.ts` (cookieless service-role for agents) | Server-only except `client.ts`. |
| `admin/` | `access.ts` (**the admin definition**: role==='admin' + `ADMIN_EMAIL` pin), `guard.ts` (`getAdminIdentity`/`requireAdmin`), `service.ts` (`'use client'` admin data access), `useAdminData.ts`, `presentation.ts` | `permissions.ts` is **not** an admin authority (no email pin). |
| `config/` | `env.ts` (zod-validated env, Node boot check), `featuredLocations.ts`, `projectInfo.ts`, `site.ts`, `skillsConfig.ts` | `ADMIM_PASSWORD`/`OPENROUTER_MODEL`/`GEMINI_MODEL` are **not** in the schema — validated ad hoc. |
| `cron/` | `auth.ts` — fail-closed `authorizeCronRequest()` | Production without `CRON_SECRET` ⇒ 503. |
| `dance/` | Dance-pipeline contracts: `schema.ts`, `contracts.ts`, `constants.ts`, image verification/dedup/sources, `types.ts` | Shared with Node scripts (import-free by design). |
| `achievements/` | Badge engine: `definitions.ts`, `requirements.ts`, `server.ts`, `client.ts`, `hooks.ts` | Server actions in `app/actions/achievements.ts` call `server.ts`. |
| `i18n/` | EN/TL dictionaries + `LanguageProvider` | Chrome strings only, never UGC. |
| `errors/` | **Canonical error contract** (Phase 4): `errorCodes.ts`, `AppError.ts`, `errorResponse.ts`, `index.ts` — `AppError.database(...)` etc. | `lib/errors.ts` + `lib/api/errors.ts` are back-compat shims. |
| `ai/` | **AI provider stack** (Phase 4): `providers/gemini.ts` (Gemini + Groq/OpenRouter fallbacks), `types`, `errors`, `config`, `index` (`formatFallbackMessages`) | Dependency direction fixed: `lib/openrouter.ts` → `lib/ai/...`; features never imported by lib. |
| `studios/`, `faq/`, `header/`, `theme/`, `groovey/`, `messenger/`, `api/`, `auth/` | Studio discovery (curated/dedupe/nationwideSweep), FAQ data, account-pill rules, theme types, Groovey knowledge block, messenger queries, API error shims, chrome-role resolver + `signOut.ts` (canonical sign-out, Phase 3) | `auth/resolveChromeRole.ts` decides which chrome to render server-side; `auth/signOut.ts#signOutEverywhere` owns presence→flag→`signOut()`. |
| root files | `errors.ts` (shim), `geo.ts` (haversine/PH bounds), `googleMaps.ts`, `googlePlaces.ts` (+`…Cache/…Quota`), `googleRegistration.ts` (OAuth flow), `masking.ts`, `nominatim.ts`, `openrouter.ts`, `permissions.ts`, `postgrest.ts`, `rateLimit.ts`, `sendEmailSecurity.ts`, `grooveyValidation.ts`, `uploadValidation.ts`, `utils.ts`, `publicProfile.ts`, `profile*.ts`, `types.ts` (authoritative union types), `typography.ts` | `rateLimit.ts` is per-process (not globally distributed). |

---

## 6. The rest

| Path | Responsibility |
|---|---|
| `hooks/` | `useDebouncedValue.ts`, `usePlayerVisible.ts`, `useProfile.ts` (shared profile fetch w/ loading/error/refresh) |
| `config/` | `dashboard-widgets.ts` (widget registry — CLIENT/COACH widget order), `player-routes.ts` (music allowlist) |
| `constants/` | `roles.ts` (ROLES/ROLE_HOME used by `lib/permissions.ts`) — `routes.ts` was deleted in Phase 2 (0 references) |
| `tests/` | **`tests/unit.test.ts`** (Phase 4, extended in 5): pure-logic suites via built-in `node:test` — bookingStatus, agreementStatusView, masking, postgrest, geo, achievements, presence, **state-machine consistency vs hub boardRules** · **`tests/cronAuth.test.ts`** (Phase 5): cron guard fail-closed contract (7 tests) |
| `src/styles/theme.css` | 64-line "surface helpers" — deliberately minimal; `app/globals.css` owns the palette |
| `agent/` | `run-*-agent.ts` — CLI entry points for the four content agents (same functions the cron routes call) |
| `scripts/` | Node quality gates: seed/sync jobs (`seed-dance-updates`, `sync-dance-logos`, …), verifiers (`verify-discipline-data.ts` — wired into `npm test`), Node-native tests (`test-booking-*.ts`, `test-masking.ts`, `test-studio-locator.ts`, `test-hub-logic.ts`, plus the user's `test-groovey.ts`/`test-send-email.ts` — wired into `npm test`), and `archive/` (38 one-off helpers) |
| `supabase/` | `schema.sql` + root SQL files, `migrations/00…41` (42 numbered; 41 = Phase 5 security hardening, validated Phase 6), plus manual-application caveats — see `docs/DATABASE_AND_SUPABASE.md` and **`docs/SECURITY_AUDIT.md`** §6 |
| `docs/` | This suite + `archive/` (3 prior reports) + **`QA_REGRESSION_CHECKLIST.md`** (Phase 4) + **`SECURITY_AUDIT.md`**, **`PRODUCTION_READINESS.md`** (Phase 5) |
| `.github/workflows/` | **`ci.yml`** (Phase 5): `npm ci` → `npm test` → `npm run build` on push/PR (no secrets) |
| `public/` | ~170 MB of photography/logos/fonts — do **not** prune casually (assets referenced from code + migrations) |
| `.vscode/` | Editor-only (gitignored elsewhere, present in tree) |

---

## 7. Import conventions (verified, post-Phase-3)

- **Deep imports everywhere**; the remaining barrels (`@/features/groovey`, `@/features/music`) are the only feature barrels in the tree. Prefer `@/features/<module>/...` deep paths matching existing code.
- **`@/components/providers/SessionProvider`** is the one session source — imported by **10+ files across all layers** (app, components, features); the `header/` package now only *consumes* it.
- No `server-only` markers anywhere; layering is enforced by convention only.
- Client components never import server-only *modules* (`lib/supabase/server.ts`, `features/groovey/server/**`) — verified. Server modules import client-side *types* (e.g. `features/presence/utils/presence.ts` imports `type UserStatus` from `@/lib/types`). The Phase 2 smell (`lib/openrouter.ts` → `features/groovey/server/gemini.ts`) is **fixed** in Phase 4: `lib/openrouter.ts` now imports `@/lib/ai/providers/gemini`.
- **One `cn()`**: `lib/utils.ts` (clsx + tailwind-merge). The back-compat shim `components/shared/cn.ts` was deleted in Phase 2; every import points at `@/lib/utils`.
- **Sign-out**: the canonical implementation is `lib/auth/signOut.ts#signOutEverywhere(userId?)` — used by `AppHeader`, `DashboardChrome`, and both Settings pages. (`SidebarProfileMenu` and `MobileDrawer` receive `onLogout` from their parents; the parents call the same utility.) It clears presence (`profiles.status='offline'`, best-effort), clears the welcome flag, and ends the session; callers then `router.push('/login'); router.refresh()`.
