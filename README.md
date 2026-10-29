<p align="center">
  <img src="public/icon-512.png" alt="GroovePH logo" width="240" />
</p>

<h1 align="center">GroovePH — Performing Arts Platform</h1>

<p align="center">
  <strong>A full-stack digital ecosystem connecting performers, verified coaches, and rehearsal studios in San Jose del Monte, Bulacan.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.3-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.8-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Available Scripts](#available-scripts)
- [Database &amp; Storage](#database--storage)
- [Security Model](#security-model)
- [Development Guidelines](#development-guidelines)
- [Further Documentation](#further-documentation)

---

## Overview

GroovePH is a production-oriented web platform for the performing arts community of San Jose del Monte, Bulacan. It bridges **performers** and **coaches** across dance, vocal arts, acting, and musical theatre with discovery, scheduling, digital agreements, studio geolocation, payments, discipline-specific community updates, and an AI assistant ("Groovey").

The platform serves three distinct audiences behind a single Next.js application:

| Audience | Surface | Access |
|---|---|---|
| Guests | Public landing, discipline pages, studios, profiles | Open |
| Clients (performers) | Client portal — bookings, contracts, community, payments | Authenticated |
| Coaches | Coach portal — schedule, requests, verification, community | Authenticated |
| Administrators | Admin console — user directory, document verification, audit log | Server-guarded |

### Design principles

- **Real data only.** Landing statistics are queried live from PostgreSQL at build/render time. If a count is zero or a query fails, the statistic is hidden rather than replaced with an invented number.
- **Server-first rendering.** Data is fetched in Server Components and passed to Client Components as props.
- **Honest empty states.** Every list renders a purposeful empty state instead of filler content.
- **No fabricated social proof.** There are no invented testimonials, ratings, or member names anywhere in the product.

---

## Features

### Accounts &amp; Access
- Separate multi-step registration flows for **clients** and **coaches**, with server-side and client-side validation.
- Google sign-in alongside email/password, plus password reset and forgot-password routes.
- "Remember me" persistence for the last identifier (session ownership remains with Supabase).
- Role-aware routing: an authenticated visitor hitting `/` is redirected to their own portal home.
- One-time welcome tour shown on first authenticated sign-in.

### Discovery &amp; Booking
- Filterable coach discovery with verified-credential badges and transparent pricing.
- Full appointment lifecycle: inquiry → confirmation → session → post-session feedback and star ratings.
- In-browser digital agreements with vector e-signature capture, rendered for both participants.
- Interactive studio locator (Google Maps JavaScript API) with address search, browser geolocation, and 1/5/10/25/50 km radius filtering.

### Community
- Showcase feed with media uploads delivered through signed URLs, reactions, and comments.
- Realtime direct messaging with read receipts and presence indicators (online / busy / away / offline).
- Discipline-specific community pages — dance, singing, acting, and theatre — each with curated updates and an upcoming-events feed.
- Achievements and badge collections.

### Payments
- GCash payment handling with generated QR codes stored in a private bucket and served via signed URLs.

### AI
- **Groovey**, a context-aware assistant backed by Google Gemini, with a multi-tier provider fallback chain, streaming chat, and generated conversation titles.

### Administration
- Server-guarded admin console: user directory, coach verification review, audit log, and content oversight.
- Public support-ticket intake with attachments.

### Platform
- Dark-mode-first visual system with theme switching across the authenticated portals; public and auth routes are permanently dark.
- Bilingual English / Tagalog dictionary layer.
- Welcome email dispatch on successful registration (best-effort; never blocks registration).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 16.3.3 | App Router, Server Components, Route Handlers |
| **UI runtime** | React 19.2.8 | Concurrent features, Suspense boundaries |
| **Language** | TypeScript 5.x | Strict mode, shared interfaces in `lib/types.ts` |
| **Styling** | Tailwind CSS v4 | CSS-variable design system via `@tailwindcss/postcss` |
| **Backend-as-a-Service** | Supabase | PostgreSQL, Row Level Security, Realtime, Storage |
| **Auth** | `@supabase/ssr` | HTTP-only cookie session exchange, edge route rules |
| **Mapping** | Google Maps JavaScript API + Places API (New) | Interactive map, Advanced Markers, radius circle, InfoWindows, real business discovery |
| **Signatures** | `react-signature-canvas` | Vector e-signature capture |
| **AI** | `@google/genai` | Gemini, with Groq / OpenRouter fallback chain |
| **Email** | `resend` | Welcome and notification delivery |
| **Validation** | `zod` | Schema validation at boundaries |
| **Animation** | `framer-motion`, `lenis` | Transitions and smooth scrolling |
| **Icons** | `lucide-react` | Accessible SVG icon set |
| **Utilities** | `date-fns`, `clsx`, `tailwind-merge` | Formatting and class composition |

---

## System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                            Client Browser                               │
│   Public (dark)   │   Auth flows (dark)   │   Portals (dark / light)     │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │ HTTPS / WSS
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 (App Router)                           │
│                                                                          │
│  proxy.ts ─────► session refresh + role-based route rules               │
│                  (logic lives in lib/supabase/middleware.ts)              │
│                                                                          │
│  Route groups:                                                           │
│  ├── /                       Public landing page                        │
│  ├── /login, /register/*     Authentication                             │
│  ├── /(client)/client/*      Client portal                              │
│  ├── /(coach)/coach/*        Coach portal                               │
│  ├── /admin/*                Admin console (server-guarded)              │
│  └── /api/*                  Route handlers                             │
└──────────────┬───────────────────────────┬───────────────────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│        Supabase Cloud        │  │        External Services              │
│  ├── PostgreSQL + RLS        │  │  ├── Google Maps JavaScript API      │
│  ├── Auth (cookie sessions)  │  │  │     (studio locator + geocoding)   │
│  ├── Realtime (chat,presence)│  │  ├── Google Gemini (+ AI fallbacks)    │
│  └── Storage buckets         │  │  └── Resend (transactional email)     │
└──────────────────────────────┘  └──────────────────────────────────────┘
```

### Request lifecycle

1. **Edge boundary** — Next.js 16 renamed the `middleware` file convention to `proxy`. The root `proxy.ts` is a thin hook that delegates to `updateSession()` in `lib/supabase/middleware.ts`, where the session refresh and route rules actually live. Any change to that logic belongs in `lib/supabase/middleware.ts`, not in `proxy.ts`.
2. **Server guards** — Privileged areas (notably `/admin/*`) apply a second server-side identity check via `lib/admin/access.ts`.
3. **Row-Level Security** — Every database query runs under RLS policies, so an account can only reach data it owns, regardless of what the client requests.

### Feature dependency flow

Each feature module follows a single direction of dependency:

```text
Page → Feature Component → Hook / Logic → Service / Server Action → Supabase (RLS)
```

---

## Project Structure

Feature-driven: domain logic is colocated, while shared utilities, layouts, and database clients remain globally accessible.

```text
GrooveSystem/
├── app/                              # Next.js App Router (routes & layouts)
│   ├── (public)/                     # Public surface
│   │   ├── page.tsx                  # Landing page — the ONLY file serving "/"
│   │   ├── about/  faq/  privacy/  terms/
│   │   ├── performing-arts-philippines/
│   │   └── (auth)/                   # login, register/{client,coach},
│   │                                 # forgot-password, reset-password
│   ├── (client)/client/              # Client portal
│   ├── (coach)/coach/                # Coach portal
│   ├── admin/                        # Admin console
│   ├── actions/                      # Server actions
│   ├── api/                          # Route handlers
│   ├── auth/                         # OAuth / session exchange callback
│   ├── community/  contracts/  messages/  userprofile/  users/
│   └── globals.css                   # Design tokens, themes, animations
│
├── features/                         # Feature modules
│   ├── acting/  dance/  singing/  theater/  music/     # Discipline pages
│   ├── appointments/                 # Booking modal, feedback, CRUD
│   ├── booking/                      # Agreements + signature capture
│   ├── calendar/  payments/  sound/
│   ├── community/                    # Showcase feed, signed media
│   ├── groovey/                      # AI assistant (UI + server provider chain)
│   ├── performing-arts/              # Cross-discipline hub
│   ├── presence/                     # Realtime status indicators
│   ├── showcase/
│   └── verification/                 # Coach document verification workflow
│
├── components/                       # Shared, reusable UI
│   ├── ui/                           # Primitives (Button, Card, Modal, …)
│   ├── shared/  layout/  header/  theme/  providers/
│   ├── landing/  studio/  profile/  dashboard/
│   ├── admin/  auth/  booking/  appointments/  community/
│   ├── verification/  achievements/  badges/  faq/  groovey/
│   └── client/  coach/
│
├── lib/                              # Core utilities & clients
│   ├── supabase/                     # client.ts, server.ts, middleware.ts
│   ├── admin/                        # Access control & server guards
│   ├── config/  i18n/  theme/  faq/  header/
│   ├── achievements/  dance/  groovey/  messenger/  services/  studios/  cron/
│   ├── types.ts                      # Authoritative shared interfaces
│   ├── geo.ts  profileFields.ts  utils.ts  …
│
├── agent/                            # Scheduled agent entry point
├── scripts/                          # Maintenance & verification scripts
├── docs/                             # Engineering documentation
├── public/                           # Static assets, fonts, logos
├── supabase/                         # Schemas, migrations, RLS policies, seeds
├── proxy.ts                          # Next.js 16 request boundary (was middleware)
├── next.config.ts                    # Next config & allowed remote image hosts
└── tsconfig.json                     # TypeScript config, `@/*` path alias
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **npm** 10 or higher
- A **Supabase** project (hosted or local via the Supabase CLI)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file from the committed template
cp .env.example .env.local

# 3. Populate .env.local with values from your service providers
#    (see "Configuration" below)

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup &amp; Safety

1. In your Supabase project, execute `supabase/schema.sql` in the SQL editor to create tables, enums, triggers, and Row Level Security policies.
2. Optionally apply the incremental scripts in `supabase/migrations/` in numeric order if you are upgrading an existing database.
3. Optionally run `supabase/seed.sql` for initial development records.

> **Production Database Safety Rule**: Treat any remote Supabase database as production data. Never run destructive SQL (`DROP TABLE`, `TRUNCATE`, cascade drops, or full resets) against remote environments. All local SQL migrations and definitions have been preserved.
>
> **SQL Backup Archive**: An untouched offline backup of all 12 root-level Supabase SQL files is preserved in `C:\website\GrooveSystem-SQL-Backup` (`admin_hardening.sql`, `community_feed.sql`, `media_posts.sql`, `messenger.sql`, `presence_realtime.sql`, `schema.sql`, `seed.sql`, `seed_admin.sql`, `seed_dance_orgs.sql`, `storage_policies.sql`, `studios.sql`, `verification_workflow.sql`).

Additional topic-specific SQL lives alongside it in `supabase/` (storage policies, verification workflow, community feed, messenger, presence, admin hardening, studios).

---

## Configuration &amp; Email Delivery

The application is configured through environment variables, loaded from `.env.local` in development and from your hosting provider's environment variables in production.

**`.env.example` is the canonical template.** It is committed to the repository and lists every key the application reads, each with a placeholder value:

```bash
cp .env.example .env.local
```

### Google Maps setup

The Studio Locator uses two Google surfaces: the browser-side Maps JavaScript API for the map itself, and server-side Places API (New) discovery behind `/api/studios`. It needs one public key and, optionally, a Map ID:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-restricted-browser-key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id   # optional; DEMO_MAP_ID is used when unset
# Optional: separate server-only key for Places discovery
GOOGLE_PLACES_API_KEY=your-server-places-key
```

In the Google Cloud console:

1. Enable **Maps JavaScript API** and **Places API (New)** for the project. The map and markers call Maps JavaScript API; studio discovery calls Places API (New) from the server.
2. Create a **Map ID** (JavaScript, vector) for production and set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Advanced Markers use this ID; the documented `DEMO_MAP_ID` fallback is for development only.
3. Restrict the API key under **APIs & Services → Credentials → API key**:
   - **Application restrictions:** HTTP referrers.
   - Add production origins (for example `https://your-domain.com/*`) and, if needed, `http://localhost:3000/*` for development.
   - **API restrictions:** allow Maps JavaScript API and Places API (New).
   - A browser-referrer-restricted key cannot be used for server-side Places calls. Either relax that key's application restriction or set `GOOGLE_PLACES_API_KEY` to a separate server key with **Places API (New)** enabled and no referrer restriction.
4. Enable **billing** for the Google Cloud project. Places API (New) and Maps JavaScript API require an active billing account even within the free tier; without it the APIs return `REQUEST_DENIED` / `BILLING_DISABLED`. Then set a billing budget/alert.
5. Check the **Places API (New)** quotas. The default project quota for `SearchTextRequest` can be as low as 100 requests/day; Nearby Search, Autocomplete, and Place Details have separate quotas. `/api/studios` uses Nearby Search for radius browsing, Text Search for business-name queries, and Autocomplete + Place Details as a fallback, so one exhausted metric does not disable the others.

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is intentionally exposed to the browser; the referrer and API restrictions are what protect it. Never put `SUPABASE_SERVICE_ROLE_KEY` or other server secrets in a `NEXT_PUBLIC_` variable.

Google Maps displays its own attribution and logo. Studio rows come from `public.studios` in Supabase, the reviewed curated dataset as a fallback, and real Google Places business listings. Directory rows and Google rows are labelled separately, and a quota or billing failure is reported as missing Google coverage rather than as a GroovePH claim.

### Resend Email Architecture &amp; Troubleshooting

GroovePH uses a two-tier email architecture:

1. **Supabase Auth Confirmation Emails** (Auth verification link & password recovery):
   - Sent directly by Supabase Auth server-side during `supabase.auth.signUp()` and `supabase.auth.resend()`.
   - **Callback URLs**: Registration and resend verification calls include `options: { emailRedirectTo: `${origin}/auth/callback` }`. The callback route `/auth/callback` exchanges the PKCE auth code for a session and redirects to the appropriate role dashboard.
   - **Rate Limits & SMTP**: By default, Supabase's built-in email service limits sends to 3–4 emails/hour. If you encounter `over_email_send_rate_limit` (429), configure **Custom SMTP** in the Supabase Dashboard:
     - Go to: **Project Settings > Authentication > SMTP Settings**.
     - Sender Email: `noreply@yourdomain.com` (verified in Resend).
     - Sender Name: `GroovePH`.
     - Host: `smtp.resend.com`
     - Port: `465` (SSL) or `587` (TLS).
     - Username: `resend`
     - Password: `<your-resend-api-key>`

2. **GroovePH Transactional Welcome Emails** (`/api/send-email`):
   - Dispatched asynchronously via the Resend Node SDK when a user creates an account.
   - **Test Mode vs. Production**: If `RESEND_FROM_ADDRESS` is unset or set to `GroovePH <onboarding@resend.dev>`, Resend allows delivery **only to the email address of the Resend account owner**. Attempting to send to any other recipient will return HTTP 403 `validation_error` (`restricted_sender`).
   - **Production Setup**: Add and verify your custom domain at [resend.com/domains](https://resend.com/domains), then set `RESEND_FROM_ADDRESS="GroovePH <hello@yourdomain.com>"` in `.env.local` or your production environment variables.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local Turbopack development server. |
| `npm run build` | Production build with type checking. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint with project rules. |
| `npm run typecheck` | Static TypeScript type check (`tsc --noEmit`). |
| `npm test` | Run full test suite: typecheck + lint + booking status test. |
| `npm run test:booking` | Appointment booking status transitions unit test suite. |
| `npm run test:booking-ui` | Appointment booking UI, timezone & duration unit test suite. |
| `npm run agent:dance` | Run the dance community agent. |
| `npm run seed:dance` | Seed dance updates. |
| `npm run logos:sync` | Synchronise dance organisation logos. |
| `npm run images:sync` | Synchronise dance update images. |
| `npm run dance:verify` | Verify dance event dates. |

---

## Database &amp; Storage

### Storage buckets

| Bucket | Visibility | Contents |
|---|---|---|
| `media-posts` | Private (signed URLs) | Community showcase media |
| `verification-documents` | Private | Coach IDs and accreditation documents |
| `contract-signatures` | Private (participants) | Vector PNG e-signatures |
| `payment-qr-codes` | Private (signed URLs) | GCash payment QR codes |
| `avatars` | Public | Profile images |
| `theme` | Public | Theme assets |

Private buckets are never exposed through public URLs; they are read via short-lived signed URLs only.

---

## Security Model

- **Route rules at the edge.** `proxy.ts` → `lib/supabase/middleware.ts` refreshes sessions and restricts portal routes by the role stored in the `profiles` row.
- **`profiles.role` is authoritative.** Role values supplied at signup come from the client and are *not* treated as authorization claims.
- **Admin access requires a server-side check** in `lib/admin/access.ts` in addition to the database role — defence in depth, not a single check.
- **RLS on every table.** Data access is enforced in PostgreSQL, so a compromised client request still cannot read another account's rows.
- **Private media stays private.** Signatures, verification documents, and payment QR codes are served through signed URLs.

---

## Development Guidelines

1. **Prefer Server Components.** Add `'use client'` only when a component genuinely needs hooks, event handlers, canvas interaction, or browser APIs.
2. **Use the `@/*` path alias** for imports (e.g. `@/features/appointments/...`, `@/lib/...`).
3. **Keep domain logic inside its feature module.** Shared code belongs in `lib/` or `components/` only when genuinely reused.
4. **Never log secrets, tokens, or request bodies** containing user data. Error output should carry reason codes, not credentials.
5. **Registering a new API route?** Mirror the existing shape in `app/api/` — validate input, return structured JSON, and keep external calls behind a route handler rather than the browser.
6. **Run the checks before opening a PR:** `npm test`.
7. **Theme isolation:** public and authentication routes are permanently dark; authenticated portals honour the user's preference.

---

## Further Documentation

| Document | Contents |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | System architecture and design decisions |
| [`docs/project-structure.md`](./docs/project-structure.md) | Detailed file and module map |
| [`docs/data-flow.md`](./docs/data-flow.md) | Request and data lifecycle |
| [`docs/dance-page-sourcing.md`](./docs/dance-page-sourcing.md) | Sourcing rules for dance page content |
| [`docs/DANCE_COMMUNITY_SETUP.md`](./docs/DANCE_COMMUNITY_SETUP.md) | Dance community module setup |
| [`docs/credits/IMAGE_SOURCES.md`](./docs/credits/IMAGE_SOURCES.md) | Image attributions |
| [`docs/credits/LOGO_SOURCES.md`](./docs/credits/LOGO_SOURCES.md) | Logo attributions |

---

## License

Proprietary. All rights reserved. Built for the GroovePH performing arts platform, San Jose del Monte, Bulacan, Philippines.