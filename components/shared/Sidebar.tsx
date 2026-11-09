'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { sectionsForRole, hrefFor } from '@/components/header/navConfig';
import { useSession } from '@/components/header/SessionProvider';
import { IconRail, type IconRailItem } from '@/components/layout/IconRail';

export function Sidebar() {
  const pathname = usePathname();
  const { role: sessionRole } = useSession();
  const role = (sessionRole === 'coach' || sessionRole === 'client' || sessionRole === 'admin') ? sessionRole : 'guest';
  const sections = sectionsForRole(role as any);

  const items: IconRailItem[] = sections.map((section) => {
    const href = section.href ?? (section.items?.[0] ? hrefFor(section.items[0], role as any) : '#');
    const active = pathname === href || section.items?.some((i) => pathname === hrefFor(i, role as any));
    return {
      id: section.id,
      href,
      label: section.label,
      icon: section.icon,
      active,
    };
  });

  return <IconRail items={items} />;
}

export default Sidebar;
