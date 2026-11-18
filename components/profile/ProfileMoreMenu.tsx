'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface ProfileMoreMenuItem {
  /** Stable key for the menu entry. */
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Renders in the destructive tone. */
  danger?: boolean;
}

/**
 * "More options" dropdown for profile pages.
 *
 * A small, honest menu: every entry performs a real action supplied by the
 * caller. Closes on Escape, on outside pointer-down, and after selection;
 * the trigger regains focus. Menu is `role="menu"`; entries are
 * `role="menuitem"` buttons with roving ArrowUp/ArrowDown focus.
 */
export function ProfileMoreMenu({
  items,
  label = 'More options',
  className,
}: {
  items: ProfileMoreMenuItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const focusItem = (index: number) => {
    const next = (index + items.length) % items.length;
    itemRefs.current[next]?.focus();
  };

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-lg)]"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  focusItem(index + 1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  focusItem(index - 1);
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:bg-muted',
                item.danger
                  ? 'text-danger hover:bg-danger-soft'
                  : 'text-foreground hover:bg-muted hover:text-accent-text'
              )}
            >
              {item.icon && (
                <span className="flex h-4 w-4 flex-none items-center justify-center text-muted-foreground" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfileMoreMenu;
