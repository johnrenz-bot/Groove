/**
 * Local category imagery for the Dance Community page.
 *
 * All thumbnails are LOCAL files under `public/images/community/dance/` —
 * nothing is hotlinked. Expected assets:
 *   - competition.jpg
 *   - events.jpg
 *   - workshop.jpg
 *   - results.jpg
 *   - news.jpg
 *   - community.jpg
 *   - crew-placeholder.jpg (reserved)
 *   - hero-dance.jpg
 *
 * The thumbnail for a card is picked by the item's category. Categories with
 * several images rotate by a stable hash of the item id, so the same card
 * always shows the same image. Every consumer renders through <SafeImage>,
 * so a missing file degrades to the gradient fallback — never a broken
 * image icon or raw alt text.
 */

export const DANCE_FALLBACK_DIR = '/images/community/dance';

const COMPETITION = `${DANCE_FALLBACK_DIR}/competition.jpg`;
const EVENTS = `${DANCE_FALLBACK_DIR}/events.jpg`;
const WORKSHOP = `${DANCE_FALLBACK_DIR}/workshop.jpg`;
const RESULTS = `${DANCE_FALLBACK_DIR}/results.jpg`;
const NEWS = `${DANCE_FALLBACK_DIR}/news.jpg`;
const COMMUNITY = `${DANCE_FALLBACK_DIR}/community.jpg`;

export const DANCE_CATEGORY_IMAGES: Record<string, readonly string[]> = {
  competition: [COMPETITION, EVENTS],
  event: [EVENTS, COMPETITION],
  workshop: [WORKSHOP, COMMUNITY],
  results: [RESULTS, COMPETITION],
  news: [NEWS, COMMUNITY],
  community: [COMMUNITY, NEWS],
};

/** Back-compat single pick (first image of the category). */
export function getDanceFallbackImage(category?: string | null): string | null {
  if (!category) return COMMUNITY;
  return DANCE_CATEGORY_IMAGES[category.toLowerCase()]?.[0] ?? COMMUNITY;
}

/** Stable hash of an id so rotation is deterministic per card. */
function stableHash(value: string | number): number {
  const s = String(value);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Category image for a card, rotated by stable hash of the item id. */
export function getDanceCategoryImage(
  category?: string | null,
  id?: string | number
): string {
  const key = (category || 'community').toLowerCase();
  const pool = DANCE_CATEGORY_IMAGES[key] ?? [COMMUNITY];
  if (id === undefined || pool.length === 1) return pool[0];
  return pool[stableHash(id) % pool.length];
}

export const DANCE_HERO_IMAGE = `${DANCE_FALLBACK_DIR}/hero-dance.jpg`;

export default getDanceFallbackImage;
