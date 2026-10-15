# Implementation Plan — Dashboard Home + Header Navigation Redesign

Generated from live codebase exploration. All file paths are absolute and resolved from
`c:\website\GrooveSystem`. The implementer must use the **absolute path** for every file
operation, because relative paths resolve against the parent workspace, not this worktree.

---

## Codebase context (what was read)

| File | Key finding |
|---|---|
| `app/globals.css` | Tailwind v4 with `@theme` block. All colors are CSS variables: `--background`, `--card`, `--border`, `--accent`, `--accent-soft`, `--accent-border`, `--accent-text`, `--muted`, `--muted-foreground`, `--success`, `--success-soft`, `--foreground`, `--divider`. Utility classes: `g-card`, `g-skeleton`, `g-eyebrow`, `g-pill`, `g-header-*`, `g-sheet-*`. No new hex values may be introduced. |
| `package.json` | Next.js 16.3.3, React 19, Tailwind v4, lucide-react, no test framework. No new packages allowed. |
| `components/shared/AppTopNav.tsx` | `'use client'`. 3-zone grid: brand / nav / actions. Already has sticky blur header (`g-header[data-scrolled]`), `g-header-wordmark` with `g-header-name` + `g-header-role`. Mobile sheet at `< lg`. Logo is in `g-header-mark` (22×22 image) + `g-header-wordmark` (span). The wordmark renders: `g-header-name` ("Groove") + `g-header-role` (portal label). **To remove the wordmark, conditionally hide `g-header-wordmark`** (don't delete CSS — other roles use it). |
| `components/client/navigation.ts` | `CLIENT_NAV`: 6 primary inline links, 2 groups (Community, About). |
| `components/coach/navigation.ts` | `COACH_NAV`: 5 primary inline links, 2 groups (Community, About). |
| `app/(client)/client/home/page.tsx` | `'use client'`. State: `user`, `recommendedCoaches` (≤8 FullCoach), `upcomingAppointments` (≤4 Appointment), `announcement`, `selectedCoach`, ticket modal state, `loading`. NO community posts, NO badge data. |
| `app/(coach)/coach/home/page.tsx` | `'use client'`. State: `coach`, `appointments` (≤6), `recommendedUsers` (≤8 Profile), `topCoaches` (≤5 FullCoach), `announcement`, `selectedUser`, ticket modal state, `loading`. NO community data. |
| `components/shared/StatCard.tsx` | Accepts `value: ReactNode`, `label: string`, `description?: string`, `icon?: ReactNode`, `accent?: boolean`. Uses `GlassCard`. |
| `components/shared/GlassCard.tsx` | `glass rounded-[20px]` with optional `glass-hover`. |
| `components/ui/Card.tsx` | `g-card` + padding variants. `CardHeader` renders icon-badge + title + subtitle + action. `CardContent`. |
| `components/ui/Badge.tsx` | Variants: `pending`, `approved`, `confirmed`, `completed`, `cancelled`, `neutral`, `accent`. |
| `components/ui/Button.tsx` | Variants: `primary`, `secondary`, `outline`, `ghost`. Sizes: `sm`, `md`, `lg`, `icon`. |
| `components/ui/Modal.tsx` | Full focus-trap, ESC, backdrop-blur, fade+scale. Sizes: `sm`(max-w-md) `md`(max-w-lg) `lg`(max-w-2xl). |
| `components/ui/Skeleton.tsx` | `Skeleton`, `SkeletonCard`, `SkeletonGrid`, `SkeletonText`, `LoadingState`. |
| `components/shared/EmptyState.tsx` | `compact` prop: `py-10`, full: `py-16`. Takes `icon`, `title`, `description`, `action`, `actionHref`. |
| `components/shared/CoachCard.tsx` | Full-bleed photo card with rating, genres, bio hover panel. Too heavy for the compact row requested. |
| `components/badges/BadgeCollection.tsx` | Already exists — the badge mini-widget needs to call `refreshAchievements` (server action). |
| `lib/types.ts` | `Profile`, `FullCoach`, `Appointment`, `Announcement` are the types in scope. |

---

## DO NOT TOUCH (unchanged across all steps)

- `lib/supabase/client.ts`, `lib/supabase/server.ts` — data layer
- Every Supabase query inside home pages — only **wrap** them in new components; never move or delete them
- `app/actions/achievements.ts` — server actions (badge mini-widget calls `refreshAchievements`)
- `StudioLocator` component and its anchor (`id="studios"`)
- `MaintenanceBanner` in client home
- Ticket modal state + `handleTicketSubmit` in client home
- `ProfileModal` and `TicketModal` sub-components in coach home
- `MiniCalendar` sub-component in coach home (keep it in coach home, not shared)
- `Modal` (components/ui/Modal.tsx), `Badge`, `Button`, `Card` component internals
- `AppTopNav.tsx` core logic: auth, presence, search, notifications, account menu, sign-out
- `DashboardLayout.tsx`, `ClientLayout.tsx`, `CoachLayout.tsx` — no changes needed
- Navigation data files (`navigation.ts`) — no route changes
- `globals.css` — no changes needed (all required CSS already exists)

---

## Architecture decisions

1. **New `components/dashboard/` directory** — 8 shared widget components. Both home pages
   import from this directory. The pages keep all their state/fetching; they pass data as
   props to these presentational widgets.

2. **No new data fetching** — every widget receives data that the host page already fetches.
   Badge mini-widget is the only exception: it runs `refreshAchievements(userId)` as a fire-
   and-forget call that the page delegates.

3. **Logo-only header** — add `logoOnly?: boolean` prop to `AppTopNav`. When true, suppress
   the `g-header-wordmark` span with a conditional. No CSS deletion.

4. **Nav grouping stays as-is** — the current `CLIENT_NAV` / `COACH_NAV` already group items
   well (primary + Community + About). The brief's grouping request maps almost exactly onto
   what already exists. The only change: client primary currently has 6 items (Dashboard,
   Find Coaches, Groovey AI, Appointments, Calendar, Performing Arts) — this is already the
   correct grouping per the brief. No navigation.ts changes needed.

5. **Recommended Coaches widget** — new compact `CoachAvatarRow` component: avatar + name +
   specialty tag only, no price/hours. Horizontal scroll on mobile, 4-col grid on desktop.
   Whole card links to `/userprofile/:id`. No `CoachCard` (too heavy).

6. **Badge mini-widget** — thin wrapper that imports `BadgeCollection` (already built in
   `components/badges/BadgeCollection.tsx`). The home page must supply `tasks`,
   `badgeStatus`, `userId`, `role`. Since home pages don't fetch badge data today, the widget
   fetches its own data internally (using the same `useAchievements` + `useBadgeStatus`
   hooks that profile pages use). This is the only widget that self-fetches.

7. **Skeleton and empty states** — every widget must render a skeleton via `g-skeleton`
   divs when its host page's `loading === true`, and an `EmptyState` when the array is empty.

---

## Step 1 — Create `components/dashboard/` directory and 8 widget components

**What**: Create the directory and all 8 widget files as described below. These are
presentational components — no Supabase, no server actions (except BadgeMiniWidget).

### 1a — `HeroBanner.tsx`

```
File: components/dashboard/HeroBanner.tsx
```

**Props interface:**
```ts
interface HeroBannerProps {
  /** e.g. "Client Console · San Jose del Monte, Bulacan" */
  eyebrow: string;
  /** e.g. "Coach Instructor Workspace" */
  headline: string;
  subline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  /** Announcement overlay — pass null to hide */
  announcement: Announcement | null;
}
```

**What to render** (top-to-bottom, no absolute-positioned text over the video):
- Outer: `<section>` with `relative flex h-[200px] items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted sm:h-[240px]`
- `<video autoPlay loop muted playsInline aria-hidden>` source `/media/Groove.mp4`
- `<div className="absolute inset-0 bg-background/70" aria-hidden />`
- Centered content div `relative z-10`: eyebrow pill (`g-eyebrow`), h2 `text-xl sm:text-2xl font-bold text-white`, p subline `text-xs sm:text-sm text-white/75`
- CTA row: primary accent button (`bg-accent text-accent-foreground hover:bg-accent-hover rounded-full h-9 px-5 text-sm font-semibold`) + secondary glass button (`border border-white/25 bg-white/10 text-white backdrop-blur-sm rounded-full h-9 px-5 text-sm font-semibold`)
- Announcement: `absolute bottom-3 right-3 z-20 hidden sm:flex` — card `rounded-2xl border border-border bg-card/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur-md` with Sparkles icon, title (truncate), message (line-clamp-2), optional CTA link

**Skeleton state**: `<div className="g-skeleton h-[200px] rounded-[20px] sm:h-[240px]" />`

**Imports**: `Link` (next/link), `Announcement` from `@/lib/types`, `Sparkles` from lucide-react, `ExternalLink` from lucide-react.

---

### 1b — `StatRow.tsx`

```
File: components/dashboard/StatRow.tsx
```

**Props interface:**
```ts
interface StatItem {
  value: React.ReactNode;
  label: string;
  description?: string;
  icon: React.ReactNode;
}
interface StatRowProps {
  stats: StatItem[];
  loading?: boolean;
}
```

**What to render**:
- `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">`
- When `loading`: 4 `<div className="g-skeleton h-32 rounded-[20px]" />` inside the grid
- When not loading: map `stats` → `<StatCard value={s.value} label={s.label} description={s.description} icon={s.icon} />` from `@/components/shared/StatCard`

**Skeleton state**: 4 skeleton rectangles.
**Empty state**: N/A — always receives at least 4 stats.

---

### 1c — `QuickActions.tsx`

```
File: components/dashboard/QuickActions.tsx
```

**Props interface:**
```ts
interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** "primary" renders accent button style, "default" renders outline */
  variant?: 'primary' | 'default';
}
interface QuickActionsProps {
  actions: QuickAction[];
}
```

**What to render**:
- `<div className="flex flex-wrap gap-2.5">`
- Each action: `<Link href={a.href} className={...}>` — primary: `inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover`, default: `inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-border-strong hover:bg-muted`
- Each Link includes the `icon` (h-4 w-4) + `label`

**No skeleton** (static, not data-driven).
**No empty state** — always has actions.

---

### 1d — `UpcomingSessionsWidget.tsx`

```
File: components/dashboard/UpcomingSessionsWidget.tsx
```

**Props interface:**
```ts
interface UpcomingSessionsWidgetProps {
  appointments: Appointment[];
  loading?: boolean;
  viewAllHref: string;
  /** "coach" shows client name; "client" shows coach name */
  perspective: 'client' | 'coach';
}
```

**What to render**:
- `<Card padding="md" className="h-full">` with `<CardHeader icon=<Calendar> title="Upcoming Sessions" subtitle="Your booked rehearsals" action=<Link href={viewAllHref}>View all</Link>>`
- Loading: 3 `<div className="g-skeleton h-16 rounded-2xl" />`
- Empty: `<EmptyState compact icon=<Calendar> title="No upcoming sessions." description="..." actionHref={...} action="Browse" />`
- Per appointment row: `rounded-2xl border border-border bg-card p-3.5 space-y-2 transition hover:border-border-strong`
  - Top row: name (coach or client, from `appt.coach?.firstname` or `appt.client?.firstname`) + `<Badge variant={badgeVariant} dot>status</Badge>`
  - Bottom row: `<Calendar h-3 w-3>` date + `<Clock h-3 w-3>` start_time — both `text-[11px] text-muted-foreground`
- Badge variant mapping: `confirmed` → `approved`, `pending` → `pending`, `cancelled` → `cancelled`, fallback → `neutral`

**Imports**: `Appointment` from `@/lib/types`, `Calendar`, `Clock` from lucide-react, `Card`, `CardHeader` from `@/components/ui/Card`, `Badge` from `@/components/ui/Badge`, `EmptyState` from `@/components/shared/EmptyState`, `formatDate` from `@/lib/utils`.

---

### 1e — `CoachAvatarRow.tsx`

```
File: components/dashboard/CoachAvatarRow.tsx
```

**Props interface:**
```ts
interface CoachAvatarRowProps {
  coaches: FullCoach[];
  loading?: boolean;
  viewAllHref: string;
}
```

**What to render**:
- `<Card padding="md">` with `<CardHeader icon=<Sparkles> title="Recommended Coaches" subtitle="Verified performing arts mentors" action=<Link href={viewAllHref}>View directory</Link>>`
- Loading: `<div className="flex gap-3 overflow-x-auto py-1">` with 4 skeleton circles `<div className="g-skeleton h-16 w-16 shrink-0 rounded-full" />`
- Content: `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">` — each coach:
  ```
  <Link href={`/userprofile/${coach.id}`} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center transition hover:border-accent-border hover:bg-muted">
    <span className="h-14 w-14 overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-foreground group-hover:border-accent-border transition">
      {photo ? <img ...> : initials}
    </span>
    <span className="w-full truncate text-xs font-bold text-foreground group-hover:text-accent-text">{firstname} {lastname}</span>
    {specialty && <span className="truncate text-[10px] text-muted-foreground capitalize">{specialty}</span>}
  </Link>
  ```
- Empty: `<EmptyState compact icon=<Sparkles> title="No coaches yet." description="Check back soon." />`

**Imports**: `FullCoach` from `@/lib/types`, `Sparkles` from lucide-react, `getInitials` from `@/lib/utils`, `Card`, `CardHeader` from `@/components/ui/Card`, `EmptyState`, `Link` (next/link).

---

### 1f — `BadgeMiniWidget.tsx`

```
File: components/dashboard/BadgeMiniWidget.tsx
```

**Props interface:**
```ts
interface BadgeMiniWidgetProps {
  userId: string;
  role: 'client' | 'coach';
}
```

**What to render**:
- Self-fetching: uses `useAchievements(userId, role)` + `useBadgeStatus(userId, role)` hooks (same hooks as profile pages).
- Import paths: `import { useAchievements } from '@/lib/achievements/hooks'` and `import { useBadgeStatus } from '@/lib/achievements/hooks'` — verify actual export paths from `lib/achievements/` before coding (see Step 2 research note).
- Loading state: `<div className="g-skeleton h-28 rounded-2xl" />`
- When loaded: render `<BadgeCollection tasks={tasks} badgeStatus={badgeStatus} userId={userId} role={role} loading={loading} />` — the `BadgeCollection` component (already in `components/badges/BadgeCollection.tsx`) handles everything else.
- Wrap in a `<Card padding="md">` with `<CardHeader icon=<Award> title="Badge Progress" subtitle="Complete tasks to earn your badge" />`

**⚠ Research note for implementer**: Before using the achievement hooks, read
`lib/achievements/hooks.ts` (or `lib/achievements/index.ts`) to confirm exact import path
and hook signatures. The hooks are already used on profile pages — mirror those imports exactly.

**Imports**: `Award` from lucide-react, `BadgeCollection` from `@/components/badges/BadgeCollection`, `Card`, `CardHeader` from `@/components/ui/Card`.

---

### 1g — `SupportCallout.tsx`

```
File: components/dashboard/SupportCallout.tsx
```

**Props interface:**
```ts
interface SupportCalloutProps {
  onSubmitTicket: () => void;
}
```

**What to render**:
- `<Card padding="md" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">`
- Left: `<div className="space-y-1.5"><h3 className="text-sm font-bold text-foreground">Need Support or Have Feedback?</h3><p className="text-xs leading-relaxed text-muted-foreground">Our administration team is available to assist.</p></div>`
- Right: `<Button variant="outline" onClick={onSubmitTicket} className="shrink-0">Submit Ticket</Button>`

**No skeleton, no empty state.**

---

### 1h — `SectionHeader.tsx` (shared widget header — NOTE: already exists as `components/shared/SectionHeader.tsx`)

The existing `PageHeader` from `components/shared/SectionHeader.tsx` is sufficient. No new file needed here.

**Summary: 7 new files to create** (1a through 1g — SectionHeader already exists):
- `components/dashboard/HeroBanner.tsx`
- `components/dashboard/StatRow.tsx`
- `components/dashboard/QuickActions.tsx`
- `components/dashboard/UpcomingSessionsWidget.tsx`
- `components/dashboard/CoachAvatarRow.tsx`
- `components/dashboard/BadgeMiniWidget.tsx`
- `components/dashboard/SupportCallout.tsx`

**Verify**: `npm run build` — all 7 new files compile with no TypeScript errors.

---

## Step 2 — Research achievement hook import paths (read-only investigation)

**What**: Before writing `BadgeMiniWidget`, read the following files to confirm hook names and import paths:

```
lib/achievements/hooks.ts   (or lib/achievements/hooks/index.ts or similar)
```

Check which of these paths exists:
- `c:\website\GrooveSystem\lib\achievements\hooks.ts`
- `c:\website\GrooveSystem\lib\achievements\index.ts`

Then find how `app/(client)/client/profile/page.tsx` imports `useAchievements` and `useBadgeStatus` and use the exact same import path in `BadgeMiniWidget.tsx`.

**Files**: Read-only. No changes.

**Verify**: N/A — this step unblocks Step 1f.

---

## Step 3 — Modify `AppTopNav.tsx` to add `logoOnly` prop

**File**: `components/shared/AppTopNav.tsx`

**What**:

1. Add `logoOnly?: boolean` to the `AppTopNavProps` interface (around line 115):
   ```ts
   /** When true, hides the wordmark (product name + portal label). Icon only. */
   logoOnly?: boolean;
   ```

2. Destructure `logoOnly = false` in the function signature alongside other props.

3. In the JSX brand zone (around line 590), conditionally suppress the wordmark:
   ```tsx
   <Link href={brandHref} className="g-header-logo" aria-label={`Groove — ${portalLabel ?? meta.label}`}>
     <span className="g-header-mark">
       <Image src="/image/wc/logo.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
     </span>
     {!logoOnly && (
       <span className="g-header-wordmark">
         <span className="g-header-name">Groove</span>
         {portalLabel && <span className="g-header-role">{portalLabel}</span>}
       </span>
     )}
   </Link>
   ```

4. Do NOT remove the `g-header-wordmark` CSS from globals.css — it is used by the admin shell and public nav.

**No other changes to AppTopNav.tsx in this step.**

**Verify**: `npm run build` — no errors. The navbar still renders wordmark for existing callers (prop defaults to false).

---

## Step 4 — Pass `logoOnly` from `DashboardLayout.tsx` to `AppTopNav`

**File**: `components/shared/DashboardLayout.tsx`

**What**:

1. Add `logoOnly?: boolean` to the `DashboardLayout` props interface.

2. Pass `logoOnly` to `<AppTopNav ... logoOnly={logoOnly} />`.

**Note**: The brief says to remove the "Groove / CLIENT PORTAL" wordmark from the header. The `logoOnly` prop flows: layout page → DashboardLayout → AppTopNav. Both `ClientLayout` and `CoachLayout` pass their children through `DashboardLayout`, so the simplest approach is to set `logoOnly={true}` in `DashboardLayout` unconditionally (or via the new prop). Since the brief says "logo icon only" for client and coach portals, set the default to `true` for client/coach roles.

**Alternative (simpler)**: Instead of adding a prop, hardcode `logoOnly={role !== 'admin'}` inside `DashboardLayout`. This is 1 line and the admin wordmark is preserved without any prop threading. Use this approach.

**Verify**: `npm run build` — no errors. Visually: `/client/home` header shows icon only; `/admin/dashboard` header still shows "Groove / Administrator".

---

## Step 5 — Redesign `app/(client)/client/home/page.tsx`

**File**: `app/(client)/client/home/page.tsx`

**What**: Replace the JSX layout inside `return (...)` with the new widget-based layout. Keep ALL state, ALL `useEffect`, ALL data fetching, ALL modal JSX UNTOUCHED. Only the JSX inside the outer `<>` and before the modal blocks changes.

### New import additions (add to existing imports):
```ts
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { StatRow } from '@/components/dashboard/StatRow';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingSessionsWidget } from '@/components/dashboard/UpcomingSessionsWidget';
import { CoachAvatarRow } from '@/components/dashboard/CoachAvatarRow';
import { BadgeMiniWidget } from '@/components/dashboard/BadgeMiniWidget';
import { SupportCallout } from '@/components/dashboard/SupportCallout';
```

Remove from existing imports: `HelpCircle`, `CheckCircle`, `ExternalLink`, `X` (moved into modal JSX which stays) — actually, keep all existing imports in place since the modal JSX still uses them. Just ADD the new widget imports.

### New skeleton state (replace the current skeleton block):
```tsx
if (loading) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="g-skeleton h-3 w-32" />
        <div className="g-skeleton h-9 w-72 max-w-full" />
        <div className="g-skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="g-skeleton h-32 rounded-[20px]" />)}
      </div>
      <div className="g-skeleton h-[200px] rounded-[20px]" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="g-skeleton h-72 rounded-[20px] lg:col-span-2" />
        <div className="g-skeleton h-72 rounded-[20px]" />
      </div>
    </div>
  );
}
```

### New main JSX layout (the region that replaces the current dashboard content):
```tsx
<>
  <MaintenanceBanner />

  <div className="space-y-6 sm:space-y-8">
    {/* 1. Page header — KEEP EXACTLY AS-IS */}
    <PageHeader
      eyebrow="Client Console · San Jose del Monte, Bulacan"
      title={<>Welcome back, <span className="text-accent-text">{user.firstname}</span></>}
      description="Book verified coaches, organize rehearsal sessions, and review digital session contracts."
      action={
        <>
          <Link href="/client/talent" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold tracking-[-0.01em] text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover hover:shadow-[var(--shadow-accent)]">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>Browse Coaches</span>
          </Link>
          <Button type="button" variant="outline" icon={<HelpCircle className="h-4 w-4" />} onClick={() => setShowTicketModal(true)}>
            Support
          </Button>
        </>
      }
    />

    {/* 2. Quick actions */}
    <QuickActions
      actions={[
        { label: 'Find Coach', href: '/client/talent', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
        { label: 'Appointments', href: '/client/appointments', icon: <Calendar className="h-4 w-4" /> },
        { label: 'Calendar', href: '/client/calendar', icon: <CalendarDays className="h-4 w-4" /> },
        { label: 'Ask Groovey AI', href: '/client/groovey', icon: <Bot className="h-4 w-4" /> },
        { label: 'Messages', href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
      ]}
    />

    {/* 3. Stat cards */}
    <StatRow
      stats={[
        { value: upcomingAppointments.length, label: 'Upcoming Sessions', description: 'Scheduled appointments', icon: <Calendar className="h-5 w-5" /> },
        { value: recommendedCoaches.length, label: 'Verified Coaches', description: 'Active in your region', icon: <BadgeCheck className="h-5 w-5" /> },
        { value: 'SJDM, Bulacan', label: 'Platform Region', description: 'Region III Hub', icon: <MapPin className="h-5 w-5" /> },
        { value: <span className="flex items-center gap-2 text-2xl sm:text-3xl"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden />{' '}Verified Active</span>, label: 'Account Status', description: `#${user.custom_id || '0001'}`, icon: <BadgeCheck className="h-5 w-5" /> },
      ]}
    />

    {/* 4. Hero banner */}
    <HeroBanner
      eyebrow="San Jose del Monte Coaching Hub"
      headline="Elevate your performing arts craft"
      subline="Connect with top dance, vocal, theater, and instrument coaches."
      primaryCta={{ label: 'Browse All Coaches', href: '/client/talent' }}
      secondaryCta={{ label: 'Studio Locator', href: '#studios' }}
      announcement={announcement}
    />

    {/* 5. Main grid */}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
      {/* Left/main column */}
      <div className="space-y-5 lg:col-span-2 lg:space-y-6">
        {/* Recommended coaches — compact avatar row */}
        <CoachAvatarRow
          coaches={recommendedCoaches}
          viewAllHref="/client/talent"
        />

        {/* Badge mini-widget */}
        <BadgeMiniWidget userId={user.id} role="client" />

        {/* Support callout */}
        <SupportCallout onSubmitTicket={() => setShowTicketModal(true)} />
      </div>

      {/* Right sidebar */}
      <UpcomingSessionsWidget
        appointments={upcomingAppointments}
        perspective="client"
        viewAllHref="/client/appointments"
      />
    </div>

    {/* 6. Studio locator — KEEP EXACTLY AS-IS */}
    <StudioLocator
      id="studios"
      title="Rehearsal Studios Locator"
      subtitle="Performing arts spaces in San Jose del Monte and Bulacan"
    />
  </div>

  {/* ALL MODAL JSX BELOW THIS LINE — UNTOUCHED */}
  ...existing selectedCoach modal...
  ...existing showTicketModal modal...
</>
```

### New icons to import (add to existing import from lucide-react):
`CalendarDays`, `Bot`, `MessageSquare` — check if already imported; add only the missing ones.

**Verify**: `npm run build` — no TypeScript errors.

---

## Step 6 — Redesign `app/(coach)/coach/home/page.tsx`

**File**: `app/(coach)/coach/home/page.tsx`

**What**: Replace the JSX layout. Keep ALL state, ALL data fetching, ALL modal/helper components (`ProfileModal`, `TicketModal`, `MiniCalendar`) UNTOUCHED. Only the main layout JSX changes.

### New import additions:
```ts
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { StatRow } from '@/components/dashboard/StatRow';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingSessionsWidget } from '@/components/dashboard/UpcomingSessionsWidget';
import { BadgeMiniWidget } from '@/components/dashboard/BadgeMiniWidget';
import { SupportCallout } from '@/components/dashboard/SupportCallout';
```

### New skeleton state (replace current skeleton block):
```tsx
if (loading || !coach) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="space-y-3">
        <div className="g-skeleton h-3 w-32" />
        <div className="g-skeleton h-8 w-72 max-w-full" />
        <div className="g-skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="g-skeleton h-32 rounded-[20px]" />)}
      </div>
      <div className="g-skeleton h-[200px] rounded-[20px]" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="g-skeleton h-72 rounded-[20px] lg:col-span-2" />
        <div className="g-skeleton h-72 rounded-[20px]" />
      </div>
      <p className="text-xs text-muted-foreground">Loading your coach terminal...</p>
    </div>
  );
}
```

### New main JSX layout (replaces current content inside `return (...)`):
```tsx
<div className="space-y-6 sm:space-y-7">
  {/* 1. Page header — KEEP EXACTLY AS-IS */}
  <PageHeader
    eyebrow="Coach Control Terminal"
    title={<>{getGreeting()}, <span className="text-accent-text">Coach {coach.firstname}</span></>}
    description="Manage appointments, organize rehearsal sessions, and review performer requests in Bulacan."
    action={/* keep existing action buttons exactly */}
  />

  {/* 2. Quick actions */}
  <QuickActions
    actions={[
      { label: 'Showcase Feed', href: '/coach/talents', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
      { label: 'Messages', href: '/messages', icon: <Send className="h-4 w-4" /> },
      { label: 'Calendar', href: '/coach/calendar', icon: <CalendarIcon className="h-4 w-4" /> },
      { label: 'Appointments', href: '/coach/appointments', icon: <CalendarIcon className="h-4 w-4" /> },
    ]}
  />

  {/* 3. Stat row */}
  <StatRow
    stats={[
      { value: appointments.length, label: 'Appointments', description: 'Total session records', icon: <CalendarIcon className="h-5 w-5" /> },
      { value: recommendedUsers.length, label: 'Students in SJDM', description: 'Registered performers', icon: <Users className="h-5 w-5" /> },
      { value: <span className="text-2xl sm:text-3xl">SJDM, Bulacan</span>, label: 'Platform Region', description: 'Region III', icon: <MapPin className="h-5 w-5" /> },
      { value: <span className="flex items-center gap-2 text-xl sm:text-2xl"><span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden />Verified Active</span>, label: 'Coach Status', description: `#${coach.custom_id || '0001'}`, icon: <CheckCircle2 className="h-5 w-5" /> },
    ]}
  />

  {/* 4. Hero banner */}
  <HeroBanner
    eyebrow="Coach Instructor Workspace"
    headline="Inspire the next generation of performers"
    subline="Track session confirmations, negotiate digital coaching contracts, and connect with talents in Bulacan."
    primaryCta={{ label: 'Community Showcase', href: '/coach/talents' }}
    secondaryCta={{ label: 'Manage Schedule', href: '/coach/appointments' }}
    announcement={announcement}
  />

  {/* 5. Main grid */}
  <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
    <div className="space-y-4 sm:space-y-5 lg:col-span-2">
      {/* Upcoming sessions from coach perspective */}
      <UpcomingSessionsWidget
        appointments={appointments}
        perspective="coach"
        viewAllHref="/coach/appointments"
      />

      {/* Badge mini-widget */}
      <BadgeMiniWidget userId={coach.id} role="coach" />

      {/* Support callout */}
      <SupportCallout onSubmitTicket={() => setShowTicket(true)} />
    </div>

    {/* Sidebar */}
    <aside className="space-y-4 sm:space-y-5">
      {/* Keep MiniCalendar exactly as-is */}
      <MiniCalendar />

      {/* Students grid — keep the existing card/grid JSX verbatim, just moved here */}
      <Card padding="none">
        <CardHeader
          className="mb-0 px-5 pb-4"
          icon={<Users className="h-4 w-4" />}
          title="Students in SJDM"
          subtitle="Local performers looking for mentorship"
        />
        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
          {recommendedUsers.slice(0, 4).map((user) => (
            {/* exact existing JSX for each student card */}
          ))}
        </div>
      </Card>
    </aside>
  </div>

  {/* 6. Studio locator — KEEP EXACTLY AS-IS */}
  <StudioLocator ... />
</div>
```

**Verify**: `npm run build` — no TypeScript errors.

---

## Step 7 — Fix `UpcomingSessionsWidget` appointment client name

**Context**: Coach appointments fetched in coach home use `appt.client:client_id(*)` in the
Supabase query. The `Appointment` type in `lib/types.ts` has `coach?: Profile` (for client-side
joins) but NOT `client?: Profile`. The coach home page's Supabase query uses `.select('*, client:client_id(*)')` and stores the result as `Appointment[]`.

**What**: In `UpcomingSessionsWidget.tsx`, handle the `perspective` prop:
- `perspective === 'client'`: display `appt.coach?.firstname ?? appt.name ?? 'Coach'`
- `perspective === 'coach'`: display `(appt as any).client?.firstname ?? appt.name ?? 'Student'`

The `(appt as any).client` cast is safe here because the coach home's Supabase query does join the client, and the widget is only used with coach data when `perspective === 'coach'`.

**Note**: If `lib/types.ts` exports an `Appointment` type that already has `client?: Profile`, use it directly without the cast. Check the actual type before coding.

**Files**: `components/dashboard/UpcomingSessionsWidget.tsx`

**Verify**: `npm run build` — no TypeScript errors.

---

## Step 8 — Ensure `CalendarDays`, `Bot`, `MessageSquare` are imported in client home

**File**: `app/(client)/client/home/page.tsx`

**What**: The current import block for lucide-react in the client home page imports:
`Calendar`, `Clock`, `Sparkles`, `MapPin`, `ChevronRight`, `ExternalLink`, `X`, `CheckCircle`, `HelpCircle`, `BadgeCheck`.

Add the missing ones needed by `QuickActions`: `CalendarDays`, `Bot`, `MessageSquare`.
The `ExternalLink` and `ChevronRight` are still used inside the `HeroBanner` component (now extracted), but they should stay in the page if any other JSX still references them. Since the page's `QuickCoachModal` and ticket modal still reference `X`, `HelpCircle`, `CheckCircle`, keep them.

**Verify**: `npm run build` — no unused-import warnings become errors.

---

## Responsive layout contract

All widgets must follow this grid pattern (already used by the project):

| Breakpoint | Columns |
|---|---|
| `default` (mobile, < 640px) | 1 column |
| `sm` (640px+) | 2 columns where applicable |
| `lg` (1024px+) | 3-column grid (2 main + 1 sidebar) |
| `xl` (1280px+) | 4-column stat row |

The `g-container` max-width is 1200px. The dashboard uses `max-w-[1240px]` (from DashboardLayout).

---

## Accessibility requirements

Every interactive widget must include:
- `aria-label` on icon-only buttons
- `role="status"` + `aria-live="polite"` on skeleton containers
- Keyboard focus styles (already handled by the global `:where(...):focus-visible` rule in globals.css — no extra work needed)
- All images: `alt=""` for decorative, descriptive text for content images

---

## Build verification

After all 8 steps are complete, run:

```
cd c:\website\GrooveSystem
npm run build
```

Expected: exit code 0, no TypeScript errors, no missing module errors.

Also check:
```
npm run lint
```

Fix any lint errors before marking done. The project uses `eslint-config-next` with React 19 rules — unused imports are warnings, not errors, but clean them up anyway.

---

## Files summary

| File | Action | Notes |
|---|---|---|
| `components/dashboard/HeroBanner.tsx` | **Create** | Replaces inline hero section in both home pages |
| `components/dashboard/StatRow.tsx` | **Create** | Wraps StatCard grid |
| `components/dashboard/QuickActions.tsx` | **Create** | Link buttons row |
| `components/dashboard/UpcomingSessionsWidget.tsx` | **Create** | Shared session list card |
| `components/dashboard/CoachAvatarRow.tsx` | **Create** | Compact coach grid for client home |
| `components/dashboard/BadgeMiniWidget.tsx` | **Create** | Self-fetching badge progress card |
| `components/dashboard/SupportCallout.tsx` | **Create** | Support ticket CTA card |
| `components/shared/AppTopNav.tsx` | **Modify** | Add `logoOnly?: boolean` prop |
| `components/shared/DashboardLayout.tsx` | **Modify** | Pass `logoOnly={role !== 'admin'}` to AppTopNav |
| `app/(client)/client/home/page.tsx` | **Modify** | New layout using widgets; keep all state/fetching/modals |
| `app/(coach)/coach/home/page.tsx` | **Modify** | New layout using widgets; keep all state/fetching/modals |

**NOT changed**: `globals.css`, `navigation.ts` (client or coach), `ClientLayout.tsx`, `CoachLayout.tsx`, `DashboardLayout.tsx` logic, `BadgeCollection.tsx`, `BadgeCard.tsx`, `BadgeModal.tsx`, `Modal.tsx`, `Button.tsx`, `Card.tsx`, `Badge.tsx`, `StatCard.tsx`, all Supabase queries, all server actions, all modal logic.
