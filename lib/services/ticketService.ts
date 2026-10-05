import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket } from '@/lib/types';

export async function getAllTickets(supabase: SupabaseClient): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Ticket[];
}

export async function updateTicketStatus(
  supabase: SupabaseClient,
  ticketId: number,
  status: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  return { error: error ? new Error(error.message) : null };
}
