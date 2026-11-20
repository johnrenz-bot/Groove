# GroovePH — API Endpoints (`app/api/`)

> Complete inventory of the 30 route handlers on 2026-11-19. Every handler sets `export const dynamic = 'force-dynamic'` (none are cached). Auth column: `getUser` = signed-in session required (401) · `requireAdmin` = session + pinned-admin (403) · `ingest` = `INGEST_API_KEY` bearer · `cron` = `CRON_SECRET` (fail-closed in prod) · `none` = public by design (may still be rate-limited).

## 1. Public / member-read endpoints

| Route | Methods | Auth | What it does | Tables / external |
|---|---|---|---|---|
| `/api/health` | GET | none | Env + DB connectivity (200 ok / 503 degraded) | `profiles` |
| `/api/groovey/health` | GET | none | Truthful Gemini health probe (may call paid API with `?fresh=true`) | Gemini |
| `/api/users` | GET | none (session optional) | Member directory: search/filter/sort/paginate (PostgREST), public-columns only, username masking, in-memory follower-tally LRU (≤1000 rows) | `profiles`, `profile_follows` |
| `/api/studios` | GET | none | Studio locator backend: `nearby\|nationwide\|geocode` scopes; merges admin-managed `studios` (anon, ≤5000 rows) + curated fallback + Google Places (New) Nearby/Text/Autocomplete; PH bounds validation; dedupe; quota-honest `googleStatus` reporting; 30 s cap | `studios`, Google Places |
| `/api/music/oembed` | GET | none | YouTube oEmbed proxy; host allowlist + video-id shape check + per-IP 20/10min limit; 5 s timeout | YouTube oEmbed |
| `/api/{dance,singing,acting,theater}/updates` | GET | none | Published discipline updates feed (region/category/org/q/page/limit), 60 s SWR | `*_updates` |
| `/api/{dance,singing,acting,theater}/events/upcoming` | GET | none | Upcoming discipline events, 120 s cache | `*_updates` |
| `/api/send-email` | POST | none (rate-limit + same-origin) | Welcome email via Resend; 3/min + 20/day per-IP; Origin-vs-Host check; HTML-escaped name; error classification (`restricted_sender`, `domain_not_verified`…) | Resend |
| `/api/tickets` | POST | none (5/min per-IP + MIME/size guard) | Anonymous support tickets; multipart attachments (allowlist pdf/png/jpg/webp ≤5MB, extension from MIME); insert via caller session, service-role fallback on RLS `42501` | `tickets`; bucket `verification-documents` (`tickets/…`) |

## 2. Member (signed-in) endpoints

| Route | Methods | Auth | What it does | Tables / external |
|---|---|---|---|---|
| `/api/groovey/chat` | POST | getUser + 30/5min | Non-streamed AI coach (Gemini w/ retries + GroovePH knowledge); 401/429/503/413 | Gemini |
| `/api/groovey/chat/stream` | POST | getUser + 30/5min | SSE streaming; per-model quota cooldown, transient retry w/ backoff; Groq→OpenRouter fallback on total Gemini failure; emits terminal error frame, never duplicated output | Gemini → Groq → OpenRouter |
| `/api/groovey/chat/title` | POST | getUser + 10/min | 3–5 word session title; static fallback when unconfigured | Gemini |
| `/api/ai/coach-assistant` | POST | getUser | "Ask this coach"; resolves coachId (UUID or `custom_id`); grounded facts prompt; Gemini→Groq→OpenRouter fallback; no invented data | `profiles`, `coach_profiles`, `feedbacks` |

## 3. Ingest endpoints (agents / pipeline)

| Route | Methods | Auth | What it does |
|---|---|---|---|
| `/api/{dance,singing,acting,theater}/ingest` | POST | ingest | Zod-validate batch payloads, dedupe (by URL/hash + `globalImageDedup`), write `*_updates`, log `agent_runs`. **Phase 5:** shared guard `lib/ingest/auth.ts` — constant-time digest compare + 2 MB body cap (413), fail-closed when unset |

## 4. Admin endpoints

| Route | Methods | Auth | What it does |
|---|---|---|---|
| `/api/admin/users` | GET, POST, PATCH, DELETE | requireAdmin (all) | Full account lifecycle: list (≤500), create (Auth admin, `email_confirm:true`), patch (allowlist; pinned-admin & last-admin guards; sub-profile upsert), delete (never self; guards) |
| `/api/admin/audit` | POST | requireAdmin | Write `admin_activity_log` row (admin identity from session, not body); failure ⇒ 200 `{logged:false}` by design |

## 5. Cron endpoints (Vercel cron, `vercel.json`)

| Route | Schedule (UTC) | What it does |
|---|---|---|
| `/api/cron/dance-agent` | `0 0 * * *` | `runDanceBeatAgent()` — Anthropic Claude discovery of dance news; refuses synthetic data w/o key in prod; `maxDuration=60` |
| `/api/cron/singing-agent` | `0 2 * * *` | same for singing |
| `/api/cron/acting-agent` | `0 4 * * *` | same for acting |
| `/api/cron/theater-agent` | `0 6 * * *` | same for theater |
| `/api/cron/dance-logos` | `0 3 * * 1` | Weekly org-logo crawl → `dance_orgs.logo_url` (300 s) |

All `cron` routes authorize via `lib/cron/auth.ts` — secret present ⇒ constant-time bearer compare (or `?key=`); **production without `CRON_SECRET` ⇒ 503** (fail-closed); local dev without it runs with a loud warning. `x-vercel-cron` is **not** trusted (caller-controlled).

## 6. HTTP verb & status conventions

- JSON errors `{ error: string }`; admin routes may add `{ detail }` for diagnostics (never PII).
- Phase 4 added the canonical contract in `lib/errors/` (`AppError` + `errorResponse()` + `errorCodes`). Discipline content routes (`*/updates`, `*/events/upcoming`, `*/ingest`) emit it; `lib/api/errors.ts` is a back-compat shim over the same module. Other handlers were audited and deliberately kept on their existing shapes (health probe, `groovey/chat/*`, `send-email`, studios/users compat responses, cron) — migration is incremental, not a rewrite.
- Common statuses: 200 ok · 201 created · 400 bad input · 401 unsigned/invalid key · 403 forbidden · 404 hidden · 409 conflict · 413 too large · 415 wrong content-type · 429 rate-limited (`Retry-After`) · 500/502/503 server/dependency errors.
- Rate limits are **per-process in-memory** (`lib/rateLimit.ts`) — they limit blast radius, not abuse across instances.

## 7. What is intentionally *not* an API

Member reads/writes go **directly from the browser to Supabase under RLS** (profiles, appointments, messages, posts…) — there is no REST layer for them by design. Do not add one without a need (caching, external callers, audit). If you do add one, reuse `lib/errors/` (canonical contract) and `lib/postgrest.ts` escaping helpers. Phase 4 centralized the shared browser-write paths in `features/notifications/services/notificationService.ts` and `features/theme/services/platformThemeService.ts`.

## 8. API ≠ proxy: the `/api` matcher exclusion

`proxy.ts` excludes `api` from its matcher (page-oriented cookie refresh). API handlers perform their own auth; middleware-level session refresh is deliberately absent there (avoids a wasted round trip + spurious prefetch work).
