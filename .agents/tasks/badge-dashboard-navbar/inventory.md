# GrooveSystem — Codebase Inventory
## Badge Collection + Dashboard & Navbar Task

---

## 1. Files Read and Their Purpose

### Project Root
| File | Purpose |
|------|---------|
| `AGENTS.md` | Warns that this is Next.js 16 with breaking changes; mandates reading `node_modules/next/dist/docs/` before writing code. |
| `package.json` | Next.js 16.3.3, React 19.2.8, Supabase SSR, Tailwind v4, Lucide React 1.37, TypeScript 5. |

### `lib/supabase/`
| File | Purpose |
|------|---------|
| `client.ts` | Browser Supabase client via `createBrowserClient` from `@supabase/ssr`. Used in all `'use client'` pages. |
| `server.ts` | Server Supabase client via `createServerClient`; uses `await cookies()` (Next.js 16 async cookies). Also exports `createAdminClient` with service role key fallback. |
| `middleware.ts` | (Not read; helper for the route proxy/middleware to refresh sessions.) |

### `lib/achievements/`
| File | Purpose |
|------|---------|
| `types.ts` | Core TypeScript types: `AchievementSlug`, `Achievement`, `UserAchievement`, `UserBadgeStatus`, `AchievementRequirement`, `AchievementWithProgress`, `AchievementTask`, `AchievementModalTask`, `BadgeType`. |
| `definitions.ts` | Static fallback definitions for both roles; `getAchievementDefinitions()`, `getBadgeName()`, `getBadgeDescription()`. Client badge = "Groove Active", Coach badge = "Groove Coach". |
| `requirements.ts` | Pure requirement evaluation. `isFilled()`, `loadProfileRowSet()`, `profileTaskRequirements()`, `taskRequirements()`, `progressForRequirements()`, `applyRequirements()`. Single source of truth for what makes each task complete. |
| `server.ts` | Server-side achievement service: `getAchievementsForRole`, `getUserAchievements`, `getUserAchievementsWithProgress`, `getUserBadgeStatus` (calls `get_user_badge_status` RPC), `checkAndUpdateAchievements`, `onProfileUpdated`, `onBookingConfirmed`, `onReviewSubmitted`. |
| `client.ts` | Browser-side read-only achievement service: mirrors server.ts but uses browser Supabase client. |
| `hooks.ts` | React hooks: `useAchievements(userId, role)` → `{achievements, loading, error, refetch}`. `useBadgeStatus(userId)` → `{badgeStatus, loading, error, refetch}`. Both defer initial fetch with `window.setTimeout(0)` to avoid set-state-in-effect lint error. |
| `index.ts` | Re-exports all achievements modules with disambiguating aliases for server vs client variants. |

### `lib/`
| File | Purpose |
|------|---------|
| `types.ts` | All shared TypeScript interfaces: `Profile`, `CoachProfile`, `ClientProfile`, `FullCoach`, `Appointment`, `Feedback`, `CommunityPost`, `Announcement`, `Notification`, `Ticket`, etc. |

### `app/actions/`
| File | Purpose |
|------|---------|
| `achievements.ts` | Server actions (`'use server'`): `updateAchievementsAfterProfileUpdate`, `updateAchievementsAfterBookingConfirmed`, `updateAchievementsAfterReviewSubmitted`, `triggerAchievementCheck`, `refreshAchievements`. All verify user role before delegating to server lib. |

### `app/(client)/client/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Thin wrapper: renders `<ClientLayout>` from `@/components/client/ClientLayout`. |
| `profile/page.tsx` | Full client profile page (`'use client'`). Loads `profiles` + `client_profiles`, fetches achievements via `useAchievements` + `useBadgeStatus` hooks, renders `<AchievementSection>`. Has view/edit mode for profile fields. Tab navigation: "Overview & Details" and "My Media Showcase". |
| `home/page.tsx` | Client dashboard (`'use client'`). Loads profile, coaches, appointments, announcement. Renders `StatCard` row, hero video banner, recommended coaches grid, upcoming sessions sidebar, studio locator. Support ticket modal included. |

### `app/(coach)/coach/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Thin wrapper: renders `<CoachLayout>` from `@/components/coach/CoachLayout`. |
| `profile/page.tsx` | Full coach profile page (`'use client'`). Loads `profiles` joined with `coach_profiles`, fetches achievements via `useAchievements` + `useBadgeStatus`, renders `<AchievementSection>`. Tabs: "Overview & Rates", "Client Reviews", "Media Showcase". |
| `home/page.tsx` | Coach dashboard (`'use client'`). Loads coach profile, appointments, performers, coaches, announcement. Renders StatCard row, hero video banner, performers grid, appointments list, mini-calendar, support ticket modal, studio locator. |

### `components/client/`
| File | Purpose |
|------|---------|
| `ClientLayout.tsx` | Passes `CLIENT_NAV`, `CLIENT_PORTAL_LABEL`, `role="client"`, `homeHref="/client/home"` to `<DashboardLayout>`. |
| `navigation.ts` | `CLIENT_NAV` — primary links: Dashboard, Find Coaches, Groovey AI, Appointments, Calendar, Performing Arts. Groups: Community (Directory, Messages), About (About Groove). |

### `components/coach/`
| File | Purpose |
|------|---------|
| `CoachLayout.tsx` | Passes `COACH_NAV`, `COACH_PORTAL_LABEL`, `role="coach"`, `homeHref="/coach/home"` to `<DashboardLayout>`. |
| `navigation.ts` | `COACH_NAV` — primary links: Dashboard, Showcase, Bookings, Calendar, Performing Arts. Groups: Community (Directory, Messages), About (About Groove). |

### `components/shared/`
| File | Purpose |
|------|---------|
| `DashboardLayout.tsx` | Main shell for all three roles. Renders `<AppTopNav>`, `<main>` with content, `<WelcomeModal>`, `<GrooveyFloatingAssistant>`, `<MusicPlayerDock>`. Content max-width: 1240px, padding: `px-5 py-7 sm:px-8 sm:py-9`. |
| `AppTopNav.tsx` | Full-featured top header. Three zones: brand (logo + portal label), nav (inline links + group dropdowns), actions (search, notification bell, account menu). Sticky with scroll-based shadow. Role-based `ROLE_META` for account menu destinations. |
| `navTypes.ts` | TypeScript: `NavItem {href, label, icon, description?}`, `NavGroup {label, icon?, items}`, `RoleNav {primary, groups}`. |
| `StatCard.tsx` | Metric card component for dashboards. |
| `EmptyState.tsx` | Reusable empty state with icon, title, description, optional action link/href. |
| `ProfileHero.tsx` | Shared identity hero card used by both profile pages. |
| `SectionHeader.tsx` | Exports `PageHeader` component used on profile and dashboard pages. |
| `WelcomeModal.tsx` | Welcome modal shown once per session; controlled by `DashboardLayout`. |

### `components/achievements/`
| File | Purpose |
|------|---------|
| `AchievementBadge.tsx` | Badge display component with unlocked/locked states, sizes (sm/md/lg/xl), glow effects. Types: `'Groove Coach'` or `'Groove Active'`. |
| `AchievementSection.tsx` | The section rendered on profile pages. Shows "View Achievements" button; opens `AchievementsModal`. Also auto-triggers celebration `AchievementModal` on first unlock. Calls `refreshAchievements` on mount and when modal opens. |
| `AchievementModal.tsx` | Celebration modal when badge is first earned. Confetti particles, glow animations, badge display, completed task list, share/download actions. Auto-closes after 15s. |
| `AchievementsModal.tsx` | Progress modal opened from "View Achievements" button. Shows all tasks with completion status, requirement checklists, progress bars. Refresh button. Share/Download actions. |
| `AchievementTaskList.tsx` | Standalone task list card (`g-card`). Shows badge header, 3-task progress with step connectors, completion timestamps, unlock footer. Used standalone (not currently included in profile pages — `AchievementSection` uses modals instead). |
| `index.ts` | Barrel export for the achievements components directory. |

---

## 2. Relevant Supabase Tables

### Core Profile Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | `id (UUID PK)`, `role (user_role enum)`, `firstname`, `lastname`, `email`, `username`, `photo_url`, `bio`, `status`, `city_name`, `region_name`, `barangay_name`, `account_verified`, `verification_status`, `created_at` | Main user table; linked to `auth.users`. Used for profile completion check (photo_url, city/region/barangay). |
| `client_profiles` | `id (UUID FK → profiles)`, `talent (VARCHAR DEFAULT 'N/A')`, `valid_id_path` | Client-specific. `talent` default 'N/A' is a placeholder (handled by `isFilled()` in requirements.ts). |
| `coach_profiles` | `id (UUID FK → profiles)`, `talents`, `genres`, `service_fee`, `duration`, `payment_type`, `payment_handle`, `notice_hours`, `notice_days`, `cancellation_method`, `portfolio_path`, `valid_id_path`, `id_selfie_path` | Coach-specific. Used for coach profile completion check. |

### Booking & Review Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `appointments` | `id`, `appointment_id`, `client_id (FK)`, `coach_id (FK)`, `status (appointment_status enum)`, `date`, `start_time`, `end_time`, `session_type`, `created_at` | Status enum: `pending → accepted → agreement_required → confirmed → completed/declined/cancelled`. Badge check uses `status IN ('confirmed', 'completed')`. |
| `feedbacks` | `id`, `coach_id (FK)`, `user_id (FK)`, `rating (1-5)`, `comment`, `created_at` | Coach badge needs `rating = 5`. Client badge needs any review by `user_id`. |

### Achievement Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `achievements` | `id (UUID PK)`, `slug (UNIQUE)`, `role (user_role)`, `title`, `description`, `icon`, `badge_name`, `badge_description`, `badge_image_url`, `task_order`, `is_active`, `created_at` | Currently seeded with 6 rows (3 client, 3 coach). `badge_image_url` is `/image/Groove-BADGE.svg` in DB seed — but actual image is at `/image/Badge/Groove-BADGE.png`. |
| `user_achievements` | `id (UUID PK)`, `user_id (FK)`, `achievement_id (FK)`, `progress (0-100)`, `completed_at`, `unlocked_at`, `metadata (JSONB)`, `created_at` | RLS: users can only read their own rows; writes only via SECURITY DEFINER RPCs. |

### Supporting Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `announcements` | `id`, `title`, `message`, `cta_url`, `cta_label`, `created_at` | Used on both dashboards. |
| `tickets` | `id`, `user_id`, `name`, `email`, `subject`, `message`, `status`, `priority` | Used for support ticket modals on both dashboards. |
| `community_posts` | `id`, `author_id`, `caption`, `media_path`, `talent` | Used in showcase tab on profiles. |

---

## 3. Existing Badge/Achievement Logic

### Database Functions (RPCs)
| Function | Purpose |
|----------|---------|
| `ensure_user_achievements(p_user_id)` | Inserts missing `user_achievements` rows for all role achievements. Called on new user insert (trigger) and before progress updates. |
| `has_user_earned_badge(p_user_id, p_role)` | Returns TRUE when all active achievements for the role have `completed_at IS NOT NULL`. |
| `get_user_badge_status(p_user_id)` | Returns single row: `{role, badge_name, badge_description, tasks_completed, tasks_total, unlocked_at, is_unlocked}`. Fixed in migration 14 (removed `badge_image_url` column from output — note: migration 10 added it but 14 dropped it from the RPC return). |
| `update_user_achievement_progress(p_user_id, p_achievement_slug, p_progress, p_metadata)` | Updates progress; stamps `completed_at` when progress ≥ 100; stamps `unlocked_at` if badge newly earned. Returns `{success, message, newly_completed, badge_unlocked}`. SECURITY DEFINER. |
| `handle_new_user_achievements()` | Trigger function: calls `ensure_user_achievements` for each new profile row. |

### TypeScript Helpers
| Module | Key Functions |
|--------|---------------|
| `lib/achievements/requirements.ts` | `isFilled(value)`, `loadProfileRowSet(supabase, userId, role)`, `profileTaskRequirements(role, rows)`, `taskRequirements(task, role, rows)`, `progressForRequirements(requirements)`, `applyRequirements(tasks, role, rows)` |
| `lib/achievements/server.ts` | `getUserAchievementsWithProgress`, `checkAndUpdateAchievements` (the main orchestrator), `onProfileUpdated`, `onBookingConfirmed`, `onReviewSubmitted` |
| `lib/achievements/client.ts` | Read-only browser versions of the above |
| `lib/achievements/hooks.ts` | `useAchievements(userId, role)`, `useBadgeStatus(userId)` |
| `lib/achievements/definitions.ts` | Static fallback definitions used when DB unavailable |

### Achievement Slugs
| Slug | Role | Badge | Task Order |
|------|------|-------|-----------|
| `client_profile_complete` | client | Groove Active | 1 |
| `client_first_booking` | client | Groove Active | 2 |
| `client_first_review` | client | Groove Active | 3 |
| `coach_profile_complete` | coach | Groove Coach | 1 |
| `coach_first_booking` | coach | Groove Coach | 2 |
| `coach_first_five_star` | coach | Groove Coach | 3 |

### Profile Completion Requirements
**Client:** profile photo (`profiles.photo_url`), primary performing interest (`client_profiles.talent` ≠ 'N/A'), location details (all three of `city_name`, `region_name`, `barangay_name`).

**Coach:** profile photo, coaching bio (`profiles.bio`), performing arts skill (`coach_profiles.talents`), at least one genre (`coach_profiles.genres`), standard rate (`coach_profiles.service_fee`), session duration (`coach_profiles.duration`), payment mode (`coach_profiles.payment_type`).

---

## 4. Current Structure of Profile Pages, Dashboard Pages, and Layouts

### Profile Pages
Both profile pages follow the same pattern:
1. `'use client'` — all data loaded client-side on mount via `useEffect`.
2. Supabase browser client fetches `profiles` row + role-specific profile row.
3. `useAchievements(userId, role)` and `useBadgeStatus(userId)` hooks populate achievement state.
4. `handleRefreshAchievements` calls `refreshAchievements` server action then refetches.
5. `AchievementSection` rendered below `ProfileHero`, above tab navigation.
6. Tab navigation below achievements.

**Client profile tabs:** "Overview & Details" (profile fields, view/edit) | "My Media Showcase" (community posts).
**Coach profile tabs:** "Overview & Rates" (profile + coaching rates, view/edit) | "Client Reviews" (feedbacks) | "Media Showcase".

### Dashboard Pages
Both dashboards follow the same pattern:
1. `'use client'` — all data loaded on mount.
2. Metric row of 4 `StatCard` components.
3. Hero video banner with announcement floating card.
4. Main 2/3 + 1/3 grid layout: main content left, sidebar right.
5. Studio locator at the bottom.

**Client dashboard content:**
- StatCards: Upcoming Sessions count, Verified Coaches count, Platform Region (hardcoded), Account Status.
- Hero: Video + announcement.
- Main: Recommended coaches grid (4 cards), Support callout.
- Sidebar: Upcoming sessions list.

**Coach dashboard content:**
- StatCards: Appointments count, Students in SJDM count, Platform Region (hardcoded), Coach Status.
- Hero: Video + announcement.
- Main: Students/performers grid (4 cards), Recent appointments list.
- Sidebar: Mini calendar, Support ticket card.

### Layouts
```
app/(client)/client/layout.tsx
  → components/client/ClientLayout.tsx ('use client')
    → components/shared/DashboardLayout.tsx ('use client')
      → components/shared/AppTopNav.tsx ('use client')
      → <main> { children } </main>
      → WelcomeModal, GrooveyFloatingAssistant, MusicPlayerDock
```
Same structure for coach with `CoachLayout`.

---

## 5. Gaps and Missing Pieces the Implementation Steps Need to Address

### Badge Collection (Profile Pages — Task 1)
1. **Badge image path mismatch**: DB seed has `badge_image_url = '/image/Groove-BADGE.svg'`, but the actual file at the correct public path is `/image/Badge/Groove-BADGE.png`. The `AchievementSection` falls back to `/image/Groove-BADGE.svg` if `badgeStatus.badge_image_url` is null. The seeded URL needs to reflect the actual PNG path, or the component fallback needs updating to `/image/Badge/Groove-BADGE.png`.

2. **"Groove Badge" vs existing badge names**: The prompt calls it the "Groove Badge" and says clients earn the "Groove Badge". The DB has "Groove Active" (client) and "Groove Coach" (coach). The `BadgeType` type in `types.ts` = `'Groove Coach' | 'Groove Active'`. The prompt says the badge is named "Groove Badge" — this conflicts with existing code. The existing badge name system ("Groove Active" / "Groove Coach") is the live implementation and should be preserved. However, the prompt asks for displaying the `Groove-BADGE.png` image properly in a collection card layout.

3. **Collection card layout missing**: Currently `AchievementSection` shows only a "View Achievements" button that opens a modal. The prompt asks for a proper **Badge Collection** section with: badge image inside an attractive collection card, badge name, description, earned/locked status, task completion progress, "Coming Soon" cards for future badges. This requires a new `BadgeCollectionSection` component (or updating `AchievementSection`) to display an inline collection grid rather than just a modal trigger.

4. **`AchievementSection` renders nothing when `tasks.length === 0`**: If achievements haven't loaded yet (DB cold start), the section disappears. The skeleton/loading state needs to show the section in loading state rather than hiding it.

### Dashboard Improvements (Task 2)
5. **Client dashboard StatCards use fake data**: "Verified Coaches count" is just `recommendedCoaches.length` (the first 8 from DB, not actual verified count). "Upcoming Sessions" is the loaded count (limit 4). These should show real counts or be redesigned to avoid misleading numbers.

6. **Coach dashboard StatCards use fake data**: "Students in SJDM" is `recommendedUsers.length` (first 8 clients). Same issue.

7. **Dashboard "pending booking requests" missing for coach**: The prompt asks for "pending booking requests" widget for coach dashboard. Currently appointments are shown without filtering by status. A pending requests card with accept/decline actions (linking to `/coach/appointments`) would be useful.

8. **Client dashboard missing messages quick-link**: The prompt asks for "messages" on the client dashboard.

9. **Quick stats (useful statistics)**: Both dashboards currently show somewhat redundant or hardcoded stats. Improvements: show real pending/confirmed counts from appointments table.

### Navbar/Header Improvements (Task 3)
10. **AppTopNav account menu** does not currently show the active profile photo — it uses initials or a placeholder. Showing the real profile photo in the account button would be an improvement.

11. **Mobile sheet** closes correctly but could have better active state indication for the current route.

12. No structural gaps — the nav system is complete. Improvements are cosmetic/UX (active state styling, profile photo in avatar button, mobile sheet improvements).

### Data Issues
13. **`get_user_badge_status` RPC** in migration 14 removed `badge_image_url` from the return type but migration 10 (original) added it. The `UserBadgeStatus` TypeScript type still has `badge_image_url?: string | null`. The actual DB function (migration 14) does NOT return it. This means `badgeStatus.badge_image_url` is always `undefined`, and the component falls back to the hardcoded `'/image/Groove-BADGE.svg'`. The fallback should be updated to `/image/Badge/Groove-BADGE.png`.

14. **`badge_image_url` column missing in RPC result**: The `AchievementSection` uses `badgeStatus?.badge_image_url || '/image/Groove-BADGE.svg'` — since migration 14 dropped `badge_image_url` from the RPC output, this always resolves to the fallback SVG path (which doesn't exist either). The component should use `/image/Badge/Groove-BADGE.png` as the canonical fallback.

---

## Summary of What Needs to Be Built/Changed

| Area | What to Build/Change |
|------|---------------------|
| `components/achievements/BadgeCollectionSection.tsx` (new) | Proper badge collection grid: Groove Badge card with image, description, task progress inline, earned/locked state; "Coming Soon" placeholder card(s). Replace or augment `AchievementSection` on profile pages. |
| `app/(client)/client/profile/page.tsx` | Swap `AchievementSection` for new `BadgeCollectionSection` (or update section to include collection display). |
| `app/(coach)/coach/profile/page.tsx` | Same as client profile. |
| Badge image fallback | Update all fallback paths from `/image/Groove-BADGE.svg` to `/image/Badge/Groove-BADGE.png`. |
| `app/(client)/client/home/page.tsx` | Dashboard UI improvements: real stats, messages quick-link, better layout/spacing/responsiveness. |
| `app/(coach)/coach/home/page.tsx` | Dashboard UI improvements: real appointment stats, pending requests section, today's schedule, better layout/spacing. |
| `components/shared/AppTopNav.tsx` | Navbar improvements: profile photo in account button, better active states, mobile sheet polish. |
| `components/client/navigation.ts` | Possibly add Messages as a primary link (currently only in Community group). |
| `components/coach/navigation.ts` | Possibly re-order or add items. |
