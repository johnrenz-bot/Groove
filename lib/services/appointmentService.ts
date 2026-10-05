import { SupabaseClient } from '@supabase/supabase-js';
import { Appointment, AppointmentStatus } from '@/lib/types';

export async function getClientAppointments(
  supabase: SupabaseClient,
  clientId: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`*, coach:coach_id(*), client:client_id(*)`)
    .eq('client_id', clientId)
    .order('date', { ascending: false });

  if (error || !data) return [];
  return data as Appointment[];
}

export async function getCoachAppointments(
  supabase: SupabaseClient,
  coachId: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`*, coach:coach_id(*), client:client_id(*)`)
    .eq('coach_id', coachId)
    .order('date', { ascending: false });

  if (error || !data) return [];
  return data as Appointment[];
}

export async function updateAppointmentStatus(
  supabase: SupabaseClient,
  appointmentId: number,
  status: AppointmentStatus
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  return { error: error ? new Error(error.message) : null };
}

export async function submitAppointmentFeedback(
  supabase: SupabaseClient,
  params: {
    appointmentId: number;
    coachId: string;
    userId: string;
    rating: number;
    feedback: string;
  }
): Promise<{ error: Error | null }> {
  // Update appointment record
  const { error: apptErr } = await supabase
    .from('appointments')
    .update({
      rating: params.rating,
      feedback: params.feedback,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.appointmentId);

  if (apptErr) return { error: new Error(apptErr.message) };

  // Insert to feedbacks table
  const { error: fbErr } = await supabase.from('feedbacks').insert({
    coach_id: params.coachId,
    user_id: params.userId,
    rating: params.rating,
    comment: params.feedback,
  });

  return { error: fbErr ? new Error(fbErr.message) : null };
}
