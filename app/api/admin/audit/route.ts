import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/audit
 *
 * Records an administrative action in `admin_activity_log`.
 *
 * Written server-side with the service-role client on purpose. If the browser
 * wrote the log itself under RLS, a compromised admin session could forge or
 * erase history — which defeats the point of an audit trail. Here the row is
 * inserted by the server, and the actor identity is taken from the verified
 * session rather than from the request body, so the caller cannot attribute an
 * action to someone else.
 *
 * Logging must never block the action it describes, so failures return 200 with
 * `logged: false` rather than surfacing an error the client would have to handle.
 */
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: { action?: string; entity?: string; entityId?: string; summary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.action || !body.entity) {
    return NextResponse.json(
      { error: 'Both action and entity are required.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('admin_activity_log').insert({
      admin_id: admin.id,
      admin_email: admin.email,
      action: String(body.action).slice(0, 80),
      entity: String(body.entity).slice(0, 80),
      entity_id: body.entityId ? String(body.entityId).slice(0, 200) : null,
      summary: body.summary ? String(body.summary).slice(0, 500) : null,
      metadata: {},
    });

    if (error) throw error;
    return NextResponse.json({ logged: true }, { status: 201 });
  } catch (err) {
    console.error('Admin audit write failed:', err);
    return NextResponse.json({ logged: false }, { status: 200 });
  }
}