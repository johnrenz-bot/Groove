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
- Interactive studio locator (Leaflet + OpenStreetMap) with adjustable search radius.

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
| **Mapping** | Leaflet 1.9.4 + OpenStreetMap | Overpass API queries for studio discovery |
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
│  ├── PostgreSQL + RLS        │  │  ├── OpenStreetMap / Overpass API     │
│  ├── Auth (cookie sessions)  │  │  │     (studio locator)               │
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

### Database setup

1. In your Supabase project, execute `supabase/schema.sql` in the SQL editor to create tables, enums, triggers, and Row Level Security policies.
2. Optionally apply the incremental scripts in `supabase/migrations/` in numeric order if you are upgrading an existing database.
3. Optionally run `supabase/seed.sql` for initial development records.

Additional topic-specific SQL lives alongside it in `supabase/` (storage policies, verification workflow, community feed, messenger, presence, admin hardening, studios).

---

## Configuration

The application is configured entirely through environment variables, loaded from `.env.local` in development and from your hosting provider's environment settings in production.

**`.env.example` is the canonical template.** It is committed to the repository and lists every key the application reads, each with a placeholder value. To configure a fresh checkout:

```bash
cp .env.example .env.local
```

Then replace each placeholder with a real value obtained from the corresponding provider (Supabase, Google AI Studio, Resend, and so on).

Guidelines:

- **Never commit real values.** `.env*` files are covered by `.gitignore` and must stay untracked.
- **Server-only credentials must never be referenced from Client Components** or from any value prefixed for browser exposure. Doing so publishes the secret to every visitor.
- **The welcome-email sender address is restricted by default.** Email providers allow sending from a test address only to the account owner. Sending to real registrants requires a verified sending domain — see the sender note at the top of `app/api/send-email/route.ts` for the full explanation and the environment override that points the route at your own domain.
- Rotate any credential immediately if it is ever exposed in a commit, log, or client bundle.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run build` | Production build with type checking. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Static type check without emitting files. |
| `npm test` | Typecheck + lint + booking status tests. |
| `npm run test:booking` | Booking status test suite only. |
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