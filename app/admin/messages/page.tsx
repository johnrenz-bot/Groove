'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  LifeBuoy,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { FormError } from '@/components/ui/FormError';
import { createClient } from '@/lib/supabase/client';
import {
  fetchClientPartnersForAdmin,
  fetchThread,
  markThreadRead,
  sendMessage,
  type ConversationSummary,
} from '@/lib/messenger/queries';
import type { Message, Profile } from '@/lib/types';

/**
 * Admin <-> Client Messenger.
 *
 * The console's counterpart to the client `/messages` page: the same two-pane
 * layout, the same design-system classes, the same Realtime approach, so the
 * two surfaces read as one product. What differs is only whose side you are
 * on — here the counterpart list is the client directory, and the thread runs
 * between the administrator and one client.
 *
 * Data access is entirely in `lib/messenger/queries.ts` and is bounded by the
 * RLS policies on `public.messages`. This component grants nothing.
 */
export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  /**
   * Which conversation is on screen, readable from inside the realtime handler
   * without making the channel depend on it. State here would tear the channel
   * down and rebuild it on every conversation switch.
   */
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = active?.id ?? null;
  const activeId = active?.id ?? null;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const loadConversations = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const list = await fetchClientPartnersForAdmin(user.id);
      setConversations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversations.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadConversations();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  /** Load the thread, then clear its unread state. */
  const openThread = useCallback(
    async (partner: Profile) => {
      setActive(partner);
      setThreadLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const rows = await fetchThread(user.id, partner.id);
        setMessages(rows);
        scrollToBottom();

        await markThreadRead(user.id, partner.id);
        // Drop the badge without waiting for a refetch of the whole list.
        setConversations((prev) =>
          prev.map((c) => (c.partner.id === partner.id ? { ...c, unread: 0 } : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this conversation.');
      } finally {
        setThreadLoading(false);
      }
    },
    [scrollToBottom]
  );

  /**
   * Live messages for the whole admin portal, not just the open thread.
   *
   * Filtering by the admin's own id in JS keeps the subscription to their
   * traffic: RLS does not filter realtime payloads, so the channel is scoped
   * client-side and the payloads are never stored anywhere.
   */
  useEffect(() => {
    let adminId: string | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      adminId = user.id;

      channel = supabase
        .channel(`admin_messenger:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const row = payload.new as Message;
            if (!adminId) return;
            if (row.sender_id !== adminId && row.receiver_id !== adminId) return;

            const partnerId = row.sender_id === adminId ? row.receiver_id : row.sender_id;
            const inbound = row.sender_id !== adminId;

            // Open thread: append live, deduped against the local echo of the
            // admin's own insert.
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              if (activeIdRef.current === partnerId) {
                scrollToBottom();
                return [...prev, row];
              }
              return prev;
            });

            if (inbound && activeIdRef.current === partnerId) {
              void markThreadRead(adminId, partnerId);
              setConversations((prev) =>
                prev.map((c) => (c.partner.id === partnerId ? { ...c, unread: 0 } : c))
              );
              return;
            }

            // Off-screen conversation: move it up and raise its badge, then
            // refresh the summaries so the preview line and count are accurate.
            if (inbound) {
              setConversations((prev) => {
                const index = prev.findIndex((c) => c.partner.id === partnerId);
                if (index === -1) return prev;
                const next = [...prev];
                const [moved] = next.splice(index, 1);
                return [
                  { ...moved, unread: moved.unread + 1 },
                  ...next,
                ];
              });
            }
            void loadConversations();
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) void createClient().removeChannel(channel);
    };
  }, [loadConversations, scrollToBottom]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;

    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const sent = await sendMessage(user.id, active.id, text);
      setDraft('');
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      scrollToBottom();
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) =>
    `${c.partner.firstname} ${c.partner.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
              Communications
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
              Client Messages
            </h1>
          </div>
          <span className="g-pill shrink-0">
            <LifeBuoy className="h-3 w-3 text-accent-text" aria-hidden="true" />
            {conversations.length}{' '}
            {conversations.length === 1 ? 'conversation' : 'conversations'}
          </span>
        </div>

        {error && <FormError message={error} />}

        <div className="g-card grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          {/* Pane 1: client conversations */}
          <aside
            aria-label="Client conversations"
            className="flex min-h-0 flex-col border-divider md:col-span-4 md:border-r"
          >
            <div className="border-b border-divider p-4">
              <div className="relative">
                <label htmlFor="admin-contact-search" className="sr-only">
                  Search clients
                </label>
                <Search
                  className="g-input-has-icon pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="admin-contact-search"
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="g-input h-10 text-sm"
                />
              </div>
            </div>

            <div className="g-scroll max-h-[38vh] min-h-0 flex-1 space-y-1 overflow-y-auto p-2 md:max-h-none">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="g-spin h-5 w-5 text-accent" aria-hidden="true" />
                  Loading clients...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No clients found.
                </div>
              ) : (
                filtered.map(({ partner, lastMessage, unread }) => {
                  const isSelected = active?.id === partner.id;
                  return (
                    <button
                      key={partner.id}
                      onClick={() => void openThread(partner)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-accent-border bg-accent-soft'
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-bold uppercase ${
                          isSelected
                            ? 'border-accent-border bg-accent text-accent-foreground'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {partner.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          partner.firstname?.[0]
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm font-semibold ${
                              isSelected ? 'text-accent-text' : 'text-foreground'
                            }`}
                          >
                            {partner.firstname} {partner.lastname}
                          </span>
                          {unread > 0 && (
                            <span className="g-pill-accent shrink-0 text-[10px] font-bold">
                              {unread}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {lastMessage ?? 'No messages yet'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Pane 2: the thread */}
          <section
            aria-label="Conversation"
            className="flex min-h-0 flex-col border-t border-divider md:col-span-8 md:border-t-0"
          >
            {active ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-divider p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold uppercase text-muted-foreground"
                    >
                      {active.firstname?.[0]}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-foreground">
                        {active.firstname} {active.lastname}
                      </h2>
                      <p className="text-[11px] font-medium text-subtle-foreground">
                        Client · {active.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/userprofile/${active.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    View Profile
                  </Link>
                </div>

                <div className="g-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {threadLoading ? (
                    <div className="flex flex-col items-center gap-2 py-20 text-center text-xs text-muted-foreground">
                      <Loader2 className="g-spin h-5 w-5 text-accent" aria-hidden="true" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-2 py-20 text-center text-muted-foreground">
                      <MessageSquare
                        className="h-6 w-6 text-subtle-foreground"
                        aria-hidden="true"
                      />
                      <p className="text-sm">
                        No messages with {active.firstname} yet.
                      </p>
                      <p className="text-xs">Send the first message to open the thread.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      // The admin's own messages sit on the right.
                      const isMine = m.sender_id === active.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[75%] space-y-1 rounded-2xl p-3.5 text-xs leading-relaxed ${
                              isMine
                                ? 'rounded-bl-md border border-border bg-card text-foreground'
                                : 'rounded-br-md bg-accent font-medium text-accent-foreground shadow-[var(--shadow-sm)]'
                            }`}
                          >
                            {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                            <span
                              className={`block text-right text-[9px] ${
                                isMine ? 'text-subtle-foreground' : 'text-accent-foreground/70'
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={threadEndRef} />
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-divider p-3">
                  <label htmlFor="admin-message-composer" className="sr-only">
                    Type your message
                  </label>
                  <input
                    id="admin-message-composer"
                    type="text"
                    placeholder="Reply to the client..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="g-input h-11 flex-1 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Inbox className="h-6 w-6 text-subtle-foreground" aria-hidden="true" />
                <p className="text-sm">Select a client to open a conversation.</p>
                <p className="text-xs">
                  Replies are delivered to the client&apos;s Messages page in real time.
                </p>
                {!loading && conversations.length === 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    No client conversations yet.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
