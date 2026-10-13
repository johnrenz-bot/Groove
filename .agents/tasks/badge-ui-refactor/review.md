# Badge Collection UI Refactor

The change extracts the badge UI into three shared components (`BadgeCard`, `BadgeModal`, `BadgeCollection`) and replaces the old `BadgeCollectionSection` on both `/client/profile` and `/coach/profile`. The refactor is layout-only: all data fetching, achievement hooks, session-storage guards, celebration modal, and share/download logic are preserved in `BadgeCollection.tsx`. The visual goal is a compact horizontal-tile grid in place of the previous tall cards, and a structured non-overlapping modal in place of the previous layout.

Watch for: **confirmed** — `BadgeModal` renders a duplicate close button inside the scrollable body in addition to the one the `Modal` shell provides (via `showClose={false}`); this is intentional but worth a second look for keyboard/screen-reader users since the `X` in the body fires before focus reaches the footer. All other checklist items pass.

**Verdict**: APPROVED

## High-level view

`BadgeCard` delivers the compact horizontal tile exactly as specified — 112px min-height, image left, text right, earned glow via `shadow-[0_0_14px_hsl(var(--success)/0.22)]`, hover lift, and a `comingSoon` variant with a lock icon. No hardcoded colors anywhere in the file; every token (`bg-muted`, `text-muted-foreground`, `bg-success-soft`, `text-success`, `bg-accent`, `border-success/20`) maps to an existing CSS variable confirmed in `globals.css`.

`BadgeModal` wraps the existing `Modal` component and passes `showClose={false}` to suppress the shell's built-in close button, then renders its own `X` button and `Badge Earned` pill in a flex row immediately inside the body. The hero section uses `relative`/`absolute` positioning strictly within a `h-36 w-36` container; the glow divs are `absolute inset-0` inside that container and never escape it to overlap text. Description, date, and task list all flow in normal document order below the container. Only the task list scrolls (via the `Modal`'s `overflow-y-auto` body); the footer with Share/Save/Close is sticky via `Modal`'s footer slot.

`BadgeCollection` owns all preserved logic: the sessionStorage-guarded celebration auto-trigger, mount-time refresh via `useRef`, modal-open refresh, `handleShare` (Web Share API with clipboard fallback), `downloadBadge`, and the `AchievementModal` (celebration) render. The header uses an icon-only `Button` (no text label) for Refresh. The grid is `grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3`. Loading state renders three `h-28` Skeleton tiles.

Both profile pages import `BadgeCollection` from `@/components/badges/BadgeCollection`, pass it the same data sources as before, and make no other changes to their existing logic or layout.

<details>
<summary>Issues (1)</summary>

1. **Duplicate close button in BadgeModal body** — `BadgeModal` renders its own `X` button inside the scrollable body alongside `showClose={false}` on the `Modal` shell. This is functional but means the first focusable element inside the modal is the close button in the body, not a primary action. Screen reader users will hear two different close affordances in sequence (body `X` → footer Close). Consider either using `showClose={true}` on the shell (which places the `X` in the header, standard position) and removing the inline `X`, or accepting the current layout as a deliberate design choice. Confidence: **confirmed**.

</details>

<details>
<summary>Details</summary>

### Compact tile layout and color tokens (BadgeCard)

`BadgeCard` sets `min-h-[112px]` on the outer `article`, image in a `h-14 w-14 shrink-0` div on the left, text column `flex-1 min-w-0` on the right — matching the h-28/min-h-[112px] spec. Hover is `hover:-translate-y-0.5 hover:shadow-md hover:border-accent-border`; `border-accent-border` resolves through `--color-accent-border` → `--accent-border`, confirmed in `globals.css`. Earned glow is `shadow-[0_0_14px_hsl(var(--success)/0.22)]` — uses the CSS variable, not a literal color. The earned pill is `bg-success-soft text-success border-success/20`, all confirmed tokens. Progress bar uses `bg-muted` track and `bg-accent` fill. No hardcoded hex, rgb, or arbitrary color values anywhere in the file.

The `comingSoon` variant renders a separate early-return JSX path with identical card dimensions, a `Lock` icon in a `bg-muted` square, and `opacity-60`. It does not receive click or keyboard handlers. The main tile sets `role="button"` and `tabIndex={0}` with an `onKeyDown` handler for Enter/Space, satisfying keyboard accessibility.

### Modal layout and no-overlap guarantee (BadgeModal)

The hero image container is `relative h-36 w-36`. The two glow divs are `absolute inset-0` inside that container — they occupy the same 144×144px area as the image and cannot overflow onto text below because they are clipped to the container. The `Image` is rendered inside `absolute inset-2` within the same container. This geometry is sound: nothing is positioned over text content.

`BadgeModal` passes `showClose={false}` to `Modal`, which suppresses the shell header's `X`. It then renders its own `X` button at the top of the body content. The result is a custom header row (`Badge Earned` pill + `X`) followed by the hero, description, date, and task list — all in normal flow. The `Modal` shell's `footer` prop receives three buttons (Share/Save/Close) that land in the sticky footer outside the scroll area. The scrollable region is `Modal`'s `overflow-y-auto` body, which is the only part that scrolls, matching the spec.

The `requirements` chips in each task row use `bg-success-soft text-success` for met requirements and `bg-muted text-muted-foreground` for unmet — both confirmed tokens.

### Preserved logic in BadgeCollection

The sessionStorage key is `badge-modal-shown-${userId}`, guarded by an effect that only fires when `isUnlocked && unlockedAt && !justUnlocked`. Mount-time refresh uses a `useRef` flag to prevent double-fire in strict mode. Modal-open refresh fires in a separate `useEffect` on `showAchievementsModal`. `handleShare` uses `navigator.share` with `navigator.clipboard` fallback. `downloadBadge` creates a temporary anchor element. `AchievementModal` (celebration) still renders conditionally when `isUnlocked && unlockedAt`. All of this is unchanged from the pre-refactor page-level code.

### Profile page integration

Both profile pages import `{ BadgeCollection } from '@/components/badges/BadgeCollection'` and render `<BadgeCollection ... />` with the existing hook data (`tasks`, `badgeStatus`, `userId`, `role`, `loading`, `onRefresh`). No `BadgeCollectionSection` import or JSX remains. No other lines in either profile page were modified.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `components/badges/BadgeCard.tsx` | New — compact horizontal tile component |
| `components/badges/BadgeModal.tsx` | New — badge detail modal using existing Modal shell |
| `components/badges/BadgeCollection.tsx` | New — section container with all preserved logic, grid, header |
| `app/(client)/client/profile/page.tsx` | Swapped `BadgeCollectionSection` → `BadgeCollection` import and JSX |
| `app/(coach)/coach/profile/page.tsx` | Swapped `BadgeCollectionSection` → `BadgeCollection` import and JSX |

Full diff: `git diff main -- components/badges/ app/\(client\)/client/profile/page.tsx app/\(coach\)/coach/profile/page.tsx`

</details>
