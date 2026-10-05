'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Notification } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';
import { Bell, ExternalLink, Inbox, CheckCheck, X } from 'lucide-react';

interface NotificationDropdownProps {
  userId: string;
}

/**
 * Shared notification bell for admin, coach and client.
 *
 * ONE component for all three roles: AppTopNav renders it, and AppTopNav is what
 * every dashboard layout uses, so this is not a per-role copy.
 *
 * DATA BEHAVIOUR IS UNCHANGED FROM THE PREVIOUS VERSION, deliberately:
 *   - fetch on mount, newest first, limit 10
 *   - a Realtime channel on INSERT filtered to this user, de-duplicated by id
 *   - markAsRead(id) and markAllRead() write read_at, then update local state
 *   - cta_url renders a "View details" link
 * Only the presentation changed.
 *
 * WHAT WAS ACTUALLY WRONG
 * The panel carried `className="g-menu ..."`, and `.g-menu` has never had a rule
 * in globals.css — only `.g-menu-item` and friends exist. So the dropdown shipped
 * with no background, no border, no shadow and no radius, and each row was a
 * separately bordered card. It read as a loose stack of boxes rather than a menu.
 * The surface is now `.g-notif-panel`, and a row is `.g-notif-item`.
 *
 * EXIT ANIMATION
 * React unmounts instantly, so a close can never animate. The panel therefore
 * stays mounted for 120ms in a `closing` state. That transition is driven from
 * the event handlers rather than an effect on purpose: setState directly in an
 * effect body is what react-hooks/set-state-in-effect rejects.
 */

const EXIT_MS = 120;

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  /** Drives the exit animation; see the note above. */
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const supabase = createClient();
    const channelName = `user-notifications-${userId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => {
            const newNotif = payload.new as Notification;
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // Clear a pending exit timer if the component unmounts mid-animation. The
  // timer id is captured per effect run so the cleanup clears the id it was
  // given, not whatever `closeTimer.current` happens to hold by then.
  useEffect(() => {
    const timerRef = closeTimer;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
    // `open` is intentionally not a dependency: the timer is cancelled and
    // restarted on every call, so the callback stays stable and the Escape
    // listener below does not re-bind on each open/close.
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  }, []);

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  // Escape closes, matching every other dismissable surface in the header.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const mounted = open || closing;
  const unreadLabel = unreadCount > 0 ? `${unreadCount} unread` : 'none unread';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : show())}
        className="g-topbar-action relative cursor-pointer"
        aria-label={`Notifications (${unreadLabel})`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground ring-2 ring-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && (
        <>
          {/* Click-outside catcher. Transparent, and it sits below the panel so
              it never steals a click meant for a notification or its link. */}
          <button
            type="button"
            aria-label="Close notifications"
            tabIndex={-1}
            className="fixed inset-0 z-50 cursor-default bg-transparent"
            onClick={close}
          />

          <div
            className="g-notif-panel"
            data-state={closing ? 'closed' : 'open'}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="g-notif-head">
              <div className="flex min-w-0 items-center gap-2">
                <h4 className="truncate text-[13px] font-bold tracking-[-0.01em] text-foreground">
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-accent-soft px-1.5 text-[10px] font-bold tabular-nums text-accent-text">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-accent-text transition-colors hover:bg-accent-soft"
                  >
                    <CheckCheck className="h-3 w-3" aria-hidden="true" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close notifications"
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="g-notif-list g-scroll">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => !notif.read_at && markAsRead(notif.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (!notif.read_at) void markAsRead(notif.id);
                      }
                    }}
                    data-unread={!notif.read_at}
                    className="g-notif-item"
                  >
                    <div className="flex items-start gap-2">
                      {notif.read_at ? (
                        <span className="mt-1.5 block w-1.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <span className="g-notif-dot mt-1.5" aria-hidden="true" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`truncate text-xs ${
                              notif.read_at
                                ? 'font-semibold text-muted-foreground'
                                : 'font-bold text-foreground'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <time
                            dateTime={notif.created_at}
                            className="shrink-0 text-[10px] tabular-nums text-subtle-foreground"
                          >
                            {formatTimeAgo(notif.created_at)}
                          </time>
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {notif.message}
                        </p>

                        {notif.cta_url && (
                          <Link href={notif.cta_url} onClick={close} className="g-notif-cta">
                            View details
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted text-subtle-foreground"
                  >
                    <Inbox className="h-4 w-4" />
                  </span>
                  <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationDropdown;
