# Badge Progress and Rehearsal Studios layout fix

The change removes the double-header inside `BadgeMiniWidget` and improves the responsive layout of `StudioLocator`. Three files were touched: `BadgeCollection.tsx`, `BadgeMiniWidget.tsx`, and `StudioLocator.tsx`. No page files, APIs, auth, database queries, or unrelated components were modified. The fix uses standard Tailwind responsive classes — no z-index hacks.

Watch for: (1) **confirmed** — `<section aria-labelledby="badge-collection-heading">` becomes an orphaned ARIA reference when `hideHeader={true}` because the `id` is inside the conditionally-suppressed header; (2) **confirmed** — `BadgeMiniWidget` now has two independent refresh paths that do not share state, so the widget's spinner and `BadgeCollection`'s internal spinner can desync.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The double-header fix is structurally correct: `hideHeader` suppresses `BadgeCollection`'s own `<header>` block, and `BadgeMiniWidget` promotes the Refresh button into `CardHeader`'s `action` slot. Profile pages (`/client/profile`, `/coach/profile`) continue to receive the header because they don't pass `hideHeader`, so the backward-compat side is clean.

There are two blocking concerns. The `<section>` wrapper in `BadgeCollection` keeps `aria-labelledby="badge-collection-heading"` regardless of `hideHeader`, but the element with `id="badge-collection-heading"` is inside the suppressed header. When `hideHeader={true}` the `aria-labelledby` reference dangles, and screen readers announce the section with no accessible name. This is a WCAG 1.3.1 failure on the dashboard. The second concern is a duplicate-refresh-state problem: `BadgeMiniWidget` owns its own `refreshing` state and calls `refreshAchievements` directly, and `BadgeCollection` also owns its own internal `refreshing` state and calls `refreshAchievements` independently — but `BadgeMiniWidget` does not pass `onRefresh` to `BadgeCollection`, so the two are uncoordinated. Clicking the header's Refresh button triggers `BadgeMiniWidget.handleRefresh`, spins the header button, and re-fetches. If `BadgeCollection`'s mount-time `onRefresh` guard or modal-open effect fires concurrently (they only guard on `onRefresh` being defined, which it is not here, so those effects are actually dormant), there is no conflict in practice — but the header-button refresh does not update `BadgeCollection`'s data because `BadgeMiniWidget` calls `refreshAchievements` (a server action that writes to DB) while `BadgeCollection` reads from `useAchievements` / `useBadgeStatus` hooks. There is no signal to re-trigger those hooks after the server-action completes, so the displayed badges may stay stale until the next full page hydration.

---

<details>
<summary>Issues (2)</summary>

1. **Dangling `aria-labelledby` when `hideHeader={true}`** — `BadgeCollection`'s `<section>` element always carries `aria-labelledby="badge-collection-heading"`, but the element bearing that `id` is inside the `{!hideHeader && ...}` block. On the dashboard (where `hideHeader` is always `true`) the ARIA reference is broken and screen readers cannot announce the section's name. Fix: conditionally omit the attribute — e.g. `aria-labelledby={hideHeader ? undefined : 'badge-collection-heading'}` — or add a visually hidden label tied to the `CardHeader` title when `hideHeader` is active.

2. **`BadgeMiniWidget` refresh does not update badge display** — `BadgeMiniWidget.handleRefresh` calls the `refreshAchievements` server action directly but does not re-trigger the `useAchievements` or `useBadgeStatus` hooks that supply data to `BadgeCollection`. The user clicks Refresh, sees the header button spin, but the badge grid does not update until a full navigation. Fix: after `refreshAchievements` resolves, invalidate or re-call the data hooks (e.g. expose a `refetch` from the hooks and call it in `handleRefresh`, or pass a proper `onRefresh` callback to `BadgeCollection` that re-fetches via the hooks).

</details>

---

<details>
<summary>Details</summary>

### Dangling `aria-labelledby` on `BadgeCollection` section

`BadgeCollection.tsx` line 165 sets `aria-labelledby="badge-collection-heading"` unconditionally:

```tsx
<section className={cn('space-y-4', className)} aria-labelledby="badge-collection-heading">
  {!hideHeader && (
    <header ...>
      <h2 id="badge-collection-heading">Badge Collection</h2>
      ...
    </header>
  )}
```

When `hideHeader={true}` (as `BadgeMiniWidget` passes it), no element in the DOM carries `id="badge-collection-heading"`. Assistive technologies resolve the `aria-labelledby` reference at runtime; a dangling `id` means the section is announced with no accessible name. This is a WCAG 1.3.1 (Info and Relationships) failure and a screen-reader regression introduced by this PR.

The fix is one line: make the attribute conditional on `hideHeader`:

```tsx
aria-labelledby={hideHeader ? undefined : 'badge-collection-heading'}
```

Alternatively, when `hideHeader` is true, derive the section label from the parent `CardHeader` title ("Badge Progress") using a stable `id` prop threaded from `BadgeMiniWidget`.

### Refresh button does not produce visible badge updates

`BadgeMiniWidget` introduces its own `handleRefresh` / `refreshing` state that calls `refreshAchievements(userId)` — the server action that re-checks task completion in the database. But the data displayed in `BadgeCollection` comes from two hooks:

```tsx
const { achievements, loading: achievementsLoading } = useAchievements(userId, role);
const { badgeStatus, loading: badgeLoading } = useBadgeStatus(userId);
```

Neither hook is re-triggered after `handleRefresh` completes. The `BadgeCollection` child also does not receive an `onRefresh` prop from `BadgeMiniWidget`, so `BadgeCollection`'s internal `handleRefresh` logic falls through to its own `refreshAchievements(userId)` call — which runs the same server action but also does not update the hook state. The net result: the header Refresh button fires a server action, the spinner plays, and the displayed badge grid remains unchanged.

On profile pages (`/client/profile`, `/coach/profile`), this works correctly because those pages pass `onRefresh={handleRefreshAchievements}` where `handleRefreshAchievements` calls both `refreshAchievements` and the React Query / SWR refetch functions. `BadgeMiniWidget` needs the same pattern.


</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `components/badges/BadgeCollection.tsx` | Added `hideHeader` prop; conditionally renders `<header>` block |
| `components/dashboard/BadgeMiniWidget.tsx` | Added own `refreshing` state + `handleRefresh`; surfaces Refresh button in `CardHeader action`; passes `hideHeader` to `BadgeCollection` |
| `components/studio/StudioLocator.tsx` | Responsive map aspect ratio, `mt-1` on controls, `w-full sm:w-auto` on status text, border-top separator on attribution |

`app/(coach)/coach/home/page.tsx` — not touched.
`app/(coach)/coach/layout.tsx` — not touched.

</details>
