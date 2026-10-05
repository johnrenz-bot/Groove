import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    let attachment_path = null;
    let attachment_name = null;
    let attachment_mime = null;
    let attachment_size = null;

    if (attachment && attachment.size > 0) {
      const ext = attachment.name.split('.').pop();
      const filename = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const buffer = Buffer.from(await attachment.arrayBuffer());

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(`tickets/${filename}`, buffer, {
          contentType: attachment.type,
          upsert: true,
        });

      if (!uploadError && uploadData) {
        attachment_path = uploadData.path;
        attachment_name = attachment.name;
        attachment_mime = attachment.type;
        attachment_size = attachment.size;
      }
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error('Ticket insertion error:', error);
      return NextResponse.json({ error: 'Failed to submit ticket. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: data }, { status: 201 });
  } catch (err: any) {
    console.error('Ticket route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
