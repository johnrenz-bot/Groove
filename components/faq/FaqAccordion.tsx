'use client';

import React, { useCallback, useId, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * ONE QUESTION, ONE ANSWER — the disclosure primitive behind every FAQ list.
 *
 * THE ACCESSIBILITY CONTRACT (WAI-ARIA accordion, "button controls a region")
 *   - The heading is a real `<h3>` so the questions appear in the page's
 *     heading outline, and the trigger inside it is a `<button>`.
 *   - `aria-expanded` on the button is the state. `aria-controls` points at the
 *     panel's id.
 *   - The panel is a `<div role="region">` labelled by the button's id, so a
 *     screen-reader user can jump straight from the question to its answer.
 *   - Enter and Space toggle, which the native button already gives us. Arrow
 *     Up / Arrow Down move between questions, Home and End jump to the ends —
 *     that is the part the native button does NOT do, and it is what makes a
 *     long list usable without reaching for the mouse.
 *   - The panel is unmounted when closed rather than hidden with CSS, so its
 *     text never reaches the accessibility tree or a find-in-page while it is
 *     not on screen.
 */

export interface FaqAccordionItem {
  id: string;
  question: string;
  answer: string;
}

export function FaqAccordionItemRow({
  item,
  isOpen,
  onToggle,
  onNavigate,
}: {
  item: FaqAccordionItem;
  isOpen: boolean;
  onToggle: (id: string) => void;
  /** Move focus to another question in the same list. */
  onNavigate: (direction: 'prev' | 'next' | 'first' | 'last') => void;
}) {
  const reactId = useId();
  const baseId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const buttonId = `faq-q-${baseId}`;
  const panelId = `faq-a-${baseId}`;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onNavigate('next');
          break;
        case 'ArrowUp':
          event.preventDefault();
          onNavigate('prev');
          break;
        case 'Home':
          event.preventDefault();
          onNavigate('first');
          break;
        case 'End':
          event.preventDefault();
          onNavigate('last');
          break;
        default:
          break;
      }
    },
    [onNavigate]
  );

  return (
    <div className="faq-item" data-open={isOpen || undefined}>
      <h3 className="faq-item-heading">
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(item.id)}
          onKeyDown={handleKeyDown}
          className="faq-item-trigger"
        >
          <span className="faq-item-question">{item.question}</span>
          {/* The icon is decorative: aria-expanded on the button already says
              whether the answer is open, so a second signal would be noise. */}
          <span className="faq-item-marker" aria-hidden="true">
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </h3>

      {isOpen && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="faq-item-panel">
          <p className="faq-item-answer">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

/**
 * The list itself. Owns which items are open so the page above it only has to
 * decide WHICH items to show, never how they behave.
 *
 * `allowMultiple` is off by default: one open answer at a time keeps the list
 * scannable and is the pattern people expect from a FAQ.
 */
export function FaqAccordion({
  items,
  openId,
  onOpenChange,
  allowMultiple = false,
  className,
}: {
  items: FaqAccordionItem[];
  /** Id of the open item, or `null`. Ignored when `allowMultiple` is false. */
  openId?: string | null;
  onOpenChange: (id: string) => void;
  allowMultiple?: boolean;
  className?: string;
}) {
  // When the page above controls the open item (search results, category
  // filtering) that state wins; otherwise fall back to local state so the
  // component still works standalone, e.g. in the landing teaser.
  const [internalOpen, setInternalOpen] = React.useState<string[]>([]);
  const isControlled = openId !== undefined;
  const openSet = new Set(
    isControlled ? (openId ? [openId] : []) : internalOpen
  );

  const toggle = useCallback(
    (id: string) => {
      if (isControlled) {
        onOpenChange(openId === id ? '' : id);
        return;
      }
      setInternalOpen((previous) => {
        if (previous.includes(id)) return previous.filter((value) => value !== id);
        return allowMultiple ? [...previous, id] : [id];
      });
    },
    [allowMultiple, isControlled, onOpenChange, openId]
  );

  const listRef = useRef<HTMLDivElement>(null);

  /** Move focus to the trigger button for a neighbouring question. */
  const navigate = useCallback(
    (direction: 'prev' | 'next' | 'first' | 'last') => {
      const root = listRef.current;
      if (!root) return;
      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>('.faq-item-trigger')
      );
      if (triggers.length === 0) return;
      const current = triggers.findIndex((element) => element === document.activeElement);
      const fallback = current === -1 ? 0 : current;
      let target = fallback;
      if (direction === 'next') target = (fallback + 1) % triggers.length;
      else if (direction === 'prev') target = (fallback - 1 + triggers.length) % triggers.length;
      else if (direction === 'first') target = 0;
      else if (direction === 'last') target = triggers.length - 1;
      triggers[target]?.focus();
    },
    []
  );

  return (
    <div ref={listRef} className={cn('faq-list', className)}>
      {items.map((item) => (
        <FaqAccordionItemRow
          key={item.id}
          item={item}
          isOpen={openSet.has(item.id)}
          onToggle={toggle}
          onNavigate={navigate}
        />
      ))}
    </div>
  );
}

export default FaqAccordion;
