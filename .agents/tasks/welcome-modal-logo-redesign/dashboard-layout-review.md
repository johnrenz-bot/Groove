# Dashboard Layout Fixes — /coach/home and /client/home

Four files changed, 10 insertions, 6 deletions. The commit addresses horizontal overflow in both dashboard grids, a collapsing sessions card on mobile, flush-edge map controls in the coach view, and the Leaflet canvas bleeding past card rounded corners.

**Watch for:** `overflow-hidden` on `StudioLocator`'s Card is applied via template-string concatenation instead of the `cn()` utility that's already imported in the file — non-blocking but inconsistent. The client page passes `"min-w-0 lg:h-full"` as `className` to `UpcomingSessionsWidget`, placing `min-w-0` on the Card element rather than on its grid-child wrapper; redundant but harmless.

**Verdict**: APPROVED

---

## High-level view

The four root causes in the report map exactly to the four changed files. `min-w-0` is placed on the correct direct grid children (`lg:col-span-2` div and `<aside>` in the coach page; `lg:col-span-2` div in the client page). `UpcomingSessionsWidget` gains a `className` prop so callers control height behavior per breakpoint rather than hardcoding `h-full`. The client page passes `"min-w-0 lg:h-full"` — the `min-w-0` is redundant since the parent div already carries it, but causes no layout issue. `padding="none"` removal from the coach `StudioLocator` is confirmed absent by direct file read. The `overflow-hidden` on `StudioLocator`'s outer Card is correct but uses a template literal rather than `cn()` — the `cn` utility is already imported in the file.

No backend, API, auth, or database files appear in the diff. Lint shows 5 pre-existing issues, none introduced here. Build passed cleanly.

---

<details>
<summary>Issues (1)</summary>

1. **`overflow-hidden` via template string instead of `cn()`** — `StudioLocator.tsx` line 260 constructs the Card className with a template literal rather than `cn('overflow-hidden', className)`. Non-blocking; consider switching for uniformity with the rest of the file.

</details>

<details>
<summary>Details</summary>

### `min-w-0` on the client-page Card vs. the grid child

The client page passes `className="min-w-0 lg:h-full"` to `UpcomingSessionsWidget`, which flows onto the Card via `cn('h-full', className)`. The `min-w-0` is redundant — the Card's parent div already carries `min-w-0`. A block element with `min-width: 0` inside a `min-width: 0` container is fine, but the intent is cleaner if `min-w-0` stays at the grid-child level and the `className` prop carries only `lg:h-full`, matching the coach-page usage.

### `overflow-hidden` concatenation pattern

`` `overflow-hidden${className ? ` ${className}` : ''}` `` works correctly — `overflow-hidden` always leads, caller className appends. The `cn` utility is imported and used elsewhere in `StudioLocator.tsx`; `cn('overflow-hidden', className)` would handle the empty-string case more explicitly and match the file's style.

</details>

---

<details>
<summary>Files changed</summary>

| File | Change |
|------|--------|
| `components/dashboard/UpcomingSessionsWidget.tsx` | Added `className?: string` prop; imported `cn`; replaced hardcoded `"h-full"` with `cn('h-full', className)` |
| `app/(coach)/coach/home/page.tsx` | Added `min-w-0` to `lg:col-span-2` div and `<aside>`; added `className="lg:h-full"` to `<UpcomingSessionsWidget>`; removed `padding="none"` from `<StudioLocator>` |
| `app/(client)/client/home/page.tsx` | Added `min-w-0` to `lg:col-span-2` div; added `className="min-w-0 lg:h-full"` to `<UpcomingSessionsWidget>` |
| `components/studio/StudioLocator.tsx` | Added `overflow-hidden` to outer `<Card>` className via template string |

Full diff: `git diff HEAD~1 HEAD`

</details>
