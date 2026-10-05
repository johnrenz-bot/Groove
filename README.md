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

## Table of Contents

- [Executive Summary](#executive-summary)
- [System Architecture](#system-architecture)
- [User Roles & Functional Modules](#user-roles--functional-modules)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Database & Storage Setup](#database--storage-setup)
- [Security & Compliance](#security--compliance)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Build & Deployment](#build--deployment)
- [Contribution Guidelines](#contribution-guidelines)
- [License & Support](#license--support)

---

## Executive Summary

**Groove** is a specialized, production-ready web application engineered to solve critical bottlenecks in the local performing arts sector of San Jose del Monte, Bulacan. Local artists and performers frequently encounter friction finding vetted mentors, enduring long booking communication delays, and struggling to identify available rehearsal studios.

Groove provides a centralized, authenticated platform that facilitates:
- **Discipline Discovery:** Direct access to vetted coaches across Dance, Singing, Acting, and Musical Theater.
- **Session Scheduling:** End-to-end appointment lifecycle from inquiry to confirmation, session execution, and rating.
- **Digital Contracts:** Legal digital session agreements backed by in-browser e-signatures (`react-signature-canvas`).
- **Studio Geolocation:** Interactive OpenStreetMap/Leaflet locator identifying rehearsal spaces around San Jose del Monte.
- **Real-Time Communication:** Instant messaging with rich media attachments (audio, video, documents, location pins).
- **Administrative Governance:** Robust administrative back-office for coach verification, transaction auditing, and ticket triage.

---

## System Architecture

Groove follows the modern **Next.js App Router** architecture with Server Components by default, Client Components where interactivity is necessary, and route-level protection enforced at the network edge:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Browser                                │
│    Landing Page (Dark)  │  Auth Flows (Dark)  │  Portals (Dark / Light)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / WSS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 (App Router)                         │
│  middleware.ts ── Session Refresh & Role-Based Access Control (RBAC)   │
│                                                                        │
│  Routes:                                                               │
│  ├── / (Landing)            ├── /login, /register/* (Auth)             │
│  ├── /(client)/* (Client)   ├── /(coach)/* (Coach)                     │
│  ├── /admin/* (Governance)  ├── /api/ai, /api/studios (Route Handlers) │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │ Database / Auth / Realtime    │ External APIs
                    ▼                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        Supabase Cloud (BaaS)         │  │   External Cloud Services    │
│  ├── PostgreSQL 15 + RLS             │  │  ├── OpenStreetMap Overpass  │
│  ├── Supabase Auth (JWT Cookies)     │  │  │   (Live Studio Locator)   │
│  ├── Realtime (Chat & Notifications) │  │  └── OpenRouter API          │
│  └── Storage Buckets (Media/Docs)    │  │      (DeepSeek AI Assistant) │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## User Roles & Functional Modules

The platform enforces strict role-based authorization using authoritative profiles verified against the database:

### 1. Client / Performer (`role: client`)
- **Discovery:** Browse and filter coaches by discipline, genre, rate range, and verified credentials.
- **Appointments:** Request session slots, manage pending bookings, and track confirmations.
- **Agreements:** Review terms and digitally sign legal session contracts directly in the browser.
- **Community:** Post performance media, comment on peer uploads, and react to updates.
- **Communication:** Chat in real time with coaches, attach audio/video samples, and share locations.

### 2. Coach / Mentor (`role: coach`)
- **Profile & Rates:** Manage biography, specializations, hourly rates, payment guidelines, and demo media.
- **Schedule Management:** Approve, decline, or reschedule incoming client booking requests.
- **Digital Signatures:** Countersign session agreements with stored digital signatures.
- **Verification Portal:** Submit government-issued ID and credentials for administrative vetting.
- **Performance Showcase:** Publish portfolio reels and testimonials to build credibility.

### 3. Administrator (`role: admin`)
- **Credential Verification:** Review submitted coach accreditation documents with approve/reject workflows.
- **User Oversight:** Inspect accounts, manage status (active/suspended), and monitor role assignments.
- **Booking Auditing:** Real-time visibility into all platform transactions and appointment lifecycles.
- **System Broadcasts:** Create and publish global announcements and scheduled maintenance notices.
- **Platform Customization:** Configure site-wide theme defaults and brand accent palettes.

---

## Key Features

- **Dark-First Brand Aesthetics:** Polished dark visual identity tailored for theatrical and artistic expression, with landing (`/`) and authentication (`/login`, `/register/*`) locked to dark mode.
- **Seamless Loading Architecture:** Centered brand loading screen with smooth breathing animation and layout-shift prevention during initial mount and streaming route transitions.
- **OpenStreetMap Studio Geolocation:** Real-time geographic spatial radius querying (1 km, 3 km, 5 km, 10 km) for dance studios and performance halls in and around San Jose del Monte.
- **Integrated Digital Signatures:** In-app canvas-based agreement signing eliminating third-party paperwork overhead.
- **Real-Time Synchronization:** Live notification badges, instant messaging channels, and live presence indicators powered by Supabase Realtime.
- **DeepSeek AI Performing Arts Assistant:** Server-side AI assistant for platform inquiries, booking etiquette, and coach recommendations.
- **Philippine Geographic Constraints:** Dedicated address selector scoped to San Jose del Monte barangays and Philippine regional standards.

---

## Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.3.3 | App Router, Server Components, Route Handlers |
| **Runtime & UI** | React 19.2.8 | Concurrent rendering, Server Actions, Suspense |
| **Language** | TypeScript 5.x | Strict type safety, shared interfaces (`lib/types.ts`) |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/postcss`, CSS custom property tokens |
| **Database** | PostgreSQL 15 (Supabase) | Row Level Security (RLS), triggers, stored functions |
| **Authentication** | `@supabase/ssr` 0.12.5 | HTTP-only cookie session handling, JWT validation |
| **Realtime Engine** | Supabase Realtime | WebSocket channels for messaging and alerts |
| **Object Storage** | Supabase Storage | Isolated public and private media buckets |
| **Mapping Engine** | Leaflet 1.9.4 & OSM | OpenStreetMap Overpass API integration |
| **E-Signatures** | react-signature-canvas | Vector stroke capture for digital agreements |
| **AI Integration** | OpenRouter API | DeepSeek Chat model integration |
| **Iconography** | Lucide React | Clean, accessible vector icons |
| **Typography** | Inter & Custom Display | Variable Sans via Google Fonts, custom display fonts |

---

## Project Directory Structure

```text
GrooveSystem/
├── app/                              # Next.js App Router structure
│   ├── (client)/                     # Authenticated client portal routes
│   │   └── client/                   # /client/home, appointments, calendar, etc.
│   ├── (coach)/                      # Authenticated coach portal routes
│   │   └── coach/                    # /coach/home, appointments, calendar, etc.
│   ├── admin/                        # Admin console (/admin/dashboard, users, etc.)
│   ├── api/                          # Server Route Handlers
│   │   ├── ai/                       # OpenRouter / DeepSeek AI assistant endpoint
│   │   ├── studios/                  # OpenStreetMap Overpass geolocation API
│   │   └── tickets/                  # Public support ticket ingestion
│   ├── auth/                         # Supabase OAuth and email confirmation callbacks
│   ├── contracts/                    # Digital agreement viewing and signing (/contracts/[id])
│   ├── login/                        # Unified authentication entry point
│   ├── register/                     # Role-based onboarding (/register/client, /register/coach)
│   ├── forgot-password/              # Password recovery workflow
│   ├── reset-password/               # Password reset token redemption
│   ├── messages/                     # Direct real-time messaging interface
│   ├── terms/                        # Legal terms of service
│   ├── privacy/                      # Privacy policy and data handling documentation
│   ├── userprofile/                  # Public user showcase profiles (/userprofile/[id])
│   ├── globals.css                   # Core design tokens, dark theme rules, and utilities
│   ├── layout.tsx                    # Root HTML layout, pre-paint theme init, global providers
│   ├── loading.tsx                   # Root Suspense streaming loading screen
│   └── page.tsx                      # Public landing and discipline showcase page
├── components/                       # Reusable UI component library
│   ├── admin/                        # Admin dashboards, verification tables, stat widgets
│   ├── ai/                           # Chat assistant modal dialogs
│   ├── appointments/                 # Booking creation, reschedule modals, status badges
│   ├── auth/                         # Address selectors, multi-step registration forms
│   ├── client/                       # Client dashboard views and talent grids
│   ├── coach/                        # Coach booking lists, rate cards, schedule editors
│   ├── community/                    # Social talent feed, comments, reactions
│   ├── contracts/                    # Digital signature pad and agreement templates
│   ├── navigation/                   # Desktop/mobile navigation bars, notifications
│   ├── shared/                       # LoadingScreen, AppLoadingSplash, AuthLayout, PublicLayout
│   ├── studio/                       # Leaflet map container and Overpass locator controls
│   ├── theme/                        # ThemeProvider, RouteThemeEnforcer, PlatformThemeSync
│   └── ui/                           # Primitives (Button, Modal, Card, FormField, Badges)
├── lib/                              # Shared libraries, utilities, and configurations
│   ├── admin/                        # Admin authorization claims and permissions
│   ├── config/                       # Skills, genres, and discipline mappings
│   ├── services/                     # Supabase database abstraction layer
│   ├── supabase/                     # Client, Server, and Middleware Supabase initializers
│   ├── geo.ts                        # Haversine distance and coordinate math
│   ├── profileFields.ts              # Profile validation regex and date helpers
│   ├── types.ts                      # Authoritative TypeScript definitions
│   └── utils.ts                      # Date formatting, peso currency formatters
├── public/                           # Static assets
│   ├── image/                        # Brand imagery, hero assets, discipline photos
│   │   └── wc/logo.png               # Official Groove brand logo
│   └── media/                        # Static demo video reels
├── supabase/                         # Database engineering assets
│   ├── schema.sql                    # Full PostgreSQL DDL (tables, indexes, RLS, functions)
│   └── seed.sql                      # Reference seed data for local testing
├── middleware.ts                     # Edge authentication and route classification guard
├── next.config.ts                    # Next.js runtime, image domains, and compiler settings
├── tsconfig.json                     # TypeScript compiler configuration and path aliases
├── eslint.config.mjs                 # Flat ESLint ruleset
└── package.json                      # Project dependencies and script declarations
```

---

## Installation & Local Setup

### Prerequisites

- **Node.js:** `v20.x` or higher (LTS recommended)
- **Package Manager:** `npm` v10+
- **Database:** Supabase Cloud Project or local Supabase CLI instance

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd GrooveSystem
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file by copying the template:
   ```bash
   cp .env.example .env.local
   ```
   Populate your keys as detailed in the [Environment Configuration](#environment-configuration) section.

4. **Initialize the Database:**
   - Navigate to the **SQL Editor** in your Supabase Dashboard.
   - Run the contents of `supabase/schema.sql` to generate all required tables, triggers, and RLS policies.
   - *(Optional)* Execute `supabase/seed.sql` to seed development test accounts and initial data.

5. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Configuration

The application requires specific environment variables for database connectivity and external service integration. **Never commit `.env.local` or disclose secret keys.**

```env
# ==============================================================================
# BROWSER ACCESSIBLE CONFIGURATION (Safe to prefix with NEXT_PUBLIC_)
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# SERVER-SIDE ONLY CONFIGURATION (NEVER EXPOSE TO CLIENT / BROWSER)
# ==============================================================================
# Service role key bypassing RLS for privileged admin API operations
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenRouter / DeepSeek AI integration for the coach assistant
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=deepseek/deepseek-chat
```

> **Security Warning:** `SUPABASE_SERVICE_ROLE_KEY` has administrative override permissions that bypass all Row Level Security policies. It must **only** be accessed in Node.js server environments (API Route Handlers) and must never appear in client bundles.

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Boots the Next.js development server with Turbopack on `http://localhost:3000`. |
| `npm run build` | Compiles TypeScript, analyzes dependencies, and creates the optimized production build. |
| `npm run start` | Serves the compiled production application. |
| `npm run lint` | Runs ESLint across the entire codebase to detect syntax and architectural issues. |

---

## Database & Storage Setup

### Supabase Storage Buckets

Configure the following storage buckets in your Supabase dashboard with appropriate visibility settings:

| Bucket Identifier | Visibility | Primary Purpose |
|---|---|---|
| `avatars` | Public | User profile photos and avatars |
| `community-media` | Public | Video reels and photo uploads for the talent feed |
| `verification-documents` | Private (Admin Only) | Government IDs and coach credentials for verification |
| `messages-media` | Private (Participants) | Chat attachments (images, recordings, documents) |
| `signatures` | Private (Participants) | Vector signature images for digital contracts |
| `contracts` | Private (Participants) | Generated legal contract documents |
| `tickets-attachments` | Private (Admin/Submitter)| Support ticket diagnostic attachments |

---

## Security & Compliance

Groove implements defense-in-depth security principles across each architectural tier:

1. **Row Level Security (RLS):** Every PostgreSQL table enforces strict RLS policies ensuring that clients and coaches can only read and write their own records.
2. **Authoritative Session Verification:** Authentication cookies are parsed and validated via `@supabase/ssr` within `middleware.ts`. User role claims are verified directly against the `profiles` table rather than client-submitted metadata.
3. **Admin Identity Hardening:** Access to `/admin/*` requires both an explicit `admin` role and verification against a pinned administrative identity in `lib/admin/access.ts`.
4. **Input Sanitization & Validation:** All user inputs are validated against strict regex patterns (email, phone, usernames) and Philippine location boundaries before submission.
5. **No Credentials Leaks:** API keys and service role tokens remain restricted to server execution contexts.

---

## Testing & Quality Assurance

Quality assurance is maintained through continuous static analysis and compilation checks:

- **ESLint Code Quality:**
  ```bash
  npm run lint
  ```
- **TypeScript Static Verification:**
  ```bash
  npx tsc --noEmit
  ```
- **Production Build Testing:**
  ```bash
  npm run build
  ```

---

## Build & Deployment

### Vercel Deployment (Recommended)

Groove is optimized for native deployment on the **Vercel** platform:

1. Push your repository to your Git provider (GitHub, GitLab, or Bitbucket).
2. Import the repository into your Vercel Dashboard.
3. Under **Project Settings > Environment Variables**, supply all variables defined in `.env.example`.
4. Ensure `NEXT_PUBLIC_APP_URL` points to your custom production domain (e.g., `https://groove.ph`).
5. Trigger the production deployment. Vercel automatically builds and deploys serverless and edge functions across its global edge network.

---

## Contribution Guidelines

We welcome contributions to the Groove platform. To maintain codebase integrity:

1. **Fork & Branch:** Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Follow Coding Standards:**
   - Adhere to Server-First Next.js patterns.
   - Use semantic design tokens from `app/globals.css` rather than hardcoding hex colors.
   - Maintain dark-mode enforcement for public landing and authentication routes.
3. **Verify Changes:**
   Run lint and type checks before submitting a Pull Request:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```
4. **Submit PR:** Provide a clear description of changes, motivation, and test steps in your Pull Request.

---

## License & Support

- **License:** Proprietary. All rights reserved. Unauthorized copying, distribution, or modification of this source code is strictly prohibited.
- **Organization:** Groove Performing Arts Platform
- **Location:** San Jose del Monte, Bulacan, Philippines
- **Inquiries & Support:** [Groove1152000@gmail.com](mailto:Groove1152000@gmail.com)
