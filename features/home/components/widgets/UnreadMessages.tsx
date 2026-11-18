'use client';

/**
 * Latest conversations preview — shared.
 *
 * Renders the same three threads the messenger page computes, via the shared
 * lib. Test/demo partners are filtered out. An unread badge appears only when
 * there are real unread rows.
 */

import React from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInitials } from '@/lib/utils';
import { isTestAccount } from '../../types';

interface ConversationLike {
  partner: {
    id: string;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    email?: string | null;
    photo_url?: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UnreadMessages({ conversations }: { conversations: ConversationLike[] }) {
  const visible = conversations
    .filter((conversation) => !isTestAccount(conversation.partner))
    .slice(0, 3);

  return (
    <PanelCard
      icon={<MessageSquare className="h-4 w-4" />}
      title="Messages"
      viewAllHref="/messages"
      viewAllLabel="View all"
    >
      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          title="No messages yet"
          description="Start a conversation with a coach, a student, or the team — it will show up here."
          actionHref="/messages"
          action="Open your inbox"
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((conversation) => {
            const { partner } = conversation;
            const name = [partner.firstname, partner.lastname].filter(Boolean).join(' ').trim() || partner.username || 'GroovePH member';
            return (
              <li key={partner.id}>
                <Link
                  href={`/messages?conversation=${partner.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 transition-colors hover:border-border-strong hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-bold text-foreground">
                    {partner.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- messenger avatars keep parity with the inbox
                      <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(partner.firstname ?? undefined, partner.lastname ?? undefined)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">{name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatWhen(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {conversation.lastMessage ?? 'Sent an attachment'}
                    </span>
                  </span>
                  {conversation.unread > 0 && (
                    <span
                      className="ml-1 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[9px] font-bold tabular-nums text-accent-foreground"
                      aria-label={`${conversation.unread} unread message${conversation.unread === 1 ? '' : 's'}`}
                    >
                      {conversation.unread > 9 ? '9+' : conversation.unread}
                    </span>
                  )}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

export default UnreadMessages;

