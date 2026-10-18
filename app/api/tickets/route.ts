import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, hasServiceRoleKey } from '@/lib/supabase/server';

/**
 * PUBLIC SUPPORT TICKETS.
 *
 * Submission is deliberately anonymous — `MIGRATION_PLAN.md` item 15 specifies a
 * guest-capable support form — so this route is NOT behind a session check. What
 * it must not be is an open file-write primitive, which is what it was:
 *
 *   - no authentication of any kind, and the privileged client, so anyone on the
 *     internet could write a row and a file;
 *   - `attachment.name.split('.').pop()` became the stored extension and
 *     `attachment.type` became the stored content type, both straight from the
 *     request body;
 *   - no size limit, so the 5 MB ceiling every other writer obeys was skipped;
 *   - `upsert: true`, which let a caller overwrite a previously stored
 *     attachment by guessing its name.
 *
 * The upload is now gated by an allowlist, sized, sanitised, and written to its
 * own `tickets/` prefix with `upsert: false`. Everything else about the endpoint
 * — the table, the columns, the admin inbox that reads it — is unchanged.
 */

/** Matches `supabase/storage_policies.sql`'s constraints for other writers. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * The extension is derived from the ALLOWED MIME TYPE, never from the uploaded
 * filename, so `payload.html` claiming `image/png` still lands as `.png` and a
 * name like `x.svg` cannot choose the stored type.
 */
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const MAX_FIELD = 200;

function clamp(value: FormDataEntryValue | null, limit: number): string {
  return String(value ?? '').trim().slice(0, limit);
}

/** The insert, tried against the caller's session first and the privileged client second. */
async function insertTicket(
  row: Record<string, unknown>
): Promise<{ data: unknown } | { error: { message: string; code?: string }; needsServiceKey: boolean }> {
  // First choice: the caller's own client, so `user_id` is the session's and the
  // write is attributable without any special privilege. `supabase/schema.sql`
  // grants `Anyone can create tickets` for exactly this case.
  const caller = await createClient();
  const {
    data: { user },
  } = await caller.auth.getUser();

  const first = await caller
    .from('tickets')
    .insert({ ...row, user_id: user?.id ?? null })
    .select()
    .single();

  if (!first.error) return { data: first.data };

  /**
   * `42501` is "row-level security policy" — the deployment has not applied the
   * guest-insert policy. The route is anonymous by design, so refusing here
   * would mean the support form silently stops working, and the ticket is the
   * thing we least want to drop. Retry with the privileged client, which is
   * RLS-independent and only works once a real `SUPABASE_SERVICE_ROLE_KEY` is
   * configured.
   *
   * `needsServiceKey` tells the caller WHICH of the two things is wrong. Without
   * it every one of these deployments reported the same opaque 500 and the real
   * cause — a placeholder key, or a migration that was never applied — was
   * invisible from the response.
   */
  if (first.error.code !== '42501') {
    return { error: first.error, needsServiceKey: false };
  }

  if (!hasServiceRoleKey()) {
    return { error: first.error, needsServiceKey: true };
  }

  const admin = await createAdminClient();
  const second = await admin
    .from('tickets')
    .insert({ ...row, user_id: user?.id ?? null })
    .select()
    .single();

  if (second.error) return { error: second.error, needsServiceKey: false };
  return { data: second.data };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = clamp(formData.get('name'), 120);
    const email = clamp(formData.get('email'), 200);
    const subject = clamp(formData.get('subject'), 160);
    const message = clamp(formData.get('message'), 4000);
    const attachment = formData.get('attachment');

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    // The privileged client for the upload only (storage writes to a private
    // bucket are policy-gated by folder prefix). The row itself goes through
    // `insertTicket` below.
    const admin = await createAdminClient();

    let attachment_path: string | null = null;
    let attachment_name: string | null = null;
    let attachment_mime: string | null = null;
    let attachment_size: number | null = null;
    let attachment_rejected: string | null = null;

    if (attachment instanceof File && attachment.size > 0) {
      const extension = ALLOWED_TYPES[attachment.type];

      if (!extension) {
        attachment_rejected = 'That file type is not accepted. Attach a PDF or an image.';
      } else if (attachment.size > MAX_UPLOAD_BYTES) {
        attachment_rejected = 'That file is larger than 5 MB.';
      } else {
        const filename = `ticket_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
        const buffer = Buffer.from(await attachment.arrayBuffer());

        const { data: uploadData, error: uploadError } = await admin.storage
          .from('verification-documents')
          // `tickets/` is its own prefix, separate from the
          // `clients|coaches/<uid>/` folders the storage policies describe.
          .upload(`tickets/${filename}`, buffer, {
            contentType: attachment.type,
            // Never overwrite: the stored name is unguessable, and allowing an
            // overwrite would let a caller replace an earlier ticket's
            // evidence.
            upsert: false,
          });

        if (uploadError || !uploadData) {
          // The ticket still matters even when the file cannot be stored —
          // dropping the whole submission because storage is unavailable loses
          // the support request. Record it and say so in the response.
          console.error('Ticket attachment upload failed:', uploadError?.message ?? 'unknown');
          attachment_rejected = 'We could not store the attachment.';
        } else {
          attachment_path = uploadData.path;
          attachment_name = attachment.name.slice(0, 120);
          attachment_mime = attachment.type;
          attachment_size = attachment.size;
        }
      }
    }

    const result = await insertTicket({
      name,
      email,
      subject,
      message,
      status: 'open',
      priority: 'medium',
      attachment_path,
      attachment_name,
      attachment_mime,
      attachment_size,
    });

    if ('error' in result) {
      console.error('Ticket insertion error:', result.error);
      if (result.needsServiceKey) {
        return NextResponse.json(
          {
            error:
              'Ticket submission is not available on this deployment: anonymous tickets are blocked by Row Level Security and no service-role key is configured. Set SUPABASE_SERVICE_ROLE_KEY, or apply the `Anyone can create tickets` policy from supabase/schema.sql.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to submit ticket. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        ticket: result.data,
        // Absent when the attachment was fine, or when there was none.
        ...(attachment_rejected ? { warning: attachment_rejected } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Ticket route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}