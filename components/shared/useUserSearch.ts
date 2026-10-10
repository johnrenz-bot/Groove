'use client';

/**
 * Header user search — the data layer behind the header's search panel.
 *
 * WHY A HOOK AND NOT A COMPONENT
 *   The search needs to survive being opened from three places (the desktop bar,
 *   the mobile sheet, and the `/` shortcut) without each of them re-implementing
 *   debounce, cancellation and error handling. Only the rendering differs, so the
 *   fetching lives here and `UserSearchResults` (below) only draws what it is
 *   handed.
 *
 * DATA SOURCE
 *   GET /api/users — the SAME endpoint the /users directory page already uses.
 *   Reusing it is deliberate:
 *     - it searches in Postgres (`ilike` across firstname / lastname / username),
 *       not against a client-side snapshot, so results are complete rather than
 *       "whatever happened to be mounted";
 *     - it selects through `PUBLIC_PROFILE_COLUMNS`, so no email, phone,
 *       birthdate or street can reach the browser even accidentally;
 *     - it excludes `role = 'admin'`, because an administrator has no public
 *       face and `/userprofile/[id]` is not a view of one;
 *     - it runs under the visitor's own session, so PostgREST/RLS still apply.
 *   No new endpoint, no new table, no service-role key on the client.
 *
 * STALE-RESPONSE SAFETY
 *   Two things guard this, and both are necessary:
 *     1. `requestIdRef` — every keystroke claims an incrementing id and a
 *        response is discarded unless it still holds the newest id. Without it a
 *        slow request for "jo" can land after a fast request for "john" and
 *        overwrite the newer, more relevant list.
 *     2. the debounce itself — the request is only issued once typing pauses, so
 *        the common case never races at all.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** A search hit. Mirrors the public subset of /api/users' DirectoryUser. */
export interface UserSearchResult {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  photo_url: string | null;
  role: string;
  city_name: string | null;
  province_name: string | null;
  account_verified: boolean;
}

export type UserSearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface ApiResponse {
  users?: UserSearchResult[];
  error?: string;
}

/** Fewer characters than this is not a search, it is a keystroke. */
const MIN_QUERY = 2;
/** Long enough to coalesce a fast typist's burst into one request. */
const DEBOUNCE_MS = 250;
/** The dropdown is a glance, not a directory. */
const RESULT_LIMIT = 6;

export function useUserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [status, setStatus] = useState<UserSearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Monotonic request id. Incremented synchronously inside the debounce callback
  // so the comparison below is against a value captured at request time, not at
  // response time.
  const requestIdRef = useRef(0);
  // Aborts the in-flight fetch when a newer query supersedes it, so a cancelled
  // request never occupies the socket or writes state after unmount.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      // Claim the id so a request already in flight is now stale, and stop it.
      // No setState here: the returned values are derived from `isSearchable`
      // below, which already reports idle/empty for this case.
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    const timer = window.setTimeout(async () => {
      // `loading` is set from inside the timer, not in the effect body: the
      // effect body runs synchronously on every keystroke, and a setState there
      // is a cascading render per character. Inside the timer it is a genuine
      // async boundary — the same place the request itself starts — and it lands
      // with the first frame of actual waiting.
      setStatus('loading');

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // `sort=az` is pushed down to Postgres and needs no follow-count tally,
        // so the dropdown stays a single cheap query. `pageSize` caps the payload
        // at what the panel can actually show.
        const params = new URLSearchParams({
          q: trimmed,
          role: 'all',
          sort: 'az',
          page: '1',
          pageSize: String(RESULT_LIMIT),
        });

        const res = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) throw new Error(`Search failed (${res.status})`);

        const data = (await res.json()) as ApiResponse;

        // A response that is no longer the newest one is discarded outright.
        if (requestIdRef.current !== requestId) return;

        if (data.error) {
          setResults([]);
          setError(data.error);
          setStatus('error');
          return;
        }

        setResults(data.users ?? []);
        setError(null);
        setStatus('success');
      } catch (err) {
        // An abort is this hook cancelling itself, not a failure — surfacing it
        // would flash an error into a field the user is still typing in.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setError(err instanceof Error ? err.message : 'Search is unavailable right now.');
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  // Abort anything still in flight when the header unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Collapse clears the query AND the results, so reopening starts blank. */
  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setQuery('');
    setResults([]);
    setStatus('idle');
    setError(null);
  }, []);

  /* The "too short to search" case is DERIVED, not stored.
     Clearing state inside the effect body would be a cascading render
     (react-hooks/set-state-in-effect) on every deletion back below two
     characters. Deriving it here means one source of truth: if the query is too
     short, there is no search, whatever the last completed request left behind.
     The request-id bump still happens in `reset` and in the effect's early
     return below, so an in-flight response cannot repopulate a cleared field. */
  const isSearchable = query.trim().length >= MIN_QUERY;

  return {
    query,
    setQuery,
    results: isSearchable ? results : EMPTY_RESULTS,
    status: isSearchable ? status : 'idle',
    error: isSearchable ? error : null,
    reset,
    /** True once the field has enough characters to be worth a request. */
    isSearchable,
  };
}

/** A stable empty array, so the derived value never re-renders consumers. */
const EMPTY_RESULTS: UserSearchResult[] = [];

export default useUserSearch;
