'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/components/shared/cn';

/**
 * The table primitive every admin list uses.
 *
 * Deliberately unopinionated about columns so one component can render users,
 * bookings, tickets, agreements, and the activity log without a bespoke copy per
 * page. It owns the four things that are easy to get subtly wrong when each
 * page does them by hand:
 *
 *   - horizontal scroll containment on narrow screens,
 *   - a real loading skeleton shaped like the real table,
 *   - the empty state, worded for whether filters are active,
 *   - row-key stability so React does not thrash when a page sorts or filters.
 */

export interface AdminColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Receives the whole row so cells can show multiple fields. */
  cell: (row: T) => React.ReactNode;
  /** Hidden below this breakpoint to keep phones readable */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

const HIDE_CLASS: Record<NonNullable<AdminColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function AdminTable<T extends { id: string | number }>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty,
  onRowClick,
  sortKey,
  sortDirection = 'desc',
  onSortChange,
  className = '',
  footer,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  skeletonRows?: number;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string) => void;
  className?: string;
  footer?: React.ReactNode;
}) {
  const visibleCount = columns.filter((c) => !c.hideBelow).length;

  if (loading) {
    return (
      <div className={cn('g-card overflow-hidden', className)}>
        <div className="flex gap-4 border-b border-border bg-muted px-5 py-3.5">
          {columns.map((c) => (
            <div key={c.key} className={cn('flex-1', c.hideBelow && HIDE_CLASS[c.hideBelow])}>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        {Array.from({ length: skeletonRows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
            {columns.map((c) => (
              <div key={c.key} className={cn('flex-1', c.hideBelow && HIDE_CLASS[c.hideBelow])}>
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={className}>{empty ?? <EmptyState title="No records" />}</div>;
  }

  return (
    <div className={cn('g-card overflow-hidden', className)}>
      {/* Horizontal scroll containment: on a phone this scrolls sideways instead
          of breaking the dashboard layout. */}
      <div className="g-scroll w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    'px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground',
                    c.hideBelow && HIDE_CLASS[c.hideBelow],
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center'
                  )}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(c.key)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground',
                        sortKey === c.key && 'text-accent-text'
                      )}
                    >
                      {c.header}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-divider transition-colors last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-muted'
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-5 py-4 align-middle text-sm',
                      c.hideBelow && HIDE_CLASS[c.hideBelow],
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center'
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="flex items-center justify-between gap-4 border-t border-divider px-5 py-3.5 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Search input + filter selects, the standard control bar above a table. */
export function AdminToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
  className = '',
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="relative flex-1">
        <label htmlFor="admin-search" className="sr-only">
          Search
        </label>
        <input
          id="admin-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="g-input cursor-text pl-4"
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Filter dropdown built on the shared Input/Select styles so it matches the rest. */
export function AdminFilter({
  value,
  onChange,
  label,
  options,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="g-input cursor-pointer pr-8"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Segment control for switching between tabs of related data. */
export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: { value: T; label: string; count?: number; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('flex flex-wrap items-center gap-1.5 rounded-full border border-border bg-card p-1', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'tabular-nums',
                  active ? 'text-accent-foreground/70' : 'text-subtle-foreground'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Client-side pagination. The admin datasets here are platform-sized, not
 * user-scale, so paging the fetched array avoids a round trip per page and
 * keeps filtering and sorting instant.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  className = '',
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total: number;
  pageSize: number;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <p className="tabular-nums">
        Showing <span className="font-semibold text-foreground">{from}</span>–
        <span className="font-semibold text-foreground">{to}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Paginate an already-filtered array. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    page: safePage,
    pageCount,
    slice: rows.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}