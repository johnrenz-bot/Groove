# GroovePH Universal Layout & Composition System

A single layout language for every route and role. This layer sits **on top of** the approved inverted-border-radius design system (`INVERTED_RADIUS_DESIGN_SYSTEM.md`); it does not replace or alter that system. It handles rhythm, alignment, shell geometry, navigation and widget proportion only. No data, auth, RLS, API or route behaviour was changed.

## 1. Layout tokens

Declared in `app/globals.css` (`:root`, with `--layout-sidebar-gap` in the composition block):

| Token | Value | Purpose |
|---|---|---|
| `--layout-page-padding` | 24px | Page/content gutter (clamped 24–36px in the dashboard) |
| `--layout-section-gap` | 28px | Space between major page blocks |
| `--layout-widget-gap` | 18px | Space between widgets/cards in a grid |
| `--layout-card-padding` | 22px | Reference padding for composed cards |
| `--layout-header-height` | 4rem (56px) | Shared header height |
| `--layout-sidebar-expanded` | 256px | Desktop rail |
| `--layout-sidebar-collapsed` | 64px | Desktop icon rail |
| `--layout-sidebar-gap` | 12px | Channel between rail and main column |
| `--layout-content-max` | 1600px | Content measure |

Smaller screens override `--inverted-*` cut depths (see the radius doc) and use 16px header gutters. The dashboard shell, `.dash-topbar`, `.dash-sidebar`, `.dash-content`, footer `.ld-wrap` and `.g-container` now share the same max width and gutter scale.

## 2. Application shell

`DashboardChrome` is the one shell for client, coach, admin, community and standalone pages. `DashboardLayout` adds only the Groovey provider; role wrappers add no duplicate chrome.

- **Sidebar:** collapsed/expanded state lives in `localStorage['groove-sidebar-collapsed']`, mirrored to `data-collapsed` on `.dash-shell`, with a 240ms width transition and tooltips on nav items, profile card and the rail toggle. Below 1024px it becomes an off-canvas drawer with scrim, focus trap, Escape/swipe close, body scroll lock and close-after-navigation. The collapsed rail now shows an icon-only search trigger.
- **Header:** left = burger (mobile) + a real breadcrumb trail; centre/right = contextual `HeaderSearch`, theme toggle, notifications and role-aware auth/account actions. Notification panels now carry `.g-notif-panel` so they float under the bell with constrained scrolling.
- **Active state:** the active nav item regains a slim gold indicator, consistent with the brand accent.
- **Search:** existing real searches are preserved — `HeaderSearch` (pages + `/api/users`, recents, keyboard navigation), drawer nav filter, FAQ filter, directory/admin/studio searches. No fake universal search was added.

## 3. Reusable page composition classes

| Class | Purpose |
|---|---|
| `.app-page` | Vertical page stack with `--layout-section-gap` between blocks |
| `.app-page-head`, `.app-page-head--stack` | Title/subtitle/action alignment; `--stack` for greeting headers |
| `.app-page-title`, `.app-page-subtitle`, `.app-eyebrow` | Type hierarchy |
| `.app-page-actions` | Action cluster |
| `.app-section`, `.app-section-head`, `.app-section-title` | Grouped content blocks |
| `.app-widget-grid`, `.app-stat-grid`, `.app-widget` | 12-column widget grid, auto-fit stat grid, bounded widget cell |
| `.app-profile-grid` | Two-column profile composition (1fr / 280–360px) |
| `.app-quick-actions` | Responsive quick-action lane |
| `.settings-shell`, `.settings-nav`, `.settings-nav-link` | Desktop settings rail (left) + content (right); horizontal on mobile |

Applied to shared primitives (`PageHeader`, `Greeting`, `QuickActions`, `StatStrip`, `Panel` consumers) and to the client/coach home, admin dashboard, settings, profile and public-profile pages. Existing dashboard widget grids inherit the same gap through `[aria-label='Dashboard widgets']` and `.g-stagger`.

## 4. Settings and profiles

- Client and coach settings now render `SettingsNav` with four anchors (`#account`, `#profile`, `#appearance`, `#danger`), sticky on desktop and horizontally scrollable on mobile. All existing save/password/delete actions remain in their original sections.
- `PageHeader` now actually renders the `eyebrow` prop that callers already passed.
- Owner and public profiles use `.app-page` + `.app-profile-grid`. Role-specific content is unchanged (coach bio/rates/genres/reviews vs client talent/payments).
- Fixed malformed utilities that changed layout (`spacr-y-5`, `backdeop-blue-md`, duplicated `border`, `hover:` fragments) and stale copy in the coach profile.

## 5. Public site and auth

- Footer `.ld-wrap` and legal `.g-container` now match the 1240px header measure and gutters.
- Landing anchors corrected to real section ids (`#for-artists`, `#how-it-works`) in `navConfig.ts`.
- Guest mobile drawer now exposes Sign in / Get started via the existing `.hx-drawer-auth` styles.
- The previously unstyled `.hx-progress` element now renders a 2px accent scroll indicator.
- Auth routes keep their existing shells, split panel, wizard scrolling and fixed logo. The inverted-radius system continues to style their cards and controls.

## 6. Themes and motion

All new surfaces use existing tokens (`--bg-*`, `--card`, `--border`, `--accent*`); no new hardcoded colours. Light, classic, halloween and christmas themes inherit the same geometry. Transitions use `--motion-standard` / `--motion-smooth` and are disabled under `prefers-reduced-motion`.

## 7. Verification

- `npm run typecheck`, `npm run lint` (0 errors), `npm run build` all pass.
- Browser checks across `/`, `/about`, `/faq`, `/login`, both registration routes, community, preview/studio-QA and shell pages: no console errors and no horizontal overflow; breadcrumbs, active rail indicator and shell gutter render as intended.
- Collapsed/expanded sidebar and drawer behaviour preserved (sidebar transition is CSS-only and verified in code and computed styles).

## 8. Do not regress

Keep the inverted-radius utilities intact, keep the root `ThemeProvider` authoritative, do not reintroduce duplicate shells or fake search results, and preserve role-specific navigation/permission checks in `navConfig.ts` / `appHeaderConfig.ts`.
