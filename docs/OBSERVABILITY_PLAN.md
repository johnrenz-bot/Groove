# GroovePH — Observability & Monitoring Plan

> 2026-11-19 · Phase 6 Task 8. **No monitoring tool is installed** — installing one costs real money and accounts. This plan explains costs, setup, and privacy implications so the owner can choose deliberately.

## 1. What exists today

| Signal | Where | Gaps |
|---|---|---|
| Application errors (server) | `console.error` → visible in Vercel logs | Not aggregated, not alerted, not retained long |
| API errors | route-local `console.error` + generic client messages | No counts/rates; silence = success bias |
| Database errors | Postgres logs in Supabase dashboard | No alerting on spikes (RLS-denial storms, connection exhaustion) |
| Auth failures | Supabase Auth logs | Not exported; no metric for brute-force bursts |
| Cron execution | `agent_runs` table (if applied in production) | No alert on cron failures or stalled schedules |
| Email delivery | Resend dashboard (delivery/bounce/complaint) | Not wired to app errors; no per-user failure surfaced beyond generic copy |
| Performance | Vercel Analytics (if enabled), Speed Insights (paid) | No budgets; no per-route latency SLO |
| Uptime | none | No `/api/health` probe from outside |
| Client JS errors | none | No window.onerror capture; silent failures in browsers |

## 2. Recommended minimal stack (owner decision)

### Tier 0 — free, do first (no new vendor)
- [ ] **UptimeRobot or Better Uptime (free tier)**: HTTPS probe of `https://<domain>/api/health` every 5 min; alert to owner's email/Slack. Cost: $0. Setup: 10 minutes. Privacy: only the health payload (`status`, `checks`, `timestamp`) — no user data.
- [ ] **Vercel logs**: enable log drain or keep Vercel's built-in retention; set up a saved query for `error`/`500`/`ingest` to review after each release.
- [ ] **Supabase log alerts**: Dashboard → Logs → set a saved query for `error` severity; no alert delivery on free tier — manual check weekly.
- [ ] **Resend**: enable webhooks or at least weekly dashboard review of bounces/complaints; disable sending on bounce-rate threshold (Resend does automatically).

### Tier 1 — paid, when the app has real users
- [ ] **Sentry (Team plan, ~$26/mo per member)**: `@sentry/nextjs` on server + client.
  - Server: wrap route handlers / server actions; capture exceptions with **PII scrubbing enabled by default** (send default PII: false).
  - Client: `browserTracing` off or low sample rate; no session replay (privacy: recordings of member screens incl. signed agreements are NOT acceptable without consent banner work).
  - Privacy review before enabling: confirm no `profiles` payloads (email/phone/street) reach breadcrumbs; scrub `authorization`, `cookie`, `x-api-key` headers (Sentry does by default — verify custom headers too).
  - Alert rules: new error in production; error rate > baseline; `send-email` 5xx; checkout-equivalent flow failures (booking insert errors).
- [ ] **Log drain to Better Stack / Datadog** (~$10–30/mo): centralize Vercel + Supabase logs; retain 30 days; alerts on patterns (e.g. `permission denied` storms → possible credential probing).

### Tier 2 — later
- [ ] OpenTelemetry tracing (Next.js instrumentation hook) → Grafana Cloud free tier (50 GB logs/mo) for dashboards: route latency p50/p95, DB call duration, error budgets.
- [ ] Synthetic checks on staging: hourly Playwright probe of the public landing + `/api/health` (staging serves this role until prod is proven).

## 3. What to monitor first (ranked by blast radius)

| # | Signal | Alert threshold | Why |
|---|---|---|---|
| 1 | `/api/health` returns non-200 for 2 consecutive checks | page owner | the only end-to-end signal |
| 2 | Any 5xx burst (>10/min) | investigate within 15 min | release or DB issue |
| 3 | Auth: `invalid login` / `email not confirmed` spike | daily report | credential stuffing |
| 4 | `send-email` failures | every failure logs; alert on 3 in a row | silent mail failure = broken onboarding |
| 5 | Cron `agent_runs.status='failed'` | daily digest | content pipeline silently dead |
| 6 | `guard_booking_transition` exceptions | weekly | users blocked from booking = revenue/trust |
| 7 | Storage 4xx on signed URLs | investigate | contract-signatures / verification docs broken |
| 8 | Gemini quota exhaustion | digest | Groovey silently degrades for all users |

## 4. Privacy implications (explicit)

- Any APM that captures full request bodies will ingest **PII**: messages, addresses, agreement content, verification metadata. Do not enable full-body capture.
- Sentry `sendDefaultPii: false` + explicit header scrubbing is mandatory before week one.
- Log drains must exclude `authorization`, `cookie`, `x-api-key`, `CRON_SECRET`-bearing URLs (`?key=` — L-3 already flags `?key=` as unsuitable for logs).
- Retain logs ≤ 30 days; document the retention window in the privacy policy (`/privacy` page) when monitoring goes live.
- This is a PH-facing consumer app: RA 10173 (Data Privacy Act) — monitoring is legitimate interest, but the privacy notice must say what is collected.

## 5. Rollout sequence

1. Week 0 (this doc): UptimeRobot on `/api/health` + Resend weekly review + Sentry decision meeting with owner.
2. Week 1: Sentry server-side with PII scrubbing → watch for a week.
3. Week 2: client-side Sentry at 5% sample → verify no PII in breadcrumbs (manual review of first 20 events).
4. Week 3+: log drain + dashboards; write the monthly review runbook (15 min, first of month).
