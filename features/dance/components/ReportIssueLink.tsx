'use client';

import { Flag } from 'lucide-react';

const SUPPORT_EMAIL = 'grooveyyph@gmail.com';

interface ReportIssueLinkProps {
  /** Human-readable title of the item being reported (event, crew, article). */
  itemTitle: string;
  /** Stable identifier when available (id, slug). Included in the email body. */
  itemId?: string | number;
  /** Kind label used in the subject line: Event, Crew, Update, Recap, etc. */
  kind?: string;
  className?: string;
}

/**
 * Secondary correction / takedown action for directory cards.
 *
 * Uses a prefilled `mailto:` link so no report is ever claimed as submitted —
 * the user's own mail client sends it. The subject and body identify the
 * relevant item. A plain anchor keeps it keyboard-accessible with no JS.
 */
export function ReportIssueLink({ itemTitle, itemId, kind = 'Listing', className = '' }: ReportIssueLinkProps) {
  const subject = encodeURIComponent(`Correction request — ${kind}: ${itemTitle}`.slice(0, 140));
  const body = encodeURIComponent(
    `Hello Groove team,\n\nI would like to report an error or request removal for this ${kind.toLowerCase()}:\n\nTitle: ${itemTitle}\n${itemId !== undefined ? `ID: ${String(itemId)}\n` : ''}Page: /community/performing-arts/dance\n\nDetails (what is wrong, and the correct information or source if you have it):\n\nThank you.`
  );
  const href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <a
      href={href}
      aria-label={`Report an error or request removal for ${itemTitle}`}
      title="Opens your email app with a prefilled correction request — nothing is submitted automatically"
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${className}`}
    >
      <Flag className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>Report an error / Request removal</span>
    </a>
  );
}

export default ReportIssueLink;
