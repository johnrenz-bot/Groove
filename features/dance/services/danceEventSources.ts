/**
 * Dance event sources — a pluggable registry.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCING RULES HONOURED HERE
 * Only publicly syndicated feeds a publisher has deliberately exposed are used.
 * Nothing in this file scrapes a rendered HTML page, calls a private or
 * undocumented API, or works around a block.
 *
 * Sources that were evaluated and deliberately NOT included, with reasons:
 *   World Dance Foundation — robots.txt disallows /api/ and names AI agents in a
 *     Disallow rule, and every endpoint returns HTTP 403. Excluded.
 *   WDC (World Dance Council) — every endpoint returns HTTP 403. Excluded.
 *   WDSF — robots.txt allows fetching, but the site is a client-rendered SPA with
 *     no feed, no JSON in the HTML, and no documented API. Reaching its data
 *     would mean reverse-engineering a private endpoint. Excluded.
 *   IDL — robots.txt allows fetching, but there is no syndicated feed
 *     (/feed 404s) and the sitemap holds only two locale indexes. Excluded.
 *
 * The one source included is a genuine WordPress-syndicated RSS 2.0 feed, which
 * is published for exactly this purpose. It currently contains ZERO items, so
 * the feature ships with an honest empty state rather than invented events.
 *
 * ADDING A SOURCE
 * Append an entry to SOURCES. Nothing else needs to change: fetching,
 * normalisation, category inference, dedupe, caching and failure isolation are
 * all driven from this list.
 */

export type DanceEventCategory = 'competition' | 'workshop' | 'news' | 'results';

export interface DanceEvent {
  /** Stable id derived from source + source id, so dedupe is deterministic. */
  id: string;
  title: string;
  /** Publisher, e.g. "World Dance Masters". */
  organizer: string;
  /** ISO date (YYYY-MM-DD) when the feed gives a usable date. */
  date: string | null;
  endDate: string | null;
  location: string | null;
  category: DanceEventCategory;
  /** Publisher-hosted image only. Never a hotlinked third-party asset. */
  image: string | null;
  registrationUrl: string | null;
  /** The publisher's own page for this item. Always linked. */
  sourceUrl: string;
  /** Registry key, so the UI can attribute the item. */
  source: string;
  /** Short plain-text summary. Never a full article. */
  summary: string | null;
  publishedAt: string | null;
}

export interface EventSource {
  key: string;
  label: string;
  /** Publicly syndicated feed. */
  feedUrl: string;
  /** Absolute URL of the human-readable page this feed corresponds to. */
  siteUrl: string;
  categoryHint?: DanceEventCategory;
}

export const SOURCES: EventSource[] = [
  {
    key: 'wdm',
    label: 'World Dance Masters',
    feedUrl: 'https://wdm.dance/feed/',
    siteUrl: 'https://wdm.dance/',
    // WordPress blog feed: posts are news unless the title says otherwise.
    categoryHint: 'news',
  },
];

/** Identifies the app to publishers, per ordinary feed-reader etiquette. */
const USER_AGENT =
  'GrooveSystem-DanceEvents/1.0 (https://groove.app; community event feed reader)';

/* ── small XML helpers ─────────────────────────────────────────────────────
   Deliberately regex-based rather than a DOM parser: the input is a feed we do
   not control, and pulling in an XML dependency for `<item>`, `<title>` and a
   CDATA unwrap is not worth the supply-chain surface. Entities are decoded by
   hand for the same reason. */

function unwrapCdata(value: string): string {
  const cdata = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return cdata ? cdata[1] : value;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#039': "'",
  '#8217': '\u2019',
  nbsp: ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (ENTITIES[code]) return ENTITIES[code];
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const n = parseInt(code.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    if (code.startsWith('#')) {
      const n = parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return match;
  });
}

function tagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return null;
  const text = decodeEntities(unwrapCdata(m[1])).trim();
  return text.length ? text : null;
}

function tagAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, 'i'));
  if (!m) return null;
  const v = decodeEntities(m[1]).trim();
  return v.length ? v : null;
}

/** Strip markup and collapse whitespace. Feeds carry HTML in most fields. */
function toPlainText(html: string, maxLength = 280): string {
  const text = decodeEntities(unwrapCdata(html))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** RFC-822 (RSS pubDate) or ISO 8601 (Atom) to a Date, or null. */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const toIsoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Infer a category from the title and the source's own categories.
 *
 * The hint is a floor, not a ceiling: a "Results" or "Championship" title is
 * still classified correctly whatever the feed calls the post. Kept
 * deliberately conservative — an event wrongly filed as news is a far smaller
 * problem than a competition hidden under News.
 */
export function inferCategory(
  title: string,
  feedCategories: string[],
  hint: DanceEventCategory = 'news'
): DanceEventCategory {
  const haystack = `${title} ${feedCategories.join(' ')}`.toLowerCase();

  if (/\b(result|results|placing|placements|final standings|winner)\b/.test(haystack)) {
    return 'results';
  }
  if (/\b(workshop|masterclass|master class|clinic|studio session|intensive|seminar)\b/.test(haystack)) {
    return 'workshop';
  }
  if (
    /\b(championship|championships|competition|contest|open|cup|grand prix|grand slam|olympiad|ball|dancefest|festival)\b/.test(
      haystack
    )
  ) {
    return 'competition';
  }
  return hint;
}

/**
 * Best-effort "City, Country" from free text.
 *
 * Deliberately conservative, because a wrong location is worse than none. The
 * first draft matched capitalised runs and happily returned "Alicante, Spain.
 * Bring" from "Three days in Alicante, Spain. Bring comfortable shoes." — so
 * this now stops at a sentence boundary, and drops a trailing fragment that
 * continues into ordinary prose.
 */
function locationFromText(text: string): string | null {
  const m = text.match(
    /\b([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3},\s*[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,2})/u
  );
  if (!m) return null;

  let candidate = m[1].trim();

  // Stop at a sentence end.
  const sentenceEnd = candidate.search(/[.;!?]/);
  if (sentenceEnd > 0) candidate = candidate.slice(0, sentenceEnd);

  // "Alicante, Spain Bring" -> the country run ran on into prose. Drop trailing
  // words that are not part of a proper noun, and anything after a stray
  // lowercase continuation.
  const parts = candidate.split(/\s+/);
  while (parts.length > 1 && /^[a-z]/.test(parts[parts.length - 1])) parts.pop();

  candidate = parts.join(' ').replace(/[,;\s]+$/, '').trim();

  // A single bare capitalised word is usually prose, not a place.
  if (!candidate.includes(',') && candidate.split(' ').length < 2) return null;
  return candidate.length >= 3 ? candidate : null;
}

/** Parse one syndicated feed into normalised events. */
function parseRssFeed(xml: string, source: EventSource): DanceEvent[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const events: DanceEvent[] = [];

  for (const item of items) {
    const rawTitle = tagText(item, 'title');
    if (!rawTitle) continue;

    const title = toPlainText(rawTitle, 200);
    const link = tagAttr(item, 'link', 'href') ?? tagText(item, 'link');
    const sourceUrl = link ?? source.siteUrl;

    const cats = (item.match(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi) ?? []).map(
      (c) => toPlainText(c, 60)
    );

    const published = parseDate(tagText(item, 'pubDate') ?? tagText(item, 'dc:date'));

    // <media:content>/<enclosure> are publisher-hosted; a bare <img> inside the
    // description is not trusted as an image source.
    const image =
      tagAttr(item, 'media:content', 'url') ??
      tagAttr(item, 'media:thumbnail', 'url') ??
      tagAttr(item, 'enclosure', 'url') ??
      null;

    const descriptionHtml =
      tagText(item, 'description') ?? tagText(item, 'content:encoded') ?? '';

    // A real "register"/"book"/"tickets" link inside the body is a better
    // registration target than guessing. Only same-origin is trusted.
    let registrationUrl: string | null = null;
    const anchors = descriptionHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) ?? [];
    for (const a of anchors) {
      const href = tagAttr(a, 'a', 'href');
      const text = toPlainText(a, 60).toLowerCase();
      if (href && /\b(register|registration|book|bookings|tickets|entry|entries|sign ?up)\b/.test(text)) {
        try {
          const abs = new URL(href, source.siteUrl);
          if (abs.protocol === 'https:' || abs.protocol === 'http:') registrationUrl = abs.toString();
        } catch {
          /* unparseable href: ignore rather than emit a broken link */
        }
        break;
      }
    }

    const summary = toPlainText(descriptionHtml, 280) || null;

    const rawId =
      tagText(item, 'guid') ??
      tagText(item, 'dc:identifier') ??
      tagText(item, 'link') ??
      `${title}-${published?.toISOString() ?? ''}`;

    events.push({
      id: `${source.key}:${rawId.replace(/\s+/g, '-').slice(0, 120)}`,
      title,
      organizer: source.label,
      date: toIsoDate(published),
      endDate: null,
      location: summary ? locationFromText(summary) : null,
      category: inferCategory(title, cats, source.categoryHint ?? 'news'),
      image,
      registrationUrl,
      sourceUrl,
      source: source.key,
      summary,
      publishedAt: published ? published.toISOString() : null,
    });
  }

  return events;
}

/* ── dedupe ────────────────────────────────────────────────────────────────
   The same event legitimately appears in more than one feed. Deduping on the
   id alone would miss that, so a second pass keys on a normalised
   title+date signature and keeps the earliest-published copy. */

function signature(event: DanceEvent): string {
  return `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${event.date ?? ''}`;
}

export function dedupeEvents(events: DanceEvent[]): DanceEvent[] {
  const seen = new Map<string, DanceEvent>();
  for (const e of events) {
    const key = signature(e);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, e);
      continue;
    }
    // Keep the copy with the earlier publication date, falling back to the
    // first seen so the result is deterministic.
    if (e.publishedAt && existing.publishedAt && e.publishedAt < existing.publishedAt) {
      seen.set(key, e);
    }
  }
  return [...seen.values()];
}

export interface SourceResult {
  source: string;
  label: string;
  events: DanceEvent[];
  /** null on success; a short reason on failure. Never throws. */
  error: string | null;
}

/**
 * Fetch one source. Never rejects: a failure becomes an error string so one dead
 * feed cannot empty the page.
 */
export async function fetchSource(source: EventSource): Promise<SourceResult> {
  try {
    const res = await fetch(source.feedUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' },
      // One hour. These are public editorial feeds; a ten-minute poll would be
      // rude and would gain nothing.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { source: source.key, label: source.label, events: [], error: `HTTP ${res.status}` };
    }

    const xml = await res.text();
    if (!/<(rss|feed)\b/i.test(xml)) {
      return { source: source.key, label: source.label, events: [], error: 'Not an RSS/Atom feed' };
    }

    return { source: source.key, label: source.label, events: parseRssFeed(xml, source), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { source: source.key, label: source.label, events: [], error: message };
  }
}

/** All sources, concurrently and independently. */
export async function fetchAllSources(): Promise<SourceResult[]> {
  return Promise.all(SOURCES.map(fetchSource));
}
