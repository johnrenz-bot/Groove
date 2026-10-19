'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, LifeBuoy, Search, X } from 'lucide-react';
import {
  ALL_FAQS,
  FAQ_CATEGORIES,
  matchesFaq,
  type FaqCategory,
} from '@/lib/faq/faq-data';
import { FaqAccordion } from './FaqAccordion';
import { cn } from '@/components/shared/cn';

/**
 * THE FAQ BROWSER — search, category filter, and the accordion list.
 *
 * ONE component for the whole `/faq` page so the three controls cannot fall out
 * of step with each other. The search box and the category chips write to the
 * same query state, the list is derived from it, and the "no results" message
 * and the result count are derived from the same list — there is no second
 * count anywhere to disagree.
 *
 * WHEN THE LIST CHANGES, THE OPEN ANSWER IS CLEARED
 *   Filtering while an answer is open would otherwise leave an open panel
 *   whose question has scrolled out of the filtered set. `useEffect` is not
 *   used for this: the reset happens in the same click handler that changed the
 *   query, which keeps it a render-time consequence rather than a second pass.
 */

type Filter = { kind: 'all' } | { kind: 'category'; id: string };

export function FaqBrowser() {
  // `?q=` deep-links from the category directory at the bottom of the page.
  // Seeding state from the URL means the search box and the results agree on
  // first paint. Reading it here rather than in the page keeps `useSearchParams`
  // inside a client component, which is where the page's <Suspense> wraps it.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [openId, setOpenId] = useState<string | null>(null);

  /** Apply the category filter, then the search terms, to the whole set. */
  const results = useMemo(() => {
    const trimmed = query.trim();
    return ALL_FAQS.filter((entry) => {
      if (filter.kind === 'category' && entry.categoryId !== filter.id) return false;
      return matchesFaq(entry, trimmed);
    });
  }, [filter, query]);

  /** Reset the open answer whenever the visible set changes. */
  const applyQuery = useCallback((next: string) => {
    setQuery(next);
    setOpenId(null);
  }, []);
  const applyFilter = useCallback((next: Filter) => {
    setFilter(next);
    setOpenId(null);
  }, []);

  const total = ALL_FAQS.length;
  const activeCategory =
    filter.kind === 'category'
      ? FAQ_CATEGORIES.find((category) => category.id === filter.id)
      : undefined;

  const chips: Array<{ key: string; label: string; count: number; onClick: () => void; active: boolean }> = [
    {
      key: 'all',
      label: 'All questions',
      count: total,
      onClick: () => applyFilter({ kind: 'all' }),
      active: filter.kind === 'all',
    },
    ...FAQ_CATEGORIES.map((category: FaqCategory) => ({
      key: category.id,
      label: category.label,
      count: category.items.length,
      onClick: () => applyFilter({ kind: 'category', id: category.id }),
      active: filter.kind === 'category' && filter.id === category.id,
    })),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Search + count. `role="search"` on the wrapper so landmark users can
          jump here; the input has its own label for everyone else. */}
      <div className="faq-searchbar" role="search">
        <label htmlFor="faq-search" className="sr-only">
          Search the frequently asked questions
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => applyQuery(event.target.value)}
          placeholder="Search questions — try &ldquo;password&rdquo;, &ldquo;coach&rdquo;, &ldquo;booking&rdquo;"
          className="faq-search-input"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => applyQuery('')}
            aria-label="Clear search"
            // `h-8 w-8` (35px) rather than `p-1.5` around a `h-4` glyph — same
            // reason as the password toggle in components/ui/FormField.tsx: the
            // padded version fell under the 32px hit target once the root scaled.
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter. A radio group in substance, buttons in markup: these
          are filters, not navigation, so they do not get `role="tab"` and they
          do not change the URL. `aria-pressed` is what actually carries the
          selected state to assistive technology. */}
      <div className="faq-filters">
        <h2 className="sr-only">Filter by category</h2>
        <ul className="faq-chip-row">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.onClick}
                aria-pressed={chip.active}
                className={cn('faq-chip', chip.active && 'faq-chip--active')}
              >
                <span>{chip.label}</span>
                <span className="faq-chip-count">{chip.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Results. Announced on change so a screen-reader user hears the new
          count after filtering without having to go looking for it. */}
      <section aria-label="Frequently asked questions">
        <p className="sr-only" aria-live="polite">
          {results.length} of {total} questions shown
          {activeCategory ? ` in ${activeCategory.label}` : ''}.
        </p>

        <p className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{results.length}</span> of{' '}
          <span className="font-semibold text-accent-text">{total}</span> questions
          {activeCategory && (
            <>
              {' '}
              in <span className="font-semibold text-foreground">{activeCategory.label}</span>
            </>
          )}
          .
        </p>

        {results.length > 0 ? (
          <FaqAccordion
            items={results.map((entry) => ({
              id: entry.id,
              question: entry.question,
              answer: entry.answer,
            }))}
            openId={openId}
            onOpenChange={setOpenId}
          />
        ) : (
          <div className="faq-empty">
            <LifeBuoy className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-base font-semibold text-foreground">No questions match that.</p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Try a shorter search, or clear the filters and browse every category. If your
              question is not answered here, the Groove team can help directly.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  applyQuery('');
                  applyFilter({ kind: 'all' });
                }}
                className="faq-chip faq-chip--active"
              >
                Show all questions
              </button>
              <Link href="/#faq" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
                Back to the homepage FAQ
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default FaqBrowser;
