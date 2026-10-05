export type UserRole = 'client' | 'coach' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'offline' | 'online' | 'busy' | 'away';
/**
 * Booking lifecycle, mirroring the public.appointment_status enum.
 *
 * 'accepted' and 'agreement_required' are real enum labels, not UI-only states:
 * the database moves a booking through them, and guard_booking_transition()
 * refuses to skip a step. 'confirmed' is reachable ONLY through the
 * both-signed trigger on the agreement — never by writing it directly.
 */
export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'agreement_required'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed';
export type PaymentMode = 'cash' | 'online';

export interface Profile {
  id: string; // auth.uid()
  custom_id?: string | null;
  role: UserRole;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  suffix?: string | null;
  birthdate?: string | null;
  contact?: string | null;
  email: string;
  username: string;
  photo_url?: string | null;
  bio?: string | null;
  status: UserStatus;
  address_summary?: string | null;
  region_code?: string | null;
  province_code?: string | null;
  city_code?: string | null;
  barangay_code?: string | null;
  region_name?: string | null;
  province_name?: string | null;
  city_name?: string | null;
  barangay_name?: string | null;
  street?: string | null;
  postal_code?: string | null;
  terms_accepted: boolean;
  email_verified: boolean;
  account_verified: boolean;
  /**
   * Verification state. Added by `supabase/verification_workflow.sql`, which
   * backfills it from `account_verified`. Optional so code that builds a Profile
   * without the new columns still typechecks — use
   * `verificationStatusOf()` from `lib/verification.ts` rather than reading it
   * directly, so a row written before the column existed cannot read as pending.
   */
  verification_status?: 'pending' | 'verified' | 'rejected' | null;
  /** Why an admin rejected the submission, shown to the account owner. */
  verification_rejection_reason?: string | null;
  /** Which document the rejection was about, when the admin named one. */
  verification_rejected_document?: string | null;
  verification_reviewed_at?: string | null;
  verification_reviewed_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type UserProfile = Profile;

export interface CoachProfile {
  id: string;
  talents: string;
  genres?: string | null;
  service_fee: number;
  duration?: string | null;
  payment_type: PaymentMode;
  payment_provider?: string | null;
  payment_handle?: string | null;
  notice_hours: number;
  notice_days: number;
  cancellation_method?: string | null;
  portfolio_path?: string | null;
  valid_id_path?: string | null;
  id_selfie_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientProfile {
  id: string;
  talent?: string | null;
  valid_id_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FullCoach extends Profile {
  coach_profile?: CoachProfile | null;
  rating?: number;
  rating_count?: number;
}

export interface FullClient extends Profile {
  client_profile?: ClientProfile | null;
}

export interface Appointment {
  id: number;
  appointment_id: number;
  client_id: string;
  coach_id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  talent?: string | null;
  experience: string;
  purpose: string;
  message?: string | null;
  status: AppointmentStatus;
  feedback?: string | null;
  rating?: number | null;
  /**
   * Added by supabase/migrations/02_booking_schema.sql. All nullable, so they
   * are optional here; `location` and the lifecycle timestamps are read when
   * building the agreement and when explaining a booking's stage to a member.
   */
  location?: string | null;
  is_online?: boolean;
  rate?: number | null;
  duration_minutes?: number | null;
  accepted_at?: string | null;
  agreement_required_at?: string | null;
  confirmed_at?: string | null;
  declined_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  cancellation_reason?: string | null;
  coach_notes?: string | null;
  created_at: string;
  updated_at: string;
  client?: Profile | null;
  coach?: Profile | null;
}

export interface Agreement {
  id: number;
  /** Added by supabase/migrations/02_booking_schema.sql: one agreement per booking. */
  appointment_id?: number | null;
  client_id: string;
  coach_id: string;
  agreement_date?: string | null;
  appointment_price?: string | null;
  session_duration?: string | null;
  payment_method?: string | null;
  notice_hours?: number | null;
  notice_days?: number | null;
  cancellation_method?: string | null;
  client_signature_path?: string | null;
  coach_signature_path?: string | null;
  agreement_pdf_path?: string | null;
  /**
   * Signature timestamps. All three also come from
   * supabase/migrations/02_booking_schema.sql; they are the AUTHORITATIVE
   * record that a party signed. The *_signature_path columns only prove an
   * object was written — a path is not loadable on its own, and a row can carry
   * one without a timestamp if the trigger did not stamp it. Optional and
   * nullable so callers holding a pre-migration shape still typecheck.
   */
  client_signed_at?: string | null;
  coach_signed_at?: string | null;
  countersigned_at?: string | null;
  status?: string | null;
  version?: string | null;
  created_at: string;
  updated_at: string;
  client?: Profile | null;
  coach?: Profile | null;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  message?: string | null;
  media_path?: string | null;
  location_url?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  /**
   * When the recipient marked this message read. NULL = unread. Added by
   * `supabase/messenger.sql` for the Admin <-> Client messenger; optional so
   * code that constructs a Message without it still typechecks.
   */
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile | null;
  receiver?: Profile | null;
}

export interface CommunityPost {
  id: number;
  author_id: string;
  caption: string;
  media_path?: string | null;
  talent: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  comments_count?: number;
  reacts_count?: number;
  user_has_reacted?: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: Profile | null;
}

export interface UserProfilePost {
  id: number;
  user_id: string;
  media_path: string;
  caption?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: number;
  coach_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: Profile | null;
  coach?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  cta_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface Announcement {
  id: number;
  title?: string | null;
  message: string;
  author: string;
  cta_url?: string | null;
  cta_label?: string | null;
  created_at: string;
}

export interface MaintenanceNotice {
  id: number;
  title?: string | null;
  type: string;
  message: string;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Ticket {
  id: number;
  user_id?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  created_at: string;
  updated_at: string;
}
