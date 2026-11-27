# GroovePH Inverted Radius Design System

A single, global shape language for every route and role: concave corner cutouts, nested radius relationships, and sculpted container edges. Implemented in `app/globals.css` with CSS custom properties, Tailwind v4 `@theme` tokens, masks, and alternating radii. No new dependencies, no runtime JavaScript, no business-logic changes.

## 1. Tokens

All tokens live in `app/globals.css` — `:root` for the dark default and the `@theme` block for Tailwind utilities. Theme scopes (`.light`, `.classic`, `.halloween`, `.christmas`, `:root[data-theme='…']`) inherit them, so shape is identical in every palette.

| Token | Value | Purpose |
|---|---|---|
| `--groove-accent`, `--groove-accent-soft` | aliases of `--accent`, `--accent-hover` | Brand gold without duplicating palette values |
| `--radius-xs … --radius-3xl` | 8 / 10 / 12 / 14 / 18 / 24 / 32 px | Tailwind `rounded-*` scale, re-based for the 14px root |
| `--radius-inv-xs … --radius-inv-xl` | 8 / 12 / 18 / 24 / 32 px | Explicit `rounded-inv-*` utilities for new work |
| `--inverted-radius-sm … xl` | 12 / 20 / 28 / 36 px | Concave cut depth (10 / 14 / 20 / 26 px on phones) |
| `--surface-gap`, `--surface-padding` | 16 / 24 px | Rhythm between/inside layered surfaces |
| `--motion-standard`, `--motion-smooth` | 250 / 400 ms | Shape and elevation transitions |
| `--inverted-ring`, `--inverted-highlight` | accent-mixed alpha | Theme-aware inset hairlines |

Legacy tokens (`--radius`, `--radius-control`, `--radius-card`, `--radius-panel`, `--av-radius-card`, `--ph-radius-*`) are preserved. Nothing that consumed them was removed.

## 2. Utilities

Shape-only utilities; they never set a colour or background, so each theme keeps its own intentional surfaces.

| Utility | Behaviour |
|---|---|
| `.inverted-surface`, `.inverted-card`, `.inverted-card-sm`, `.inverted-card-lg`, `.inverted-panel`, `.inverted-modal`, `.inverted-section` | True concave corners via four intersecting radial-gradient masks; the cutout is real transparency, revealing the correct parent surface in both themes |
| `.inverted-shell` | Alternating radii for containers that host popovers, sticky children or overflowing decorations — no mask, nothing clipped |
| `.inverted-button`, `.inverted-input`, `.inverted-navigation` | Alternating radii + inset ring; native focus rings stay visible |
| `.inverted-floating-element` | Organic `50% 50% 50% small` corner, morphing on hover |

Masks are only applied to leaf surfaces (stat tiles, bento tiles, modal panels, editorial panels). Containers with dropdowns or absolutely positioned menus use the non-clipping variants.

## 3. Universal application

The bottom of `app/globals.css` applies the language to the actual class families used by the app:

- Cards/panels: `.g-card`, `.g-panel`, `.tile`, `.bento-*`, `.ph-card`, `.ld-card`, `.gl-card-dark`, `.av-card`, `.au-card`, `.reg-*`, `.rw-*`, `.ed-panel`, `.profile-hero`, `.g-imagecard`, `.g-kpi-card`, `.faq-*`
- Controls/navigation: `.g-input`, `.av-input`, `.gs-input`, `.dash-nav-item`, `.dash-profile`, `.dash-sidebar-search-btn`, `.av-btn`, `.ph-btn-*`, `.ld-btn*`, `.faq-btn`, `.hx-auth-link`, `.g-menu-item`, `.hx-menu-item`, `.gs-row`
- Pills (`rounded-full` badges/avatars/progress) are deliberately left circular

Shared React primitives explicitly opt in: `Button`, `Input`/`Textarea`/`Select`, `Card`, `StatCard`, `EmptyState`, `Modal` (dialog panel), `AuthLayout` (auth card), toasts, and the Groovey floating assistant. Because these are shared, all 70+ routes inherit the language.

## 4. Theme compatibility

- The mask removes pixels instead of painting a "surrounding" colour, so no cutout can reveal a stale dark colour in light mode (or vice versa).
- Inset rings/highlights are derived from `--accent` with `color-mix`, so they follow the active accent (gold, bronze, seasonal).
- Pills, spinners and decorative circles keep their intentional `50%`/`9999px` radii.

## 5. Responsive behaviour

At `max-width: 640px`, cut depths and `--surface-padding` shrink so corners never eat form fields or buttons. Alternating radii keep masks unnecessary on small controls. `prefers-reduced-motion` removes all shape transitions. Overflow is never introduced; decorative corner work is CSS-only and `pointer-events: none` where applicable.

## 6. Usage examples

```tsx
// A leaf surface with a true concave cut
<div className="inverted-card bg-card border border-border p-5">…</div>

// A container that hosts a dropdown — use the non-clipping shell
<div className="inverted-shell g-card p-5">…</div>

// Controls keep their native focus ring
<button className="inverted-button …">Continue</button>
<input className="inverted-input …" />

// Tailwind utilities for new work
<div className="rounded-inv-lg border border-border bg-surface">…</div>
```

## 7. Verification

- `npm run typecheck`, `npm run lint`, `npm run build`
- Browser spot checks: `/`, `/login`, `/register/client`, `/client/home`, `/coach/home`, `/admin/dashboard`, `/community/performing-arts/dance` in dark and light themes at desktop and mobile widths
- Confirm: no horizontal overflow, no clipped fields/buttons, visible focus rings, modals and dropdowns still escape their hosts, preferred reduced motion honoured.
