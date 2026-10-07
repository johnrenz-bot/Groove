<p align="center">
  <img src="public/image/wc/logo.png" alt="Groove Logo" width="240" />
</p>

<h1 align="center">Groove — Performing Arts Platform</h1>

<p align="center">
  <strong>A modern, full-stack digital ecosystem connecting performers, verified coaches, and rehearsal studios in San Jose del Monte, Bulacan.</strong>
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

## Overview

**Groove** is a specialized, production-ready web platform engineered for the performing arts community in San Jose del Monte, Bulacan. It bridges performers and coaches across dance, singing, acting, and musical theater with streamlined discovery, real-time booking, digital e-signature agreements, interactive studio geolocation, and community showcase feeds.

Detailed engineering guides and workflow specs are maintained in the [`docs/`](./docs/) directory:
- [Architecture Overview](./docs/architecture.md)
- [Project Structure & Map](./docs/project-structure.md)
- [Data Flow & Lifecycle](./docs/data-flow.md)
- [Verification Workflow](./docs/verification-workflow.md)
- [Admin Hardening](./docs/admin-hardening.md)
- [Theme System](./docs/theme-system.md)

---

## Key Features

- **Discipline Discovery:** Filter and book mentors across Dance, Vocal Arts, Acting, and Musical Theater with verified credentials and transparent pricing.
- **Appointment Scheduling:** Complete booking lifecycle from client inquiry to coach confirmation, session execution, and star ratings.
- **In-Browser Digital Contracts:** Formal digital agreements with vector stroke e-signatures (`react-signature-canvas`) stored securely in Supabase Storage.
- **Studio Geolocation:** Interactive OpenStreetMap and Leaflet map engine locating rehearsal spaces within customizable radii (1 km, 3 km, 5 km, 10 km) around San Jose del Monte.
- **Live Direct Messaging & Presence:** Real-time WebSocket messaging and presence indicators powered by Supabase Realtime.
- **Talent Showcase & Community Feed:** Category-filtered media feeds with signed URL delivery, post interactions, and comments.
- **DeepSeek AI Coach Assistant:** Server-side AI assistant (`/api/ai/coach-assistant`) answering discipline, fee, and etiquette queries.
- **Administrative Console:** Server-guarded back-office for coach document verification, audit logs, booking oversight, and system announcements.
- **Theatrical Visual System:** Dark-mode-first aesthetic with dynamic theme switching across authenticated portals.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.3.3 | App Router, Server Components, Route Handlers, Turbopack |
| **UI & Runtime** | React 19.2.8 | Concurrent features, Server Actions, Suspense boundaries |
| **Language** | TypeScript 5.x | Strict type safety with shared interfaces in `lib/types.ts` |
| **Styling** | Tailwind CSS v4 | CSS variables design system via `@tailwindcss/postcss` |
| **Backend as a Service** | Supabase | PostgreSQL 15, Row Level Security (RLS), Realtime WebSockets |
| **Authentication** | `@supabase/ssr` 0.12.5 | HTTP-only cookie session exchange and Edge Middleware RBAC |
| **Storage** | Supabase Storage | Isolated public and signed private object storage buckets |
| **Mapping Engine** | Leaflet 1.9.4 & OpenStreetMap | Overpass API live studio queries |
| **Signatures** | `react-signature-canvas` | Vector canvas e-signature capture |
| **AI Assistant** | OpenRouter API | DeepSeek Chat model integration |
| **Icons** | Lucide React | Accessible SVG icon set |

---

## Project Structure

The codebase is organized using a **feature-driven architecture** where domain logic is colocated for clarity, while shared utilities, layouts, and database clients remain accessible across the application:

```text
GrooveSystem/
├── app/                              # Next.js App Router (Routes & Layouts)
│   ├── (client)/client/              # Authenticated Client Portal (/client/home, talent, appointments, etc.)
│   ├── (coach)/coach/                # Authenticated Coach Portal (/coach/home, appointments, profile, etc.)
│   ├── admin/                        # Server-guarded Admin Console (/admin/dashboard, users, verifications)
│   ├── api/                          # Server Route Handlers (/api/ai, /api/studios, /api/tickets, /api/admin)
│   ├── auth/callback/                # OAuth & Supabase session exchange callback
│   ├── contracts/[id]/               # Digital contract view and sign route
│   ├── dance-events/                 # External dance events directory page
│   ├── login/, register/*            # Authentication routes (dark-mode enforced)
│   ├── messages/                     # Direct messaging page
│   ├── userprofile/[id]/             # Public coach and client showcase profile
│   ├── layout.tsx, page.tsx          # Root shell layout and public landing page
│   └── globals.css                   # Master CSS tokens, themes, and animations
│
├── features/                         # Feature Modules (Page → Component → Logic → Supabase)
│   ├── appointments/                 # Booking modal, feedback dialog, and appointment CRUD
│   │   ├── components/               # BookingModal.tsx, FeedbackModal.tsx
│   │   └── services/                 # appointmentService.ts
│   ├── booking/                      # Legal contracts, agreement cards, and canvas signatures
│   │   ├── components/               # AgreementSignature, SessionAgreementCard, SessionAgreementDocument, etc.
│   │   └── services/                 # bookingAgreement.ts
│   ├── community/                    # Talent showcase feed, signed media rendering, and upload logic
│   │   ├── components/               # CommunityFeed.tsx, SignedMedia.tsx
│   │   ├── services/                 # communityService.ts
│   │   └── utils/                    # community.ts, communityMedia.ts
│   ├── dance/                        # Dance events feed, access gates, and external sources
│   │   ├── components/               # DanceEventsFeed.tsx
│   │   ├── hooks/                    # useDanceAccess.ts
│   │   └── services/                 # danceAccess.ts, danceEventSources.ts
│   ├── presence/                     # Real-time user status (online, busy, away, offline)
│   │   ├── components/               # PresenceBridge.tsx, StatusSelect.tsx
│   │   ├── hooks/                    # usePresence.ts
│   │   └── utils/                    # presence.ts
│   └── verification/                 # Coach ID verification workflow and booking gate rules
│       ├── components/               # VerificationReviewPanel, VerificationDocumentsUpload, VerifiedBadge, etc.
│       └── services/                 # verification.ts
│
├── components/                       # Shared & Reusable UI Components
│   ├── admin/                        # Admin layout, user directory, tables, and drawers
│   ├── client/, coach/               # Portal layouts and sidebar navigation definitions
│   ├── shared/                       # AppTopNav, Footer, CoachCard, LoadingScreen, EmptyState, etc.
│   ├── studio/                       # StudioLocator and Leaflet StudioLocatorMap
│   ├── theme/                        # ThemeProvider, ThemeToggle, RouteThemeEnforcer
│   └── ui/                           # Primitive atoms (Button, Card, Modal, Input, Badge, etc.)
│
├── lib/                              # Core Utilities, Supabase Clients & Types
│   ├── admin/                        # Admin access control, server guards, and admin queries
│   ├── config/                       # Disciplines and genre taxonomies (skillsConfig.ts)
│   ├── supabase/                     # Supabase clients: client.ts, server.ts, middleware.ts
│   ├── types.ts                      # Authoritative shared TypeScript interfaces
│   ├── utils.ts                      # Common formatters (currency, dates, URLs)
│   └── geo.ts, ph-locations.ts       # Coordinate math and Philippine PSGC locations
│
├── docs/                             # Engineering Architecture & Specifications
├── public/                           # Static assets, fonts, brand logos, video media
├── supabase/                         # PostgreSQL schemas, migrations, RLS policies, seeds
├── middleware.ts                     # Edge authentication and RBAC session refresh
├── next.config.ts                    # Next.js configuration and image domains
└── tsconfig.json                     # TypeScript configuration with @/* path alias
```

---

## High-Level Architecture & Data Flow

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
│  Route Hierarchy:                                                       │
│  ├── /                         Public landing page                      │
│  ├── /login, /register/*       Authentication                           │
│  ├── /(client)/client/*        Authenticated client portal              │
│  ├── /(coach)/coach/*          Authenticated coach portal               │
│  ├── /admin/*                  Admin console (server-guarded)           │
│  ├── /messages, /contracts/*   Shared authenticated routes              │
│  └── /api/*                    Server route handlers                    │
└───────────────────┬──────────────────────────┬──────────────────────────┘
                    │                          │
                    ▼                          ▼
┌───────────────────────────────────┐  ┌──────────────────────────────────┐
│       Supabase Cloud (BaaS)       │  │     External Cloud Services      │
│  ├── PostgreSQL 15 + RLS          │  │  ├── OpenStreetMap Overpass API   │
│  ├── Supabase Auth (JWT Cookies)  │  │  │   (Live Studio Locator)       │
│  ├── Realtime (Chat, Presence)    │  │  └── OpenRouter API              │
│  └── Storage Buckets (Media/Docs) │  │      (DeepSeek AI Assistant)     │
└───────────────────────────────────┘  └──────────────────────────────────┘
```

### Architectural Dependency Flow

Every feature module follows a clean, single-direction flow:

$$\text{Page} \longrightarrow \text{Feature Component} \longrightarrow \text{Hook / Logic} \longrightarrow \text{Service / Server Action} \longrightarrow \text{Supabase PostgreSQL (RLS)}$$

1. **Edge Enforcement:** `middleware.ts` runs on all requests to refresh auth tokens and enforce route access by role.
2. **Server Guards:** High-privilege routes (e.g., `/admin/*`) apply a second server check (`lib/admin/guard.ts`) verifying the pinned administrative identity.
3. **Row-Level Security:** Every query sent to PostgreSQL runs under Supabase RLS policies, ensuring accounts can only access data they own.

---

## Setup & Installation

### Prerequisites

- **Node.js:** `v20.x` or higher
- **Package Manager:** `npm` v10+
- **Supabase Account:** Cloud project or local Supabase instance

### Quickstart

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/GrooveSystem.git
   cd GrooveSystem
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials in `.env.local` (see below).

4. **Initialize the database:**
   Execute `supabase/schema.sql` inside your Supabase project's SQL editor to generate all tables, enums, triggers, and Row Level Security policies. Optionally run `supabase/seed.sql` for initial development records.

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Environment Configuration

Configure the following variables in `.env.local`. **Never commit actual production keys or secrets to version control.**

```env
# ==============================================================================
# CLIENT-ACCESSIBLE SETTINGS (NEXT_PUBLIC_ prefix is exposed to browser bundles)
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# SERVER-ONLY SETTINGS (NEVER EXPOSE TO THE CLIENT)
# ==============================================================================
# Service role key bypassing RLS for administrative background operations
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenRouter DeepSeek integration for Coach AI Assistant
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=deepseek/deepseek-chat
```

---

## Available Scripts

Defined in `package.json`:

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server with Turbopack on `localhost:3000`. |
| `npm run build` | Compiles TypeScript, verifies route typings, and builds the production bundle. |
| `npm run start` | Runs the compiled Next.js application in production mode. |
| `npm run lint` | Runs ESLint across the codebase. |
| `npx tsc --noEmit` | Performs a complete static type check without emitting files. |

---

## Supabase Storage Buckets

The platform utilizes private and public Supabase Storage buckets:

| Bucket Identifier | Visibility | Description |
|---|---|---|
| `avatars` | Public | Profile pictures for clients and coaches |
| `media-posts` | Authenticated / Signed | User performance portfolio and talent videos |
| `verification-documents` | Private (Admin Only) | Government IDs and accreditation certificates |
| `signatures` | Private (Participants) | Vector PNG signatures for digital contracts |
| `contracts` | Private (Participants) | Stored session agreement PDFs |

---

## Notes for Future Developers

1. **Path Aliasing:** Use the `@/*` alias for clean imports (e.g., `@/features/appointments/...`, `@/lib/...`, `@/components/...`).
2. **Backward Compatibility:** Existing imports via `@/components/...` and `@/lib/...` for moved feature files are preserved through re-export barrels, preventing breaking changes across external references.
3. **Server vs. Client Components:** Prefer React Server Components by default. Add `'use client'` strictly when components require React hooks, event listeners, canvas interactions, or browser APIs.
4. **Theme Isolation:** Public pages (`/`, `/login`, `/register/*`) are permanently enforced to dark mode. Authenticated portals support user preference and admin-configured global themes.
5. **Security Rules:** Never use `SUPABASE_SERVICE_ROLE_KEY` in Client Components. Admin authorization requires both `role = 'admin'` in the database and email match against the pinned administrative identity in `lib/admin/access.ts`.

---

## License

Proprietary. All rights reserved. Built for Groove Performing Arts Platform, San Jose del Monte, Bulacan, Philippines.
