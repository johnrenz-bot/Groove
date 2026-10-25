'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { SELF_ASSIGNABLE, statusMeta, type Presence } from '../utils/presence';
import { usePresence, useSetPresence } from '../hooks/usePresence';
import { cn } from '@/components/shared/cn';

/**
 * Presence selector for coaches and clients.
 */

/** The indicator, shared by the option rows and the account trigger. */
export function PresenceDot({
  status,
  size = 'md',
}: {
  status: Presence | string | null | undefined;
  /** `sm` for the badge on an avatar, `md` for an option row. */
  size?: 'sm' | 'md';
}) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        'rounded-full ring-2 ring-card',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        meta.value === 'online' ? 'bg-success' :
        meta.value === 'away' ? 'bg-warning' :
        meta.value === 'busy' ? 'bg-danger' : 'bg-muted-foreground'
      )}
      role="img"
      aria-label={`Status: ${meta.label}`}
      title={`Status: ${meta.label}`}
    />
  );
}

/**
 * The collapsed presence control: one row showing ONLY the current status,
 * which opens the option list when activated.
 */
export function StatusSelect({
  userId,
  fallbackStatus,
}: {
  userId: string;
  /** The value from the caller's own fetched row, for the first paint. */
  fallbackStatus?: string | null;
}) {
  const current = usePresence(userId, fallbackStatus);
  const save = useSetPresence(userId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const meta = statusMeta(current);

  const focusOption = useCallback((index: number) => {
    const count = SELF_ASSIGNABLE.length;
    const next = ((index % count) + count) % count;
    optionRefs.current[SELF_ASSIGNABLE[next].value]?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const selected = SELF_ASSIGNABLE.findIndex((option) => option.value === current);
    const timer = window.setTimeout(() => focusOption(Math.max(0, selected)), 0);

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, current, focusOption]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = SELF_ASSIGNABLE.map((option) => optionRefs.current[option.value]).filter(
      (node): node is HTMLButtonElement => Boolean(node)
    );
    const active = buttons.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(active + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(active <= 0 ? SELF_ASSIGNABLE.length - 1 : active - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(SELF_ASSIGNABLE.length - 1);
        break;
      default:
        return;
    }
  };

  const choose = async (next: Presence) => {
    if (next === current || saving) return;
    setOpen(false);
    setSaving(true);
    setError(null);
    try {
      await save(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Your status could not be changed. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-bold transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'ring-1 ring-accent-border'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        title={`Status: ${meta.label} — change`}
      >
        <PresenceDot status={current} size="sm" />
        <span className="text-foreground">{meta.label}</span>
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown
            className={cn(
              'h-3 w-3 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[110] mt-1 w-40 rounded-2xl border border-accent-border bg-card/95 shadow-xl backdrop-blur-md p-1 animate-in fade-in zoom-in-95 duration-150"
          role="radiogroup"
          aria-label="Your status"
          onKeyDown={onMenuKeyDown}
        >
          {SELF_ASSIGNABLE.map(({ value, label, hint }) => {
            const active = current === value;
            return (
              <button
                key={value}
                ref={(node) => {
                  optionRefs.current[value] = node;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => void choose(value)}
                className={cn(
                  'flex items-center justify-between w-full rounded-xl px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/50'
                )}
                title={hint}
              >
                <div className="flex items-center gap-2">
                  <PresenceDot status={value} size="sm" />
                  <span>{label}</span>
                </div>
                {active && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="status" className="absolute top-full right-0 mt-1 text-[10px] font-medium text-danger whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}

export default StatusSelect;
