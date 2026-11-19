# GrooveSystem — Architecture Audit & Refactoring Report

Date: 2026-11-15 · Scope: `C:\website\GrooveSystem` · Status of the app before/after: **working tree was already dirty** (pre-existing uncommitted changes from earlier work, kept untouched). All routes, URLs, schema, RLS, auth flows and UI were preserved.

---

## 1. Executive summary

The project was **not** a from-scratch rebuild — it was an already-modularized codebase with a mature `features/` layer, an admin service (`lib/admin/service.ts`), centralized admin auth (`lib/admin/access.ts` + `lib/admin/guard.ts`), and several back-compat shims in `components/shared/`. The main problems found and fixed in this pass:

1. **Dead duplicate modules** — whole pre-refactor copies of components lived on in `components/appointments`, `components/booking`, `components/verification`, `components/community` and `lib/services`, with **zero** live imports (all call sites already pointed at the `features/` canonical copies). Deleted.
2. **Compat shims scattered in `components/shared/`** — consolidated: `EmptyState`, `GlassCard`, `LoadingScreen`, `PresenceBridge`, `StatusSelect`, `StatCard` now have exactly one canonical home each; refs were rewritten.
3. **`cn` duplicated** in `components/shared/cn.ts` and `lib/utils.ts` — now a single implementation in `lib/utils.ts`.
4. **Profile fetching had no shared API** — created `features/profile/services/profileService.ts` (client-injected, RLS-respecting), `hooks/useProfile.ts` (loading/error/refresh), and migrated the two identical Settings pages (client/coach) to it, eliminating the copy-pasted ~25-line fetch block.
5. **Role/permission definitions duplicated** — created `constants/roles.ts` (roles, labels, ROLE_HOME), `lib/permissions.ts` (predicates + `homeForRole`), `constants/routes.ts` (canonical paths). `lib/admin/access.ts#roleHome` now delegates to `homeForRole` instead of re-encoding the map.
6. **`.tsx` import-path churn** — 20 files re-pointed from `@/components/shared/EmptyState` to `@/components/ui/EmptyState`; 4 files re-pointed to `components/loading` / `features/presence` canonical modules.

Verification: **typecheck 0 errors · lint 0 errors (285 warnings, all pre-existing) · production build succeeds (all routes emitted) · unit suites: 101 passed / 70 passed / 115 passed / "All 7 test suites passed".** See §9.

---

## 2. Before → After architecture overview

### Before
```
app/                    routes (unchanged in this pass)
components/
  appointments/  booking/  verification/  community/   ← dead pre-refactor copies
  shared/        ← mix of real layouts + re-export shims + duplicate cn + a real StatCard
  loading/  ui/  dashboard/  header/  admin/ ...
features/               self-contained feature modules (already good)
lib/
  admin/                 admin service + auth guard (kept, roleHome de-duplicated)
  services/              ← dead (4 files, zero imports)
  supabase/              browser/server/service clients (kept)
hooks/                  only useDebouncedValue.ts
constants/              did not exist
```

### After
```
app/                    routes identical; settings pages now consume hooks/useProfile
components/
  ui/            ← single canonical EmptyState (26+ importers)
  loading/       ← single canonical LoadingScreen family (splash/route/modal)
  dashboard/     ← StatRow + MetricStatCard (was components/shared/StatCard.tsx)
  shared/        ← layouts/providers/shims-free real components only
  cn.ts          ← re-export of lib/utils#cn (back-compat)
features/
  profile/       ← NEW: services/profileService.ts + index.ts (canonical profile DAL)
constants/                ← NEW: roles.ts (ROLES, ROLE_HOME, ROLE_LABEL), routes.ts (ROUTES)
lib/
  permissions.ts           ← NEW: is*Role, canAccessRole, homeForRole
  admin/access.ts          ← roleHome delegates to homeForRole
hooks/
  useProfile.ts            ← NEW: useProfile() { profile, setProfile, userId, loading, error, refresh }
```

---

## 3. Moved / reorganized / deleted files

### Deleted (dead, 0 imports anywhere — verified by repo-wide search for alias, relative and basename references)
- `components/appointments/` — `BookingModal.tsx` (old copy), `FeedbackModal.tsx`
- `components/booking/` — `AgreementSignature.tsx`, `SessionAgreementCard.tsx`, `SessionAgreementDocument.tsx`, `SignAgreementModal.tsx`, `ViewAgreementModal.tsx`
- `components/verification/` — `VerificationDocumentCard.tsx`, `VerificationDocumentsUpload.tsx`, `VerificationRequiredNotice.tsx`, `VerificationReviewPanel.tsx`, `VerifiedBadge.tsx`
- `components/community/` — `CommunityFeed.tsx`, `SignedMedia.tsx`, `communityMedia.ts`
- `lib/services/` — `appointmentService.ts`, `communityService.ts`, `profileService.ts`, `ticketService.ts`
- `components/shared/EmptyState.tsx` (shim → `components/ui/EmptyState.tsx`)
- `components/shared/GlassCard.tsx` (shim, 0 refs → `components/ui/GlassCard.tsx`)
- `components/shared/LoadingScreen.tsx` (shim → `components/loading/LoadingScreen.tsx`)
- `components/shared/PresenceBridge.tsx` (shim → `features/presence/components/PresenceBridge.tsx`)
- `components/shared/StatusSelect.tsx` (shim → `features/presence/components/StatusSelect.tsx`)
- `components/shared/StatCard.tsx` (real component, only consumer `dashboard/StatRow`)

### Moved
- `components/shared/StatCard.tsx` → `components/dashboard/MetricStatCard.tsx` (export renamed `StatCard` → `MetricStatCard` to avoid collision with `components/dashboard/StatCard.tsx`; sole consumer `StatRow.tsx` updated). Its `./cn` and `./GlassCard` imports re-pointed to `@/components/shared/cn` and `@/components/ui/GlassCard`.

### Canonicalized (refs rewritten, files kept)
- `@/components/shared/EmptyState` → `@/components/ui/EmptyState` (20 files)
- `@/components/shared/LoadingScreen` → `@/components/loading/LoadingScreen` (`app/loading.tsx`, `components/shared/DashboardLayout.tsx`)
- `@/components/shared/PresenceBridge` → `@/features/presence/components/PresenceBridge` (`app/layout.tsx`)
- `@/components/shared/StatusSelect` → `@/features/presence/components/StatusSelect` (`components/header/UserMenu.tsx`)
- `components/shared/cn.ts` → re-export of `@/lib/utils#cn` (160+ importers untouched)

### Created
- `features/profile/services/profileService.ts`, `features/profile/index.ts`
- `hooks/useProfile.ts`
- `constants/roles.ts`, `constants/routes.ts`
- `lib/permissions.ts`

### Rewritten
- `app/(client)/client/settings/page.tsx`, `app/(coach)/coach/settings/page.tsx` — identical fetch blocks replaced by `useProfile()`; guest redirect preserved; dismissible error banner kept (dismiss keyed on the error string, no reset-effect).
- `lib/admin/access.ts` — `roleHome()` now delegates to `homeForRole()` (identical mapping; both remain the single source consumed by middleware + admin layout).

---

## 4. Consolidated duplications

| Duplicate | Canonical | Where the copies went |
|---|---|---|
| BookingModal / FeedbackModal (2 copies) | `features/appointments/components/*` | stale `components/appointments/*` deleted |
| Agreement/Signing components (5 files) | `features/booking/components/*` | stale `components/booking/*` deleted |
| Verification components (5 files) | `features/verification/components/*` | stale `components/verification/*` deleted (all were `export *` shims) |
| CommunityFeed / SignedMedia / communityMedia | `features/community/*` | stale `components/community/*` shims deleted |
| appointmentService / communityService / profileService / ticketService | `features/*/services/*` | stale `lib/services/*` deleted |
| EmptyState (shared shim + ui) | `components/ui/EmptyState.tsx` | shim deleted, 20 files re-pointed |
| GlassCard (shared shim + ui) | `components/ui/GlassCard.tsx` | shim deleted, 0 refs |
| LoadingScreen (shared shim + loading) | `components/loading/LoadingScreen.tsx` | shim deleted, 2 refs re-pointed |
| PresenceBridge / StatusSelect (shared shims + presence) | `features/presence/components/*` | shims deleted, 2 refs re-pointed |
| StatCard (shared, dashboard, ui) | deliberately kept 3: `ui/StatCard` (booking strip/metrics), `dashboard/StatCard` (home pages), `MetricStatCard` (dashboard StatRow) — genuinely different visuals | shared one moved to `dashboard/MetricStatCard.tsx` |
| `cn` in `components/shared/cn.ts` + `lib/utils.ts` | `lib/utils.ts` | shared now re-exports |
| `roleHome` mapping in `lib/admin/access.ts` + (new) `lib/permissions.ts#homeForRole` | `lib/permissions.ts` | access delegates |

Role-check logic is otherwise spread across feature components **intentionally** (presentational branching on `profile.role`); the *decision* points — middleware, admin layout guard, admin API guard, admin client helper — all read `lib/admin/access.ts` (`isAdminIdentity` with the `ADMIN_EMAIL` pin) and were left exactly as they were. No authorization behavior changed.

---

## 5. Supabase / data-fetching architecture (new)

**Rules enforced by the new layer**
- One module owns profile reads/writes: `features/profile/services/profileService.ts`.
- Every function takes the caller's Supabase client (`BrowserClient` in client components, cookie-bound server client in RSC/Route Handlers). **RLS applies unchanged**; the module never reaches for the service-role key.
- Reads and writes are separate functions. Writes (`updateProfile`) do a partial `UPDATE` and **strip `id`, `role`, `created_at`** so the shared helper can never move identity or role columns. No upserts.
- Failures throw `AppError` (`@/lib/errors`) with a generic user-safe message + machine code (`PROFILE_FETCH_FAILED`, …). Transport errors are never leaked raw to the UI.
- Missing `profiles` row (half-created account) resolves to `null`, not an exception — matching existing call-site semantics.

**Public API**
`getProfileById` · `getProfileByUsername` · `getCurrentProfile` · `getCoachProfile` · `getClientProfile` · `updateProfile` (exported via `features/profile/index.ts`)

**Client hook** — `hooks/useProfile.ts`: wraps the browser client; returns `{ profile, setProfile, userId, loading, error, refresh }`. Re-read on demand (`refresh`), guest-safe, defers its first read a tick (same pattern as `SessionProvider`, keeps the `react-hooks/set-state-in-effect` rule clean).

**Migrated call sites**: the two Settings pages (were byte-identical fetch blocks). **Not yet migrated** (deliberately — see §8): the dashboard/profile pages' multi-query loaders, `SessionProvider`, `SettingsSections`' auth-then-mirror email/username flow, admin pages. They already work; each needs an individual behavior review, not a regex.

**No new data-fetching libraries were introduced** (no React Query/SWR). Server vs client Supabase usage was kept separate: no server-only code was imported into client components; the new service module is client-agnostic (client injected).

---

## 6. Centralized auth & role system

- `constants/roles.ts` — `ROLES`, `Role`, `ROLE_LABEL`, `ROLE_HOME`, `isRole()`. Mirrors the `user_role` enum in `@/lib/types`.
- `constants/routes.ts` — `ROUTES` (client/coach/admin/auth/public paths), for new code; no existing literal was force-replaced.
- `lib/permissions.ts` — pure predicates `is{Admin,Coach,Client}Role`, `canAccessRole(role, allowed)`, `homeForRole(role)`. Edge-safe (no Node APIs), so proxy/middleware can import it.
- `lib/admin/access.ts` — unchanged in behavior: still the single source for "who may administer" (`profiles.role === 'admin'` **and** email pinned to `ADMIN_EMAIL`). Only `roleHome` was de-duplicated.
- Protected-route behavior, middleware route rules, layout guards, RLS: **untouched**. The admin email pin stays in env, never in the browser bundle.

---

## 7. Oversized `.tsx` files — status

| File | Lines (now) | Status |
|---|---|---|
| `components/studio/StudioLocator.tsx` | ~2266 | **Deferred — documented.** Map + search orchestration; inventory notes an attempted split was reverted. Needs component tests first. |
| `lib/googlePlaces.ts` | ~1836 | Deferred. Already split once (`googlePlacesQuota.ts`, `googlePlacesCache.ts` extracted, re-exports keep API). |
| `app/(public)/(auth)/register/coach/page.tsx` | ~1648 | Deferred — registration flow, multi-step form, high regression risk. |
| `features/appointments/components/BookingModal.tsx` | ~1523 | Deferred — booking state machine. |
| `components/auth/RegistrationFormFields.tsx` | ~1444 | Deferred. |
| `components/auth/AddressSelector.tsx` | ~1334 | Deferred (SJDM data already extracted to `components/auth/sjdms.ts`). |
| `app/(coach)/coach/profile/page.tsx` | ~999 | Partially done previously (types + Tabs/Reviews/Showcase extracted to `coach/profile/components|types/`). Not forced further. |
| Settings pages | 140 → 128 | **Refactored in this pass** (fetch block removed, no behavior change). |

Nothing was split just to hit a line count; each remaining file is JSX-heavy and needs tests before decomposition.

---

## 8. Left unchanged — and why

- **All routes & URLs, `proxy.ts`, `lib/supabase/middleware.ts`** — auth/session behavior is load-bearing; build output confirms identical route table.
- **Admin authorization** (`lib/admin/access.ts` pin logic, `lib/admin/guard.ts`, `lib/admin/service.ts`, `app/admin/**`) — never bypassed or "simplified"; only `roleHome` was de-duplicated.
- **`components/profile/SettingsSections.tsx`** — intentionally does *not* use `updateProfile()`: it must authenticate email changes via `supabase.auth.updateUser` first and only mirror to `profiles` on success. Forcing it through the generic helper would reorder auth/DB writes.
- **`SessionProvider`** — already the app-wide single source of "who is this"; the Settings pages used the new hook instead of this (page-local loading/error semantics + guest redirect), no conflict.
- **`dashboard/StatCard` vs `ui/StatCard` vs `MetricStatCard`** — different visuals (home dashboard rows, booking summary strip metrics, landing/stat rows). Merged only the single stray `components/shared/StatCard`.
- **`lib/utils.ts`** — kept as the canonical home of `cn` + `formatCurrency`/`formatDate`/etc.; did not create a parallel `utils/` root (would duplicate the repo's own convention).
- **`features/appointments` vs `components/appointments`** — canonical is `features/`; stale copy deleted, not merged.
- **Pages with multi-query profile loaders** (`*(home|profile)/page.tsx`, `app/messages`, `userprofile/[id]`, …) — need per-page behavior review before swapping to `getCurrentProfile()`; a blind regex migration would change error/empty/retry semantics that were deliberately engineered (see comments in `client/home/page.tsx`).
- **`next.config.ts`, `.env*`, `supabase/**` (schema, RLS, seeds)** — untouched by design.
- **`StudioLocator.tsx` and other 800+ line files** — see §7.
- **Pre-existing uncommitted changes** — left as found.

---

## 9. Verification results (actually run)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | **PASS** — 0 errors |
| ESLint | `npm run lint` | **PASS** — 0 errors, 285 warnings (all pre-existing; 291 before this pass) |
| Unit — booking status | `npm run test:booking` | **PASS** — 101 passed, 0 failed (7 suites) |
| Unit — masking | `npm run test:masking` | **PASS** — all suites |
| Unit — booking time UI | `npm run test:booking-ui` | **PASS** — 70 passed, 0 failed |
| Studio locator suite | `npm run test:studios` | **PASS** — 115 passed, 0 failed |
| Full gate | `npm run test` | **PASS** (typecheck && lint && the three suites) |
| Production build | `npm run build` | **PASS** — all routes emitted (`/`, `/login`, `/client/*`, `/coach/*`, `/admin/*`, `/messages`, `/userprofile/[id]`, …), static+dynamic split unchanged, proxy (middleware) compiled |

Tests that were already failing/skipped before this pass: **none observed.** The Google Places 429 lines in the studios suite are mocked quota-exhaustion assertions, not failures. Auth flows verified to the extent possible without live Supabase credentials: typecheck, build-time prerender of every page, middleware compile, and the unchanged admin guard paths. A manual sign-in smoke test against the real Supabase project is still recommended post-deploy.

---

## 10. Remaining architectural issues (honest list)

1. **Oversized files** (§7) — need component tests before decomposition.
2. **Profile-fetching migration is partial** — the new `features/profile` service + `useProfile` are proven on Settings; the dashboard/profile/messages loaders still hand-roll multi-query fetches. Migrate incrementally, one page per PR, preserving each page's empty/error/retry semantics.
3. **Role-string literals in feature components** (`profile.role === 'coach'` etc., ~150 sites) — presentational; fine, but `constants/roles.ts` should back any *new* role logic, and eventually the most-repeated helpers (e.g. booking-card collectives) can take predicates from `lib/permissions.ts`.
4. **`components/shared/` is still mixed-purpose** (layouts + providers + banners + 30 real components). A further split (`layouts/`, `feedback/`, `navigation/`) is cosmetic and was not forced — it would churn 100+ imports for zero behavior gain without tests.
5. **`components/ui/` has 26 files** — good convergence (Badge, Button, Card, Input, Modal, …) but still no barrel; import-by-path is the convention, keep it.
6. **No barrel exports for most features** (`features/profile/index.ts` aside) — intentional to avoid circular deps; do not add mega-barrels.
7. **Duplicated booking-detail pages** (client vs coach appointments) share `features/appointments` already; their page shells (~700 lines each) could extract a shared `<AppointmentsShell>` given tests.
8. **`features/groovey` (981-line gemini.ts, 613-line ChatContext)** — works; isolate streaming/tool-calling behind a service seam when convenient.
9. **`next.config.ts` has an unused `isProd`** (pre-existing warning) — remove at next config pass.
10. **Four `npm run test` warnings carry `react-hooks/set-state-in-effect` from pre-existing files** (`lib/i18n/LanguageProvider.tsx`, `app/(public)/(auth)/login/page.tsx`, etc.) — not introduced here.

---

## 11. Net effect

- Working-tree diff vs HEAD: 66 files changed, ~232 insertions, ~910 deletions — **includes pre-existing uncommitted work** (Google Places quota/cache extraction, profile-page decomposition, next.config cleanup) that was in the tree before this pass. This pass's own contribution: 19 dead files deleted (see §3), ~20 import sites re-pointed, 2 Settings pages rewritten onto `useProfile()`, 7 new modules created.
- Zero runtime behavior changes; every route, guard, shim contract and loading surface preserved or redirected to a strictly better canonical implementation.
- The codebase now has: one profile DAL, one role/permission vocabulary, one route map for new code, one `cn`, one EmptyState, one LoadingScreen family, one presence pair — and a written record of what was deliberately *not* touched and why.
