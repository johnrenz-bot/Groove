# Implementation Plan — Dashboard Layout Fix

**Scope:** Frontend-only. Touch only the five files listed below.  
**Routes fixed:** `/coach/home`, `/client/home`  
**Output report:** `c:\website\GrooveSystem\.agents\tasks\welcome-modal-logo-redesign\dashboard-layout-report.md`

---

## Root-cause summary (confirmed by code inspection)

| # | Problem | Evidence |
|---|---------|----------|
| 1 | `UpcomingSessionsWidget` has `<Card padding="md" className="h-full">` hardcoded inside the component. On mobile (single-column stack) `h-full` resolves against a block-formatting context that has no intrinsic height, forcing the card taller than its content. On desktop it is fine — the card should fill its grid row. The fix is to make `h-full` optional via a `className` prop and pass it as `lg:h-full` from each call site. | `UpcomingSessionsWidget.tsx` line: `<Card padding="md" className="h-full">` |
| 2 | Coach home passes `padding="none"` to `StudioLocator`. With no padding, `CardHeader` and the controls bar are flush with the card edge (no horizontal breathing room). The client home passes no `padding` prop, defaulting to `"md"` and looking correct. There is no design reason for the difference; the fix is to remove `padding="none"` from the coach page. | `coach/home/page.tsx`: `<StudioLocator … padding="none" />` |
| 3 | Neither page wraps grid children in `min-w-0`. CSS grid children default to `min-width: auto`, which means a long, non-breaking string (coach name, studio title) can force the column to be wider than its track, causing horizontal overflow. Adding `min-w-0` to every direct grid-child wrapper (the `<div className="space-y-… lg:col-span-2">` and `<aside>` in each page) clamps them correctly. | Both `page.tsx` files |
| 4 | `g-card` (the CSS class powering `<Card>`) sets `border-radius: 20px` but **no** `overflow-hidden`. The Leaflet map inside `StudioLocator` mounts into a `div` that fills `aspect-[21/9]` but can produce canvas pixels that bleed outside the rounded-corner boundary of the wrapping `<Card>`. Fix: add `overflow-hidden` to the `StudioLocator` `<Card>`'s `className` prop. | `globals.css` `.g-card` block; `StudioLocator.tsx` `<Card padding={padding} …>` |

---

## Files changed

| File | Change |
|------|--------|
| `components/dashboard/UpcomingSessionsWidget.tsx` | Add optional `className` prop; remove hardcoded `h-full`; pass `className` to `<Card>` |
| `app/(coach)/coach/home/page.tsx` | Pass `className="lg:h-full"` to `<UpcomingSessionsWidget>`; remove `padding="none"` from `<StudioLocator>`; add `min-w-0` to the two direct grid-child wrappers |
| `app/(client)/client/home/page.tsx` | Pass `className="lg:h-full"` to `<UpcomingSessionsWidget>`; add `min-w-0` to the two direct grid-child wrappers |
| `components/studio/StudioLocator.tsx` | Add `overflow-hidden` to the outer `<Card>`'s `className` |

---

## Step-by-step changes

### Step 1 — `components/dashboard/UpcomingSessionsWidget.tsx`

**What to change:**

1. Add `className?: string` to the `UpcomingSessionsWidgetProps` interface.
2. Destructure `className = ''` from props in the function signature.
3. On the `<Card>` element, change `className="h-full"` to `className={className}`.  
   The card itself still receives `padding="md"` — that stays.

**Files:** `components/dashboard/UpcomingSessionsWidget.tsx`

**Verify:** `npx next lint` — no new errors on this file; TypeScript compilation succeeds.

---

### Step 2 — `app/(coach)/coach/home/page.tsx`

Three independent edits in this file:

**2a. `UpcomingSessionsWidget` call — add `className` prop**

Locate the `<UpcomingSessionsWidget` call inside the "2-col main" `<div>`. It currently reads:

```
<UpcomingSessionsWidget
  appointments={appointments}
  perspective="coach"
  viewAllHref="/coach/appointments"
/>
```

Add `className="lg:h-full"` so the card only stretches to row height on large screens:

```
<UpcomingSessionsWidget
  appointments={appointments}
  perspective="coach"
  viewAllHref="/coach/appointments"
  className="lg:h-full"
/>
```

**2b. `StudioLocator` call — remove `padding="none"`**

Locate the `<StudioLocator` call near the bottom of the JSX. It currently reads:

```
<StudioLocator
  title="Rehearsal Studios Directory"
  subtitle="Dance and performing arts studios around San Jose del Monte, Bulacan — curated listings plus community-sourced results"
  padding="none"
/>
```

Remove the `padding="none"` prop entirely, allowing it to use the default `"md"`:

```
<StudioLocator
  title="Rehearsal Studios Directory"
  subtitle="Dance and performing arts studios around San Jose del Monte, Bulacan — curated listings plus community-sourced results"
/>
```

**2c. Main 3-col grid — add `min-w-0` to both grid-child wrappers**

In the `{/* Main 3-col grid */}` section, two direct children of `grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6` need `min-w-0`:

- The left wrapper: `<div className="space-y-4 sm:space-y-5 lg:col-span-2">` → add `min-w-0`:  
  `<div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-2">`
- The sidebar: `<aside className="space-y-4 sm:space-y-5">` → add `min-w-0`:  
  `<aside className="min-w-0 space-y-4 sm:space-y-5">`

**Files:** `app/(coach)/coach/home/page.tsx`

**Verify:** `npx next lint` — no new errors on this file.

---

### Step 3 — `app/(client)/client/home/page.tsx`

Two independent edits in this file:

**3a. `UpcomingSessionsWidget` call — add `className` prop**

Locate the `<UpcomingSessionsWidget` call at the end of the main grid section (it is a direct child of the `grid grid-cols-1 gap-5 lg:grid-cols-3` div, after the `lg:col-span-2` div). It currently reads:

```
<UpcomingSessionsWidget
  appointments={upcomingAppointments}
  perspective="client"
  viewAllHref="/client/appointments"
/>
```

Add `className="lg:h-full"`:

```
<UpcomingSessionsWidget
  appointments={upcomingAppointments}
  perspective="client"
  viewAllHref="/client/appointments"
  className="lg:h-full"
/>
```

**3b. Main grid — add `min-w-0` to both grid-child wrappers**

In the `{/* Main grid */}` section, two direct children of `grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6` need `min-w-0`:

- The left wrapper: `<div className="space-y-5 lg:col-span-2 lg:space-y-6">` → add `min-w-0`:  
  `<div className="min-w-0 space-y-5 lg:col-span-2 lg:space-y-6">`
- The sessions widget sits directly in the grid with no wrapper `<div>` — `min-w-0` is passed via the `className` prop added in 3a. No additional wrapper needed here; `Card` already renders a `<div>` and `className` is forwarded through `UpcomingSessionsWidget → Card`.

  However, `Card` does not currently forward `className` directly to the outermost `div` in the grid flow — it does (`cn('g-card', …, className)`). So `lg:h-full min-w-0` could be combined:  
  Change the className in 3a to `className="min-w-0 lg:h-full"`.

**Files:** `app/(client)/client/home/page.tsx`

**Verify:** `npx next lint` — no new errors on this file.

---

### Step 4 — `components/studio/StudioLocator.tsx`

**What to change:**

The outer `<Card>` in the `return` statement currently reads:

```tsx
<Card padding={padding} id={id} className={className}>
```

The component already accepts a `className` prop (already defined in its interface and destructured with `className = ''`). The fix is to merge `overflow-hidden` into whatever `className` the caller provides. Use a template expression:

Change to:

```tsx
<Card padding={padding} id={id} className={`overflow-hidden${className ? ` ${className}` : ''}`}>
```

This guarantees `overflow-hidden` is always present regardless of what the caller passes, preventing Leaflet canvas pixels from bleeding outside the card's `border-radius: 20px` rounded corners.

**Files:** `components/studio/StudioLocator.tsx`

**Verify:** `npx next lint` — no new errors on this file.

---

### Step 5 — Final verification

Run both commands from the workspace root `c:\website\GrooveSystem`:

```
npx next lint
npx next build
```

Expected outcomes:
- `next lint` exits 0 with no errors introduced by these changes (pre-existing warnings, if any, are noted but not fixed — only issues caused by these changes are in scope).
- `next build` completes successfully, producing a `.next` output directory with no TypeScript or compilation errors for the changed files.

**Report:** Write findings to `c:\website\GrooveSystem\.agents\tasks\welcome-modal-logo-redesign\dashboard-layout-report.md` listing:
- Each changed file and what was changed
- Lint output (errors vs warnings, noting which are pre-existing)
- Build output (success/failure, any errors)
- Confirmation that no backend or unrelated files were modified

---

## Dependency order

Steps 1–4 are independent of each other and may be applied in any order, but Step 1 must be complete before Step 5's build verification, because Steps 2 and 3 add the `className` prop call that Step 1's interface change enables. The TypeScript compiler enforces this.

Recommended sequence: **1 → 2 → 3 → 4 → 5**.

---

## What this plan does NOT touch

- No backend files, API routes, database queries, or authentication logic.
- No unrelated components, styles, or pages.
- `StudioLocatorMap.tsx`, `DashboardLayout.tsx`, `HeroBanner.tsx`, `StatRow.tsx`, `Card.tsx`, `globals.css` — all left unchanged.
- Map functionality (markers, filters, radius selector, Leaflet interactions) — fully preserved.
- Coach/client data fetching and role logic — fully preserved.
