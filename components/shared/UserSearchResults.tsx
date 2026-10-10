'use client';

/**
 * The header's user-search results panel.
 *
 * Owns the keyboard interaction for the list — arrows, Home/End, Enter, Escape —
 * and every visual state: loading, error, no-results, and results.
 *
 * A NOTE ON ROLES
 *   This is a `listbox`, not a `menu`. A menu is for choosing an ACTION; this
 *   chooses a VALUE from a set, which is what `listbox` + `option` means, and it
 *   is what makes the active-descendant pattern (one real focus on the input,
 *   `aria-activedescendant` pointing at the highlighted option) correct. Screen
 *   readers announce position and count that a menu cannot.
 */

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, SearchX, TriangleAlert, UserRound } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { cn } from '@/components/shared/cn';
import type { UserSearchResult, UserSearchStatus } from './useUserSearch';

export function UserSearchResults({
  results,
  status,
  error,
  query,
  isSearchable,
  activeIndex,
  onActiveIndexChange,
  onNavigate,
  idPrefix,
}: {
  results: UserSearchResult[];
  status: UserSearchStatus;
  error: string | null;
  query: string;
  /** False while the field is too short to have searched. */
  isSearchable: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onNavigate: (result: UserSearchResult) => void;
  /** Namespaces the input/option ids so two instances cannot collide. */
  idPrefix: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the highlighted row inside the scroll box. Without this, arrowing past
  // the fold moves the selection off-screen while the list stays put, and the
  // user is left following a cursor they cannot see.
  useEffect(() => {
    if (activeIndex < 0) return;
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!list || !option) return;

    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;

    if (optionTop < viewTop) list.scrollTop = optionTop;
    else if (optionBottom > viewBottom) list.scrollTop = optionBottom - list.clientHeight;
  }, [activeIndex]);

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (status === 'loading') {
    return (
      <div className="g-usearch-state" role="status" aria-live="polite">
        <Loader2 className="g-spin h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>Searching…</span>
      </div>
    );
  }

  /* ── Error ─────────────────────────────────────────────────────────────── */
  if (status === 'error') {
    return (
      <div className="g-usearch-state" role="alert">
        <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">Search unavailable</span>
          <span className="mt-0.5 block truncate text-subtle-foreground" title={error ?? undefined}>
            {error ?? 'Please try again in a moment.'}
          </span>
        </span>
      </div>
    );
  }

  /* ── Not enough characters yet ─────────────────────────────────────────── */
  if (!isSearchable) {
    return (
      <div className="g-usearch-state">
        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>Type at least 2 characters to find a coach or client.</span>
      </div>
    );
  }

  /* ── No results ────────────────────────────────────────────────────────── */
  if (results.length === 0) {
    return (
      <div className="g-usearch-state" role="status" aria-live="polite">
        <SearchX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0">
          No members match
          {query.trim() ? (
            <>
              {' '}
              <span className="font-semibold text-foreground">“{query.trim()}”</span>
            </>
          ) : null}
          .
        </span>
      </div>
    );
  }

  /* ── Results ───────────────────────────────────────────────────────────── */
  return (
    <ul ref={listRef} className="g-usearch-list" role="listbox" id={`${idPrefix}-list`} aria-label="User search results">
      {results.map((user, index) => {
        const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
        const display = fullName || user.username || 'Groove member';
        const roleLabel = user.role === 'coach' ? 'Coach' : user.role === 'client' ? 'Client' : 'Member';
        const location = [user.city_name, user.province_name].filter(Boolean).join(', ');
        const active = index === activeIndex;

        return (
          <li key={user.id} role="none">
            {/* A Link, not a button: the result IS a destination, so it must be
                openable in a new tab and must show a real href on hover. Enter is
                handled on the input via onNavigate, which routes to the same
                place. */}
            <Link
              href={`/userprofile/${user.id}`}
              id={`${idPrefix}-option-${index}`}
              role="option"
              aria-selected={active}
              data-index={index}
              data-active={active || undefined}
              // onMouseDown fires before the input's blur, so the panel is not
              // torn down by its own dismissal before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => {
                onActiveIndexChange(index);
                onNavigate(user);
              }}
              className="g-usearch-item"
            >
              <span className="g-usearch-avatar" aria-hidden="true">
                {user.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(user.firstname ?? 'G', user.lastname ?? 'M')
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="g-usearch-name">{display}</span>
                  <span
                    className={cn(
                      'g-pill shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em]',
                      user.role === 'coach' ? 'g-pill-accent' : ''
                    )}
                  >
                    {roleLabel}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle-foreground">
                  {user.username && <span className="truncate">@{user.username}</span>}
                  {location && (
                    <>
                      {user.username && (
                        <span aria-hidden="true" className="text-subtle-foreground/60">
                          ·
                        </span>
                      )}
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{location}</span>
                      </span>
                    </>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default UserSearchResults;
