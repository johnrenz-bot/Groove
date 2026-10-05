import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * DELETE /api/admin/users?id=<uuid>
 *
 * Removes an account and its authentication record.
 *
 * This exists as a server route rather than a client-side call because deleting
 * a `profiles` row does not delete the matching `auth.users` row — the foreign
 * key cascades the other way. Doing it from the browser would leave an orphaned
 * auth user who could sign in again and have a fresh profile created for them
 * via the signup trigger. Removing the auth user requires the service-role key,
 * which must never reach the client, so this is the only place it can happen.
 *
 * Authorization is enforced twice: `requireAdmin()` rejects the request unless
 * the caller is the pinned admin account, and the service-role client would
 * bypass RLS — so this check is the entire security boundary for the operation.
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin('Not authorized to delete accounts');
  } catch (err) {
    const status = (err as { status?: number }).status ?? 403;
    return NextResponse.json({ error: 'Not authorized' }, { status });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: 'A valid user id is required.' }, { status: 400 });
  }

  try {
    const supabase = await createAdminClient();

    // Refuse to delete the account doing the deleting. Recoverable, but losing
    // the only admin is not a state anyone wants to debug in production.
    const { data: target } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', id)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
    }

    if (target.role === 'admin') {
      return NextResponse.json(
        { error: 'Administrator accounts cannot be deleted from this console.' },
        { status: 403 }
      );
    }

    // Auth first: if this fails, nothing has been lost. If the profile delete
    // then fails, the account is left without a login, which is the safe
    // direction to fail in.
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json(
        { error: `Could not remove the sign-in record: ${authError.message}` },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
    if (profileError) {
      return NextResponse.json(
        { error: `Sign-in removed, but the profile could not be deleted: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin user delete error:', err);
    return NextResponse.json({ error: 'Could not delete this account.' }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}