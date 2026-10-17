-- Migration 21: GroovePH Professional GCash Payment System
--
-- Adds tables and policies for:
-- 1. gcash_profiles: GCash account details, QR code images, and status for Clients and Coaches
-- 2. payment_transactions: Payment requests, receipts/proofs, verification reviews, and audit trail
--
-- Safe to re-run (idempotent with IF NOT EXISTS and DROP POLICY IF EXISTS).

-- =============================================================================
-- 1. GCash Profiles Table (Both Client and Coach)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gcash_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    qr_code_url TEXT,
    qr_code_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcash_profiles_user_id ON public.gcash_profiles(user_id);

ALTER TABLE public.gcash_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active gcash profiles" ON public.gcash_profiles;
CREATE POLICY "Anyone can view active gcash profiles"
    ON public.gcash_profiles
    FOR SELECT
    TO authenticated
    USING (is_active = true OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own gcash profile" ON public.gcash_profiles;
CREATE POLICY "Users can manage own gcash profile"
    ON public.gcash_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- 2. Payment Transactions & Proofs Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(50) UNIQUE NOT NULL,
    appointment_id BIGINT REFERENCES public.appointments(id) ON DELETE SET NULL,
    agreement_id BIGINT REFERENCES public.agreements(id) ON DELETE SET NULL,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
    description TEXT NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'confirmed', 'rejected', 'cancelled'
    payee_account_name VARCHAR(150) NOT NULL,
    payee_account_number VARCHAR(30) NOT NULL,
    payee_qr_url TEXT,
    instructions TEXT,
    proof_image_url TEXT,
    proof_image_path TEXT,
    proof_uploaded_at TIMESTAMPTZ,
    proof_notes TEXT,
    gcash_ref_number VARCHAR(50),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_sender ON public.payment_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_recipient ON public.payment_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_appt ON public.payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(payment_status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their transactions" ON public.payment_transactions;
CREATE POLICY "Participants can view their transactions"
    ON public.payment_transactions
    FOR SELECT
    TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can create transactions" ON public.payment_transactions;
CREATE POLICY "Users can create transactions"
    ON public.payment_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Participants can update transactions" ON public.payment_transactions;
CREATE POLICY "Participants can update transactions"
    ON public.payment_transactions
    FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin())
    WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- 3. Storage Policies for gcash-qr and payment-proofs (in avatars / private storage)
-- =============================================================================
-- Safe fallback to avatars bucket where users upload their assets:
-- Path convention:
--   avatars/<auth.uid()>/gcash-qr-<timestamp>.<ext>
--   avatars/<auth.uid()>/payment-proof-<timestamp>.<ext>
