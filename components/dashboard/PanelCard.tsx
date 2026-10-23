'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';

export interface PanelCardProps {
  icon: React.ReactNode;
  title: string;
  /** @deprecated Explanations now live behind the info trigger. */
  subtitle?: string;
  /** Longer explanation for the info modal. */
  info?: React.ReactNode;
  infoShort?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}

/**
 * Dashboard panel used by the client and coach homes. Backed by the shared
 * Panel so headers, spacing and disclosure behaviour cannot drift.
 */
export function PanelCard({
  icon,
  title,
  subtitle,
  info,
  infoShort,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
}: PanelCardProps) {
  return (
    <Panel>
      <PanelHeader
        icon={icon}
        title={title}
        info={info ?? subtitle}
        infoShort={infoShort}
        action={
          viewAllHref ? (
            <Link
              href={viewAllHref}
              className="flex items-center gap-1 rounded-full px-1 text-xs font-semibold text-accent-text transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {viewAllLabel}
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />
      <PanelBody>{children}</PanelBody>
    </Panel>
  );
}

export default PanelCard;
