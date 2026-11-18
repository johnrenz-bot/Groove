import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /messages — role-aware redirect to the respective hub.
 * Preserves every query param (?user=, ?booking=, ?tab=, ?section=, ?view=).
 * Admins land on /admin/messages (the support console), never on coach/client UI.
 */
export default async function MessagesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value !== undefined) qs.set(key, value);
  }
  const query = qs.toString();

  if (!user) redirect(`/login${query ? `?${query}` : ''}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (role === 'admin') redirect(`/admin/messages${query ? `?${query}` : ''}`);
  if (role === 'coach') redirect(`/coach/messages${query ? `?${query}` : ''}`);
  redirect(`/client/messages${query ? `?${query}` : ''}`);
}

