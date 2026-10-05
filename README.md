# Groove

**Groove** is a private, full-stack performing arts platform built for the Philippine market. It connects clients with verified performing arts coaches across disciplines including Dance, Singing, Acting, and Theater — enabling discovery, appointment booking, digital contracts, real-time messaging, and community content sharing.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

---

## Product Overview

Groove serves three distinct roles within a unified authentication system:

| Role | Description |
|---|---|
| **Client** | Discovers coaches, books face-to-face sessions, signs digital agreements, and participates in the community feed |
| **Coach** | Manages availability, confirms or declines appointments, configures rates, and publishes portfolio content |
| **Admin** | Approves/suspends users, manages announcements and maintenance notices, triages support tickets, and monitors platform analytics |

---

## Key Features

- **Multi-role authentication** — unified login routing Clients, Coaches, and Admins via Supabase Auth with role metadata and email verification
- **Coach discovery & filtering** — search by talent type, genre, city/barangay, and maximum service fee
- **Appointment booking** — full status lifecycle (`pending → confirmed / declined → cancelled / completed`) with rating and feedback on completion
- **Digital agreements & e-signatures** — canvas-based signature capture with PDF generation stored to Supabase Storage
- **Real-time messaging** — direct client ↔ coach chat with media attachments (image, video, audio, document) and location sharing via Supabase Realtime
- **Community talent feed** — video/photo posts categorized by talent domain with likes and comment threads
- **AI Coach Assistant** — DeepSeek/OpenRouter-powered chatbot integrated as a coach profile overlay
- **User profiles & portfolios** — public-facing profile pages with media post grids for both clients and coaches
- **Notifications system** — real-time in-app notification bell with unread badge via Supabase Realtime inserts
- **Announcement & maintenance broadcasts** — admin-controlled banners visible across all layouts
- **Admin control panel** — user verification workflows, support ticket triage, system settings, and analytics dashboard
- **Public support ticket submission** — guest and authenticated ticket filing with attachments
- **Theme switching** — Light and Dark mode with CSS custom-property-based design tokens
- **Philippine address selection** — region → province → city → barangay address picker in registration flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.3 (App Router, TypeScript) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 + PostCSS |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Realtime | Supabase Realtime Channels |
| Storage | Supabase Storage Buckets |
| AI / LLM | OpenRouter API — DeepSeek model |
| Icons | Lucide React |
| Signatures | react-signature-canvas |
| Fonts | Inter (Google Fonts), PlanetKosmos, Progress (local) |
| Deployment | Vercel (recommended) |

---

## Project Structure

```text
Groove/
├── app/                        # Next.js App Router
│   ├── (client)/               # Protected client routes
│   │   └── client/
│   │       ├── home/           # Client dashboard
│   │       ├── profile/        # Client profile & portfolio
│   │       ├── appointments/   # Appointment list & booking
│   │       ├── calendar/       # Booking calendar view
│   │       ├── talent/         # Coach discovery + community feed
│   │       └── about/
│   ├── (coach)/                # Protected coach routes
│   │   └── coach/
│   │       ├── home/           # Coach dashboard
│   │       ├── profile/        # Coach profile & rate config
│   │       ├── appointments/   # Incoming appointment management
│   │       ├── calendar/       # Session calendar
│   │       ├── talents/        # Coach discovery view
│   │       └── about/
│   ├── admin/                  # Admin protected portal
│   ├── api/                    # API Route Handlers
│   │   ├── ai/                 # OpenRouter AI assistant endpoint
│   │   └── tickets/            # Public ticket submission handler
│   ├── auth/                   # Auth callback route (Supabase)
│   ├── contracts/              # Digital agreement viewer & signing
│   ├── login/                  # Unified login page
│   ├── register/               # Client & coach registration
│   ├── forgot-password/
│   ├── reset-password/
│   ├── messages/               # Real-time messenger
│   ├── terms/                  # Terms & conditions
│   ├── userprofile/            # Public user profile viewer
│   ├── globals.css             # Tailwind v4 theme tokens & global styles
│   ├── layout.tsx              # Root layout (Inter font, ThemeProvider)
│   └── page.tsx                # Public landing page
├── components/
│   ├── admin/                  # Admin panel components
│   ├── ai/                     # AI assistant modal
│   ├── appointments/           # Booking modals, status badges
│   ├── auth/                   # Registration, address selector
│   ├── client/                 # Client-specific UI
│   ├── coach/                  # Coach-specific UI
│   ├── community/              # Feed, post cards, comments
│   ├── contracts/              # Signature pad, agreement form
│   ├── navigation/             # AppHeader, AdminSidebar, NotificationDropdown
│   ├── shared/                 # Shared modals & UI (BookingModal, etc.)
│   └── theme/                  # ThemeProvider, ThemeSwitcher
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Component Supabase client
│   │   └── middleware.ts       # Auth session refresh middleware helper
│   ├── services/               # Domain service helpers
│   │   ├── appointmentService.ts
│   │   ├── communityService.ts
│   │   ├── profileService.ts
│   │   └── ticketService.ts
│   ├── config/
│   │   └── skillsConfig.ts     # Performing arts skills/talent configuration
│   ├── openrouter.ts           # OpenRouter / DeepSeek AI client
│   ├── ph-locations.ts         # Philippine geographic data
│   ├── types.ts                # TypeScript interfaces for all domain models
│   └── utils.ts                # Utility helpers (formatting, dates, currency)
├── public/
│   ├── fonts/                  # Local font files
│   ├── image/                  # Brand images and icons
│   └── media/                  # Static media assets
├── supabase/
│   ├── schema.sql              # Full PostgreSQL DDL (tables, RLS, triggers)
│   └── seed.sql                # Reference seed data
├── middleware.ts               # Next.js auth middleware (route protection by role)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── postcss.config.mjs          # PostCSS / Tailwind CSS v4 configuration
├── .env.example                # Environment variable template
└── README.md
```

---

## Authentication

Authentication is handled entirely by **Supabase Auth** with role-based routing enforced in `middleware.ts`.

### How it works

1. **Registration** — Users register as Client or Coach. A PostgreSQL trigger on `auth.users` automatically inserts a corresponding row into `public.profiles` with the assigned role.
2. **Login** — Supabase returns a JWT containing the user's role in metadata. The Next.js middleware reads this via `@supabase/ssr` cookie-based session.
3. **Route protection** — `middleware.ts` enforces:
   - `/admin/*` → `role === 'admin'`
   - `/(client)/*` → `role === 'client'`
   - `/(coach)/*` → `role === 'coach'`
   - Unauthenticated users are redirected to `/login`
4. **Row-Level Security (RLS)** — Every Supabase table has RLS policies ensuring users can only access their own data. Admins have elevated policies for oversight operations.
5. **Email verification** — Handled natively by Supabase Auth with redirect to `/auth/callback`.

---

## Database

The database runs on **Supabase PostgreSQL**. The full schema is located at [`supabase/schema.sql`](./supabase/schema.sql).

### Core Tables

| Table | Description |
|---|---|
| `profiles` | Unified user table linked to `auth.users` (Client, Coach, Admin) |
| `coach_profiles` | Coach-specific configuration (talents, fees, payment, schedule) |
| `client_profiles` | Client-specific data |
| `appointments` | Booking records with full status lifecycle |
| `agreements` | Digital session contracts with signature paths |
| `messages` | Real-time direct messages between users |
| `community_posts` | Talent community feed posts (video/photo) |
| `comments` | Comment threads on community posts |
| `post_reacts` | Like reactions on community posts (one per user per post) |
| `user_profile_posts` | Portfolio showcase posts on user profiles |
| `feedbacks` | Star ratings and testimonials for coaches |
| `notifications` | In-app notification records with real-time delivery |
| `announcements` | Admin-broadcast platform announcements |
| `maintenance_notices` | Scheduled downtime / maintenance alerts |
| `tickets` | Public support ticket submissions |
| `system_settings` | Key-value store for platform-wide settings |

### Supabase Storage Buckets

| Bucket | Access |
|---|---|
| `avatars` | Public |
| `verification-documents` | Private (admin only) |
| `community-media` | Public |
| `messages-media` | Authenticated participants |
| `signatures` | Authenticated participants |
| `contracts` | Authenticated participants |
| `tickets-attachments` | Authenticated / admin |

---

## Environment Variables

Copy `.env.example` to `.env.local` and populate all values before running the application.

```bash
cp .env.example .env.local
```

```env
# Supabase Public Configuration (Safe for browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase Service Role Key — SERVER-SIDE ONLY. Never expose to the client.
SUPABASE_SERVICE_ROLE_KEY=

# OpenRouter / DeepSeek AI Assistant (server-side API routes only)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-chat

# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security**: `SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY` are server-side only. They must never be prefixed with `NEXT_PUBLIC_` and must never be committed to version control.

---

## Local Development

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **Supabase** project with the schema from `supabase/schema.sql` applied

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd Groove

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in your Supabase project URL, anon key, and other values

# 4. Apply the database schema to your Supabase project
# Run supabase/schema.sql in the Supabase SQL Editor, then supabase/seed.sql if needed

# 5. Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server with Turbopack |
| `npm run build` | Compile and bundle for production |
| `npm run start` | Start the production server (requires `build` first) |
| `npm run lint` | Run ESLint across the codebase |

---

## Production Build

```bash
npm run build
npm run start
```

The build output is placed in `.next/`. For Vercel deployments, this is handled automatically by the platform.

---

## Deployment

Groove is designed for deployment on **Vercel**. The default Next.js App Router configuration is fully compatible with Vercel's Edge Network.

**Recommended setup:**

1. Connect the repository to a Vercel project.
2. Set all environment variables from `.env.example` in the Vercel project settings (Environment Variables tab).
3. Set the `NEXT_PUBLIC_APP_URL` to your production domain.
4. Deploy — Vercel handles the build and edge distribution automatically.

---

## Security Notes

- **Row-Level Security (RLS)** is enforced at the database level on all tables. Application-layer authorization is a secondary check.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and must only be used in trusted server-side contexts (API Route Handlers, never client components).
- **Environment variables** containing secrets must never be prefixed `NEXT_PUBLIC_` or accessed on the client.
- **File uploads** are validated on the server before being stored to Supabase Storage. Accepted MIME types are enforced per bucket.
- The `middleware.ts` session refresh ensures tokens are rotated on every request, minimizing the risk of stale session exploitation.

---

## Development Guidelines

- **Server Components by default** — use `"use client"` only when browser APIs or interactivity are required.
- **Database access** — use `lib/supabase/server.ts` in Server Components and Route Handlers; use `lib/supabase/client.ts` only in Client Components.
- **Type safety** — all domain models are typed in `lib/types.ts`. Extend this file for new database tables.
- **Service layer** — complex database queries belong in `lib/services/`. Pages should not contain raw Supabase query logic.
- **Path aliases** — use the `@/` alias (mapped to the project root) for all internal imports.
- **Styling** — use Tailwind CSS utility classes. Design tokens (colors, spacing, typography) are defined as CSS custom properties in `app/globals.css` under `@theme`.
- **Components** — organize by domain (e.g., `components/appointments/`, `components/community/`). Shared primitives go in `components/shared/`.

---

## Roadmap

- [ ] Push notifications (browser + mobile) via Supabase Edge Functions
- [ ] In-app PDF preview of generated agreement documents
- [ ] Coach availability calendar with blocked-date management
- [ ] SMS notification integration for appointment reminders
- [ ] Admin analytics export (CSV / PDF reports)
- [ ] Progressive Web App (PWA) manifest and offline support
- [ ] Coach video introduction / demo reel on profile
- [ ] Stripe or GCash payment integration for online session fees

---

## License

Private. All rights reserved. This software is proprietary and not licensed for distribution or use outside of authorized personnel.
