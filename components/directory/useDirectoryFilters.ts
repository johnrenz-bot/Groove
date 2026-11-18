'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_MAX_FEE,
  LOCATION_OPTIONS,
  DISCIPLINE_OPTIONS,
} from './types';

/**
 * One hook owns the directory's filter state — chips, search, fee, location —
 * and mirrors it into the URL (`?q=&discipline=&location=&maxFee=`) so filters
 * survive refresh and links are shareable.
 *
 * The page is a client component on a static route, so it cannot lean on
 * `useSearchParams()` (it would drag the whole route into the dynamic
 * serverless renderer). Instead the hook reads from `window.location.search`
 * after mount — SSR-safe, no new Suspense boundary, and the `#directory` hash
 * is deliberately left untouched.
 */
export function useDirectoryFilters(defaults?: { maxFee?: number }) {
  const DEFAULT_FEE = defaults?.maxFee ?? DEFAULT_MAX_FEE;

  const [queryInput, setQueryInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [discipline, setDiscipline] = useState('All');
  const [location, setLocation] = useState('All');
  const [maxFee, setMaxFee] = useState(DEFAULT_FEE);
  const [initialized, setInitialized] = useState(false);

  // 300ms debounce for the text query. Chips, menus and the slider are
  // applied immediately; only typing waits for the pause.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(queryInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  // Hydrate from the URL once, after mount. Reads window.location directly so
  // the page can stay static — no useSearchParams() Suspense tax. State sets
  // land inside a rAF callback so the effect itself stays side-effect-only.
  useEffect(() => {
    if (initialized) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const d = params.get('discipline') ?? params.get('talent');
        const l = params.get('location');
        const fee = params.get('maxFee');

        if (q) setQueryInput(q);
        if (d) {
          const match = DISCIPLINE_OPTIONS.find(
            (o) =>
              o.id.toLowerCase() === d.toLowerCase() ||
              o.label.toLowerCase().includes(d.toLowerCase())
          );
          if (match) setDiscipline(match.id);
        }
        if (l) {
          const match = LOCATION_OPTIONS.find(
            (o) =>
              o.id.toLowerCase() === l.toLowerCase() ||
              o.label.toLowerCase().includes(l.toLowerCase())
          );
          if (match) setLocation(match.id);
        }
        if (fee && Number.isFinite(Number(fee))) {
          const parsed = Math.min(5000, Math.max(300, Math.round(Number(fee))));
          setMaxFee(parsed);
        }
      } catch {
        /* URL access blocked — keep defaults */
      }
      setInitialized(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialized]);

  // Mirror into the URL (replace, never push) so shares resolve to the same
  // state without spamming history. Hash is left untouched.
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (queryInput.trim()) params.set('q', queryInput.trim());
    if (discipline !== 'All') params.set('discipline', discipline);
    if (location !== 'All') params.set('location', location);
    if (maxFee !== DEFAULT_FEE) params.set('maxFee', String(maxFee));

    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [queryInput, discipline, location, maxFee, initialized, DEFAULT_FEE]);

  const disciplineLabel = useMemo(
    () => DISCIPLINE_OPTIONS.find((o) => o.id === discipline)?.label ?? discipline,
    [discipline]
  );
  const locationLabel = useMemo(
    () => LOCATION_OPTIONS.find((o) => o.id === location)?.label ?? location,
    [location]
  );

  const activeFilterCount = useMemo(
    () =>
      [
        searchQuery !== '',
        discipline !== 'All',
        location !== 'All',
        maxFee < DEFAULT_FEE,
      ].filter(Boolean).length,
    [searchQuery, discipline, location, maxFee, DEFAULT_FEE]
  );

  const isFiltered = activeFilterCount > 0;

  const resetAll = useCallback(() => {
    setQueryInput('');
    setSearchQuery('');
    setDiscipline('All');
    setLocation('All');
    setMaxFee(DEFAULT_FEE);
  }, [DEFAULT_FEE]);

  const chips = useMemo(() => {
    const out: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (searchQuery)
      out.push({ id: 'q', label: `“${searchQuery}”`, onRemove: () => { setQueryInput(''); setSearchQuery(''); } });
    if (discipline !== 'All')
      out.push({ id: 'discipline', label: disciplineLabel, onRemove: () => setDiscipline('All') });
    if (location !== 'All')
      out.push({ id: 'location', label: locationLabel, onRemove: () => setLocation('All') });
    if (maxFee < DEFAULT_FEE)
      out.push({ id: 'maxFee', label: `Up to ₱${maxFee.toLocaleString()}`, onRemove: () => setMaxFee(DEFAULT_FEE) });
    return out;
  }, [searchQuery, discipline, location, maxFee, DEFAULT_FEE, disciplineLabel, locationLabel]);

  return {
    queryInput,
    setQueryInput,
    searchQuery,
    discipline,
    setDiscipline,
    disciplineLabel,
    location,
    setLocation,
    locationLabel,
    maxFee,
    setMaxFee,
    activeFilterCount,
    isFiltered,
    resetAll,
    chips,
  };
}
