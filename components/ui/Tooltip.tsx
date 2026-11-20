'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

const POSITION: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/**
 * Minimal hover/focus tooltip. Pure CSS visibility driven by group
 * pseudo-classes so it stays cheap and works on touch (focus-within).
 */
export function Tooltip({
  label,
  side = 'right',
  children,
  className,
}: {
  label: string;
  side?: TooltipSide;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[90] whitespace-nowrap rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-[10px] font-medium leading-none text-foreground opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          POSITION[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}

export default Tooltip;
