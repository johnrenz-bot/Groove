'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The loading/error/data state machine every admin page needs.
 *
 * The old admin pages each hand-rolled `useState({loading, data, error})` plus
 * a `useCallback` fetcher, which is why several of them silently swallowed
 * errors — the `catch` only logged, and the page rendered as if it were merely
 * empty. Here a failure is a first-class state the caller must render.
 *
 * Guards against the two classic bugs: setting state after unmount, and a
 * slow first request overwriting the result of a later retry (only the newest
 * request is allowed to commit).
 */
export function useAdminData<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monotonic request id: a stale response can never clobber a newer one.
  const requestId = useRef(0);
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (!mounted.current || id !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      // Keep the previous data visible behind the error banner where we have
      // it, so a transient failure does not blank a populated screen.
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: run, setData };
}

/**
 * Tracks a single in-flight mutation (saving, deleting) and surfaces its error.
 * Admin actions are destructive enough that each one needs its own spinner and
 * its own error path rather than sharing the page's loading flag.
 */
export function useAdminAction() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
      setPending(key);
      setError(null);
      try {
        return await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The action could not be completed.');
        return undefined;
      } finally {
        setPending(null);
      }
    },
    []
  );

  return { pending, error, setError, run };
}