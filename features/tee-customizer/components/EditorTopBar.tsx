'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Shuffle,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface EditorTopBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onRandomize: () => void;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
}

const ICON_BTN =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-[12px] border border-border bg-card text-muted-foreground transition-all hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35';

function IconAction({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(ICON_BTN, className)}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/**
 * Groove Studio editor chrome: navigation, history, reset and the three
 * primary actions (save / export / share). Below the large breakpoint the
 * secondary history actions and the save/export pair fold into one menu so
 * the bar never scrolls sideways on a phone.
 */
export function EditorTopBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onRandomize,
  onSave,
  onExport,
  onShare,
}: EditorTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const secondaryActions = [
    { label: 'Reset design', icon: RotateCcw, onClick: onReset },
    { label: 'Randomize design', icon: Shuffle, onClick: onRandomize },
    { label: 'Save design', icon: Save, onClick: onSave },
    { label: 'Export design', icon: Download, onClick: onExport },
  ];

  return (
    <header
      className="relative z-50 flex h-14 shrink-0 items-center gap-x-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] sm:gap-x-3 sm:px-4 sm:pt-0 max-md:h-[calc(52px+env(safe-area-inset-top))] md:h-14 max-md:px-2.5"
    >
      {/* Brand + navigation */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Tooltip label="Back to Groove PH" side="bottom">
          <Link
            href="/"
            aria-label="Back to Groove PH"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-border bg-card text-muted-foreground transition-all hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Tooltip>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/image/Shirts/Logo/Logo.png"
          alt=""
          className="hidden h-9 w-9 shrink-0 rounded-[10px] border border-border bg-[#f4f4f5] object-contain p-[5px] shadow-[var(--shadow-sm)] sm:block sm:h-10 sm:w-10 sm:p-[6px] sm:rounded-[11px]"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-none tracking-[-0.01em] text-foreground sm:text-base">
            Tee Customizer
          </h1>
        </div>
      </div>

      {/* History tools — reset/shuffle fold into the overflow menu on small screens */}
      <div
        className="flex items-center gap-1 rounded-[12px] border border-border bg-card/50 p-1"
        role="group"
        aria-label="History"
      >
        <IconAction label="Undo (Ctrl/Cmd+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </IconAction>
        <IconAction label="Redo (Ctrl/Cmd+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </IconAction>
        <span aria-hidden="true" className="hidden h-5 w-px bg-border lg:block" />
        <div className="hidden items-center gap-1 lg:flex">
          <IconAction label="Reset design" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </IconAction>
          <IconAction label="Randomize design" onClick={onRandomize}>
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          </IconAction>
        </div>
      </div>

      {/* Primary actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0 lg:gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="hidden h-9 px-3 max-lg:hidden lg:inline-flex"
          icon={<Save className="h-4 w-4" aria-hidden="true" />}
          onClick={onSave}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="hidden h-9 px-3 max-lg:hidden lg:inline-flex"
          icon={<Download className="h-4 w-4" aria-hidden="true" />}
          onClick={onExport}
        >
          Export
        </Button>
        <Button
          size="sm"
          className="h-9 px-3 sm:px-4"
          icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
          onClick={onShare}
        >
          <span className="hidden sm:inline">Share</span>
        </Button>

        {/* Overflow: save/export (tablet) + reset/shuffle/save/export (phone) */}
        <div ref={menuRef} className="relative lg:hidden">
          <Tooltip label="More actions" side="bottom">
            <button
              type="button"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={ICON_BTN}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
          {menuOpen && (
            <div
              role="menu"
              aria-label="More actions"
              className="absolute right-0 top-full z-[70] mt-2 w-[196px] overflow-hidden rounded-[12px] border border-border bg-surface p-1 shadow-[var(--shadow-lg)] animate-in fade-in zoom-in-95 duration-150"
            >
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                const hideOnTablet =
                  action.label === 'Reset design' || action.label === 'Randomize design';
                return (
                  <button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      action.onClick();
                    }}
                    className={cn(
                      'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      hideOnTablet && 'md:hidden'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default EditorTopBar;
