'use client';

/**
 * New message - opposite-role search, never admins, never test accounts.
 *
 * Hits the same /api/users directory the rest of the app uses: admins are
 * excluded server-side, and the test/demo name heuristic is applied again
 * here before anything renders. One conversation per person - picking a
 * result deep-links the hub to that thread (?conversation=<id>).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { isMemberFacingPartner, isTestNamed } from '../adminExclusion';
import type { HubRole } from '../types';

interface DirectoryUser {
  id: string;
  firstname: string | null;
  lastname: string | null;
  username: string | null;
  photo_url: string | null;
  role: string;
  account_verified?: boolean | null;
  city_name?: string | null;
}

export function HubNewMessageDialog({
  open,
  role,
  onClose,
  onPick,
}: {
  open: boolean;
  role: HubRole;
  onClose: () => void;
  onPick: (partnerId: string) => void;
}) {
  const opposite = role === 'client' ? 'coach' : 'client';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Reset + focus when the dialog opens.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setQuery('');
      setResults([]);
      setError(null);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Debounced directory search.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users?role=${opposite}&q=${encodeURIComponent(q)}&page=1&pageSize=10`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Search failed.');
        const payload = (await res.json()) as { users?: DirectoryUser[] };
        const users = (payload.users ?? []).filter(
          (u) =>
            u.role === opposite &&
            isMemberFacingPartner(u) &&
            !isTestNamed(u)
        );
        setResults(users);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Search failed.');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [open, query, opposite]);

  // Render-time derivations - never sync setState.
  const visibleResults = query.trim().length >= 2 ? results : [];
  const showSearching = loading && query.trim().length >= 2;

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const emptyMessage = useMemo(() => {
    if (query.trim().length < 2) return `Type at least 2 letters to search ${opposite}s.`;
    if (loading) return 'Searching...';
    return `No ${opposite}s match "${query.trim()}".`;
  }, [query, loading, opposite]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Start a new conversation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border border border-border bg-background shadow-2xl"
      >
        <div className="flex items-center gap-2   border-b border-divider p-3">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search {opposite}s</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={role === 'client' ? 'Search coaches...' : 'Search clients...'}
              aria-label={role === 'client' ? 'Search coaches' : 'Search clients'}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-subtle-foreground focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Search results">
          {error ? (
            <p role="alert" className="px-3 py-6 text-center text-xs text-danger">
              {error}
            </p>
          ) : visibleResults.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground" role="status">
              {loading ? 'Searching...' : emptyMessage}
            </p>
          ) : (
            visibleResults.map((user) => {
              const name =
                [user.firstname, user.lastname].filter(Boolean).join(' ').trim() ||
                user.username ||
                'Member';
              return (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    onPick(user.id);
                    onClose();
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover: bg-transparent hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[10px] font-bold text-accent-text">
                    {user.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(user.firstname ?? undefined, user.lastname ?? undefined)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      {user.city_name ?? 'Groove member'}
                      {user.account_verified ? (
                        <ShieldCheck className="h-3 w-3 text-success" aria-label="Verified" />
                      ) : null}
                    </span>
                  </span>
                  <MessageSquare className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                </button>
              );
            })
          )}
        </div>

        {showSearching && (
          <p className="flex items-center justify-center gap-2   border-t border-divider px-3 py-2 text-[10px] text-muted-foreground" role="status">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Searching
          </p>
        )}
      </div>
    </div>
  );
}

