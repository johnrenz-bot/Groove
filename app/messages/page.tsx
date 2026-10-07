'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Paperclip,
  Search,
  Loader2,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Info,
  MapPin,
  ExternalLink,
  X,
  Calendar,
  Music,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import { Message, Profile } from '@/lib/types';
import { statusMeta } from '@/features/presence/utils/presence';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { createClient } from '@/lib/supabase/client';
import { SessionAgreementCard } from '@/features/booking/components/SessionAgreementCard';
import {
  fetchAdminPartners,
  fetchConversationsForUser,
  fetchThread,
  markThreadRead,
} from '@/lib/messenger/queries';

/**
 * Presence badge for a conversation partner avatar.
 */
function PartnerPresence({ partner }: { partner: Profile }) {
  const presence = usePresence(partner.id, partner.status);
  const label = `Status: ${statusMeta(presence).label}`;
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
 * Written status text under the partner name in header.
 */
function PartnerStatusLine({ partner }: { partner: Profile }) {
  const presence = usePresence(partner.id, partner.status);
  const label =
    presence === 'online'
      ? 'Online / Active'
      : (statusMeta(presence).label ?? 'Offline');

  return (
    <p
      className={`text-[11px] font-medium flex items-center gap-1.5 g-presence-text--${presence}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </p>
  );
}

/** Format message timestamps into relative date separators */
function formatMessageGroupDate(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
  const searchParams = useSearchParams();
  const requestedPartnerId = searchParams.get('user');

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadByPartner, setUnreadByPartner] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPartnerPanel, setShowPartnerPanel] = useState(false);
  const [mobileTab, setMobileTab] = useState<'contacts' | 'chat'>('contacts');

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

      const oppositeRole = profile.role === 'coach' ? 'client' : 'coach';
      const { data: partners } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', oppositeRole)
        .neq('status', 'suspended');

      setConversations(partners || []);

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

      let admins: Profile[] = [];
      if (profile.role === 'client') {
        try {
          admins = await fetchAdminPartners();
          if (admins.length > 0) {
            const existing = new Set((partners || []).map((p) => p.id));
            setConversations([...admins.filter((a) => !existing.has(a.id)), ...(partners || [])]);
          }
        } catch (err) {
          console.error('Could not load the support contact:', err);
        }
      }

      if (requestedPartnerId) {
        const pool: Profile[] =
          profile.role === 'client'
            ? [...admins, ...(partners || [])]
            : [...(partners || [])];
        const target = pool.find((p) => p.id === requestedPartnerId);
        if (target) {
          setActivePartner(target);
          setMobileTab('chat');
          return;
        }
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

    const data = await fetchThread(currentUser.id, activePartner.id);
    setMessages(data || []);
    scrollToBottom();

    try {
      await markThreadRead(currentUser.id, activePartner.id);
      setUnreadByPartner((prev) => ({ ...prev, [activePartner.id]: 0 }));
    } catch {
      // Ignored
    }
  }, [currentUser, activePartner, scrollToBottom]);

  useEffect(() => {
    if (!currentUser || !activePartner) return;
    fetchMessages();
  }, [currentUser, activePartner, fetchMessages]);

  const activePartnerIdRef = useRef<string | null>(null);
  activePartnerIdRef.current = activePartner?.id ?? null;

  useEffect(() => {
    if (!currentUser) return;
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
          if (row.sender_id !== me && row.receiver_id !== me) return;

          const partnerId = row.sender_id === me ? row.receiver_id : row.sender_id;
          const inbound = row.sender_id !== me;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            if (activePartnerIdRef.current === partnerId) {
              scrollToBottom();
              return [...prev, row];
            }
            return prev;
          });

          if (inbound && activePartnerIdRef.current === partnerId) {
            void markThreadRead(me, partnerId);
            setUnreadByPartner((prev) => ({ ...prev, [partnerId]: 0 }));
            return;
          }

          setUnreadByPartner((prev) => ({
            ...prev,
            [partnerId]: inbound ? (prev[partnerId] ?? 0) + 1 : prev[partnerId] ?? 0,
          }));

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
  }, [currentUser?.id, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activePartner || !newMessage.trim() || sending) return;

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

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) =>
      `${c.firstname} ${c.lastname} ${c.role}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const selectPartner = (partner: Profile) => {
    setActivePartner(partner);
    setMobileTab('chat');
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <AppHeader
        userRole={currentUser?.role === 'coach' ? 'coach' : 'client'}
        userProfile={currentUser}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-5">
        {/* Top header row */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text sm:text-[11px]">
              Communications Hub
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Direct Messenger
            </h1>
          </div>
          <span className="g-pill shrink-0 text-xs">
            <Sparkles className="h-3 w-3 text-accent-text" aria-hidden="true" />
            {conversations.length} {conversations.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        {/* 2-Pane Main Messenger Card */}
        <div className="g-card relative flex min-h-0 flex-1 overflow-hidden border border-border shadow-xl">
          {/* ── Pane 1: Conversation List ── */}
          <aside
            aria-label="Conversations"
            className={`flex flex-col border-divider bg-card transition-all duration-200 md:w-80 lg:w-96 md:border-r ${
              mobileTab === 'contacts' ? 'flex w-full' : 'hidden md:flex'
            }`}
          >
            {/* Search Bar */}
            <div className="shrink-0 border-b border-divider p-3 sm:p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search contacts by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="g-input h-10 w-full pl-9 pr-8 text-xs sm:text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Partner Contacts List */}
            <div className="g-scroll flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center text-xs text-muted-foreground">
                  <Loader2 className="g-spin h-6 w-6 text-accent" aria-hidden="true" />
                  Loading your contacts…
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-16 px-4 text-center text-xs text-muted-foreground">
                  <MessageSquare className="mx-auto h-7 w-7 text-subtle-foreground/50 mb-2" />
                  {searchQuery ? 'No contacts match your search.' : 'No available contacts yet.'}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 block mx-auto text-accent-text hover:underline font-semibold"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((partner) => {
                  const isSelected = activePartner?.id === partner.id;
                  const unread = unreadByPartner[partner.id] ?? 0;

                  return (
                    <button
                      key={partner.id}
                      onClick={() => selectPartner(partner)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-accent-border bg-accent-soft/80 shadow-sm'
                          : 'border-transparent hover:border-border/60 hover:bg-muted/70'
                      }`}
                    >
                      {/* Avatar with Presence dot */}
                      <span
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-bold uppercase transition ${
                          isSelected
                            ? 'border-accent-border shadow-sm'
                            : 'border-border group-hover:border-border-strong'
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

                      {/* Name & Details */}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-1.5">
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
                              <span className="g-pill-accent text-[10px] font-bold px-1.5 py-0.2">
                                {unread}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
                              {partner.role}
                            </span>
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {partner.city_name || partner.address_summary || 'San Jose del Monte'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Pane 2: The Active Thread ── */}
          <section
            aria-label="Conversation Thread"
            className={`flex flex-1 min-h-0 flex-col bg-background/50 ${
              mobileTab === 'chat' ? 'flex w-full' : 'hidden md:flex'
            }`}
          >
            {activePartner ? (
              <>
                {/* Thread Header */}
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-divider bg-card/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setMobileTab('contacts')}
                      className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Back to contacts list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold uppercase text-muted-foreground shadow-sm"
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
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                          {activePartner.role === 'coach' ? 'Coach ' : ''}
                          {activePartner.firstname} {activePartner.lastname}
                        </h2>
                        <span className="hidden sm:inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {activePartner.role}
                        </span>
                      </div>
                      <PartnerStatusLine partner={activePartner} />
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPartnerPanel((v) => !v)}
                      aria-label="Toggle profile information"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition cursor-pointer sm:h-9 sm:w-auto sm:px-3 sm:gap-1.5 ${
                        showPartnerPanel
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Info className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    <Link
                      href={`/userprofile/${activePartner.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground sm:h-9 sm:px-3.5"
                    >
                      <span>Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </header>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Messages Feed */}
                  <div className="g-scroll flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 sm:p-6">
                    {messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent-text shadow-sm">
                          <MessageSquare className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <div className="max-w-sm space-y-1">
                          <p className="text-base font-bold text-foreground">
                            Start a conversation with {activePartner.firstname}!
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Discuss rehearsal schedules, song routines, studio availability, or agreement terms.
                          </p>
                        </div>

                        {/* Starter Prompts */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-md">
                          {[
                            'Hi! What is your rehearsal availability this week?',
                            'Can we coordinate a 1-hour coaching session?',
                            'Where is your preferred studio in San Jose del Monte?',
                          ].map((promptText) => (
                            <button
                              key={promptText}
                              onClick={() => setNewMessage(promptText)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-accent-border hover:bg-accent-soft hover:text-accent-text cursor-pointer text-left"
                            >
                              💬 {promptText}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((m, index) => {
                          const isMe = m.sender_id === currentUser?.id;
                          const showDateHeader =
                            index === 0 ||
                            formatMessageGroupDate(messages[index - 1].created_at) !==
                              formatMessageGroupDate(m.created_at);

                          return (
                            <React.Fragment key={m.id}>
                              {showDateHeader && (
                                <div className="my-4 flex items-center justify-center">
                                  <span className="rounded-full border border-border bg-muted/60 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-xs">
                                    {formatMessageGroupDate(m.created_at)}
                                  </span>
                                </div>
                              )}

                              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[85%] sm:max-w-[75%] space-y-2 rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm transition ${
                                    isMe
                                      ? 'rounded-br-sm bg-accent font-medium text-accent-foreground shadow-[var(--shadow-sm)]'
                                      : 'rounded-bl-sm border border-border bg-card text-foreground shadow-xs'
                                  }`}
                                >
                                  {m.media_path && (
                                    <div className="max-h-60 overflow-hidden rounded-xl border border-border/20 bg-muted">
                                      {m.media_path.endsWith('.mp4') || m.media_path.endsWith('.mov') ? (
                                        <video
                                          src={m.media_path}
                                          controls
                                          className="max-h-60 w-full object-cover"
                                        />
                                      ) : (
                                        <img
                                          src={m.media_path}
                                          alt="Attachment preview"
                                          className="max-h-60 w-full object-cover"
                                        />
                                      )}
                                    </div>
                                  )}
                                  {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                                  <span
                                    className={`block text-right text-[10px] ${
                                      isMe ? 'text-accent-foreground/75' : 'text-subtle-foreground'
                                    }`}
                                  >
                                    {new Date(m.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}

                    {/* Integrated Session Agreement Card with Full Agreement Modal */}
                    {currentUser && (
                      <SessionAgreementCard
                        currentUserId={currentUser.id}
                        partnerId={activePartner.id}
                      />
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Collapsible Partner Profile Drawer */}
                  {showPartnerPanel && (
                    <aside
                      aria-label="Partner Details"
                      className="w-72 shrink-0 border-l border-divider bg-card/95 p-4 space-y-4 overflow-y-auto animate-in slide-in-from-right-4 duration-200 hidden lg:block"
                    >
                      <div className="flex items-center justify-between border-b border-divider pb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Contact Overview
                        </h3>
                        <button
                          onClick={() => setShowPartnerPanel(false)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-center space-y-2">
                        <span className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-bold text-foreground text-lg shadow-sm">
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
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {activePartner.firstname} {activePartner.lastname}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-text">
                            {activePartner.role}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3.5 text-xs">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" />
                          <span>{activePartner.city_name || activePartner.address_summary || 'San Jose del Monte, Bulacan'}</span>
                        </div>
                        {activePartner.bio && (
                          <p className="leading-relaxed text-foreground/90 text-[11px]">
                            {activePartner.bio}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2">
                        <Link
                          href={`/userprofile/${activePartner.id}`}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-accent text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover"
                        >
                          <span>Full Profile</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </aside>
                  )}
                </div>

                {/* Fixed Composer Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex shrink-0 items-center gap-2 border-t border-divider bg-card px-3 py-3 sm:px-5 sm:py-3.5"
                >
                  <label
                    className="g-topbar-action flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
                    aria-label="Attach photo, video, or file"
                    title="Attach photo, video, or file"
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
                    placeholder={`Message ${activePartner.firstname}…`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="g-input h-10 flex-1 text-xs sm:text-sm"
                  />

                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    aria-label="Send message"
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <MessageSquare className="h-7 w-7 text-subtle-foreground" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Select a Conversation</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a performing arts coach or client from the list to view your thread.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
