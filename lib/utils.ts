import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '₱0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₱0';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

export function getStorageUrl(path: string | null | undefined, bucket: string = 'avatars'): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * `verification-documents` is a PRIVATE bucket, so a public object URL 400s for
 * every file in it. Documents must be read through a signed URL instead:
 *
 *   supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
 *
 * This helper only builds the request; the caller needs the Supabase client,
 * because signing requires the current user's token.
 */
export const VERIFICATION_BUCKET = 'verification-documents';

/** Signed URLs are short-lived; a drawer can sit open for a while. */
export const SIGNED_URL_TTL_SECONDS = 60 * 30;

/**
 * Normalizes `coach_profiles.genres` into a list of genre names.
 *
 * The column is TEXT and registration writes a JSON string shaped
 * `{ skill, genres: [...] }`, but three other shapes exist in the data:
 * a bare array, a real JSON array string, and the legacy comma-separated
 * text. Rendering the raw column therefore produced visible JSON like
 * `{"skill":"Dance","genres":["Hip-Hop",...]}`.
 *
 * Returns names only — never the syntax — so callers can render them
 * directly as pills, comma-joined text, or a list.
 */
export function parseGenres(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];

  // A real array (PostgREST can return jsonb/array columns as-is).
  if (Array.isArray(raw)) {
    return raw.map((g) => (typeof g === 'string' ? g : String(g))).map((g) => g.trim()).filter(Boolean);
  }

  // An object column: { skill, genres: [] } — or the genres array directly.
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return parseGenres(obj.genres);
  }

  if (typeof raw !== 'string') return [];

  const text = raw.trim();
  if (!text) return [];

  // JSON object string: { "skill": "Dance", "genres": [...] }
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return parseGenres(JSON.parse(text));
    } catch {
      // Not JSON after all — fall through to the legacy path.
    }
  }

  // Legacy: comma-separated genre names. A brace/bracket-prefixed string that
  // failed to parse is never a genre name, so it is dropped rather than shown.
  return text
    .split(',')
    .map((g) => g.trim())
    .filter((g) => g && !/^[{[]/.test(g));
}

export function getInitials(firstname?: string | null, lastname?: string | null): string {
  const f = (firstname || '').trim().charAt(0).toUpperCase();
  const l = (lastname || '').trim().charAt(0).toUpperCase();
  return `${f}${l}` || 'U';
}

/**
 * Parses coach genres from either structured JSON {"skills": {"Dance": ["Hip-Hop"]}}
 * or legacy comma-separated string format. Returns a flat array of unique genre names.
 */
export function parseCoachGenres(rawGenres: string | null | undefined): string[] {
  if (!rawGenres || !rawGenres.trim()) return [];
  const trimmed = rawGenres.trim();

  // Attempt to parse structured JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.skills && typeof parsed.skills === 'object') {
        const genres: string[] = [];
        for (const skill of Object.keys(parsed.skills)) {
          const list = parsed.skills[skill];
          if (Array.isArray(list)) {
            genres.push(...list);
          }
        }
        return Array.from(new Set(genres.filter(Boolean)));
      }
    } catch {
      // Fall through to plain text parsing
    }
  }

  // Fallback for comma or pipe separated formats
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    const genres: string[] = [];
    for (const part of parts) {
      if (part.includes(':')) {
        const [, genreList] = part.split(':');
        if (genreList) {
          genres.push(...genreList.split(',').map((g) => g.trim()));
        }
      } else {
        genres.push(part);
      }
    }
    return Array.from(new Set(genres.filter(Boolean)));
  }

  return trimmed
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * Parses coach skills and grouped genres from either structured JSON or legacy format.
 */
export function parseCoachSkills(rawGenres: string | null | undefined): Record<string, string[]> | null {
  if (!rawGenres || !rawGenres.trim()) return null;
  const trimmed = rawGenres.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.skills && typeof parsed.skills === 'object') {
        return parsed.skills;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

