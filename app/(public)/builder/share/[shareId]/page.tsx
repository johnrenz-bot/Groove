import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { createClient } from '@/lib/supabase/server';
import { normalizeDesign } from '@/features/tee-customizer/serialization';
import { ReadOnlyDesignView } from '@/features/tee-customizer/components/ReadOnlyDesignView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shared tee design — Groove PH',
  description: 'A view-only Groove PH custom tee design.',
};

/**
 * Public share surface. The table itself stays owner-only under RLS; the
 * `get_shared_shirt_design` RPC returns exactly one design for an unguessable
 * share id and only when `is_public` is true.
 */
export default async function SharedDesignPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_shared_shirt_design', {
    p_share_id: shareId,
  });

  if (error || !data) notFound();

  let raw: unknown = data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      notFound();
    }
  }

  if (!raw || typeof raw !== 'object') notFound();

  const design = normalizeDesign(raw);

  return (
    <PublicLayout showFooter={false}>
      <ReadOnlyDesignView design={design} />
    </PublicLayout>
  );
}
