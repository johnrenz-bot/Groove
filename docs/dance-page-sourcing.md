# Dance page — image sourcing & date verification

Reference date for all date-logic checks: **14 October 2026 (Asia/Manila)**.

This documents where every Latest Updates card's data came from, and what was
refused. Run `npm run dance:verify` to re-check the assertions.

## Every card traces to an official source

No card has an invented date, result, venue, or registration link. The
"Official Source" button on each card links to the page the facts were read
from.

| Card | Source | Image source |
|---|---|---|
| Red Bull DYS World Final 2026 | redbull.com event page | `img.redbull.com` campaign crop (`preferUrl`) |
| World of Dance Finals 2026 | worldofdance.com/events | Official World of Dance YouTube thumbnail |
| HHI Philippines 2027 | hiphopinternational.com schedule | hhiphilippines.com (GoDaddy `img1.wsimg.com`) |
| IDL 2026 Championship | idl.pro | `framerusercontent.com` og:image |
| UDO Philippines 2026 Nationals | udostreetdance.com event page | Official UDO Philippines 2026 poster |
| HHI Worlds 2026 | hiphopinternational.com | `WORLDS2026-ft.FlagsOnStage` (site's own asset) |
| HQ World Adult Gold | OfficialHHI YouTube | YouTube `sddefault` thumbnail |
| HHI World Moves 2026 | hiphopinternational.com | `2026-WM-WEB.png` (site's own asset) |
| Red Bull DYS Philippines 2026 | redbull.com PH event page | `img.redbull.com` PH campaign crop |
| World of Dance Philippines 2026 | newportworldresorts.com | `WOD_0.jpg` og:image |
| Juste Debout 20th Edition | juste-debout.com | `IMG_6234.png` (site's own poster) |
| STEEZY / IDL season | steezy.co blog | `cdn.prod.website-files.com` (Webflow CDN) |

## How images were retrieved

`npm run images:sync` (`scripts/sync-dance-update-images.ts`) discovers and
**downloads** each asset into `public/dance-updates/`. Hotlinking was rejected
because a card that depends on someone else's CDN fails on a cold cache and
shifts layout when that CDN rotates.

A candidate is accepted only if it is HTTPS, served by the source host or a
CDN that host officially points at, `image/*`, passes a magic-byte check, and
decodes to at least 560×315 and 20 KB. Candidates come from four tiers, in
order: hand-picked `preferUrl`, `og:image`/`twitter:image`, YouTube thumbnails
(`maxres` → `hq720` → `sd` → `hq`), then filtered body `<img>` elements.

Every one of the 12 images was also **opened and visually inspected** before
being committed — automated validation proves a file is a real image on an
official host, not that it depicts the event. Two things that only human review
caught:

- Red Bull reuses one campaign key-art across every event page in the series.
  Without a per-card `preferUrl`, two cards would have carried a
  byte-identical photo. The sync now also refuses any asset already claimed by
  another card.
- `worldofdance.com` is a client-rendered SPA whose `og:image` is a 12 KB logo.
  It was correctly rejected by the size floor; the card instead uses the
  official channel's Finals video.

## Why no stock imagery

`lib/dance/imageVerification.ts` and migration 18 both reject Unsplash, Pexels,
Shutterstock, Pixabay, Getty and friends. A stock photo of *a* dancer is not a
photograph of *this* competition, and presenting it as one is the failure mode
these rules exist to prevent.

## Cards with no image

None in the current set. The fallback path is implemented and tested anyway:
`image_fallback_reason` is written whenever `image_url` is null, and
`lib/dance/schema.ts` **rejects** a row that has an image and a reason, or
neither. A blank card always says why; an unexplained blank is
indistinguishable from a broken page.

## Date logic

`isUpcomingEvent()` in `features/dance/services/danceService.ts`:

- Compares against the **page's** timezone (Asia/Manila), not the server's.
- Keeps an event listed through the end of its own calendar day, so a battle
  that started at 01:00 doesn't vanish mid-run.
- Treats a missing or unparseable date as *not* upcoming — a record with no
  date cannot be advertised as attendable, but stays in Latest Updates.

Historical cards remain visible in Latest Updates and are excluded only from
the Upcoming Events rail. Three cards qualify as upcoming at the reference
date; the other nine are concluded and labelled as such.

### A date bug this found

Card and rail dates were rendered with `toLocaleDateString` and no explicit
`timeZone`, which formats in the **reader's** zone. The Red Bull World Final is
24 October 18:00 in Zurich — already 25 October in Manila — so the page showed
"Oct 25" directly under a headline reading "24 October". Both now render from
the venue's own UTC offset via `formatEventDate()` / `parseEventDateParts()` in
`lib/dance/types.ts`, giving every reader the same string. Regression checks
live in `scripts/verify-dance-dates.ts`.

## Reproducing

```bash
npm run images:sync    # re-fetch and re-validate assets, write sync-report.json
npm run dance:verify   # assert date logic + image integrity
npm run typecheck
```

`sync-report.json` records, per card, the asset URL, its pixel dimensions,
byte size, discovery tier, and — on failure — the specific reason no image was
accepted.

## Rights & terms

Assets were fetched from each organisation's own public website over plain
HTTPS with no authentication, no access-control bypass, and no private content.
Each card links back to the official page and credits the organisation. These
marks and photographs remain the property of their owners and are used here for
editorial identification with attribution; this is not a licence grant.