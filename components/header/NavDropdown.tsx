'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

import type { HeaderDropdownItem, HeaderNavItem } from './appHeaderConfig';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import {
  translateDropdownItem,
  translateGroup,
  translateSectionLabel,
} from './headerText';
import { isRouteActive } from './routeMatch';
import { useLocationHash } from './useLocationHash';
import type { NavRole } from './navConfig';

/** Matches the panel exit animation in globals.css. */
const EXIT_MS = 160;

/**
 * A top-level navigation trigger plus its panel.
 *
 * Hover and click drive the same open state. The 220ms close delay is the hover
 * intent: crossing the gap between trigger and panel must not dismiss the menu.
 * A click that follows a hover is read as "pin it", not "toggle it shut".
 *
 * The panel measures itself before paint and shifts horizontally when it would
 * leave the viewport, so the right-most Community menu is not clipped on a
 * laptop and the left-most Dashboard menu is not clipped on a phone.
 */
export function NavDropdown({
  item,
  items,
  role,
  pathname,
  active,
  open,
  onOpen,
  onClose,
  onNavigate,
  onHover,
}: {
  item: HeaderNavItem;
  items: HeaderDropdownItem[];
  role: NavRole;
  pathname: string;
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onNavigate?: () => void;
  onHover?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [shift, setShift] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const closeTimer = useRef<number | null>(null);
  const openedByHover = useRef(false);
  const openRef = useRef(open);
  const menuId = useId();

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const dropdown = Boolean(item.dropdown);
  const { language } = useLanguage();
  const hash = useLocationHash();
  const label = translateSectionLabel(role, language, item.id, item.label);

  const clearTimers = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

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
      // Moving from one trigger to its neighbour opens the neighbour first.
      // The departing menu's delayed close must not then close the menu that
      // just opened, so it only runs while this trigger is still the open one.
      if (!openRef.current) return;
      onClose();
      setActiveIndex(-1);
    }, 220);
  }, [clearTimers, onClose]);

  const cancelClose = useCallback(() => clearTimers(), [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // The header owns a single `openMenu`, so a route change or opening another
  // surface flips `open` to false without calling this component's `close`.
  // Unmount the panel after the exit animation in that case too; otherwise a
  // closed panel stays in the DOM and can keep capturing pointer events.
  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  /**
   * Collision-aware placement. Measured after mount and before paint, so the
   * panel never appears clipped and then jumps inward.
   *
   * Measured from the WRAPPER's centre and `offsetWidth`, not from the panel's
   * rect: the rect already contains the correction transform applied last time,
   * so a resize would otherwise compound the shift.
   */
  const positionPanel = useCallback(() => {
    const panel = panelRef.current;
    const wrap = wrapperRef.current;
    if (!panel || !wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    const centre = wrapRect.left + wrapRect.width / 2;
    const width = panel.offsetWidth;
    const gutter = 8;

    let next = 0;
    const left = centre - width / 2;
    const right = centre + width / 2;
    if (left < gutter) next = gutter - left;
    else if (right > window.innerWidth - gutter) next = window.innerWidth - gutter - right;

    setShift((current) => (Math.abs(current - next) < 1 ? current : next));
  }, []);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    positionPanel();
  }, [open, mounted, items.length, positionPanel]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', positionPanel);
    return () => window.removeEventListener('resize', positionPanel);
  }, [open, positionPanel]);

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
        close();
        break;
    }
  };

  if (!dropdown) {
    return (
      <Link
        href={item.href ?? '#'}
        data-nav-id={item.id}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
        className="hx-link"
        onClick={onNavigate}
        onMouseEnter={onHover}
      >
        <item.icon className="hx-link-icon" aria-hidden="true" />
        {label}
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
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        data-nav-id={item.id}
        data-active={active || undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={mounted ? menuId : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => {
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
          onHover?.();
        }}
        onKeyDown={onTriggerKeyDown}
        className="hx-link hx-link--trigger"
      >
        <item.icon className="hx-link-icon" aria-hidden="true" />
        {label}
        <ChevronDown className="hx-link-caret" aria-hidden="true" />
      </button>

      {mounted && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          data-state={open ? 'open' : 'closed'}
          onKeyDown={onPanelKeyDown}
          className="hx-panel"
          style={{ ['--hx-panel-shift' as string]: `${shift}px` }}
        >
          <div className="hx-panel-body">
            {items.map((entry, index) => {
              const text = translateDropdownItem(role, language, entry);
              const group = translateGroup(role, language, entry.group);
              const showGroup =
                Boolean(entry.group) &&
                (index === 0 || items[index - 1]?.group !== entry.group);
              const isCurrent = isRouteActive(entry.href, pathname, hash);
              return (
                <React.Fragment key={entry.id}>
                  {showGroup && (
                    <p className="hx-panel-heading" aria-hidden="true">
                      {group}
                    </p>
                  )}
                  <Link
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    href={entry.href}
                    role="menuitem"
                    tabIndex={activeIndex === index ? 0 : -1}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => {
                      onNavigate?.();
                      close();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="hx-panel-item"
                    style={{ ['--item-index' as string]: String(index) }}
                  >
                    <span className="hx-panel-item-icon" aria-hidden="true">
                      <entry.icon className="h-4 w-4" />
                    </span>
                    <span className="hx-panel-item-text">
                      <span className="hx-panel-item-label">{text.label}</span>
                      {text.description && (
                        <span className="hx-panel-item-desc">{text.description}</span>
                      )}
                    </span>
                    <ChevronRight className="hx-panel-item-arrow" aria-hidden="true" />
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NavDropdown;
