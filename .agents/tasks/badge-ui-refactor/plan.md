# Implementation Plan — Badge UI Refactor

Scope: UI/layout only. Zero changes to logic, data fetching, state, or badge unlock
functionality. All three new files live in `components/badges/`. Both profile pages
get a one-line import swap and a one-line JSX rename.

---

- [ ] 1. Create `components/badges/BadgeCard.tsx`

  Compact horizontal tile (~110–130 px height). Uses only existing semantic tokens.

  **Props**
  ```ts
  interface BadgeCardProps {
    badge: {
      badgeType: string;
      badgeDescription: string | null;
      isUnlocked: boolean;
      unlockedAt: string | null;
      badgeImageUrl: string;
      tasksCompleted: number;
      tasksTotal: number;
    };
    onClick: () => void;
    comingSoon?: boolean;
  }
  ```

  **Layout** — `<article>` with `role="button" tabIndex={0}`, `onClick`, `onKeyDown`
  (Enter/Space), `cursor-pointer`, `flex items-center gap-3 p-3 rounded-2xl border
  border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md
  hover:border-accent-border`.

  Earned glow: add `shadow-[0_0_12px_hsl(var(--success)/0.2)]` when `isUnlocked`.

  - **Left** — `relative h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden` with
    `next/image` fill + `object-contain`. Dimmed (`opacity-40 grayscale`) when locked.
  - **Right** (`flex-1 min-w-0 flex flex-col gap-1`):
    - Name: `text-sm font-medium text-foreground truncate`
    - When `isUnlocked`: "Earned" pill — `inline-flex items-center rounded-full px-2
      py-0.5 text-[11px] font-semibold bg-success-soft text-success border
      border-success/30`; then earned date `text-xs text-muted-foreground`.
    - When `!isUnlocked && !comingSoon`: thin progress bar `h-1 w-full bg-muted
      rounded-full overflow-hidden` with inner `bg-accent` div at
      `(tasksCompleted/tasksTotal)*100%`; label `text-xs text-muted-foreground`
      showing "N/N tasks".
    - Description: `text-xs text-muted-foreground line-clamp-1`.

  **Coming Soon variant** (`comingSoon={true}`): wrapper gets `opacity-60
  cursor-default pointer-events-none`. Left slot shows a muted `Lock` icon
  (lucide-react) instead of the image. Right shows "Coming Soon" (`text-sm
  font-medium text-muted-foreground`) and "New badge in development" (`text-xs
  text-muted-foreground`). `onClick` is a no-op; no `role="button"`.

  Files: `components/badges/BadgeCard.tsx`

  Verify: `npx tsc --noEmit` from repo root — no errors on this file.

---

- [ ] 2. Create `components/badges/BadgeModal.tsx`

  Clean non-overlapping modal. Uses `Modal` from `@/components/ui/Modal` (`size="md"`,
  `showClose={false}`). The Modal already handles ESC, focus trap, backdrop-click
  close, and `fade-in zoom-in-95`.

  **Props**
  ```ts
  interface BadgeModalTask {
    title: string;
    description: string;
    completed: boolean;
    completedAt?: string;
    requirements?: { label: string; met: boolean }[];
  }

  interface BadgeModalProps {
    badge: {
      badgeType: string;
      badgeDescription: string | null;
      isUnlocked: boolean;
      unlockedAt: string | null;
      badgeImageUrl: string;
      tasksCompleted: number;
      tasksTotal: number;
    };
    tasks: BadgeModalTask[];
    isOpen: boolean;
    onClose: () => void;
    onShare: () => void;
    onDownload: () => void;
  }
  ```

  **Outer wrapper** inside `<Modal>`: `flex flex-col max-h-[85vh]`.

  a) **Sticky header** (`sticky top-0 z-10 flex items-center justify-between px-5
     py-3.5 border-b border-divider bg-card`):
     - Left: badge name `font-semibold text-foreground text-base`; when `isUnlocked`
       inline "Badge Earned" pill `bg-success-soft text-success text-xs rounded-full
       px-2 py-0.5 ml-2`.
     - Right: `<button>` with `X` icon, `aria-label="Close"`, ghost styling matching
       Modal's existing close button pattern (`p-2 rounded-full
       hover:bg-muted hover:text-foreground transition-colors`).

  b) **Scrollable body** (`flex-1 overflow-y-auto px-5 py-4 space-y-5`):
     - **Hero** — `relative mx-auto w-36 h-36 flex-shrink-0` (radial glow behind
       using `bg-[radial-gradient(ellipse_at_center,_hsl(var(--accent)/0.18)_0%,_transparent_70%)]`
       as a `div` sized to `w-52 h-32 absolute inset-0 -z-10 mx-auto`; image is
       `next/image` fill `object-contain` — never absolutely positioned over text).
     - **Description** — `text-sm text-muted-foreground text-center`. When earned:
       `"Unlocked on <date>"` in `text-xs text-muted-foreground mt-1 text-center`.
     - **Tasks heading** — `text-sm font-semibold text-foreground mt-4 mb-2` reading
       "Completed Tasks".
     - **Task rows** (`flex items-start gap-3`): `CheckCircle2` h-4 w-4 mt-0.5
       `text-success` (or `Circle` `text-muted-foreground` when not completed); title
       `text-sm font-medium text-foreground` (NO strikethrough); subtitle `text-xs
       text-muted-foreground line-clamp-1`; date right-aligned `text-xs
       text-muted-foreground ml-auto shrink-0`. Requirements (if present) rendered as
       small `inline-flex` pills (`text-[10px] rounded-full px-1.5 py-0.5`) using
       `bg-success-soft text-success` (met) or `bg-muted text-muted-foreground`
       (unmet).

  c) **Sticky footer** (`sticky bottom-0 z-10 flex flex-col sm:flex-row items-center
     gap-2 px-5 py-3.5 border-t border-divider bg-card`):
     - `<Button variant="primary" size="sm" className="w-full sm:w-auto">Share
       Achievement</Button>` — calls `onShare`.
     - `<Button variant="outline" size="sm" className="w-full sm:w-auto">Save
       Badge</Button>` — calls `onDownload`.
     - `<Button variant="ghost" size="sm" className="w-full sm:w-auto">Close</Button>`
       — calls `onClose`.

  Accessibility: `aria-label={badge.badgeType}` on the `<Modal>` wrapper (Modal
  already sets `role="dialog" aria-modal="true"`).

  Files: `components/badges/BadgeModal.tsx`

  Verify: `npx tsc --noEmit` — no errors on this file.

---

- [ ] 3. Create `components/badges/BadgeCollection.tsx`

  Drop-in replacement for `BadgeCollectionSection`. Copy **all** logic verbatim from
  `components/achievements/BadgeCollectionSection.tsx`:
  - All imports (keep `AchievementModal`, `refreshAchievements`, `getBadgeName`,
    `getBadgeDescription`, `getTaskUrls`).
  - All state: `showCelebrationModal`, `showAchievementsModal`, `justUnlocked`,
    `refreshing`.
  - `refreshedOnMount` ref + two `useEffect` hooks.
  - `handleRefresh`, `handleTaskClick`, `downloadBadge`, `handleShare` callbacks.
  - `modalTasks` derivation.
  - `badgeType`, `badgeDescription`, `isUnlocked`, `unlockedAt`, `badgeImageUrl`,
    `tasksCompleted`, `tasksTotal` derivations.
  - `BadgeCollectionSectionProps` interface (identical shape, just re-exported from
    this file as the component's props type).

  **Only the JSX changes**:

  - **Header**: `<header className="flex items-center justify-between">` containing:
    - Left: `<h2>Badge Collection</h2>` (`text-lg font-semibold text-foreground`) and
      `<p>Complete tasks to earn badges and showcase your achievements</p>`
      (`text-sm text-muted-foreground mt-0.5`).
    - Right: icon-only `<Button variant="ghost" size="icon" aria-label="Refresh
      badges" onClick={handleRefresh} disabled={refreshing || loading}>` with
      `<RefreshCw className={cn('h-4 w-4', (refreshing || loading) && 'animate-spin')}
      />`.

  - **Grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.

  - **Loading state**: three `<Skeleton className="h-28 rounded-2xl" />` tiles (import
    `Skeleton` from `@/components/ui/Skeleton`).

  - **Real badge tile**: `<BadgeCard badge={{ badgeType, badgeDescription, isUnlocked,
    unlockedAt, badgeImageUrl, tasksCompleted, tasksTotal }} onClick={() =>
    setShowAchievementsModal(true)} />`.

  - **Two Coming Soon tiles**: `<BadgeCard badge={{...}} comingSoon={true}
    onClick={() => {}} />` — pass any valid shape for `badge`; it won't render.

  - **Modals**: keep `<AchievementModal ...>` exactly as-is. Replace
    `<AchievementsModal ...>` with:
    ```tsx
    <BadgeModal
      badge={{ badgeType, badgeDescription, isUnlocked, unlockedAt, badgeImageUrl,
               tasksCompleted, tasksTotal }}
      tasks={modalTasks.map(t => ({
        title: t.title,
        description: t.description,
        completed: t.completed,
        completedAt: t.completedAt,
        requirements: t.requirements,
      }))}
      isOpen={showAchievementsModal}
      onClose={() => setShowAchievementsModal(false)}
      onShare={handleShare}
      onDownload={() => downloadBadge(badgeImageUrl)}
    />
    ```

  Export both `BadgeCollection` (named) and as default.

  Files: `components/badges/BadgeCollection.tsx`

  Verify: `npx tsc --noEmit` — no errors on this file.

---

- [ ] 4. Update both profile pages to use `BadgeCollection`

  In **`app/(client)/client/profile/page.tsx`**:
  - Replace:
    ```ts
    import { BadgeCollectionSection } from '@/components/achievements/BadgeCollectionSection';
    ```
    with:
    ```ts
    import { BadgeCollection } from '@/components/badges/BadgeCollection';
    ```
  - Replace the JSX element `<BadgeCollectionSection` with `<BadgeCollection` (and
    closing tag if present). All props stay identical.

  In **`app/(coach)/coach/profile/page.tsx`**:
  - Same two substitutions (import + element name).

  Do NOT change any other line in either file.

  Files:
  - `app/(client)/client/profile/page.tsx`
  - `app/(coach)/coach/profile/page.tsx`

  Verify: `npx tsc --noEmit` from `c:\website\GrooveSystem` — zero errors. Report
  the exact tsc output.

---

## Notes / assumptions

- `Modal` sets `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` internally;
  `BadgeModal` passes `aria-label` as a fallback via the `Modal` wrapper.
- The `statusPill` block in `BadgeCollectionSection` used hardcoded `green-100 /
  green-800 / amber-100 / amber-800` class names. `BadgeCard` replaces those with
  `bg-success-soft text-success` only — no new colors introduced.
- `AchievementsModal` had a hardcoded `amber/emerald` gradient and `style={{ boxShadow
  }}` with literal rgba values. `BadgeModal` replaces both with CSS variable tokens.
- The `style jsx` block in `AchievementsModal` is not carried over; animations are
  handled by Tailwind `animate-in` classes already available.
- `next/image` is used for badge images (fill + sizes prop) exactly as in the existing
  `BadgeCollectionSection` — no API changes needed.
- If `Skeleton` is not exported from `@/components/ui/Skeleton`, fall back to
  `<div className="h-28 rounded-2xl bg-muted animate-pulse" />` inline.
