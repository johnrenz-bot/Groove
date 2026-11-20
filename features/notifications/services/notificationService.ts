/**
 * Notifications data service.
 *
 * One module for the three operations the bell and the admin console perform:
 * listing a member's notifications, subscribing to new inserts (Realtime), and
 * marking them read. Admin broadcast inserts live here too, so the write
 * surface never scatters into components.
 *
 * All access goes through the browser client under Row Level Security:
 * members read and update only their own rows; admin broadcasts require the
 * admin RLS policy. No service-role access is introduced here.
 */
import { createClient } from '@/lib/supabase/client';
import { AppError } from '@/lib/errors';
import type { Notification } from '@/lib/types';

export const NOTIFICATION_COLUMNS =
  'id, user_id, title, message, cta_url, read_at, created_at';

export const NOTIFICATIONS_LIMIT = 10;

/** Newest-first list of the member's notifications. */
export async function listNotifications(
  userId: string,
  limit: number = NOTIFICATIONS_LIMIT
): Promise<Notification[]> {
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw AppError.database(error, 'Could not load your notifications.');
  }
  return (data ?? []) as Notification[];
}

/**
 * Subscribe to INSERT events for this user's notifications.
 * Returns an unsubscribe function — callers must invoke it on unmount.
 */
export function subscribeToNotificationInserts(
  userId: string,
  onInsert: (notification: Notification) => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`user-notifications-${userId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Notification }) => onInsert(payload.new)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Mark one notification read. Returns true on success. */
export async function markNotificationRead(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

/** Mark every unread notification of the member read. Returns true on success. */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  return !error;
}

/**
 * Admin broadcast: insert one notification row per recipient.
 * RLS gates who may insert for other users (admin policy).
 */
export async function createNotificationsForUsers(
  userIds: string[],
  title: string,
  message: string,
  ctaUrl?: string | null
): Promise<void> {
  if (userIds.length === 0) return;
  const cleanIds = userIds.map((id) => id.trim()).filter(Boolean);
  if (cleanIds.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from('notifications').insert(
    cleanIds.map((user_id) => ({ user_id, title, message, cta_url: ctaUrl ?? null }))
  );
  if (error) {
    throw AppError.database(error, 'Could not send this notification.');
  }
}
