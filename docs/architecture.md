# Architecture Overview

> This document describes the system as it actually exists today.
> It is a reference for developers who need to understand how the pieces fit together.

---

## High-Level System Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
│   Landing (Dark)  │  Auth Flows (Dark)  │  Portals (Dark / Light)       │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS / WSS
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 (App Router)                           │
│                                                                         │
│  middleware.ts ─── Session Refresh + Role-Based Access Control (RBAC)   │
│                                                                         │
│  Route Groups:                                                          │
│  ├── /                         Public landing page                      │
│  ├── /login, /register/*       Authentication (dark-only)               │
│  ├── /(client)/client/*        Authenticated client portal              │
│  ├── /(coach)/coach/*          Authenticated coach portal               │
│  ├── /admin/*                  Admin console (server-guarded)           │
│  ├── /messages, /contracts/*   Shared authenticated pages               │
│  ├── /dance-events             External events feed                     │
│  └── /api/*                    Route Handlers (server-side)             │
│                                                                         │
│  Providers (root layout):                                               │
│    ThemeProvider → PlatformThemeSync → RouteThemeEnforcer                │
│    AppLoadingSplash · PresenceBridge                                    │
└───────────────────┬──────────────────────────┬─────────────────────────┘
                    │                          │
                    ▼                          ▼
┌───────────────────────────────────┐  ┌──────────────────────────────────┐
│       Supabase Cloud (BaaS)       │  │     External Cloud Services      │
│  ├── PostgreSQL 15 + RLS          │  │  ├── OpenStreetMap Overpass API   │
│  ├── Supabase Auth (JWT Cookies)  │  │  │   (Live Studio Locator)       │
│  ├── Realtime (Chat, Presence,    │  │  └── OpenRouter API              │
│  │    Notifications)              │  │      (DeepSeek AI Assistant)     │
│  └── Storage Buckets              │  └──────────────────────────────────┘
│      (avatars, media, signatures, │
│       contracts, verification)    │
└───────────────────────────────────┘
```

---

## 1. Rendering Strategy

The application uses the **Next.js App Router** with Server Components by default.
Client Components are used only where browser interactivity is required — form state,
real-time subscriptions, canvas drawing, and map rendering.

| Pattern | Where |
|---|---|
| **Server Component** | Admin layout guard, public landing, legal pages |
| **Client Component** | Dashboard pages with live data, messenger, community feed, booking modals, map, signature pad |
| **Route Handler** | `/api/ai/coach-assistant`, `/api/studios`, `/api/tickets`, `/api/admin/*`, `/api/dance-events` |

Pages use the `'use client'` directive at the top when they need browser APIs.
Server components import from `@/lib/supabase/server` and client components from `@/lib/supabase/client`.

---

## 2. Authentication & Authorization

### 2.1 Auth Provider

Authentication is handled entirely by **Supabase Auth** via `@supabase/ssr`:
- **Browser client** → `lib/supabase/client.ts` → `createBrowserClient()`
- **Server component / Route Handler** → `lib/supabase/server.ts` → `createClient()` (uses `cookies()`)
- **Middleware** → `lib/supabase/middleware.ts` → `createServerClient()` (uses request cookies)

Sessions are stored as **HTTP-only cookies** (not `localStorage`), refreshed transparently by the middleware on every request.

### 2.2 OAuth Flow

Google OAuth is supported. The callback lands on `/auth/callback/route.ts`, which exchanges the code for a session and redirects to the role-appropriate home page.

### 2.3 Middleware Guard (`middleware.ts`)

Every non-static request passes through the middleware, which:

1. **Refreshes the Supabase session** — ensures tokens are up-to-date.
2. **Classifies the route** into one of: `auth`, `admin`, `coach`, `client`, `shared`, `public`.
3. **Redirects unauthenticated users** trying to reach protected routes → `/login?redirectTo=...`.
4. **Redirects authenticated users** on auth pages → their role's home.
5. **Enforces role isolation**:
   - `/admin/*` requires both `role = 'admin'` AND the pinned admin email.
   - `/coach/*` requires `role = 'coach'` (or admin).
   - `/client/*` requires `role = 'client'` (or admin).

### 2.4 Admin Identity Hardening

Admin access requires **two conditions** (defined in `lib/admin/access.ts`):
1. The `profiles.role` column = `'admin'`
2. The account email exactly matches the pinned `ADMIN_EMAIL` constant

This dual check prevents role self-assignment attacks. The admin layout (`app/admin/layout.tsx`) performs a **second, independent server-side check** via `lib/admin/guard.ts`, so even if the middleware were somehow bypassed, the admin section would still refuse to render.

### 2.5 Registration Flows

Two separate registration flows exist:
- `/register/client` — collects personal info + PH address + valid government ID
- `/register/coach` — collects personal info + PH address + talent/genre selection + portfolio + government ID + selfie with ID

Both use the `RegistrationFormFields` component (multi-step wizard) and post data to Supabase Auth with `user_metadata.role`, which triggers a database function that creates the `profiles` row.

---

## 3. Database Architecture

### 3.1 Core Tables

| Table | Purpose |
|---|---|
| `profiles` | Central user table (linked to `auth.users` by `id`) |
| `coach_profiles` | Coach-specific detail (talent, fees, notice period, documents) |
| `client_profiles` | Client-specific detail (talent interest, government ID) |
| `appointments` | Booking lifecycle (pending → accepted → agreement_required → confirmed → completed) |
| `agreements` | Digital session contracts (linked to appointment, stores signature paths) |
| `messages` | Direct messaging between users |
| `community_posts` | Social talent feed posts |
| `post_reactions` | Reactions on community posts |
| `post_comments` | Comments on community posts |
| `feedbacks` | Star ratings and written reviews (client → coach) |
| `notifications` | In-app notification items |
| `announcements` | Admin-created platform-wide announcements |
| `maintenance_notices` | Scheduled downtime and maintenance alerts |
| `tickets` | Public support ticket submissions |
| `profile_follows` | User follow/unfollow relationships |
| `user_profile_posts` | Profile portfolio/media posts |
| `admin_audit_log` | Admin action audit trail |
| `platform_settings` | Platform-wide configuration (theme defaults, etc.) |

### 3.2 Row Level Security (RLS)

Every table has RLS policies. Key patterns:
- Users can only read/write their own `profiles` row
- Appointments are visible to both the client and coach involved
- Messages are visible to sender and receiver only
- Admin audit log requires the `is_admin()` database function
- Verification documents are private to the user and admin

### 3.3 Database Functions & Triggers

Stored in `supabase/schema.sql` and migration files:
- `guard_booking_transition()` — enforces the appointment status state machine
- `on_agreement_countersigned()` — auto-confirms booking when both parties sign
- `missing_verification_documents()` — blocks approval if required docs are missing
- `is_admin()` — single-source admin check used by RLS policies

### 3.4 Migration Files

Located in `supabase/migrations/`, numbered `00_` through `09_`. These are applied in order and cover:
- Appointment reference generation
- Booking lifecycle enum and schema
- Signature storage policies
- User status hotfixes
- Feedback-booking linkage
- Profile follows system

---

## 4. Storage Buckets

| Bucket | Visibility | Used For |
|---|---|---|
| `avatars` | Public | Profile photos |
| `community-media` | Public | Community feed video/photo uploads |
| `verification-documents` | Private | Government IDs, credentials, selfies |
| `messages-media` | Private | Chat attachments |
| `contract-signatures` | Private | E-signature PNG captures |
| `contracts` | Private | Generated agreement documents |
| `tickets-attachments` | Private | Support ticket file attachments |
| `user-posts` | Public | Profile portfolio media |

Private buckets require **signed URLs** for access. The application generates short-lived signed URLs (30 minutes) via `supabase.storage.from(bucket).createSignedUrl()`.

---

## 5. Real-Time Features

Supabase Realtime powers three live subsystems:

### 5.1 Messaging (`app/messages/page.tsx`)
- Subscribes to `INSERT` events on the `messages` table
- Filtered to the current conversation's participants

### 5.2 Notifications (`components/shared/NotificationDropdown.tsx`)
- Subscribes to `INSERT` events on the `notifications` table
- Scoped to the current user's `user_id`
- Updates the unread badge count in the nav bar

### 5.3 Presence (`lib/presence/usePresence.ts`, `components/shared/PresenceBridge.tsx`)
- A single Realtime presence channel for the whole app
- Writes the user's status (`online`, `away`, `busy`, `offline`) to the `profiles.status` column
- `PresenceBridge` in the root layout ensures one subscription per session
- `StatusSelect` component lets users self-assign their presence state

---

## 6. Theme System

### 6.1 Architecture

The theme system has three layers:

1. **Pre-paint script** (inline `<script>` in root layout) — reads `localStorage` before React hydrates to prevent a flash of wrong colors.
2. **ThemeProvider** (`components/theme/ThemeProvider.tsx`) — React context that manages mode (`dark` / `light` / `system`) and accent color (`gold`, `ember`, `ocean`, `orchid`, `jade`, `rose`).
3. **PlatformThemeSync** — fetches the admin-configured default accent from `platform_settings` after mount.
4. **RouteThemeEnforcer** — forces dark mode on landing, login, and registration pages.

### 6.2 CSS Token System

All colors are defined as CSS custom properties in `app/globals.css`, organized by theme mode and accent. Components use semantic tokens (`--background`, `--foreground`, `--accent`, `--card`, etc.) rather than hard-coded colors.

---

## 7. External Integrations

### 7.1 OpenRouter / DeepSeek AI

- **Endpoint**: `/api/ai/coach-assistant/route.ts`
- **Client**: `components/shared/CoachAIAssistantModal.tsx`, `components/client/TalentCoachAssistant.tsx`
- **Library**: `lib/openrouter.ts`
- The AI assistant answers questions about a specific coach using their actual profile data
- Falls back to a static response if no API key is configured

### 7.2 OpenStreetMap Overpass

- **Endpoint**: `/api/studios/route.ts`
- **Client**: `components/studio/StudioLocator.tsx`, `components/studio/StudioLocatorMap.tsx`
- Queries the Overpass API for leisure/dance/arts venues within a configurable radius
- Results are rendered on a Leaflet map

### 7.3 Dance Events Feed

- **Endpoint**: `/api/dance-events/route.ts`
- **Library**: `lib/danceEventSources.ts`
- Aggregates dance event data from external sources
- Displayed on the `/dance-events` page via `components/dance/DanceEventsFeed.tsx`

---

## 8. Key Design Decisions

1. **Server Components first** — only pages with interactivity use `'use client'`.
2. **No server actions for mutations** — client components use direct Supabase client calls, not React Server Actions. This keeps auth context on the client side.
3. **profiles table is authoritative** — role claims from `user_metadata` are never trusted; the database row is always queried.
4. **Dual admin guard** — both middleware AND the server layout check admin identity, providing defense in depth.
5. **Philippine locale** — currency is PHP (₱), addresses follow the PSGC standard (Region → Province → City → Barangay), and the studio locator is geofenced to San Jose del Monte, Bulacan.
6. **Single presence channel** — all pages share one WebSocket subscription via `PresenceBridge` in the root layout, avoiding redundant connections.
