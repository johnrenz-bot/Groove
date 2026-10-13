'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import {
  descriptionFor,
  hrefFor,
  isDropdown,
  labelFor,
  type NavLeaf,
  type NavRole,
  type NavSection,
} from './navConfig';

/** Matches the 160ms panel transition in globals.css. */
const EXIT_MS = 160;

/**
 * A dropdown trigger plus its panel.
 *
 * OPENS TWO WAYS, ON PURPOSE
 *   Hover is what a pointer wants: the panel appears under the cursor without a
 *   click, and moving into it is one motion. Click is what a keyboard wants, and
 *   what a touch device has no alternative to. Both drive the same state, so the
 *   two never disagree about whether something is open.
 *
 *   The 120ms close delay exists for the gap between trigger and panel. Without
 *   it, a pointer travelling diagonally across that gap crosses a band where it
 *   is over neither, the menu closes, and the user has to come back for it.
 *
 * ARIA
 *   `aria-haspopup="menu"` + `aria-expanded` on the trigger, `role="menu"` on
 *   the panel, `role="menuitem"` on the links. Arrow keys move a roving
 *   highlight WITHOUT moving DOM focus (focus stays on the panel), which is the
 *   pattern a menu requires — moving focus into the list would make Tab behave
 *   unexpectedly and would strand a screen-reader user.
 */
export function NavDropdown({
  section,
  role,
  pathname,
  active,
  open,
  onOpen,
  onClose,
  onNavigate,
}: {
  section: NavSection;
  role: NavRole;
  /**
   * Current path, passed in rather than read from `window`. Reading
   * `window.location` during render would give the server a different answer
   * than the client on the very first paint, which React reports as a
   * hydration mismatch, and would silently mark the wrong item live after any
   * client-side navigation.
   */
  pathname: string;
  /** True when the current route is inside this section. */
  active: boolean;
  /**
   * Whether this panel is open — decided by `<Header>`, not here.
   *
   * The header owns ONE value for every surface in the bar. When each dropdown
   * kept its own `open`, two of them could be open at once: the menus did not
   * know about each other, so opening the profile menu left the Community menu
   * hanging underneath it, and the only visible symptom was two overlapping
   * panels the user had to guess between.
   */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  // Kept mounted for EXIT_MS so the panel can animate out. Without this, closing
  // is an instant disappearance and the whole bar feels like it blinks. This is
  // the only piece of open-state kept locally, because it is about the ANIMATION
  // rather than about which menu is open.
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const closeTimer = useRef<number | null>(null);
  /**
   * Whether the CURRENT open state came from a hover.
   *
   * Without this, a pointer user breaks the menu: moving onto the trigger fires
   * `mouseenter` and opens the panel, and the click that follows — which is what
   * actually put the cursor there — then reads "already open" and closes it
   * again. The menu appears and vanishes under one deliberate motion.
   *
   * So the click is read as "pin it open" when the hover already opened it, and
   * as a genuine toggle otherwise. Touch and keyboard never set this, so they
   * get the toggle they expect.
   */
  const openedByHover = useRef(false);
  const menuId = useId();

  const items = (section.items ?? []) as NavLeaf[];
  const dropdown = isDropdown(section);

  const clearTimers = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  /** Parent closes us; we only handle the unmount delay and the highlight. */
  const close = useCallback(() => {
    clearTimers();
    openedByHover.current = false;
    onClose();
    setActiveIndex(-1);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    closeTimer.current = timer;
  }, [clearTimers, onClose]);

  const openNow = useCallback(
    (index?: number) => {
      clearTimers();
      setMounted(true);
      onOpen();
      setActiveIndex(index ?? -1);
    },
    [clearTimers, onOpen]
  );

  const scheduleClose = useCallback(() => {
    clearTimers();
    openedByHover.current = false;
    closeTimer.current = window.setTimeout(() => {
      onClose();
      setActiveIndex(-1);
    }, 120);
  }, [clearTimers, onClose]);

  const cancelClose = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // Escape returns focus to the trigger that opened the panel.
  //
  // Outside-click is NOT handled here: the header owns it, because "outside"
  // has to mean outside the whole bar. A click on the profile trigger is
  // outside THIS dropdown, so a per-dropdown handler would close the Community
  // menu and then the click would open the profile menu — two handlers racing
  // over one click.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const focusItem = useCallback((index: number) => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }, []);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!dropdown) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openNow(0);
      // Focus moves on the next frame so the panel exists in the DOM first.
      window.requestAnimationFrame(() => focusItem(0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openNow(items.length - 1);
      window.requestAnimationFrame(() => focusItem(items.length - 1));
    }
  };

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem((activeIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case 'Tab':
        // Tabbing out of a menu should close it, or the panel lingers over
        // whatever the user moved to.
        close();
        break;
    }
  };

  // A plain link (no items) is rendered as a link, not a button — the semantics
  // of "this navigates" and "this opens a menu" are not interchangeable, and a
  // button that navigates breaks middle-click and open-in-new-tab.
  if (!dropdown) {
    return (
      <Link
        href={section.href ?? '#'}
        data-nav-id={section.id}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
        className="hx-link"
        onClick={onNavigate}
      >
        <section.icon className="hx-link-icon" aria-hidden="true" />
        {section.label}
      </Link>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="hx-dropdown"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onFocus={cancelClose}
      onBlur={(event) => {
        // Only close when focus leaves the whole dropdown, not when it moves
        // from the trigger to an item inside the panel.
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        data-nav-id={section.id}
        data-active={active || undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={mounted ? menuId : undefined}
        onClick={() => {
          // See `openedByHover`. A click that follows a hover means "keep it
          // open", not "toggle it shut".
          if (openedByHover.current) {
            openedByHover.current = false;
            openNow();
            return;
          }
          if (open) close();
          else openNow();
        }}
        onMouseEnter={() => {
          openedByHover.current = true;
          openNow();
        }}
        onKeyDown={onTriggerKeyDown}
        className="hx-link hx-link--trigger"
      >
        <section.icon className="hx-link-icon" aria-hidden="true" />
        {section.label}
        {/* No chevron. It was a 0.875rem glyph with a 0.6-opacity stroke sitting
            6px from the label, and at this type size it read as a stray mark
            rather than as an affordance — most visibly beside "Community",
            whose label is already the longest in the row. `aria-haspopup` and
            `aria-expanded` still announce that the trigger opens something, and
            the hover/active fills carry the affordance visually. */}
      </button>

      {mounted && (
        <div
          id={menuId}
          role="menu"
          aria-label={section.label}
          data-state={open ? 'open' : 'closed'}
          onKeyDown={onPanelKeyDown}
          className="hx-panel"
        >
          {section.heading && (
            <p className="hx-panel-heading" aria-hidden="true">
              {section.heading}
            </p>
          )}
          <div className="hx-panel-body">
            {items.map((item, index) => {
              const href = hrefFor(item, role);
              const description = descriptionFor(item, role);
              return (
                <Link
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  href={href}
                  role="menuitem"
                  tabIndex={activeIndex === index ? 0 : -1}
                  aria-current={isRouteActive(href, pathname) ? 'page' : undefined}
                  onClick={() => {
                    onNavigate?.();
                    close();
                  }}
                  className="hx-panel-item"
                >
                  <span className="hx-panel-item-icon" aria-hidden="true">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="hx-panel-item-text">
                    <span className="hx-panel-item-label">{labelFor(item, role)}</span>
                    {description && (
                      <span className="hx-panel-item-desc">{description}</span>
                    )}
                  </span>
                  <ChevronRight className="hx-panel-item-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A route is current when it matches exactly or is an ancestor of the path.
 * The hash is stripped first: `/client/talent#directory` and `/client/talent`
 * are the same page, and a hash must not be mistaken for a different
 * destination — otherwise every tab of a tabbed page reads as "not here".
 */
export function isRouteActive(href: string, pathname: string): boolean {
  const [path] = href.split('#');
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default NavDropdown;
