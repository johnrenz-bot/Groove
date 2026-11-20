'use client';

/**
 * DM thread -- bounded, read-through realtime.
 *
 * This is the ONLY message-rendering component in the hub/support surface; the
 * old inline copies in /messages are retired. It uses the same RLS-safe
 * queries as the rest of the app and respects the messenger migration status
 * (no read_at column => no unread badge, no crash).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, AlertCircle, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchThread,
  markThreadRead,
  sendMessage,
} from '@/lib/messenger/queries';
import { historyFromEvents, type BookingEvent } from '@/features/appointments/services/bookingStatus';
import { cn } from '@/lib/utils';
import { ELLIPSIS, EM_DASH } from '@/lib/typography';
import type { Message, Profile } from '@/lib/types';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = d.toDateString();
  if (key === today.toDateString()) return 'Today';
  if (key === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
function clock(time: string): string {
  const d = new Date(time);
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function HubChat({
  viewer,
  partner,
  className,
  onActivity,
  events,
  names,
  quickReplies,
}: {
  viewer: Profile;
  partner: Profile;
  className?: string;
  /** Called after each successful send -- the parent marks itself stale. */
  onActivity?: () => void;
  /**
   * Booking audit rows (booking_events) -- rendered as compact centered rows
   * interleaved chronologically with the messages. Pass nothing for plain DMs.
   */
  events?: readonly BookingEvent[];
  /** id -> display name for the actors in `events`. */
  names?: Readonly<Record<string, string>>;
  /** One-tap composer chips; omitted renders no chips. */
  quickReplies?: readonly string[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchThread(viewer.id, partner.id);
      setMessages(rows);
      await markThreadRead(viewer.id, partner.id).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Messages could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [viewer.id, partner.id]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    const supabase = createClient();
    const channel = supabase
      .channel(`hub-chat:${viewer.id}:${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${viewer.id}`,
        },
        (payload: any) => {
          const row = payload.new as Message;
          if (row.sender_id !== partner.id) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          void markThreadRead(viewer.id, partner.id).catch(() => undefined);
          onActivity?.();
        }
      )
      .subscribe();
    return () => {
      window.clearTimeout(t);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.id, partner.id]);

  useEffect(() => {
    if (loading) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  const send = () => void sendText(draft);

  // Group messages and booking events by day for separators.
  const sendText = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(viewer.id, partner.id, text.trim());
      if (sent) {
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
        setDraft('');
        onActivity?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  type Item =
    | { at: string; kind: 'msg'; msg: Message }
    | { at: string; kind: 'event'; label: string; who: string; key: string };
  const eventRows = (events && names)
    ? historyFromEvents(events, names)
        .slice()
        .reverse()
        .map((e) => ({ at: e.at, label: e.label, who: e.who }))
    : [];
  const items: Item[] = [
    ...messages.map((msg): Item => ({ at: msg.created_at, kind: 'msg', msg })),
    ...eventRows.map((e): Item => ({ at: e.at, kind: 'event', label: e.label, who: e.who, key: `${e.at}-${e.label}` })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const groups: { day: string; rows: Item[] }[] = [];
  for (const item of items) {
    const day = dayLabel(item.at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.rows.push(item);
    else groups.push({ day, rows: [item] });
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading conversation {ELLIPSIS}
          </div>
        ) : error ? (
          <div role="alert" className="mx-auto flex max-w-md items-start gap-2 rounded-2xl border border-border bg-danger-soft px-4 py-3 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {error}
              <button type="button" className="ml-2 font-semibold underline" onClick={() => void load()}>
                Retry
              </button>
            </span>
          </div>
        ) : groups.length === 0 ? (
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 py-12 text-center">
            {/* Editorial empty state */}
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent-text">
              <Send className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="font-sans text-base font-semibold text-foreground">A blank stage</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              No messages yet {EM_DASH} say hello and discuss the details of your session.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.day} aria-label={group.day}>
              <div className="my-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--accent-border))]" />
                <span className="rounded-full border border-border bg-card px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.day}
                </span>
                <span className="h-px flex-1 bg-[linear-gradient(270deg,transparent,var(--accent-border))]" />
              </div>
              <ul className="space-y-2">
                {group.rows.map((item, index) => {
                  if (item.kind === 'event') {
                    return (
                      <li
                        key={item.key ?? `event-${index}`}
                        className="flex w-full items-center justify-center gap-2 py-0.5"
                      >
                        <span
                          className="h-px w-6 bg-divider"
                          aria-hidden="true"
                        />
                        <span className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">
                          <Zap className="h-3 w-3 text-accent-text" aria-hidden="true" />
                          {item.who}: {item.label}
                        </span>
                        <span
                          className="h-px w-6 bg-divider"
                          aria-hidden="true"
                        />
                      </li>
                    );
                  }
                  const msg = item.msg;
                  const mine = msg.sender_id === viewer.id;
                  return (
                    <li
                      key={msg.id}
                      className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[78%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-xs leading-relaxed sm:max-w-[70%]',
                          mine
                            ? 'rounded-br-md bg-gradient-to-br from-[#e4c989] to-[#d6b36a] text-[#141414] '
                            : 'rounded-bl-md border border-border bg-elevated text-foreground '
                        )}
                      >
                        {msg.media_path && msg.media_path.match(/\.(png|jpe?g|gif|webp|avif|mp4|mov)$/i) ? (
                          <a href={msg.media_path} target="_blank" rel="noreferrer noopener" className="mb-1.5 block text-[10px] font-semibold underline opacity-80">
                            Open attachment
                          </a>
                        ) : null}
                        {msg.message}
                        <span className={cn('mt-1 block text-[9px]', mine ? 'text-accent-foreground/75' : 'text-muted-foreground')}>
                          {clock(msg.created_at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {quickReplies && quickReplies.length > 0 && (
        <div
          className="flex shrink-0 gap-1.5 overflow-x-auto   border-t border-divider bg-background/95 px-3 pt-2"
          aria-label="Quick replies"
        >
          {quickReplies.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={sending}
              onClick={() => void sendText(chip)}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border border-border bg-card px-3 text-[10px] font-semibold text-muted-foreground transition hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex shrink-0 items-center gap-2   border-t border-divider bg-background/95 px-2 py-2 backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor="hub-chat-input" className="sr-only">
          Message
        </label>
        <input
          id="hub-chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${partner.firstname ?? partner.username ?? 'them'}...`}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-xs text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent-border focus:ring-2 focus:ring-accent-soft"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}

