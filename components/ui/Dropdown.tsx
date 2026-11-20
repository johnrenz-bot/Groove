'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Shared dropdown / context menu. Panel: --bg-surface, 1px --border-strong,
 * 12px radius, 6px padding. Items 36-40px, 8px radius, hover --bg-hover.
 * Destructive items red. Fade+scale 150ms.
 */
export function Dropdown({ trigger, items, align = 'right', open: controlledOpen, onOpenChange }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => { setInternalOpen(v); onOpenChange?.(v); };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open && (
        <div
          className={cn(
            'absolute z-[1200] mt-2 min-w-[180px] rounded-[12px] border border-border-strong bg-surface p-1.5 shadow-[var(--shadow-md)]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          style={{ animation: 'g-modal-in 150ms ease-out' }}
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="my-1 h-px bg-border" />;
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm transition-colors',
                  item.destructive
                    ? 'text-danger hover:bg-danger-soft'
                    : 'text-foreground hover:bg-hover'
                )}
              >
                {item.icon && <span className="shrink-0 text-muted-foreground">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dropdown;