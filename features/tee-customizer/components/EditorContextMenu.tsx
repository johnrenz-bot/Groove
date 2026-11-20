'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  LockOpen,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: 'danger';
}

interface EditorContextMenuProps {
  /** Viewport coordinates of the click that opened the menu. */
  x: number;
  y: number;
  locked: boolean;
  canBringForward: boolean;
  canBringToFront: boolean;
  canSendBackward: boolean;
  canSendToBack: boolean;
  onBringForward: () => void;
  onBringToFront: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 208;
const EDGE_GAP = 8;

/**
 * Floating artwork context menu. Opens at the pointer, flips around the
 * viewport edges, and closes on outside click, scroll or Escape.
 */
export function EditorContextMenu({
  x,
  y,
  locked,
  canBringForward,
  canBringToFront,
  canSendBackward,
  canSendToBack,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onDuplicate,
  onToggleLock,
  onDelete,
  onClose,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const height = menu?.offsetHeight ?? 260;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.min(Math.max(EDGE_GAP, x), viewportWidth - MENU_WIDTH - EDGE_GAP);
    const top =
      y + height + EDGE_GAP > viewportHeight
        ? Math.max(EDGE_GAP, y - height)
        : Math.max(EDGE_GAP, y);

    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleScroll = () => onClose();

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const moveSection: ContextMenuItem[] = [
    {
      id: 'bring-forward',
      label: 'Bring forward',
      icon: ChevronUp,
      onSelect: onBringForward,
    },
    {
      id: 'bring-to-front',
      label: 'Bring to front',
      icon: ArrowUpToLine,
      onSelect: onBringToFront,
    },
    {
      id: 'send-backward',
      label: 'Send backward',
      icon: ChevronDown,
      onSelect: onSendBackward,
    },
    {
      id: 'send-to-back',
      label: 'Send to back',
      icon: ArrowDownToLine,
      onSelect: onSendToBack,
    },
  ].filter((item) => {
    if (item.id === 'bring-forward') return canBringForward;
    if (item.id === 'bring-to-front') return canBringToFront;
    if (item.id === 'send-backward') return canSendBackward;
    return canSendToBack;
  });

  const actionSection: ContextMenuItem[] = [
    { id: 'duplicate', label: 'Duplicate', icon: Copy, onSelect: onDuplicate },
    {
      id: 'lock',
      label: locked ? 'Unlock' : 'Lock',
      icon: locked ? LockOpen : Lock,
      onSelect: onToggleLock,
    },
    { id: 'delete', label: 'Delete', icon: Trash2, onSelect: onDelete, tone: 'danger' },
  ];

  const sections = [moveSection, actionSection].filter((section) => section.length > 0);

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Artwork actions"
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: position?.left ?? x,
        top: position?.top ?? y,
        visibility: position ? 'visible' : 'hidden',
      }}
      className={cn(
        'fixed z-[80] w-[208px] origin-top-left overflow-hidden rounded-[12px] border border-border bg-surface p-1 shadow-[var(--shadow-lg)]',
        'animate-in fade-in zoom-in-95 duration-150'
      )}
    >
      {sections.map((section, index) => (
        <React.Fragment key={index}>
          {index > 0 && <div aria-hidden="true" className="mx-1 my-1 h-px bg-border" />}
          {section.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className={cn(
                  'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  item.tone === 'danger' && 'text-danger hover:bg-danger-soft'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(menu, document.body);
}

export default EditorContextMenu;
