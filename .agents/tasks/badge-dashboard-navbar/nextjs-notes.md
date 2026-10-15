# Next.js 16 (App Router) Key Conventions

Source: `node_modules/next/dist/docs/` — Next.js 16.3.3, React 19.2.8

---

## App Router — Core Patterns

### File Conventions
- **`page.tsx`** — Makes a route publicly accessible; exports a default React component.
- **`layout.tsx`** — Shared UI that wraps child segments; persists across navigations without re-rendering.
- **`loading.tsx`** — Suspense boundary fallback shown while a segment loads.
- **`error.tsx`** — Error boundary for a segment.
- **`route.ts`** — API endpoint (no JSX); handles HTTP methods.
- **`proxy.ts`** — Server-side request handling (formerly Middleware).

### Component Types
- **Server Components** — Default in App Router; render on server; can fetch data directly; no `useState`/effects; no `"use client"` needed.
- **Client Components** — Marked `'use client'` at file top; run in browser; can use state, effects, event handlers.
- Pages in this project are **all `'use client'`** — they use Supabase browser client and React hooks directly.

### Server Actions (`"use server"`)
- Async functions marked `'use server'` (top of file or inline).
- Used for mutations (profile save, achievement update).
- Called from Client Components via `import('@/app/actions/...')` (dynamic import pattern used in this project).
- Project file: `app/actions/achievements.ts`.

### Data Fetching Patterns Used in This Project
1. **Client-side on mount** — `useEffect` + Supabase browser client (`createClient` from `@/lib/supabase/client`).
2. **Server Actions** — Triggered from `Client Component` after user actions (profile save, booking confirm).
3. **No RSC data fetching** currently used in page files — all pages are `'use client'`.

### Route Groups
- `(client)` and `(coach)` — Folders in parentheses omit the group name from the URL path but can share a `layout.tsx`.
- Route: `app/(client)/client/profile/page.tsx` → URL: `/client/profile`.

### Import Aliases
- `@/` resolves to the workspace root (configured in `tsconfig.json`).

---

## Key Breaking Changes / Conventions in v16

### `"use cache"` directive (new in v16)
- Marks a component or function as cacheable.
- Not yet used in this project.

### Proxy (replaces Middleware)
- `proxy.ts` replaces `middleware.ts` in Next.js 16. This project uses `lib/supabase/middleware.ts` as a helper but the actual proxy file may be elsewhere.

### React 19 + Server Components
- App Router uses React canary (React 19). Pages Router uses the installed React version.
- All pages in this project use `'use client'` so they run as React 19 client components.

### `cookies()` is async
- `const cookieStore = await cookies();` — Project already uses this pattern correctly in `lib/supabase/server.ts`.

---

## Styling System
- **Tailwind CSS v4** with PostCSS (`@tailwindcss/postcss`).
- Design tokens: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-accent-text`, `border-border`, `border-divider`, `bg-accent`, `bg-accent-soft`, `text-accent-foreground`, `border-accent-border`.
- Utility: `cn()` from `@/components/shared/cn` (wraps `clsx` + `tailwind-merge`).
- CSS classes: `g-card`, `g-pill`, `g-pill-accent`, `g-eyebrow`, `g-input`, `g-skeleton`, `g-header`, `g-header-inner`, `g-hsearch`, `g-header-link`, `g-header-brand` — custom Groove design-system classes.

---

## Navigation Architecture
- `AppTopNav` — single shared header for all three roles; receives `primary` (inline links) and `groups` (dropdown triggers).
- `DashboardLayout` — shell component rendering `AppTopNav` + `<main>`; wraps every `/client/*`, `/coach/*`, `/admin/*` page via their route `layout.tsx`.
- Roles supply their own nav through `ClientLayout`/`CoachLayout` → `DashboardLayout(role, navItems, groups)`.
- `ROLE_META` in `AppTopNav` defines per-role: `profile`, `editProfile`, `settings`, `homeHref`.

---

*Content was rephrased for compliance with licensing restrictions.*
