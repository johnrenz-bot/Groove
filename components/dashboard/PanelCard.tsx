import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface PanelCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}

export function PanelCard({ icon, title, subtitle, viewAllHref, viewAllLabel = 'View all', children }: PanelCardProps) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(20,40,75,0.06),0_8px_24px_rgba(20,40,75,0.05)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-semibold text-accent-text transition hover:underline"
          >
            {viewAllLabel}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default PanelCard;
