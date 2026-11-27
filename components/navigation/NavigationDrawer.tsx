'use client';

/**
 * THE ONE navigation surface.
 *
 * Desktop: an in-flow, collapsible rail. Collapsed = icon-only with floating
 * label tooltips; expanded = labelled groups. The main column flexes to use
 * whatever width remains.
 * Mobile: the same markup becomes an off-canvas overlay drawer.
 *
 * It always renders from the role-filtered sections in `navConfig.ts`, so
 * there is no second navigation list and no hidden duplicate to reconcile.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PanelLeftClose, type LucideIcon } from 'lucide-react';

import {
  hrefFor,
  labelFor,
  navKeyFor,
  type NavRole,
  type NavSection,
} from '@/components/header/navConfig';

export interface DrawerExtraLink {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface TipState {
  label: string;
  top: number;
  left: number;
}

export function NavigationDrawer({
  open,
  onClose,
  onToggle,
  sections,
  role,
  activeKey,
  extraGroups,
  badges,
  collapsed = true,
  mode = 'shell',
  isDesktop = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Header-side toggle: collapses the rail on desktop, closes the drawer on mobile. */
  onToggle?: () => void;
  sections: NavSection[];
  role: NavRole;
  activeKey: string | null;
  extraGroups?: Array<{ label: string; links: DrawerExtraLink[] }>;
  badges?: Record<string, number>;
  collapsed?: boolean;
  mode?: 'shell' | 'overlay';
  isDesktop?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const showTooltips = isDesktop && mode === 'shell' && collapsed;

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!showTooltips) setTip(null);
  }, [showTooltips]);

  const handleTip = (event: React.SyntheticEvent<HTMLAnchorElement>, label: string) => {
    if (!showTooltips) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };

  const renderLink = (href: string, label: string, Icon: LucideIcon, key: string, count?: number) => (
    <Link
      key={key}
      href={href}
      className="nav-drawer-item"
      data-label={label}
      data-active={activeKey === key || undefined}
      aria-current={activeKey === key ? 'page' : undefined}
      aria-label={label}
      onClick={onClose}
      onMouseEnter={(event) => handleTip(event, label)}
      onMouseLeave={() => setTip(null)}
      onFocus={(event) => handleTip(event, label)}
      onBlur={() => setTip(null)}
    >
      <Icon aria-hidden="true" />
      <span className="nav-drawer-item-label">{label}</span>
      {count && count > 0 ? (
        <span className="nav-drawer-badge" aria-label={`${count} need your attention`}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );

  return (
    <>
      {open && (
        <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={onClose} />
      )}
      <aside
        id="global-navigation-drawer"
        className="nav-drawer"
        data-open={open ? 'true' : 'false'}
        data-collapsed={collapsed ? 'true' : 'false'}
        data-mode={mode}
        role={mode === 'overlay' ? 'dialog' : undefined}
        aria-modal={mode === 'overlay' ? true : undefined}
        aria-label="Primary navigation"
      >
        <div className="nav-drawer-head">
          <span className="nav-drawer-title">Workspace</span>
          <button
            ref={closeRef}
            type="button"
            className="nav-drawer-close"
            onClick={onToggle ?? onClose}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <PanelLeftClose aria-hidden="true" />
          </button>
        </div>

        <nav
          className="nav-drawer-body"
          aria-label="Primary navigation"
          onScroll={() => setTip(null)}
        >
          {(extraGroups ?? []).map((group) =>
            group.links.length > 0 ? (
              <div key={group.label} className="nav-group">
                <p className="nav-group-label">{group.label}</p>
                {group.links.map((link) =>
                  renderLink(link.href, link.label, link.icon, `extra-${link.id}`)
                )}
              </div>
            ) : null
          )}

          {sections.map((section) => (
            <div key={section.id} className="nav-group">
              {section.items ? <p className="nav-group-label">{section.label}</p> : null}
              {section.items
                ? section.items.map((leaf) =>
                    renderLink(
                      hrefFor(leaf, role),
                      labelFor(leaf, role),
                      leaf.icon,
                      navKeyFor(section, leaf),
                      badges?.[leaf.id]
                    )
                  )
                : section.href
                  ? renderLink(section.href, section.label, section.icon, navKeyFor(section))
                  : null}
            </div>
          ))}
        </nav>
      </aside>

      {tip && (
        <div
          className="nav-tooltip"
          role="tooltip"
          style={{ top: tip.top, left: tip.left }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}

export default NavigationDrawer;
