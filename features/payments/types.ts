import type { Profile, Appointment } from '@/lib/types';

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected' | 'cancelled';

export interface GCashProfile {
  id?: string;
  user_id: string;
  account_name: string;
  account_number: string;
  qr_code_url?: string | null;
  qr_code_path?: string | null;
  is_active?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentTransaction {
  id: string;
  transaction_reference: string;
  appointment_id?: number | null;
  agreement_id?: number | null;
  sender_id: string;
  recipient_id: string;
  amount: number;
  currency: string;
  description: string;
  payment_status: PaymentStatus;
  payee_account_name: string;
  payee_account_number: string;
  payee_qr_url?: string | null;
  instructions?: string | null;
  proof_image_url?: string | null;
  proof_image_path?: string | null;
  proof_uploaded_at?: string | null;
  proof_notes?: string | null;
  gcash_ref_number?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile | null;
  recipient?: Profile | null;
  appointment?: Appointment | null;
}

export interface CreatePaymentRequestInput {
  sender_id: string; // payer
  recipient_id: string; // payee
  amount: number;
  description: string;
  appointment_id?: number | null;
  agreement_id?: number | null;
  payee_account_name: string;
  payee_account_number: string;
  payee_qr_url?: string | null;
  instructions?: string | null;
}

export interface SubmitPaymentProofInput {
  transaction_id: string;
  proof_file?: File | null;
  proof_data_url?: string | null;
  gcash_ref_number: string;
  proof_notes?: string;
  sender_id: string;
}

export interface ReviewPaymentProofInput {
  transaction_id: string;
  payment_status: 'confirmed' | 'rejected';
  reviewer_id: string;
  review_notes?: string;
}
