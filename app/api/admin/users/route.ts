import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient, hasServiceRoleKey } from '@/lib/supabase/server';
import { isAdminIdentity, ADMIN_EMAIL } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';

/**
 * Admin user management API.
 *
 * Every method here is admin-only: `requireAdmin()` rejects the request unless
 * the caller is the pinned admin account. Writes go through the service-role
 * client, which bypasses RLS, so that check is the entire security boundary.
 */

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function guard() {
  try {
    const admin = await requireAdmin('Not authorized to manage accounts');
    return { admin, error: null as NextResponse | null };
  } catch (err) {
    const status = (err as { status?: number }).status ?? 403;
    return { admin: null, error: NextResponse.json({ error: 'Not authorized' }, { status }) };
  }
}

const ALLOWED_ROLES: UserRole[] = ['client', 'coach', 'admin'];

export async function GET() {
  const { error } = await guard();
  if (error) return error;

  try {
    const supabase = await createAdminClient();
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('*, coach_profile:coach_profiles(*), client_profile:client_profiles(*)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (dbError) throw dbError;
    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error('Admin user list error:', err);
    return NextResponse.json({ error: 'Could not load accounts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await guard();
  if (error) return error;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: 'Service role key is not configured, so accounts cannot be created.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  const role = String(body.role ?? 'client') as UserRole;
  const firstname = String(body.firstname ?? '').trim();
  const lastname = String(body.lastname ?? '').trim();
  const middlename = body.middlename ? String(body.middlename).trim() : undefined;
  const username = body.username ? String(body.username).trim() : undefined;
  const contact = body.contact ? String(body.contact).trim() : undefined;
  const talent = body.talent ? String(body.talent).trim() : undefined;
  const talents = body.talents ? String(body.talents).trim() : undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }
  if (!['client', 'coach'].includes(role)) {
    return NextResponse.json({ error: 'Role must be client or coach.' }, { status: 400 });
  }
  if (!firstname || !lastname) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  try {
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        firstname,
        middlename: middlename ?? null,
        lastname,
        username: username ?? email.split('@')[0],
        contact: contact ?? null,
        talent: talent ?? 'N/A',
        talents: talents ?? 'Dance',
      },
    });

    if (authError || !data?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Could not create the account.' },
        { status: 400 }
      );
    }

    // Fetch the profile the trigger created.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, coach_profile:coach_profiles(*), client_profile:client_profiles(*)')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    return NextResponse.json({ user: profile ?? { id: data.user.id, email, role } }, { status: 201 });
  } catch (err) {
    console.error('Admin user create error:', err);
    return NextResponse.json({ error: 'Could not create this account.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await guard();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: 'A valid user id is required.' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Load the current record so we can enforce safeguards.
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  // Never touch the pinned admin account's role.
  if (target.email === ADMIN_EMAIL && body.role && body.role !== 'admin') {
    return NextResponse.json({ error: 'The primary administrator role cannot be changed.' }, { status: 403 });
  }

  // Guard against removing the last admin.
  if (target.role === 'admin' && body.role && body.role !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last administrator.' }, { status: 403 });
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedFields = [
    'firstname', 'middlename', 'lastname', 'contact', 'status', 'bio',
    'address_summary', 'street', 'postal_code', 'barangay_name', 'city_name',
    'province_name', 'region_name', 'account_verified',
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) patch[field] = body[field];
  }

  if (body.role !== undefined) {
    const newRole = String(body.role) as UserRole;
    if (!ALLOWED_ROLES.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    patch.role = newRole;
  }

  try {
    const { data: updated, error: dbError } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*, coach_profile:coach_profiles(*), client_profile:client_profiles(*)')
      .maybeSingle();
    if (dbError) throw dbError;

    // Keep auth metadata in sync when role changes, best-effort.
    if (body.role !== undefined && hasServiceRoleKey()) {
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { role: body.role },
      }).catch(() => undefined);
    }

    // Ensure a detail row exists for the new role.
    try {
      if (body.role === 'coach') {
        await supabase
          .from('coach_profiles')
          .upsert({ id, talents: 'Dance' }, { onConflict: 'id', ignoreDuplicates: true });
      } else if (body.role === 'client') {
        await supabase
          .from('client_profiles')
          .upsert({ id, talent: 'N/A' }, { onConflict: 'id', ignoreDuplicates: true });
      }
    } catch {
      // Best-effort: the trigger may have already created the row.
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error('Admin user update error:', err);
    return NextResponse.json({ error: 'Could not update this account.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { admin, error } = await guard();
  if (error) return error;

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: 'A valid user id is required.' }, { status: 400 });
  }

  // Never delete your own account.
  if (admin && admin.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 403 });
  }

  try {
    const supabase = await createAdminClient();

    const { data: target } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', id)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
    }

    // Never delete the primary administrator account.
    if (target.email === ADMIN_EMAIL) {
      return NextResponse.json({ error: 'The primary administrator account cannot be deleted.' }, { status: 403 });
    }

    // Prevent removing the last administrator.
    if (target.role === 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last administrator.' }, { status: 403 });
      }
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Service role key is not configured, so accounts cannot be deleted.' },
        { status: 503 }
      );
    }

    // Auth first.
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
