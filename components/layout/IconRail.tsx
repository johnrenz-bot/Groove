'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/components/shared/cn';

export interface IconRailItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

export interface IconRailProps {
  items: IconRailItem[];
  className?: string;
}

export function IconRail({ items, className = '' }: IconRailProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex w-16 flex-col items-center gap-2 border-r border-white/8 bg-black py-4',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={cn(
              'group relative flex h-11 w-11 items-center justify-center rounded-[12px] text-white/60 transition-colors hover:bg-white/8 hover:text-white',
              item.active && 'bg-white/10 text-[#f4be4d]'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-black px-2 py-1 text-xs text-white group-hover:block">
              {item.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}

export default IconRail;
