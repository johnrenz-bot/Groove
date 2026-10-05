'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Send,
  Paperclip,
  Search,
  Loader2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import { Message, Profile } from '@/lib/types';
import { statusMeta } from '@/lib/presence';
import { usePresence } from '@/lib/presence/usePresence';
import { createClient } from '@/lib/supabase/client';
import { SessionAgreementCard } from '@/components/booking/SessionAgreementCard';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  fetchAdminPartners,
  fetchConversationsForUser,
  fetchThread,
  markThreadRead,
  sendMessage,
} from '@/lib/messenger/queries';

/**
 * `useSearchParams` opts a client component out of static prerendering, so it
 * has to sit under a Suspense boundary. The boundary renders nothing visible —
 * the messenger is entirely client-rendered once the session resolves — so the
 * fallback is a spinner matching the page's own loading state.
 */
/**
 * The presence badge for one conversation partner.
 *
 * Split out because `usePresence` is a hook: it cannot be called inside the
 * `.map()` that renders the contact list, so each row needs its own component
 * to subscribe to the shared store.
 */
function PartnerPresence({ partner }: { partner: Profile }) {
  const presence = usePresence(partner.id, partner.status);
  const label = `Status: ${statusMeta(presence).label}`;
  // Not aria-hidden: the dot is the only signal on the row, so it carries the
  // label itself. An aria-hidden wrapper around visually-hidden text would hide
  // the very text that was meant to describe it.
  return (
    <span
      className={`g-presence-badge g-presence-dot--${presence}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}

/**
 * The written status under the partner's name in the thread header.
 *
 * Reads from the same shared store as the contact-list dot, via the same
 * `usePresence` hook — no second Supabase channel and no second status source.
 * It is a separate component only because hooks cannot be called inside the
 * `.map()`; here it is called once for the single active partner.
 *
 * Online reads "Online / Active" because that pair is the wording this header
 * has always used; the other three are the plain labels from the shared
 * registry, so the text cannot invent a state the dropdown does not offer.
 */
function PartnerStatusLine({ partner }: { partner: Profile }) {
  const presence = usePresence(partner.id, partner.status);
  const label =
    presence === 'online'
      ? 'Online / Active'
      : (statusMeta(presence).label ?? 'Unknown');

  return (
    <p
      className={`text-[11px] font-medium g-presence-text--${presence}`}
      // Announced as a live region: the whole point of this line is that it
      // changes without a refresh, which a screen-reader user would otherwise
      // have no way to notice.
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">● </span>
      {label}
    </p>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="g-spin h-8 w-8 text-accent" aria-hidden="true" />
          <span className="sr-only">Loading messenger</span>
        </div>
      }
    >
      <MessagesMessenger />
    </Suspense>
  );
}

function MessagesMessenger() {
  /**
   * Deep link target: the coach/client card a user clicked "Message" on.
   *
   * Both `/client/home` and `/coach/home` already link to `/messages?user=<id>`,
   * but nothing here read it, so the intent was dropped and the page silently
   * opened whichever conversation happened to be first. Honouring the param is
   * what makes those existing actions actually work — no new messaging route and
   * no second conversation list.
   */
  const searchParams = useSearchParams();
  const requestedPartnerId = searchParams.get('user');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  /** Unread per partner id. Read receipts are the source; see markThreadRead. */
  const [unreadByPartner, setUnreadByPartner] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile);

      // Fetch all users to chat with (if client -> fetch coaches, if coach -> fetch clients)
      //
      // The filter is "not suspended", NOT `status = 'active'`. Nothing in the
      // app ever sets status to 'active' — profiles default to 'offline' and the
      // sign-out handler writes 'offline' — so requiring 'active' filtered out
      // every real account and left the contact list permanently empty, which in
      // turn made a deep-linked conversation unreachable. Suspended is the only
      // status that should genuinely bar someone from being messaged.
      const oppositeRole = profile.role === 'coach' ? 'client' : 'coach';
      const { data: partners } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', oppositeRole)
        .neq('status', 'suspended');

      setConversations(partners || []);

      // Unread counts come from the shared read-receipt query so the client and
      // admin sidebars count identically. A failure here must not hide the
      // contact list, so it is contained.
      if (profile.role === 'client') {
        try {
          const summaries = await fetchConversationsForUser(user.id);
          const map: Record<string, number> = {};
          for (const s of summaries) map[s.partner.id] = s.unread;
          setUnreadByPartner(map);
        } catch (err) {
          console.error('Could not load unread counts:', err);
        }
      }

      // Admin <-> Client support thread.
      //
      // A client can also reach the platform administrator. Those are added on
      // top of the existing coach list rather than replacing it, and only for
      // clients — a coach's contact list is untouched by this.
      let admins: Profile[] = [];
      if (profile.role === 'client') {
        try {
          admins = await fetchAdminPartners();
          if (admins.length > 0) {
            const existing = new Set((partners || []).map((p) => p.id));
            setConversations([...admins.filter((a) => !existing.has(a.id)), ...(partners || [])]);
          }
        } catch (err) {
          // Support contact is a convenience: if it cannot be listed, the coach
          // list below is still complete and usable.
          console.error('Could not load the support contact:', err);
        }
      }

      // Open the deep-linked conversation when `?user=` named one, otherwise keep the
      // existing behaviour of selecting the first partner.
      if (requestedPartnerId) {
        const pool: Profile[] =
          profile.role === 'client'
            ? [...admins, ...(partners || [])]
            : [...(partners || [])];
        const target = pool.find((p) => p.id === requestedPartnerId);
        if (target) {
          // Opening an existing thread is exactly "if a conversation already
          // exists, open it" — no new row is written here. A conversation is
          // created by the first message actually sent, so simply viewing a
          // coach never produces a duplicate or an empty thread.
          setActivePartner(target);
          return;
        }
        // The id is not in the role's contact list (a coach messaging a coach,
        // or a suspended account). Fall through to the default selection rather
        // than inventing a contact.
        console.error('Requested conversation partner is not available:', requestedPartnerId);
      }

      if (partners && partners.length > 0) {
        setActivePartner(partners[0]);
      }
    } catch (err) {
      console.error('Error loading messenger:', err);
    } finally {
      setLoading(false);
    }
  }, [requestedPartnerId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !activePartner) return;

    // Shared with the admin messenger so both sides read a thread identically.
    // Bounded by the same RLS policies.
    const data = await fetchThread(currentUser.id, activePartner.id);

    setMessages(data || []);
    scrollToBottom();

    // Opening a thread is what "reads" it. The update is scoped by RLS to rows
    // addressed to this user and not sent by them.
    try {
      await markThreadRead(currentUser.id, activePartner.id);
      setUnreadByPartner((prev) => ({ ...prev, [activePartner.id]: 0 }));
    } catch {
      // A read receipt is not worth surfacing: the thread is open and readable
      // either way, and the badge clears on the next load regardless.
    }
  }, [currentUser, activePartner, scrollToBottom]);

  useEffect(() => {
    // Loading the thread is its own effect: it must run on every conversation
    // switch, whereas the realtime channel below must NOT be rebuilt then.
    if (!currentUser || !activePartner) return;
    fetchMessages();
  }, [currentUser, activePartner, fetchMessages]);

  /**
   * Routing for realtime events. A ref rather than state: the channel is created
   * once per signed-in user, but the handler has to know which conversation is
   * open at the moment an event arrives. Using state here would force the
   * channel to be torn down and rebuilt on every conversation switch.
   */
  const activePartnerIdRef = useRef<string | null>(null);
  activePartnerIdRef.current = activePartner?.id ?? null;

  useEffect(() => {
    if (!currentUser) return;

    /**
     * One channel for the whole messenger, scoped to the signed-in user.
     *
     * It used to be created per open thread (`chat_<me>_<partner>`) and torn
     * down on every switch, which meant a message arriving for any OTHER
     * conversation was dropped: the handler only appended to the active thread,
     * so the sidebar, the preview line and the unread badge never moved until a
     * refresh. A single per-user channel sees the user's whole traffic once and
     * routes each event to the right destination.
     *
     * The channel name includes the user id so two accounts in the same browser
     * never share a topic, and it is removed on unmount so no duplicate
     * subscription accumulates.
     */
    const supabase = createClient();
    const me = currentUser.id;

    const channel = supabase
      .channel(`messenger:${me}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new as Message;
          // RLS does not filter realtime frames, so the filter is applied here:
          // this user must be one end of the row.
          if (row.sender_id !== me && row.receiver_id !== me) return;

          const partnerId = row.sender_id === me ? row.receiver_id : row.sender_id;
          const inbound = row.sender_id !== me;

          // 1. The open thread, if this message belongs to it. Deduped because
          //    the sender's own insert is both returned by `.select()` and
          //    echoed by realtime.
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            if (activePartnerIdRef.current === partnerId) {
              scrollToBottom();
              return [...prev, row];
            }
            return prev;
          });

          // 2. The open thread is being read, so an inbound message there is
          //    immediately read: stamp it rather than waiting for a refresh.
          if (inbound && activePartnerIdRef.current === partnerId) {
            void markThreadRead(me, partnerId);
            setUnreadByPartner((prev) => ({ ...prev, [partnerId]: 0 }));
            return;
          }

          // 3. Otherwise it belongs to a conversation that is not on screen.
          //    The badge and the preview line update live.
          setUnreadByPartner((prev) => ({
            ...prev,
            [partnerId]: inbound ? (prev[partnerId] ?? 0) + 1 : prev[partnerId] ?? 0,
          }));

          // Move the conversation to the top of the list so the most recent
          // thread is the one in view. No refetch: a burst of messages must not
          // cause a query per message. A partner who is not already listed is
          // skipped — inventing a contact row from a realtime frame would put an
          // unvalidated profile in the sidebar.
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === partnerId);
            if (index === -1) return prev;
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            return [moved, ...next];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // `scrollToBottom` is stable and the open conversation is read through
    // `activePartnerIdRef`, so neither is a dependency: adding either would tear
    // the channel down and rebuild it on every conversation switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activePartner || !newMessage.trim()) return;

    try {
      setSending(true);
      const text = newMessage.trim();
      setNewMessage('');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: activePartner.id,
          message: text,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
        // Notify Receiver
        await supabase.from('notifications').insert({
          user_id: activePartner.id,
          title: `New Message from ${currentUser.firstname}`,
          message: text.length > 60 ? `${text.substring(0, 60)}...` : text,
          cta_url: '/messages',
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activePartner) return;

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const filename = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('chat-attachments')
        .upload(filename, file);

      if (!uploadErr && uploadData) {
        const { data: pubUrl } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filename);

        const { data: msgData } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUser.id,
            receiver_id: activePartner.id,
            message: `Sent an attachment: ${file.name}`,
            media_path: pubUrl.publicUrl,
          })
          .select()
          .single();

        if (msgData) {
          setMessages((prev) => [...prev, msgData]);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    `${c.firstname} ${c.lastname}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader
        userRole={currentUser?.role === 'coach' ? 'coach' : 'client'}
        userProfile={currentUser}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-6 pt-6 md:px-8 md:pt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
              Communications
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
              Direct Messenger
            </h1>
          </div>
          <span className="g-pill shrink-0">
            <Sparkles className="h-3 w-3 text-accent-text" aria-hidden="true" />
            {conversations.length} {conversations.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        <div className="g-card grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          {/* ── Pane 1: conversation list. Stacks above the thread on mobile
              rather than disappearing, so the contact list is never gated
              behind a tap. ── */}
          <aside
            aria-label="Conversations"
            className="flex min-h-0 flex-col border-divider md:col-span-4 md:border-r"
          >
            {/* Search */}
            <div className="border-b border-divider p-4">
              <div className="relative">
                <label htmlFor="contact-search" className="sr-only">
                  Search contacts
                </label>
                <Search
                  className="g-input-has-icon pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="contact-search"
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="g-input h-10 text-sm"
                />
              </div>
            </div>

            {/* Partner rows. Capped on mobile so the thread below keeps room
                to breathe instead of being pushed off the screen. */}
            <div className="g-scroll max-h-[38vh] min-h-0 flex-1 space-y-1 overflow-y-auto p-2 md:max-h-none">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="g-spin h-5 w-5 text-accent" aria-hidden="true" />
                  Loading contacts...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No contacts found.
                </div>
              ) : (
                filteredConversations.map((partner) => {
                  const isSelected = activePartner?.id === partner.id;
                  const unread = unreadByPartner[partner.id] ?? 0;
                  return (
                    <button
                      key={partner.id}
                      onClick={() => setActivePartner(partner)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-accent-border bg-accent-soft'
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      {/* Presence rides the avatar in the contact list, so who
                          is reachable is visible before a conversation is even
                          opened. `relative` anchors the badge to this row. */}
                      <span
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-bold uppercase ${
                          isSelected
                            ? 'border-accent-border'
                            : 'border-border'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-full w-full items-center justify-center ${
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {partner.photo_url ? (
                            <img
                              src={partner.photo_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            partner.firstname?.[0]
                          )}
                        </span>
                        <PartnerPresence partner={partner} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm font-semibold ${
                              isSelected ? 'text-accent-text' : 'text-foreground'
                            }`}
                          >
                            {partner.role === 'coach' ? 'Coach ' : ''}
                            {partner.role === 'admin' ? 'Support — ' : ''}
                            {partner.firstname} {partner.lastname}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {unread > 0 && (
                              <span className="g-pill-accent text-[10px] font-bold">
                                {unread}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
                              {partner.role}
                            </span>
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {partner.city_name || partner.address_summary || 'Available'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Pane 2: the active thread ── */}
          <section
            aria-label="Conversation"
            className="flex min-h-0 flex-col border-t border-divider md:col-span-8 md:border-t-0"
          >
            {activePartner ? (
              <>
                {/* Thread header */}
                <div className="flex items-center justify-between gap-3 border-b border-divider p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold uppercase text-muted-foreground"
                    >
                      {activePartner.photo_url ? (
                        <img
                          src={activePartner.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        activePartner.firstname?.[0]
                      )}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-foreground">
                        {activePartner.role === 'coach' ? 'Coach ' : ''}
                        {activePartner.firstname} {activePartner.lastname}
                      </h2>
                      <PartnerStatusLine partner={activePartner} />
                    </div>
                  </div>

                  <Link
                    href={`/userprofile/${activePartner.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    View Profile
                  </Link>
                </div>

                {/* Thread — the scroll region. min-h-0 is what lets it actually
                    shrink and scroll instead of pushing the composer off-screen. */}
                <div className="g-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-2 py-20 text-center text-muted-foreground">
                      <MessageSquare className="h-6 w-6 text-subtle-foreground" aria-hidden="true" />
                      <p className="text-sm">
                        Start a conversation with {activePartner.firstname}!
                      </p>
                      <p className="text-xs">
                        Discuss rehearsal dates, songs, choreography, or rates.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUser?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] space-y-2 rounded-2xl p-3.5 text-xs leading-relaxed ${
                              isMe
                                ? 'rounded-br-md bg-accent font-medium text-accent-foreground shadow-[var(--shadow-sm)]'
                                : 'rounded-bl-md border border-border bg-card text-foreground'
                            }`}
                          >
                            {m.media_path && (
                              <div className="max-h-56 overflow-hidden rounded-xl bg-muted">
                                {m.media_path.endsWith('.mp4') || m.media_path.endsWith('.mov') ? (
                                  <video src={m.media_path} controls className="max-h-56 w-full object-cover" />
                                ) : (
                                  <img
                                    src={m.media_path}
                                    alt="Media attachment"
                                    className="max-h-56 w-full object-cover"
                                  />
                                )}
                              </div>
                            )}
                            {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                            <span
                              className={`block text-right text-[9px] ${
                                isMe
                                  ? 'text-accent-foreground/70'
                                  : 'text-subtle-foreground'
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
                  {/* The Session Agreement for this conversation, when one exists.
                      Placed inside the scroll region above the anchor so it reads
                      as part of the thread, and above the composer so it never
                      displaces the input. Renders nothing when there is no
                      agreement for this pair of people. */}
                  {currentUser && (
                    <SessionAgreementCard
                      currentUserId={currentUser.id}
                      partnerId={activePartner.id}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Composer — pinned by sitting outside the scroll region */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 border-t border-divider p-3"
                >
                  <label
                    className="g-topbar-action cursor-pointer"
                    aria-label="Attach a file"
                    title="Attach a file"
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                    <input
                      type="file"
                      accept="image/*,video/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label htmlFor="message-composer" className="sr-only">
                    Type your message
                  </label>
                  <input
                    id="message-composer"
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="g-input h-11 flex-1 text-sm"
                  />

                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <MessageSquare className="h-6 w-6 text-subtle-foreground" aria-hidden="true" />
                <p className="text-sm">Select a contact from the list to start messaging.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
