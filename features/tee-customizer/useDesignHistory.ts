'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { TeeDesign } from './types';

const HISTORY_LIMIT = 60;
const COALESCE_WINDOW_MS = 900;

interface HistoryState {
  past: TeeDesign[];
  present: TeeDesign;
  future: TeeDesign[];
}

export interface DesignUpdateOptions {
  /**
   * Consecutive updates with the same key inside the coalesce window become one
   * undo step. Sliders and drag gestures use this so undo does not step through
   * every pointer event.
   */
  coalesce?: string;
  /** Update the canvas without touching undo history. */
  record?: boolean;
}

export function useDesignHistory(initialDesign: TeeDesign | (() => TeeDesign)) {
  const [state, setState] = useState<HistoryState>(() => ({
    past: [],
    present: typeof initialDesign === 'function' ? initialDesign() : initialDesign,
    future: [],
  }));
  const stateRef = useRef(state);
  const lastCoalesceKey = useRef<string | null>(null);
  const lastCoalesceAt = useRef(0);

  const apply = useCallback((next: HistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const update = useCallback(
    (
      updater: TeeDesign | ((previous: TeeDesign) => TeeDesign),
      options: DesignUpdateOptions = {}
    ) => {
      const previous = stateRef.current;
      const next = typeof updater === 'function' ? updater(previous.present) : updater;
      if (next === previous.present) return;

      if (options.record === false) {
        apply({ ...previous, present: next });
        return;
      }

      const now = Date.now();
      const coalesce = options.coalesce;
      const isCoalesced =
        Boolean(coalesce) &&
        lastCoalesceKey.current === coalesce &&
        now - lastCoalesceAt.current < COALESCE_WINDOW_MS;

      if (coalesce) {
        lastCoalesceKey.current = coalesce;
        lastCoalesceAt.current = now;
      } else {
        lastCoalesceKey.current = null;
      }

      if (isCoalesced) {
        apply({ past: previous.past, present: next, future: [] });
        return;
      }

      apply({
        past: [...previous.past, previous.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      });
    },
    [apply]
  );

  const undo = useCallback(() => {
    const previous = stateRef.current;
    if (!previous.past.length) return;
    const nextPresent = previous.past[previous.past.length - 1];
    lastCoalesceKey.current = null;
    apply({
      past: previous.past.slice(0, -1),
      present: nextPresent,
      future: [previous.present, ...previous.future].slice(0, HISTORY_LIMIT),
    });
  }, [apply]);

  const redo = useCallback(() => {
    const previous = stateRef.current;
    if (!previous.future.length) return;
    const nextPresent = previous.future[0];
    lastCoalesceKey.current = null;
    apply({
      past: [...previous.past, previous.present].slice(-HISTORY_LIMIT),
      present: nextPresent,
      future: previous.future.slice(1),
    });
  }, [apply]);

  /** Load an imported/shared design and start a fresh history. */
  const load = useCallback(
    (design: TeeDesign) => {
      lastCoalesceKey.current = null;
      apply({ past: [], present: design, future: [] });
    },
    [apply]
  );

  return useMemo(
    () => ({
      design: state.present,
      update,
      load,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      historyLength: state.past.length,
    }),
    [state, update, load, undo, redo]
  );
}
