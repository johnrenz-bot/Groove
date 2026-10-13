# Implementation Plan — GrooveSystem Badge Collection + Dashboard & Navbar

Generated from live codebase exploration. All paths are relative to `c:\website\GrooveSystem`.

---

## Feature 1 — Badge Collection (Client & Coach Profiles)

### Design Decisions

- **New component `BadgeCollectionSection`** replaces the current `AchievementSection` on both profile pages. The existing `AchievementSection` hides everything when `tasks.length === 0` (early return `null`) and only shows a "View Achievements" button — no inline visual. The new component shows an attractive collection grid inline on the page.
- **Badge image**: All fallbacks currently resolve to `/image/Groove-BADGE.svg` (which doesn't exist). The canonical path is `/image/Badge/Groove-BADGE.png` (confirmed present in `public/image/Badge/`). Update all fallbacks.
- **Badge names preserved**: The DB uses "Groove Active" (client) and "Groove Coach" (coach). These are correct — the prompt's "Groove Badge" refers to the concept, not a rename. The `BadgeType` union stays `'Groove Coach' | 'Groove Active'`.
- **No new DB migration needed**: All data already exists in `achievements`, `user_achievements`, `appointments`, `feedbacks`, and `profiles`. The `useAchievements` and `useBadgeStatus` hooks already provide everything needed.
- **"Coming Soon" placeholders**: 2 generic locked cards with no invented names — just "New Badge" placeholders with `?` icons.
- **Keep modals**: `AchievementsModal` and `AchievementModal` (celebration) stay. The `BadgeCollectionSection` renders an inline grid first, then opens modals on click.

---

### Step 1 — Fix badge image path across the codebase

**What**: Change every fallback from `/image/Groove-BADGE.svg` to `/image/Badge/Groove-BADGE.png` in the 3 files that reference it.

**Files**:
- `components/achievements/AchievementSection.tsx` — `badgeImageUrl` fallback (line ~line 85)
- `components/achievements/AchievementsModal.tsx` — download link `link.download = 'Groove-BADGE.png'` is fine; the `badgeImageUrl` prop default needs fixing in callers
- `app/(client)/client/profile/page.tsx` — no direct reference (passes through hooks), but `handleRefreshAchievements` and the props are clean
- `app/(coach)/coach/profile/page.tsx` — same

**Verify**: `npm run build` produces no TypeScript errors.

---

### Step 2 — Create `components/achievements/BadgeCollectionSection.tsx`

**What**: New `'use client'` component that renders:

1. **Section header** — "Badge Collection" heading with subtitle, plus a refresh button (calls `onRefresh`).
2. **Collection grid** — `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
3. **Groove Badge card** (the first/only real badge):
   - `<img src="/image/Badge/Groove-BADGE.png" />` displayed prominently (64–80px tall), grayscale + opacity 40% when locked, full color when earned.
   - Badge name (`badgeStatus?.badge_name || getBadgeName(role)`), badge description below it.
   - Status pill: green "Earned" when `is_unlocked`, amber "In Progress" when `tasks_completed > 0 && !is_unlocked`, gray "Locked" otherwise.
   - Earned date (`badgeStatus.unlocked_at`) when earned — formatted with `toLocaleDateString('en-PH')`. Never shown when null.
   - Progress bar: `tasks_completed / tasks_total` — only shown when not yet earned.
   - Task checklist: 3 rows, each showing task title + `CheckCircle2` (green, filled) or `Circle` (gray) icon. Incomplete tasks render as a `<Link>` to the relevant page (use the same `getTaskUrls` map from `AchievementSection`).
   - "View Details" button — opens `AchievementsModal` (passed as `onViewDetails` prop).
   - Celebration trigger: auto-opens `AchievementModal` on first unlock (same `sessionStorage` guard already in `AchievementSection`).
4. **"Coming Soon" placeholder cards** (2 cards):
   - Dimmed lock icon, label "Coming Soon", no name/description invented.
   - Subtle locked styling: gray border, `bg-muted`, `cursor-default`.

**Loading state**: When `loading === true`, show 3 skeleton cards (`g-skeleton h-48 rounded-2xl`) so the section doesn't disappear.

**Props interface**:
```ts
interface BadgeCollectionSectionProps {
  tasks: AchievementWithProgress[];
  badgeStatus: UserBadgeStatus | null;
  userId: string;
  role: 'client' | 'coach';
  loading?: boolean;
  className?: string;
  onRefresh?: () => Promise<void>;
}
```

**Files**:
- `components/achievements/BadgeCollectionSection.tsx` (create)
- `components/achievements/index.ts` (add export)

**Verify**: `npm run build` — no TypeScript errors, no missing imports.

---

### Step 3 — Update client profile page to use `BadgeCollectionSection`

**What**: In `app/(client)/client/profile/page.tsx`, replace the `<AchievementSection>` render block (in the "Achievements" `<div className="mb-6">` section) with `<BadgeCollectionSection>`. Pass `loading` from the achievements hooks (`achievements.length === 0 && !error` is not reliable — use `useAchievements` loading state). The `useAchievements` hook already exposes `loading` via its return; destructure it.

**Changes**:
1. Add `loading: achievementsLoading` to the `useAchievements` destructure.
2. Replace `import { AchievementSection }` with `import { BadgeCollectionSection }`.
3. Replace the `<AchievementSection .../>` with `<BadgeCollectionSection tasks={clientAchievements} badgeStatus={clientBadgeStatus} userId={profile.id} role="client" loading={achievementsLoading} onRefresh={handleRefreshAchievements} />`.

**Files**:
- `app/(client)/client/profile/page.tsx`

**Verify**: `npm run build` — no errors.

---

### Step 4 — Update coach profile page to use `BadgeCollectionSection`

**What**: Mirror Step 3 for `app/(coach)/coach/profile/page.tsx`. The coach profile page uses `useAchievements(coach?.id ?? null, 'coach')` — same pattern. Replace `AchievementSection` with `BadgeCollectionSection` with `role="coach"`.

**Files**:
- `app/(coach)/coach/profile/page.tsx`

**Verify**: `npm run build` — no errors.

---

## Feature 2 — Dashboard Improvements

### Design Decisions

- **Client dashboard**: Replace misleading StatCards. `recommendedCoaches.length` ≤ 8 (query limit) is not "Verified Coaches count". Instead fetch the actual count of coaches with `account_verified = true`. Rename "Upcoming Sessions" to show only future appointments, not all 4 fetched. Add Messages quick-link. Add a "Pending Bookings" count StatCard. Show appointment status more clearly.
- **Coach dashboard**: Replace misleading `recommendedUsers.length` StatCard. Fetch actual client count. Add a dedicated "Pending Requests" section (filter `appointments` where `status = 'pending'` for this coach). Add today's schedule (filter `appointments` by today's date). Re-use existing `EmptyState` and `Badge` components.
- **No new components needed** — work within existing `Card`, `StatCard`, `EmptyState`, `Badge`, `Button` components.
- **Stick to the existing grid layout** (`lg:grid-cols-3`) — only change content inside it.

---

### Step 5 — Improve client dashboard (`/client/home`)

**What**: Refactor `app/(client)/client/home/page.tsx`:

1. **Data loading additions** in `loadDashboardData`:
   - Fetch real verified coach count: `supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coach').eq('account_verified', true)` → `verifiedCoachCount`.
   - Fetch pending bookings count: `supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('client_id', authUser.id).eq('status', 'pending')` → `pendingCount`.
   - Fetch upcoming appointments with date filter: add `.gte('date', new Date().toISOString().slice(0, 10))` to the appointments query.
   - Add state: `const [verifiedCoachCount, setVerifiedCoachCount] = useState(0)` and `const [pendingCount, setPendingCount] = useState(0)`.

2. **StatCard row** — replace 4 StatCards with:
   - "Upcoming Sessions" → `upcomingAppointments.length` (now filtered to future dates)
   - "Pending Bookings" → `pendingCount`
   - "Verified Coaches" → `verifiedCoachCount` (real DB count)
   - "Account Status" — keep as-is

3. **Quick actions bar** below PageHeader: add a Messages button `<Link href="/messages">` with `MessageSquare` icon alongside the existing "Browse Coaches" button.

4. **Upcoming sessions sidebar**: Add `appt.status` color-coding with proper `Badge` variants. Show "No upcoming sessions" `EmptyState` with a link to `/client/appointments`.

5. **Loading state**: The existing skeleton is fine; no change needed.

6. **Error state**: Add a top-level `error` state. If `loadDashboardData` throws, show `<FormError>` instead of a blank screen.

**Files**:
- `app/(client)/client/home/page.tsx`

**Verify**: `npm run build` — no errors.

---

### Step 6 — Improve coach dashboard (`/coach/home`)

**What**: Refactor `app/(coach)\coach\home\page.tsx`:

1. **Data loading additions** in `fetchData`:
   - Fetch real client (performer) count: `supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client')` → `clientCount`.
   - Fetch pending booking requests: `supabase.from('appointments').select('*, client:client_id(*)').eq('coach_id', profile.id).eq('status', 'pending').order('date', { ascending: true }).limit(5)` → `pendingAppointments`.
   - Fetch today's schedule: `supabase.from('appointments').select('*, client:client_id(*)').eq('coach_id', profile.id).eq('date', new Date().toISOString().slice(0, 10)).order('start_time', { ascending: true })` → `todayAppointments`.
   - Add states: `clientCount`, `pendingAppointments`, `todayAppointments`.

2. **StatCard row** — replace 4 StatCards:
   - "Upcoming Appointments" → count of `appointments` with future date and `status IN ('confirmed', 'pending')`.
   - "Registered Performers" → `clientCount` (real DB count, not slice limit).
   - "Platform Region" — keep.
   - "Coach Status" — keep.

3. **New "Today's Schedule" section** in the main column (above the students grid): if `todayAppointments.length > 0`, show a card listing today's sessions. If empty, show compact `EmptyState`.

4. **New "Pending Requests" card** in the main column (after today's schedule): show up to 5 pending appointments with Accept/Decline buttons that link to `/coach/appointments`.

5. **Appointments list**: already shows all appointments; add status filter tabs ("All", "Pending", "Confirmed") as simple `<button>` toggles that filter the local `appointments` state — no new DB query needed.

**Files**:
- `app/(coach)/coach/home/page.tsx`

**Verify**: `npm run build` — no errors.

---

## Feature 3 — Header/Navbar Improvements

### Design Decisions

- **No structural changes** — `AppTopNav`, `DashboardLayout`, `ClientLayout`, `CoachLayout` all work correctly. Changes are cosmetic/UX only.
- **Profile photo in mobile sheet**: The mobile sheet shows initials-only avatar. The `user?.photo_url` is already available (it's used in the desktop account button). Add the same `Image` rendering to the sheet identity block.
- **Active state in mobile sheet**: The `data-active` attribute is already there; check if `g-sheet-link[data-active]` CSS applies the accent color and border — if not, it needs a CSS addition.
- **Messages nav item upgrade for coach**: Add `Messages` directly to `COACH_NAV.primary` (remove from Community group). Currently coach Messages is only in the Community dropdown. Client already has it in the dropdown too — add it to `CLIENT_NAV.primary` as well, since the prompt asks for "messages" as a quick-link on the dashboard. Actually, re-checking: the nav already has 6 primary items for client and 5 for coach. Adding Messages to primary would overflow the header row. Better approach: ensure Messages is a prominent action on dashboards (done in FEAT-002) and add a dedicated Messages shortcut icon to `AppTopNav`'s actions zone.
- **Account button**: Already shows `user.photo_url` if available (confirmed in the code at offset 737+). The mobile sheet does NOT show it — fix that.
- **Mobile sheet**: Add profile photo to the sheet identity block.

---

### Step 7 — Improve AppTopNav: profile photo in mobile sheet + active state polish

**What**: In `components/shared/AppTopNav.tsx`:

1. **Mobile sheet identity block** (around line 955+): Replace the plain `<span className="g-account-avatar">` (initials) with the same conditional rendering used in the desktop account button — `user?.photo_url ? <Image .../> : <span>initials</span>`. Use the same `g-header-avatar-img` class for the `<Image>` or a new `g-sheet-avatar-img` class if dimensions differ.

2. **Messages shortcut in actions zone**: Add a `<Link href="/messages">` icon button in the actions zone (between search and notifications) that shows `MessageSquare` icon. Only show for `client` and `coach` roles (not admin). This gives both roles a 1-click Messages path without touching the nav items.

**Files**:
- `components/shared/AppTopNav.tsx`

**Verify**: `npm run build` — no errors. Check at mobile width: sheet shows photo/initials correctly.

---

### Step 8 — Navigation spacing and active state polish

**What**: 

1. **`components/client/navigation.ts`**: No changes needed — Messages is already in Community group and dashboard has a quick-link after FEAT-002.
2. **`components/coach/navigation.ts`**: No changes needed — same reasoning.
3. **Mobile sheet active state**: Confirm `g-sheet-link[data-active]` CSS exists in the global stylesheet. If missing, add `.g-sheet-link[data-active] { color: var(--accent-text); background-color: var(--accent-soft); }` to the relevant CSS file.

**Files**:
- Find and check `app/globals.css` or wherever `g-sheet-link` is defined; patch if the active state rule is absent.

**Verify**: `npm run build` — no errors. `npm run lint` — no new warnings.

---

## Build Verification

After all 8 steps:

```bash
cd c:\website\GrooveSystem
npm run lint
npm run build
```

Expected: exit code 0 for both. Fix any TypeScript errors before reporting completion.

---

## Files Summary

| File | Action |
|------|--------|
| `components/achievements/BadgeCollectionSection.tsx` | **Create** — new badge collection component |
| `components/achievements/AchievementSection.tsx` | **Modify** — fix badge image fallback path |
| `components/achievements/index.ts` | **Modify** — export `BadgeCollectionSection` |
| `app/(client)/client/profile/page.tsx` | **Modify** — use `BadgeCollectionSection`, destructure `loading` |
| `app/(coach)/coach/profile/page.tsx` | **Modify** — use `BadgeCollectionSection`, destructure `loading` |
| `app/(client)/client/home/page.tsx` | **Modify** — real stats, messages quick-link, error state |
| `app/(coach)/coach/home/page.tsx` | **Modify** — real stats, today's schedule, pending requests |
| `components/shared/AppTopNav.tsx` | **Modify** — photo in mobile sheet, messages shortcut |
| `app/globals.css` (or equivalent) | **Possibly modify** — active state rule if absent |

No database migrations required. No new npm packages required.
