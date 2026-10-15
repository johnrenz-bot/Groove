# Implementation Plan — Coach Home Layout Fix

Scope: **Badge Progress** section and **Rehearsal Studios Directory** section on
`/coach/home` only. No other sections, routes, or components are touched.

---

## Root Cause Analysis

### 1 — Badge Progress (`BadgeMiniWidget` + `BadgeCollection`)

**File:** `components/dashboard/BadgeMiniWidget.tsx`

`BadgeMiniWidget` wraps `BadgeCollection` in a `<Card padding="md">` that already
renders a `<CardHeader>` with icon, title ("Badge Progress"), and subtitle. Then
`BadgeCollection`, rendered as a child of that same card, renders its own `<section>`
with a full `<header>` element containing an `<h2>` ("Badge Collection"), a description
paragraph, and an icon-only Refresh button.

This creates **double headers inside a single card**:
- `CardHeader` → border-bottom divider → title, subtitle (rendered once)
- Immediately below it, `BadgeCollection` → `<header>` → `<h2>` + `<p>` + Refresh button

The two header blocks stack with no separation, so "Badge Progress" (CardHeader) and
"Badge Collection" (`<h2>`) visually overlap or appear as an unstructured wall of titles.
The `CardHeader` default style (`mb-5 pb-5 border-b`) and `BadgeCollection`'s own header
(`flex items-center justify-between`) have no mutual top-gap, making them bleed together.

Additionally the `BadgeCard` grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) works
fine on its own, but because the enclosing card already has `padding="md"` (i.e. `p-6`,
24 px on all sides) _and_ `BadgeCollection` wraps its own content in `space-y-4`, there
is redundant vertical rhythm that pushes content down farther than expected.

**Fix direction:** Remove the duplicate inner header from `BadgeCollection` when it is
rendered inside `BadgeMiniWidget`. The cleanest approach is to add a prop
`hideHeader?: boolean` to `BadgeCollection` that, when `true`, suppresses the `<header>`
block, moving the refresh button up to the `CardHeader` as its `action` prop. This keeps
`BadgeCollection` backward-compatible on profile pages where it needs its own header.

### 2 — Rehearsal Studios Directory (`StudioLocator`)

**File:** `components/studio/StudioLocator.tsx`

The component uses `<Card padding={padding}>` where the coach home passes no `padding`
prop, so it falls back to the default `padding="md"` (`p-6`). The structure is:

```
<Card p-6>                     ← 24 px padding on all sides
  <CardHeader mb-5 pb-5 />     ← title + subtitle, 5 units (20 px) bottom margin + border
  <div mb-3 flex controls />   ← radius pills + location buttons
  <div aspect-[21/9] />        ← map
  <ul mt-3 />                  ← studio list
  <p mt-3 />                   ← attribution
</Card>
```

**Identified issues:**

a. **Controls bar overlapping CardHeader divider**: `CardHeader` default class adds
   `mb-5 border-b border-divider pb-5`. The controls div below it has `mb-3`, which is
   fine, but on narrower viewports the `flex-wrap` in the controls bar causes the
   radius pills, "Pick centre" button, "My Location" button, and the centre-label
   paragraph all to wrap onto 3–4 lines, blowing up the controls block height and
   pushing the map out of the card's natural height. This looks like controls
   "overlapping" the map.

b. **Map aspect ratio on mobile**: `aspect-[21/9]` is an ultra-wide ratio (≈ 2.33:1).
   On a 375 px wide mobile screen inside a card with `px-6` (24 px each side), the
   map container is only 327 px wide and just 140 px tall — too short to be usable.
   The correct fix is a responsive aspect ratio: wide on desktop, squarer on mobile.

c. **Studio list columns overflow on tablet**: `sm:grid-cols-2 lg:grid-cols-3` is
   correct but the card has `p-6` at all widths. On a 768 px tablet in two-column
   mode the list cards have enough room, but there is no gap between the list bottom
   and the attribution paragraph.

d. **Controls wrap poorly on mobile**: On screens narrower than 480 px, the radius
   toggle group + two buttons + the status text all try to share one flex row.
   The status text needs `w-full` on mobile so it takes its own line rather than
   trying to fit inline.

e. **Card padding mismatch on edge-to-edge map**: The coach home passes
   `padding="none"` _in the prop signature_ (`padding?: 'none' | 'md'`) with the
   comment "matches the coach dashboard's edge-to-edge map card", but the coach
   home page calls `<StudioLocator>` **without** passing the `padding` prop at all,
   so it falls through to the `padding="md"` default. The fix is to confirm whether
   the coach dashboard should be edge-to-edge or padded. Looking at the visual
   hierarchy — the `CardHeader` is inside the card so it needs padding around it —
   the right answer is `padding="md"` (which is the current default). The edge-to-edge
   comment in the prop JSDoc is misleading; we keep `padding="md"` as default and
   do not need to change this at all.

---

## Implementation Plan

- [ ] 1. **Add `hideHeader` prop to `BadgeCollection` and thread Refresh into `BadgeMiniWidget`'s `CardHeader`**

  **Why:** `BadgeMiniWidget` uses `<Card>` with `<CardHeader title="Badge Progress">`,
  and then renders `<BadgeCollection>` which immediately adds its own `<header>` with
  title "Badge Collection". Two title blocks inside one card is the visual overlap.

  **What to do:**

  In `components/badges/BadgeCollection.tsx`:
  - Add `hideHeader?: boolean` to `BadgeCollectionSectionProps`.
  - Wrap the entire `<header>` block in `{!hideHeader && ( ... )}`.
  - The Refresh button still needs to be accessible when `hideHeader` is true, so
    also add `onRefreshClick?: () => void` and `isRefreshing?: boolean` props that
    a parent can use to wire its own refresh trigger.
  - Actually, a simpler approach: keep the refresh state internal, but expose the
    refresh button as a separate named export `BadgeCollectionRefreshButton` — OR
    simply move the `RefreshCw` button into the `CardHeader`'s `action` slot in
    `BadgeMiniWidget` by forwarding a `ref` or callback. The simplest correct
    approach is to add `hideHeader` to suppress the inner header, and separately
    render a standalone `<Button>` for refresh directly in `BadgeMiniWidget`'s
    `CardHeader action` that calls a `handleRefresh` forwarded via a new
    `onRefresh` callback prop already present on `BadgeCollectionSectionProps`.

  In `components/dashboard/BadgeMiniWidget.tsx`:
  - Import `RefreshCw` and `useState` / `useCallback`.
  - Wire a `handleRefresh` state into the Card action slot.
  - Pass `hideHeader={true}` to `BadgeCollection`.
  - Pass `onRefresh` so `BadgeMiniWidget` can offer the refresh button in its
    `CardHeader action` prop.

  **Files to modify:**
  - `components/badges/BadgeCollection.tsx`
  - `components/dashboard/BadgeMiniWidget.tsx`

  **Verify:** `npm run lint` passes. `npm run build` passes.
  The rendered card on `/coach/home` shows exactly one header ("Badge Progress"),
  the badge grid below it, and a refresh icon button to the right of the title —
  no second "Badge Collection" title.

---

- [ ] 2. **Fix responsive aspect ratio of the map in `StudioLocator`**

  **Why:** `aspect-[21/9]` produces an ~140 px tall map on a 375 px mobile screen,
  too short to be usable and the cause of the visual "map overlapping other cards"
  complaint (the map itself is very small, so the nearby-list below it that has a
  full grid of studio cards pushes far down the page and visually fights adjacent
  cards).

  **What to do:**

  In the map container `div` inside `StudioLocator.tsx`, change the aspect ratio
  from the single class `aspect-[21/9]` to a responsive set:

  ```
  // Before
  className="relative aspect-[21/9] overflow-hidden rounded-2xl border border-border"

  // After
  className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] overflow-hidden rounded-2xl border border-border"
  ```

  This gives:
  - Mobile (< 640 px): 4:3 ratio — ~280 px tall on a 375 px screen. Usable.
  - Tablet (640–1023 px): 16:9 — standard video ratio. Good.
  - Desktop (≥ 1024 px): 21:9 — original wide cinematic ratio.

  **Files to modify:**
  - `components/studio/StudioLocator.tsx`

  **Verify:** `npm run lint` passes. `npm run build` passes.
  On a 375 px viewport the map is visibly taller than before (~280 px vs ~140 px).

---

- [ ] 3. **Fix controls bar wrapping on mobile in `StudioLocator`**

  **Why:** The controls `div` has `flex flex-wrap items-center gap-2`. On narrow
  screens, the four items (radius toggle group, Pick Centre button, My Location
  button, and the status text paragraph) all land in one flex container. The
  status paragraph has `ml-auto` which works on wide screens but on a single
  wrapped row it ends up on the same line as the last button.

  **What to do:**

  In `StudioLocator.tsx`, in the controls `<div>`:

  ```tsx
  // Before
  <div className="mb-3 flex flex-wrap items-center gap-2">

  // After
  <div className="mb-3 flex flex-wrap items-center gap-2 gap-y-2">
  ```

  And on the status paragraph, add responsive width so it occupies the full row
  on mobile:

  ```tsx
  // Before
  <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">

  // After
  <p className="ml-auto w-full sm:w-auto text-xs text-muted-foreground" aria-live="polite">
  ```

  This makes the status text drop to its own line on mobile (showing centre name
  and count below the buttons) while on `sm+` it stays right-aligned inline as
  before.

  **Files to modify:**
  - `components/studio/StudioLocator.tsx`

  **Verify:** `npm run lint` passes. `npm run build` passes.
  On a 375 px viewport the controls show as: radius pills row / buttons row /
  status text row — three clean lines, no truncation.

---

- [ ] 4. **Add bottom spacing between studio list and attribution paragraph**

  **Why:** The studio list `<ul>` has `mt-3` and the attribution `<p>` has `mt-3`.
  This gives only 12 px + 12 px = 24 px separation, which reads as them being the
  same block. Add a top border and more top margin to the attribution to visually
  separate it from the list.

  **What to do:**

  In `StudioLocator.tsx`, on the attribution paragraph:

  ```tsx
  // Before
  <p className="mt-3 text-[11px] text-subtle-foreground">

  // After
  <p className="mt-4 border-t border-divider pt-3 text-[11px] text-subtle-foreground">
  ```

  **Files to modify:**
  - `components/studio/StudioLocator.tsx`

  **Verify:** `npm run lint` passes. `npm run build` passes.
  Attribution text is visually separated from the studio list below the map.

---

- [ ] 5. **Add missing top padding between `CardHeader` and controls bar in `StudioLocator`**

  **Why:** `CardHeader` has a default `mb-5` (20 px margin-bottom) and `border-b
  border-divider pb-5`. The controls bar directly below has no top padding of its
  own — only `mb-3` (margin toward the map). On some themes the divider and the
  radius pill ring appear to be the same line, making the header and controls look
  merged.

  **What to do:**

  Change `mb-3` on the controls div to `mb-3 mt-1` so there is at least one unit
  of breathing room between the header divider and the controls:

  ```tsx
  // Before
  <div className="mb-3 flex flex-wrap items-center gap-2 gap-y-2">

  // After — the mt-1 is new
  <div className="mb-3 mt-1 flex flex-wrap items-center gap-2 gap-y-2">
  ```

  **Files to modify:**
  - `components/studio/StudioLocator.tsx`

  (Note: this is a single character addition merged onto the same line as step 3
  above; it is listed separately for clarity. The implementer can apply both
  in one edit.)

  **Verify:** `npm run lint` passes. `npm run build` passes.

---

- [ ] 6. **Run lint and build; confirm no regressions**

  This step verifies the whole change set as a unit.

  ```
  npm run lint
  npm run build
  ```

  Expected: zero ESLint errors, zero TypeScript errors, build exits `0`.

  **Files changed across all steps:**
  - `components/badges/BadgeCollection.tsx` — add `hideHeader` prop, conditionally render `<header>`
  - `components/dashboard/BadgeMiniWidget.tsx` — pass `hideHeader`, surface refresh in `CardHeader`
  - `components/studio/StudioLocator.tsx` — responsive map ratio, controls wrap fix, attribution separator

---

## What NOT to change

- `app/(coach)/coach/home/page.tsx` — no layout changes needed here; all bugs are in components.
- Any API routes, server actions, Supabase queries, or authentication logic.
- `BadgeCard.tsx`, `BadgeModal.tsx`, `AchievementModal.tsx` — badge display logic is correct.
- `StudioLocatorMap.tsx` — map internals are correct; only the wrapper card dimensions change.
- Any admin, client, or other coach routes.
- The `DashboardLayout`, `CoachLayout`, or `AppTopNav` shells.
- Global CSS tokens (`app/globals.css`) — the design tokens are correct.
- Any components not named in steps 1–5 above.

## Responsive Strategy

| Breakpoint | Map aspect ratio | Controls | Badge grid |
|---|---|---|---|
| default (< 640 px) | 4:3 | 3 stacked rows | 1 column |
| sm (≥ 640 px) | 16:9 | 2 rows (buttons + status inline) | 2 columns |
| lg (≥ 1024 px) | 21:9 | 1 row (everything inline) | 3 columns |

The badge grid columns are already defined by `BadgeCollection` (`grid-cols-1
sm:grid-cols-2 lg:grid-cols-3`) and are correct — no change needed there.

## Build and lint commands

```bash
npm run lint      # ESLint via eslint-config-next
npm run build     # next build — compiles and type-checks
```

Both commands are defined in `package.json` at the repo root
(`c:\website\GrooveSystem\package.json`).
