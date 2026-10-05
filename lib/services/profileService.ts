import { SupabaseClient } from '@supabase/supabase-js';
import { Profile, CoachProfile, ClientProfile, FullCoach } from '@/lib/types';

export async function getCurrentUserProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getCoachWithDetails(supabase: SupabaseClient, coachId: string): Promise<FullCoach | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`*, coach_profile:coach_profiles(*)`)
    .eq('id', coachId)
    .single();

  if (error || !data) return null;

  const { data: reviews } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('coach_id', coachId);

  const avgRating = reviews?.length
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
    : 5.0;

  return {
    ...data,
    rating: Number(avgRating.toFixed(1)),
    rating_count: reviews?.length || 0,
  } as FullCoach;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Profile>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: error ? new Error(error.message) : null };
}

export async function updateCoachProfile(
  supabase: SupabaseClient,
  coachId: string,
  updates: Partial<CoachProfile>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('coach_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', coachId);

  return { error: error ? new Error(error.message) : null };
}

export async function updateClientProfile(
  supabase: SupabaseClient,
  clientId: string,
  updates: Partial<ClientProfile>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clientId);

  return { error: error ? new Error(error.message) : null };
}
