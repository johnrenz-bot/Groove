'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Award, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { FeatureProgress } from './FeatureProgress';

export type SuccessNotificationTone = 'success' | 'achievement' | 'danger';

export interface SuccessNotificationProgress {
  completed: number;
  total: number;
  label?: string;
}

export interface SuccessNotificationAction {
  label: string;
  onClick: () => void;
}

export interface SuccessNotificationOptions {
  title: string;
  description?: string;
  /** Lucide icon element shown in the leading medallion. */
  icon?: React.ReactNode;
  tone?: SuccessNotificationTone;
  /** Auto-dismiss delay in ms. 0 keeps the toast until dismissed. */
  duration?: number;
  /**
   * Collapses repeated triggers of the same event. Identical keys are ignored
   * while the toast is visible and for a short cool-down afterwards.
   */
  dedupeKey?: string;
  progress?: SuccessNotificationProgress;
  action?: SuccessNotificationAction;
}

interface NotificationItem extends SuccessNotificationOptions {
  id: string;
  tone: SuccessNotificationTone;
  duration: number;
}

interface SuccessNotificationContextValue {
  notifySuccess: (options: SuccessNotificationOptions) => string | null;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const SuccessNotificationContext = createContext<SuccessNotificationContextValue>({
  notifySuccess: () => null,
  dismiss: () => undefined,
  dismissAll: () => undefined,
});

const DEFAULT_DURATION = 5200;
const DEDUPE_WINDOW_MS = 6000;
const MAX_VISIBLE = 3;

let notificationCounter = 0;

function nextNotificationId() {
  notificationCounter += 1;
  return `groove-toast-${Date.now()}-${notificationCounter}`;
}

/**
 * Global success notification host.
 *
 * Mounted once in the root layout so any route can announce a completed action.
 * The toast sits at the top centre of the viewport, above the page and the
 * header, and animates down into place with a restrained ease-out settle.
 *
 * The queue lives here (not in each page) so stacking, duplicate suppression,
 * and dismissal stay consistent across client, coach, admin and public routes.
 */
export function SuccessNotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Mirrors `items` for synchronous dedupe checks inside notifySuccess, where a
  // state updater cannot be relied on to run before the next call.
  const itemsRef = useRef<NotificationItem[]>([]);
  const recentKeysRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    const next = itemsRef.current.filter((item) => item.id !== id);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const dismissAll = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  const notifySuccess = useCallback((options: SuccessNotificationOptions): string | null => {
    const dedupeKey = options.dedupeKey;
    const now = Date.now();

    if (dedupeKey) {
      const lastShown = recentKeysRef.current.get(dedupeKey);
      const alreadyVisible = itemsRef.current.some((item) => item.dedupeKey === dedupeKey);
      if (alreadyVisible || (lastShown !== undefined && now - lastShown < DEDUPE_WINDOW_MS)) {
        return null;
      }
      recentKeysRef.current.set(dedupeKey, now);

      // Keep the cool-down map from growing forever on long-lived sessions.
      if (recentKeysRef.current.size > 40) {
        for (const [key, shownAt] of recentKeysRef.current) {
          if (now - shownAt >= DEDUPE_WINDOW_MS) recentKeysRef.current.delete(key);
        }
      }
    }

    const item: NotificationItem = {
      ...options,
      id: nextNotificationId(),
      tone: options.tone ?? 'success',
      duration: options.duration ?? DEFAULT_DURATION,
    };

    const next = [...itemsRef.current, item].slice(-MAX_VISIBLE);
    itemsRef.current = next;
    setItems(next);

    return item.id;
  }, []);

  const value = useMemo(
    () => ({ notifySuccess, dismiss, dismissAll }),
    [notifySuccess, dismiss, dismissAll]
  );

  return (
    <SuccessNotificationContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[130] flex flex-col items-center gap-2 px-3 sm:px-4"
            style={{ top: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
            role="region"
            aria-label="Success notifications"
            aria-live="polite"
            aria-atomic="false"
            data-lenis-prevent
          >
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <NotificationCard key={item.id} item={item} onDismiss={dismiss} />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </SuccessNotificationContext.Provider>
  );
}

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, onDismiss]);

  const isDanger = item.tone === 'danger';
  const defaultIcon = isDanger ? (
    <AlertCircle className="h-4 w-4" aria-hidden="true" />
  ) : item.tone === 'achievement' ? (
    <Award className="h-4 w-4" aria-hidden="true" />
  ) : (
    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
  );

  return (
    <motion.div
      layout="position"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -26, scale: 0.975 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.985 }}
      transition={
        reduceMotion
          ? { duration: 0.12 }
          : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
      }
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-full max-w-[27rem] items-start gap-3 rounded-2xl border px-3.5 py-3',
        'bg-[#111110]/95 text-[#f7f0e1] shadow-[0_18px_50px_-18px_rgba(0,0,0,0.92)]',
        'backdrop-blur-md supports-[backdrop-filter]:bg-[#111110]/88',
        isDanger ? 'border-danger/40' : 'border-[var(--brand-sunburst-border)]'
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border',
          isDanger
            ? 'border-danger/35 bg-danger/15 text-danger'
            : 'border-[var(--brand-sunburst-border)] bg-[rgba(244,190,77,0.14)] text-[var(--brand-sunburst)]'
        )}
        aria-hidden="true"
      >
        {item.icon ?? defaultIcon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-snug text-[#f7f0e1]">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[#c9c1b2]">{item.description}</p>
        )}
        {item.progress && (
          <FeatureProgress
            className="mt-2"
            size="sm"
            onDark
            showLabel={false}
            completed={item.progress.completed}
            total={item.progress.total}
            label={item.progress.label}
            ariaLabel={`${item.progress.label ?? 'Progress'}: ${item.progress.completed} of ${item.progress.total}`}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-start">
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="inline-flex h-8 cursor-pointer items-center rounded-full border border-[rgba(244,190,77,0.4)] bg-[rgba(244,190,77,0.1)] px-2.5 text-[11px] font-semibold text-[#f4be4d] transition-colors hover:bg-[rgba(244,190,77,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)]"
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss notification"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#a8a093] transition-colors hover:bg-white/10 hover:text-[#f7f0e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

/** Trigger global success notifications from any client component. */
export function useSuccessNotifications() {
  return useContext(SuccessNotificationContext);
}

export default SuccessNotificationProvider;
