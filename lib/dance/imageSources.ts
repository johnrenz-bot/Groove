/**
 * Official artwork manifest for the Dance Latest Updates cards.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS LIVES HERE AND NOT IN `features/`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `scripts/sync-dance-update-images.ts` runs under `node
 * --experimental-strip-types`, which cannot resolve the `@/` alias, and it
 * imports `node:fs`. If the data file under `features/` imported the script for
 * its types — which is the obvious first thing to write — webpack would pull
 * the script's Node built-ins into the page bundle and the build would fail.
 *
 * So the manifest lives in `lib/dance/`, next to `constants.ts`, for the same
 * reason that file is import-free: it has to be loadable by a Next.js server
 * component AND by a bare Node script. Nothing here may import anything.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT EACH FIELD MEANS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `pageUrl`
 *   The organisation's own page, and the same URL the card links to as
 *   "Official Source". The sync validates the image's host against it, so if
 *   the two ever drift the image quietly stops verifying. Keeping them in one
 *   object is the guard.
 *
 * `extraHosts`
 *   First-party CDNs that are not subdomains of `pageUrl`. Deliberately
 *   enumerated and reviewed per item:
 *     img.redbull.com             Red Bull image CDN
 *     cdn.prod.website-files.com  Webflow CDN behind steezy.co
 *     framerusercontent.com       Framer CDN behind idl.pro
 *     img1.wsimg.com              GoDaddy CDN behind hhiphilippines.com
 *   No generic or third-party image host belongs here.
 *
 * `preferUrl`
 *   Hand-picked asset, tried before anything discovered on the page. Needed
 *   because several of these series reuse ONE campaign key-art across every
 *   event page; without it two Red Bull cards would carry a byte-identical
 *   photo, which the sync's cross-item dedupe would then blank to a fallback.
 *   The pick must be an asset from the same official host as `pageUrl`.
 */

export interface ImageSourceSpec {
  /** Stable id — matches the `id` of the update record it belongs to. */
  id: string;
  /** The official page the card links to and the image must be attributable to. */
  pageUrl: string;
  /** Extra first-party CDN hosts allowed to serve this item's artwork. */
  extraHosts?: string[];
  /** Asset to try first. Must still pass every validation rule. */
  preferUrl?: string;
  /** Human-readable credit shown on the card. */
  credit: string;
}

export const IMAGE_SOURCES: ImageSourceSpec[] = [
  // ── IDL ──────────────────────────────────────────────────────────────────
  // idl.pro is published on Framer; its og:image is the league's own key art.
  {
    id: 'idl-2026-championship',
    pageUrl: 'https://www.idl.pro/',
    extraHosts: ['framerusercontent.com'],
    credit: 'IDL (International Dance League)',
  },

  // ── Red Bull Dance Your Style ────────────────────────────────────────────
  // Every event page on the series reuses the same "…2026-header" key art, so
  // each card below names a different official crop/shoot of it.
  {
    id: 'redbull-dys-world-final-2026',
    pageUrl: 'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich',
    extraHosts: ['img.redbull.com'],
    preferUrl:
      'https://img.redbull.com/images/c_crop,x_2334,y_0,h_5322,w_4258/c_fill,w_1200,h_900/q_auto,f_jpg/redbullcom/2025/10/2/vw1gxks9krjk4kiaazay/red-bull-dance-your-style-2026-header',
    credit: 'Red Bull Dance Your Style',
  },
  {
    id: 'redbull-dys-philippines-2026',
    pageUrl: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    extraHosts: ['img.redbull.com'],
    // The Philippines page nominates its OWN campaign photo (a different shoot
    // from the series header), so two Red Bull cards never repeat a scene.
    preferUrl:
      'https://img.redbull.com/images/c_fill,g_auto,w_1200,h_630/f_jpg,q_auto/redbullcom/2026/2/12/ce08snr2dbap3gryenxl/dance-your-style-philippines-2026-header',
    credit: 'Red Bull Dance Your Style Philippines',
  },

  // ── Hip Hop International ────────────────────────────────────────────────
  // hiphopinternational.com publishes no og:image. These are the page's own
  // <img> assets from the 2026 season, picked from the site itself.
  {
    id: 'hhi-world-2026',
    pageUrl: 'https://hiphopinternational.com/world-hip-hop-dance-championship',
    preferUrl:
      'https://hiphopinternational.com/wp-content/uploads/2026/07/WORLDS2026-ft.FlagsOnStage-scaled.jpg',
    credit: 'Hip Hop International',
  },
  {
    id: 'hhi-worldwide-schedule-2026',
    pageUrl: 'https://hiphopinternational.com/schedule-of-events-worldwide',
    preferUrl:
      'https://hiphopinternational.com/wp-content/uploads/2026/06/2026-WM-WEB.png',
    credit: 'Hip Hop International',
  },
  {
    id: 'hhi-philippines-2026',
    pageUrl: 'https://www.youtube.com/watch?v=OJWk6eD0-mQ',
    credit: 'Hip Hop International (OfficialHHI YouTube)',
  },
  {
    id: 'hhi-philippines-2027',
    pageUrl: 'https://hhiphilippines.com/',
    // GoDaddy's wsimg CDN, which is where hhiphilippines.com serves photos.
    extraHosts: ['img1.wsimg.com'],
    preferUrl:
      'https://img1.wsimg.com/isteam/ip/b9c68dc3-d732-42d1-84cf-bcdf1f875112/HHI%20Philippines%202024_JV%20Megacrew-115.jpg',
    credit: 'HHI Philippines',
  },

  // ── World of Dance ───────────────────────────────────────────────────────
  // worldofdance.com is a client-rendered SPA whose og:image is a 12 KB logo.
  // The official channel's own 2026 Finals video is the best first-party
  // photograph of the event, so the card links there.
  {
    id: 'wod-world-finals-2026',
    pageUrl: 'https://www.youtube.com/watch?v=rcM2JhFHEm4',
    credit: 'World of Dance (official YouTube)',
  },
  {
    id: 'wod-philippines-2026',
    pageUrl: 'https://www.newportworldresorts.com/event/world-dance-philippines-2026',
    credit: 'World of Dance Philippines / Newport Performing Arts Theater',
  },

  // ── UDO ──────────────────────────────────────────────────────────────────
  {
    id: 'udo-philippines-2026',
    pageUrl:
      'https://www.udostreetdance.com/es_ec/events/view/udo-philippines-street-dance-national-qualifier-2026-10-2026',
    credit: 'UDO Philippines',
  },

  // ── Juste Debout ────────────────────────────────────────────────────────
  {
    id: 'justedebout-2026-finals',
    pageUrl: 'https://juste-debout.com/en/our-latest-news',
    preferUrl: 'https://juste-debout.com/wp-content/uploads/2025/11/IMG_6234.png',
    credit: 'Juste Debout',
  },

  // ── STEEZY ───────────────────────────────────────────────────────────────
  {
    id: 'steezy-idl-2026-season',
    pageUrl:
      'https://www.steezy.co/posts/internationl-dance-league-announces-its-2026-season-schedule',
    extraHosts: ['cdn.prod.website-files.com'],
    credit: 'STEEZY Blog',
  },
];