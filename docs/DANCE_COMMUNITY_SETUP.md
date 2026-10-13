# Dance Community & DanceBeat Agent Setup Guide

This document describes the implementation, environment configuration, database structure, and automated pipeline for the **Dance Community** feature at `/community/performing-arts/dance`.

---

## 1. Visual Design & Reference Architecture

- **Live URL:** `/community/performing-arts/dance`
- **Design Inspiration:** Styled after [IDL Pro Teams: Brotherhood](https://www.idl.pro/teams/brotherhood)
- **Palette & Visual Tokens:**
  - Dark Navy / Obsidian background (`#050B10`, `#0A141C`, `#0E1C26`)
  - Red angular accents (`#C8102E`)
  - Neon-lime highlights (`#C6F10E`)
  - Bold condensed uppercase typography for sports broadcast aesthetic
  - IDL Team Roster cards (Brotherhood, UPeepz, Philippine Allstars, A-Team)
  - "MATCH RECAPS" & "BATTLE BREAKDOWN" sports scorecards presentation

---

## 2. API Endpoints

All route handlers are implemented under `app/api/`:

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dance/updates` | Public | Returns published updates (`status = 'published'`) with query filtering (`region`, `category`, `org`, `q`, `page`, `limit`). |
| `GET` | `/api/dance/events/upcoming` | Public | Returns upcoming competitions and battles sorted chronologically. |
| `POST` | `/api/dance/ingest` | Protected (`INGEST_API_KEY`) | Ingests a validated batch of updates into `dance_updates`. |
| `GET` | `/api/cron/dance-agent` | Protected (`CRON_SECRET`) | Triggers the automated DanceBeat Agent to discover and verify updates. |

---

## 3. Environment Variables

Add the following keys to `.env.local` (server-side only, never exposed to the client):

```env
# Anthropic Claude API key for automated web discovery and summarization
ANTHROPIC_API_KEY=sk-ant-api03-...

# Shared secret protecting POST /api/dance/ingest
INGEST_API_KEY=your-secure-ingest-api-key

# Secret token authorizing GET /api/cron/dance-agent (used by Vercel Cron or external scheduler)
CRON_SECRET=your-secure-cron-secret

# Supabase Service Role Key (for privileged server operations)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

---

## 4. Running the DanceBeat Agent

### Manual Run via CLI
Execute the agent directly using Node:
```bash
npm run agent:dance
```

### Seeding Verified Starter Data
Seed verified initial competitions, workshops, and news dispatches:
```bash
npm run seed:dance
```

### 6-Hour Automated Cron
The project includes `vercel.json` configuring Vercel Cron to invoke `/api/cron/dance-agent` every 6 hours:
```json
{
  "crons": [
    {
      "path": "/api/cron/dance-agent",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

External cron services (e.g. GitHub Actions, Cron-Job.org) can trigger the agent by passing the `CRON_SECRET`:
```bash
curl -X GET "https://your-domain.com/api/cron/dance-agent" \
  -H "Authorization: Bearer your-secure-cron-secret"
```

---

## 5. Moderation & Trust Model

1. **Strict Zod Validation:** All agent outputs are validated against `danceUpdateSchema`. Invalid dates, malformed URLs, or oversized strings are rejected before touching the database.
2. **Verification State:**
   - Items verified with confidence are stored with `status: 'published'`.
   - Items with uncertainty are marked with `status: 'pending_review'`.
3. **Deduplication:** Updates are deduplicated by `source_url`.
4. **Public Isolation:** Public read endpoints (`/api/dance/updates` and `/api/dance/events/upcoming`) exclusively return records where `status = 'published'`.
