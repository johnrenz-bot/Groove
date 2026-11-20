'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ProfileEditSection {
  id: string;
  label: string;
}

/**
 * Section navigator for the (long) edit form. Rendered as a pill rail of
 * anchor chips; the chip for the section currently in view is highlighted.
 *
 * Clicking scrolls with `behavior: 'smooth'` and focuses nothing by itself —
 * headings inside each Panel remain the tab order, so keyboard users are not
 * yanked around. On reduced-motion or when the element is missing, it falls
 * back to an instant jump.
 */
export function ProfileEditNav({ sections }: { sections: ProfileEditSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0.05, 0.2, 0.5] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Edit sections"
      className="sticky top-2 z-20 -mx-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/85 p-1.5 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0"
    >
      <div className="flex gap-1">
        {sections.map((section) => {
          const isActive = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => {
                const node = document.getElementById(section.id);
                if (!node) return;
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
                setActive(section.id);
              }}
              className={cn(
                'flex-none cursor-pointer rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                isActive
                  ? 'bg-accent-soft text-accent-text'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default ProfileEditNav;
