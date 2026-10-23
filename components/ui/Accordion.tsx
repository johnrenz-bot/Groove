'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface AccordionItem {
  id: string;
  title: string;
  summary?: React.ReactNode;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

/**
 * Secondary content folded away by default. Single-open, keyboard native
 * (`button` + `aria-expanded` + `aria-controls`), animated height only.
 */
export function Accordion({
  items,
  defaultOpenId,
  className = '',
}: {
  items: AccordionItem[];
  defaultOpenId?: string;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn('divide-y divide-divider overflow-hidden rounded-xl border border-border', className)}>
      {items.map((item) => {
        const open = item.id === openId;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
              aria-controls={`accordion-${item.id}`}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              {item.icon && <span className="shrink-0 text-accent-text">{item.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                {item.summary && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.summary}</span>
                )}
              </span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={`accordion-${item.id}`}
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;
