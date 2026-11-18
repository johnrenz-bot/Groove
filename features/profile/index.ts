/**
 * Profile feature: one canonical read/write path for `profiles` rows and the
 * role-specific detail tables (`coach_profiles` / `client_profiles`).
 *
 * Callers pass their own Supabase client; RLS does the rest.
 */
export {
  getProfileById,
  getProfileByUsername,
  getCurrentProfile,
  getCoachProfile,
  getClientProfile,
  updateProfile,
} from './services/profileService';
