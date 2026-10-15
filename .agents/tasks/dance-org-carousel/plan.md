# Implementation Plan — Official Dance Organization Logo Carousel

Route: `/community/performing-arts/dance`. Place a logo-only infinite marquee **directly below the hero** (`DanceCommunityHero`) and **above the latest-updates feed**, preserving the existing GroovePH theme/navbar/layout and the existing `OrgLogoBar` click-to-filter behavior.

## Codebase findings (verified by reading the code — read again before implementing)

- **Dance route** is `app/community/performing-arts/dance/page.tsx`: a thin server wrapper that renders `<DanceCommunityView />` from `features/dance/components/DanceCommunityView.tsx`. It exports static `metadata` (keep it).
- **`DanceCommunityView`** is a `'use client'` component. Its JSX order is: `Breadcrumb` → `DanceCommunityHero` (hero) → `OrgLogoBar` (text-pill, click-to-filter, syncs `selectedOrg` to URL) → `UpcomingEventsSection` → Latest Updates feed → `FeaturedCrewsRoster`. The carousel must render **between `DanceCommunityHero` and `OrgLogoBar`** (i.e. directly below the hero, still above the latest-updates feed).
- **`OrgLogoBar`** (`features/dance/components/OrgLogoBar.tsx`) is the existing click-to-filter control. It uses `ORGANIZATIONS` from `@/lib/dance/constants` and `cn` from `@/components/shared/cn`, styled with Groove tokens (`border-border`, `bg-muted/30`, `text-muted-foreground`). **Do not change it** — the carousel is a separate component; the carousel links to official sites, `OrgLogoBar` keeps owning filter state.
- **Server/client boundary**: `DanceCommunityView` is `'use client'`, so it cannot import a server fetch directly. Correct pattern: the **server page fetches** `getDanceOrgs()` and **passes the orgs as a prop** to `<DanceCommunityView initialOrgs={orgs} />`; `DanceCommunityView` renders the client carousel between the hero and `OrgLogoBar`. No "loader rendered outside the view" — that would place the carousel above the breadcrumb/hero (a bug in an earlier draft; do not repeat it).
- **Supabase clients** (`lib/supabase/server.ts`): `createClient()` uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon, RLS applies) — use this for the page read. `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` — for privileged writes. For the Node sync script, build a client directly from `@supabase/supabase-js` with the service-role key (scripts cannot resolve `@/` aliases; see `lib/dance/constants.ts` header comment).
- **Migrations** live in `supabase/migrations/`, numbered `00_`…`18_`. Latest is `18_dance_updates_images.sql`. Next is `19_dance_orgs.sql`. RLS pattern (see `17_dance_crews.sql`): `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` then `CREATE POLICY "Public read …" ON … FOR SELECT USING (true);` wrapped in a `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies …) THEN … END IF; END $$;` guard for idempotency. With RLS enabled and only a SELECT policy, INSERT/UPDATE/DELETE are denied to anon/authenticated; the **service role bypasses RLS**, so service-role-only writes need no explicit write policy (matches `crews`).
- **Script runner**: the project runs `.ts` scripts via `node --experimental-strip-types --no-warnings` (see `agent:dance`, `seed:dance`, `scripts/seed-dance-updates.ts`). Scripts use **relative imports with `.ts` extension** and ESM `import`/`export` syntax (the env supports it). The task explicitly requires `scripts/sync-dance-logos.ts` — use `.ts` + `node --experimental-strip-types --no-warnings`, NOT `.mjs`.
- **Next.js 16 image changes** (per `node_modules/next/dist/docs`): `priority` on `<Image>` is deprecated — use `preload={false}` for lazy logos; `onLoadingComplete` is deprecated — use `onLoad`.
- **Tailwind v4**: no `tailwind.config.ts`; tokens are CSS custom properties in `app/globals.css` `@theme`. Use token class names only (`bg-card`, `border-border`, `text-muted-foreground`, `g-eyebrow`, …) — never hardcoded hex in components. The dance page is **dark-only by design** (IDL navy/lime/red palette, see `lib/dance/constants.ts` `IDL`), but the carousel sits in the normal themed surface (`bg-card`/`border-border`) like `OrgLogoBar`, so token classes are correct.
- **Existing utilities**: `.g-eyebrow` (section eyebrow) and `no-scrollbar` exist in `globals.css`. `cn` at `@/components/shared/cn`.
- **`dance_orgs` table**: does not exist anywhere — safe to create (confirmed by search).
- **`public/logos/`**: does not exist — the sync script creates it.
- **`vercel.json`** already has one cron: `{ "path": "/api/cron/dance-agent", "schedule": "0 */6 * * *" }`. **Merge** the weekly logos job into the `crons` array — keep `dance-agent`; do not overwrite.
- **Cron route pattern** (`app/api/cron/dance-agent/route.ts`): `export const dynamic = 'force-dynamic'; export const maxDuration = 60;`, GET handler verifies `CRON_SECRET` (Authorization Bearer, `?key=`, or `vercel-cron` user-agent) then runs the work and returns JSON.
- **`next.config.ts`** `images.remotePatterns` already lists `www.steezy.com`, `www.worldofdance.com`, `www.hiphopinternational.com`, `www.thedancelebague.com`, `www.justedebout.com`, `www.udodanceworld.com`, `www.redbull.com`, `*.supabase.co`, etc. Because verified logos are **stored locally in `/public/logos/`** and `logo_url` is a local path, the carousel uses `next/image` on **local** images — **no `next.config.ts` change is required** (do not edit it). Unverified orgs render a text-pill fallback, never an external image.
- **`ORGANIZATIONS`** (`lib/dance/constants.ts`) lists idl/steezy/world-of-dance/hhi/red-bull-dance-your-style/juste-debout/udo/philippines with `site` + `domains`. Note: `idl` site is `https://www.thedancelebague.com` (literal in the file) and `udo` fullName is "Universal Dance Organization" there — the task names UDO "United Dance Organisation". Use the task's display name in `dance_orgs.name` and defer the official-domain truth to server-side sync validation.

## Strict rules (encode in every step; do not violate)

- Never mark a logo `logo_verified = true` without confirming an HTTPS request returned HTTP 200 with an `image/*` Content-Type AND that the URL is on the org's own official domain (provenance), AND that the bytes are a real image (not a placeholder/tracking pixel). Inspect the actual response, not the filename/URL.
- Never assume a logo from its filename or URL. Never use fabricated or unverified logos.
- On failure, set `logo_url = null`, `logo_verified = false` and render a clean **text-pill** fallback using the org's name. Record the reason in `LOGO_SOURCES.md` and the final report.
- Preserve existing verified assets when a replacement candidate fails (do not overwrite a good `logo_url`/`logo_verified` with a failure).
- Never expose the service-role key. Read it from `process.env.SUPABASE_SERVICE_ROLE_KEY` only inside server code/the script; never log it; never ship it to the client.
- Do not delete or restructure unrelated files. Do not modify `OrgLogoBar`, `UpdatesFilterBar`, the filter state, the DanceBeat Agent, existing APIs, or `next.config.ts`.

---

## Implementation Plan

- [ ] 1. **Create migration `supabase/migrations/19_dance_orgs.sql`**
      Create the `dance_orgs` table with the required columns, public-SELECT RLS, and indexes. Follow the `DO $$ … IF NOT EXISTS … END $$` policy-guard pattern from `17_dance_crews.sql`.

      Columns (exact): `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `slug TEXT NOT NULL UNIQUE`, `website_url TEXT NOT NULL`, `logo_url TEXT`, `logo_source_url TEXT`, `logo_verified BOOLEAN NOT NULL DEFAULT false`, `sort_order INTEGER NOT NULL DEFAULT 0`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

      RLS: `ALTER TABLE dance_orgs ENABLE ROW LEVEL SECURITY;` and a public SELECT policy named `"Public read dance_orgs"` wrapped in the idempotency guard. No INSERT/UPDATE/DELETE policy (service-role writes bypass RLS — add a clarifying comment). Add `CREATE INDEX IF NOT EXISTS dance_orgs_slug_idx ON dance_orgs (slug);` and `CREATE INDEX IF NOT EXISTS dance_orgs_sort_order_idx ON dance_orgs (sort_order);`.

      Files: `supabase/migrations/19_dance_orgs.sql`
      Verify: `npm run typecheck` still passes (SQL is applied operationally, not by the build); visually confirm `CREATE TABLE IF NOT EXISTS`, the two indexes, and the RLS guard are present and syntactically balanced.

- [ ] 2. **Create the `DanceOrg` type in `lib/dance/types.ts`**
      New file (do not touch `lib/dance/constants.ts` — it is import-free by design per its header comment). Export an interface matching `dance_orgs` columns exactly:

      ```ts
      export interface DanceOrg {
        id: string;
        name: string;
        slug: string;
        website_url: string;
        logo_url: string | null;
        logo_source_url: string | null;
        logo_verified: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }
      ```

      Files: `lib/dance/types.ts`
      Verify: `npm run typecheck` — zero errors.

- [ ] 3. **Create the server data-access function `features/dance/services/danceOrgsService.ts`**
      Server module (no `'use client'`). Import `createClient` from `@/lib/supabase/server` and `DanceOrg` from `@/lib/dance/types`. Export `async function getDanceOrgs(): Promise<DanceOrg[]>` that: `const supabase = await createClient();` then `const { data, error } = await supabase.from('dance_orgs').select('*').order('sort_order', { ascending: true });` — on `error`, `console.error` and return `[]`; otherwise return `data ?? []`. Public SELECT under RLS is allowed for anon.

      Files: `features/dance/services/danceOrgsService.ts`
      Verify: `npm run typecheck` — zero errors.

- [ ] 4. **Add the marquee keyframes + reduced-motion CSS to `app/globals.css`**
      Append a new block (after the `.g-eyebrow` / existing reduced-motion blocks). Pure CSS, no dependencies:

      ```css
      /* ── Dance Org Logo Carousel ─────────────────────────────────────────── */
      @keyframes dance-marquee {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .dance-marquee-wrap { overflow: hidden; }
      .dance-marquee-wrap:hover .dance-marquee-track,
      .dance-marquee-wrap:focus-within .dance-marquee-track { animation-play-state: paused; }
      .dance-marquee-track {
        display: flex;
        align-items: center;
        width: max-content;
        animation: dance-marquee 30s linear infinite;
        will-change: transform;
      }
      @media (prefers-reduced-motion: reduce) {
        .dance-marquee-track { animation: none; }
      }
      ```

      The track duplicates the org list (`[...orgs, ...orgs]`) so `translateX(-50%)` loops seamlessly.

      Files: `app/globals.css`
      Verify: `npm run build` — PostCSS/Tailwind processes with no errors.

- [ ] 5. **Create the text-pill fallback `features/dance/components/OrgTextPill.tsx`**
      Pure presentational component (no `'use client'`). Matches `OrgLogoBar` pill styling with Groove tokens only:

      ```tsx
      interface OrgTextPillProps { name: string; }
      export function OrgTextPill({ name }: OrgTextPillProps) {
        return (
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
            {name}
          </span>
        );
      }
      ```

      Files: `features/dance/components/OrgTextPill.tsx`
      Verify: `npm run typecheck` — zero errors.

- [ ] 6. **Create the client carousel `features/dance/components/OrgLogoCarouselClient.tsx`**
      `'use client'`. Props `{ orgs: DanceOrg[] }`. If `orgs.length === 0` return `null` (no empty strip).

      Structure:
      - `<section role="region" aria-label="Official league partners" className="mb-8">` with `<h2 className="sr-only">Official league partners</h2>` and an eyebrow `<span className="g-eyebrow mb-3">Official Leagues &amp; Federations</span>`.
      - `.dance-marquee-wrap` div (inline `style={{ touchAction: 'pan-y' }}` so vertical page scroll passes through on touch).
      - `.dance-marquee-track` div rendering `[...orgs, ...orgs]` (duplicated for seamless loop).
      - Each item: `<a href={org.website_url} target="_blank" rel="noopener noreferrer" aria-label={\`${org.name} — official website (opens in a new tab)\`} className="mx-4 inline-flex shrink-0 items-center" style={{ height: 48 }}>`.
      - Inside the anchor: if `org.logo_url && org.logo_verified` → `<Image src={org.logo_url} alt={\`${org.name} logo\`} height={40} width={140} style={{ width: 'auto', height: 40, objectFit: 'contain' }} preload={false} className="grayscale opacity-50 transition-all duration-300 hover:grayscale-0 hover:opacity-100" onLoad={…} onError={() => setFailedSlug(org.slug)} />` (local `/logos/…` path, so no `unoptimized`/remotePattern needed). If the image errors, fall back to `<OrgTextPill name={org.name} />` (track failed slugs in state). Else (no verified logo) → `<OrgTextPill name={org.name} />`.
      - **Touch/swipe**: implement pointer-drag on the wrap — `onPointerDown` records start X and pauses the animation (`style.animationPlayState='paused'`); `onPointerMove` (when pointer is down) translates the track by the drag delta via a CSS variable / transform; `onPointerUp`/`onPointerLeave` resumes the animation. Disable drag when `prefers-reduced-motion` (check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`). This gives real swipe support beyond hover-pause.

      Files: `features/dance/components/OrgLogoCarouselClient.tsx`
      Verify: `npm run typecheck` — zero errors; confirm no `priority`/`onLoadingComplete` usage.

- [ ] 7. **Wire the carousel into the page (server fetch → client view)**
      - Create `features/dance/components/DanceCommunityPageServer.tsx` — async **server** component: `const orgs = await getDanceOrgs(); return <DanceCommunityView initialOrgs={orgs} />;` (import `getDanceOrgs` from `@/features/dance/services/danceOrgsService`, `DanceCommunityView` from `./DanceCommunityView`).
      - Modify `features/dance/components/DanceCommunityView.tsx`: add an optional prop `initialOrgs?: DanceOrg[]` (import the type); render `<OrgLogoCarouselClient orgs={initialOrgs ?? []} />` **between** the `<DanceCommunityHero …/>` block (comment `/* 1. Hero Banner … */`) and `<OrgLogoBar …/>` (comment `/* 2. Organization Logo Filter Bar */`), with comment `/* 1b. Official League Logo Carousel */`. Change nothing else (filter state, `OrgLogoBar`, `ORGANIZATIONS` count, etc. stay).
      - Modify `app/community/performing-arts/dance/page.tsx`: replace `<DanceCommunityView />` with `<DanceCommunityPageServer />` (wrapped in `<React.Suspense fallback={null}>` so a slow Supabase read never blocks the page). Keep the `metadata` export unchanged.
      - Modify `app/community/performing-arts/[discipline]/page.tsx` dance branch: dynamic-import `DanceCommunityPageServer` instead of `DanceCommunityView` (`const { DanceCommunityPageServer } = await import('@/features/dance/components/DanceCommunityPageServer'); return <DanceCommunityPageServer />;`). Keep `generateStaticParams` (still excludes `dance`) and `generateMetadata` unchanged.

      Files: `features/dance/components/DanceCommunityPageServer.tsx`, `features/dance/components/DanceCommunityView.tsx`, `app/community/performing-arts/dance/page.tsx`, `app/community/performing-arts/[discipline]/page.tsx`
      Verify: `npm run typecheck` and `npm run build` — zero errors; `DanceCommunityView` still accepts zero-arg calls (optional prop) so `features/dance/index.ts` re-export and any other importer are unaffected.

- [ ] 8. **Create the logo sync script `scripts/sync-dance-logos.ts` and the `logos:sync` npm script**
      TypeScript, run via `node --experimental-strip-types --no-warnings`. Relative imports only (no `@/`). Import `@supabase/supabase-js` (`createClient`), `node:fs`, `node:path`, `node:url`, and the base org list from `../lib/dance/constants.ts` (relative, `.ts`).

      Export `async function runDanceLogoSync(opts?: { writeFiles?: boolean }): Promise<SyncReport>` (reusable core), plus a CLI guard `if (process.argv[1]?.replace(/\\/g,'/').endsWith('scripts/sync-dance-logos.ts')) main().catch(err => { console.error(err); process.exit(1); })` so importing the module from the cron route does not auto-run.

      Core logic per org (the ORGS list — see step 8b):
      1. **Discover** candidates in priority order: (a) official press/brand kit page, (b) `<svg>`/logo used in the official site header (fetch HTML, scan `<img src>`/`<svg>`/inline SVG and `<link rel="icon"…>`), (c) `og:image` **only if a follow-up check confirms it is the org's logo** (not a generic hero), (d) `apple-touch-icon` or highest-quality favicon. Resolve relative URLs against the official origin.
      2. **Validate** each candidate: HTTPS only; HTTP 200 (HEAD, fall back to GET); `Content-Type` starts with `image/` (allow `image/svg+xml`); size ≥ 1 KB; hostname is the org's own official domain (or a known official CDN subdomain) — provenance check. Read the response bytes (GET) and confirm they decode as an image (reject tracking pixels/HTML error pages served as 200). **Inspect the actual image; never trust filename/URL.**
      3. **On first valid candidate**: download the bytes to `public/logos/<slug>.<ext>` (ext from content-type: `.svg`/`.png`/`.jpg`/`.webp`); set `logo_url = '/logos/<slug>.<ext>'`, `logo_source_url = candidate`, `logo_verified = true`. If `writeFiles === false` or the FS is not writable (catch the write error), skip the file write, keep any existing `logo_url`, and still record `logo_source_url`/`logo_verified`/`updated_at`.
      4. **On failure**: set `logo_url = null`, `logo_verified = false`, capture a `fallbackReason`. **Preserve existing verified assets**: if the row already has `logo_verified = true` and the new candidate fails, do not null it out — keep the existing `logo_url`/`logo_verified` and just refresh `updated_at` (log that the existing asset was preserved).
      5. **Upsert** `dance_orgs` by `slug` using a service-role Supabase client (`createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`) — set `name`, `slug`, `website_url`, `logo_url`, `logo_source_url`, `logo_verified`, `sort_order`, `updated_at = new Date().toISOString()`. Use `upsert({ onConflict: 'slug' })`. Read keys from `process.env`; never log them; exit with a clear error if `SUPABASE_SERVICE_ROLE_KEY` is missing.
      6. Print a summary table: org, logo file, source URL, verified yes/no, fallback reason.

      **8b. ORGS list** (required 7 + researched international/Philippine additions; `website_url` here is the starting point — the script validates server-side and may downgrade to fallback): IDL (`https://www.thedancelebague.com`), STEEZY (`https://www.steezy.com`), World of Dance (`https://www.worldofdance.com`), Hip Hop International (`https://www.hiphopinternational.com`), Red Bull Dance Your Style (`https://www.redbull.com/danceyourstyle`), Juste Debout (`https://www.justedebout.com`), UDO / United Dance Organisation (`https://www.udodanceworld.com`), Battle of the Year (`https://www.battleoftheyear.net`), WDSF / World DanceSport Federation (`https://www.worlddancesport.org`), and 1–2 Philippine candidates researched at implementation time (e.g. a Battle of the Year Philippines or national street-dance championship with an official `.ph` site). For any org whose official domain cannot be confirmed, seed it anyway and let the script set `logo_verified = false` + text-pill fallback + reason in `LOGO_SOURCES.md`.

      Files: `scripts/sync-dance-logos.ts`, `package.json` (add `"logos:sync": "node --experimental-strip-types --no-warnings scripts/sync-dance-logos.ts"` to `scripts`)
      Verify: `npm run typecheck` — zero errors; `npm run logos:sync` — runs and prints the summary table (fallbacks are acceptable and expected when network/creds are unavailable; record actual results in `LOGO_SOURCES.md`/report).

- [ ] 9. **Create the seed SQL `supabase/seed_dance_orgs.sql`**
      Deterministic base rows so the carousel has orgs (text-pill fallbacks) even before the sync fetches logos. `INSERT INTO dance_orgs (name, slug, website_url, sort_order, logo_verified) VALUES (…), … ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, website_url = EXCLUDED.website_url, sort_order = EXCLUDED.sort_order;` for the same ORGS list as step 8b (logo_url null, logo_verified false). Keep this list in sync with the script's ORGS (add a comment cross-referencing `scripts/sync-dance-logos.ts`).

      Files: `supabase/seed_dance_orgs.sql`
      Verify: file is valid SQL with `ON CONFLICT (slug)` and balanced statements.

- [ ] 10. **Create the weekly cron route and merge `vercel.json`**
      - Create `app/api/cron/dance-logos/route.ts` mirroring `app/api/cron/dance-agent/route.ts`: `export const dynamic = 'force-dynamic'; export const maxDuration = 300;` (logo sync does many fetches — 300s; note this may require Vercel Pro). GET handler checks `CRON_SECRET` (Authorization Bearer / `?key=` / `vercel-cron` UA) exactly as `dance-agent` does, then `const report = await runDanceLogoSync({ writeFiles: true });` (import via relative path `../../../scripts/sync-dance-logos.ts` — webpack bundles it; it uses only `@supabase/supabase-js` + node built-ins + a relative import to `constants.ts`), and returns `NextResponse.json(report, { status: report.ok ? 200 : 500 })`.
      - **Merge** `vercel.json`: keep the existing `dance-agent` cron and **add** `{ "path": "/api/cron/dance-logos", "schedule": "0 3 * * 1" }` (weekly, Monday 03:00 UTC) to the same `crons` array. Do not remove or overwrite `dance-agent`.

      Files: `app/api/cron/dance-logos/route.ts`, `vercel.json`
      Verify: `npm run typecheck` — zero errors; `vercel.json` is valid JSON and contains **both** cron entries.

- [ ] 11. **Create `LOGO_SOURCES.md` (repo root) and the final report**
      - `LOGO_SOURCES.md` at `c:\website\GrooveSystem\LOGO_SOURCES.md`: a Markdown table with columns **Organization | Official Website | Logo Source URL | Verification Status | Fallback Reason**, one row per org, populated from the **actual** sync run results (do not fabricate; unverifiable rows show the real reason).
      - `.agents/tasks/dance-org-carousel/report.md`: final report identifying which orgs use text-pill fallbacks and why, plus the verification summary (build output, link/rel checks, reduced-motion, target/rel correctness).

      Files: `LOGO_SOURCES.md`, `.agents/tasks/dance-org-carousel/report.md`
      Verify: both files exist; every required org has a row; no row claims "verified" without a real source URL.

- [ ] 12. **Final verification (the gate)**
      1. `npm run typecheck` — zero TypeScript errors.
      2. `npm run build` — zero build errors and no deprecated-prop warnings (`priority`/`onLoadingComplete`).
      3. Sanity-check: `vercel.json` has both crons; `next.config.ts` unchanged; `OrgLogoBar.tsx`, `UpdatesFilterBar.tsx`, and the DanceBeat agent untouched; the carousel JSX sits between `DanceCommunityHero` and `OrgLogoBar`; each logo `<a>` has `target="_blank" rel="noopener noreferrer"`; reduced-motion CSS present; `next/image` uses `preload={false}` and local `/logos/…` paths.
      4. If `SUPABASE_SERVICE_ROLE_KEY` + network are available, run `npm run logos:sync` and record the actual summary in `LOGO_SOURCES.md`/`report.md`. If unavailable, record that and the fallback outcome honestly.

      Record actual `npm run build` output in `report.md`. Never claim an unverified logo is verified.

---

## Key decisions (rationale)

- **Carousel inside `DanceCommunityView`, not above it.** The page is a server component; it fetches `getDanceOrgs()` and passes `initialOrgs` to the client view, which renders the carousel between the hero and `OrgLogoBar`. This is the only placement that is truly "directly below the hero" and "above the latest-updates feed." An earlier draft rendered a server loader above `<DanceCommunityView />`, which would have placed the carousel above the breadcrumb/hero — rejected.
- **Logos link to official sites; `OrgLogoBar` keeps the filter.** The explicit DESIGN requirement is that each logo opens its official website in a new tab (`rel="noopener noreferrer"`). The existing click-to-filter lives in `OrgLogoBar` and is preserved unchanged (the "if implemented" filter requirement is satisfied by leaving that control intact). The two are intentionally separate: the carousel is navigational, `OrgLogoBar` owns filter state.
- **Local `/public/logos/` storage** (not Supabase Storage): matches the project's static-asset convention, lets `next/image` optimize without `remotePattern` changes, and keeps `next.config.ts` untouched. The CLI `npm run logos:sync` is the canonical full fetch→download→upsert (run in CI/local; committed assets). The weekly cron calls the same core; on Vercel's read-only runtime FS it gracefully skips the file write, preserves existing committed `logo_url` assets, and refreshes DB status (`logo_source_url`/`logo_verified`/`updated_at`) — satisfying "preserve existing verified assets when replacement candidates fail."
- **`.ts` script + `node --experimental-strip-types`** (not `.mjs`): the task requires `scripts/sync-dance-logos.ts`, and the project's `seed:dance`/`agent:dance` establish exactly this pattern with relative `.ts` imports.
- **Logo-tailored validator, not `lib/dance/imageVerification.ts`**: that helper rejects `favicon`/`apple-touch-icon`/`logo.svg` (priority-4 and priority-2 sources the task explicitly allows for logos) and bans small icons. The sync script uses its own logo validator that allows SVGs/apple-touch-icons/favicons as last-resort sources while keeping the HTTPS/HTTP-200/image-content-type/official-domain-provenance/byte-inspection checks.
- **`maxDuration = 300`** on the cron route (vs 60 on `dance-agent`): logo discovery/downloads across ~10 sites need the headroom; note this may require Vercel Pro.
