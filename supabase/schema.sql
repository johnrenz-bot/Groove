-- ==============================================================================
-- GrooveSystem: Supabase PostgreSQL Schema & Security Policies
-- Migration from Laravel to Next.js + Supabase
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'coach', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended', 'offline', 'online', 'busy', 'away');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'declined', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('cash', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Profiles Table (Linked to Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_id VARCHAR(10) UNIQUE,
    role user_role NOT NULL DEFAULT 'client',
    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100) NOT NULL,
    suffix VARCHAR(50),
    birthdate DATE,
    contact VARCHAR(30),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    photo_url TEXT,
    bio TEXT,
    status user_status NOT NULL DEFAULT 'offline',
    address_summary TEXT,
    region_code VARCHAR(20),
    province_code VARCHAR(20),
    city_code VARCHAR(20),
    barangay_code VARCHAR(50),
    region_name VARCHAR(120),
    province_name VARCHAR(120),
    city_name VARCHAR(120),
    barangay_name VARCHAR(120),
    street VARCHAR(160),
    postal_code VARCHAR(20),
    terms_accepted BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    account_verified BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Coach Details Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coach_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    talents TEXT NOT NULL DEFAULT 'Dance',
    genres TEXT,
    service_fee INTEGER DEFAULT 0,
    duration VARCHAR(50) DEFAULT '1 hour',
    payment_type payment_mode DEFAULT 'cash',
    payment_provider VARCHAR(50),
    payment_handle VARCHAR(150),
    notice_hours INTEGER DEFAULT 0,
    notice_days INTEGER DEFAULT 0,
    cancellation_method VARCHAR(255),
    portfolio_path TEXT,
    valid_id_path TEXT,
    id_selfie_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. Client Details Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    talent VARCHAR(100) DEFAULT 'N/A',
    valid_id_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. Appointments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id INTEGER UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'F2F',
    talent VARCHAR(100),
    experience VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    message TEXT,
    status appointment_status NOT NULL DEFAULT 'pending',
    feedback TEXT,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. Agreements / Contracts Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agreements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agreement_date DATE DEFAULT CURRENT_DATE,
    appointment_price VARCHAR(50),
    session_duration VARCHAR(50),
    payment_method VARCHAR(50),
    notice_hours INTEGER,
    notice_days INTEGER,
    cancellation_method VARCHAR(255),
    client_signature_path TEXT,
    coach_signature_path TEXT,
    agreement_pdf_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. Messages Table (Chat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    media_path TEXT,
    location_url TEXT,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. Community Posts Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT NOT NULL,
    media_path TEXT,
    talent VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. Post Comments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. Post Reacts Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.post_reacts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_post_user_react UNIQUE (post_id, user_id)
);

-- ==============================================================================
-- 11. User Profile Showcase Posts Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profile_posts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_path TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. Feedbacks & Ratings Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. Notifications Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    cta_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 14. Announcements Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255),
    message TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'Admin',
    cta_url TEXT,
    cta_label VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 15. Maintenance Notices Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_notices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(50) DEFAULT 'maintenance',
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by VARCHAR(100) DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. Support Tickets Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'open',
    priority VARCHAR(30) DEFAULT 'normal',
    attachment_path TEXT,
    attachment_name VARCHAR(255),
    attachment_mime VARCHAR(100),
    attachment_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 17. System Settings Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default Settings Insert
INSERT INTO public.system_settings (key, value)
VALUES ('theme', 'light')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 18. Indexes for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_geo ON public.profiles(region_code, province_code, city_code, barangay_code);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_coach ON public.appointments(coach_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_talent ON public.community_posts(talent);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ==============================================================================
-- 19. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Public can read basic profile info, users can update own profile, Admins can manage all
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Coach profiles
CREATE POLICY "Public can view coach profiles" ON public.coach_profiles FOR SELECT USING (true);
CREATE POLICY "Coaches can update own coach profile" ON public.coach_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coaches can insert own coach profile" ON public.coach_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Client profiles
CREATE POLICY "Public can view client profiles" ON public.client_profiles FOR SELECT USING (true);
CREATE POLICY "Clients can update own client profile" ON public.client_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Clients can insert own client profile" ON public.client_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Appointments: Clients and Coaches involved + Admins
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

CREATE POLICY "Clients can book appointments" ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update appointments" ON public.appointments FOR UPDATE
USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

-- Agreements
CREATE POLICY "Participants can view agreements" ON public.agreements FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

CREATE POLICY "Participants can insert/update agreements" ON public.agreements FOR ALL
USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

-- Messages
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin());

CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can edit/delete own messages" ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Community posts
CREATE POLICY "Public can view community posts" ON public.community_posts FOR SELECT
USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and Admins can delete posts" ON public.community_posts FOR UPDATE
USING (auth.uid() = author_id OR public.is_admin());

-- Comments
CREATE POLICY "Public can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors and Admins can delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Post Reacts
CREATE POLICY "Public can view reacts" ON public.post_reacts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can toggle reacts" ON public.post_reacts FOR ALL USING (auth.uid() = user_id);

-- User Profile Posts
CREATE POLICY "Public can view profile posts" ON public.user_profile_posts FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile posts" ON public.user_profile_posts FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Feedbacks
CREATE POLICY "Public can view feedback" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Clients can submit feedback" ON public.feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System and Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Announcements & Maintenance
CREATE POLICY "Public can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.is_admin());

CREATE POLICY "Public can view active maintenance notices" ON public.maintenance_notices FOR SELECT USING (true);
CREATE POLICY "Admins can manage maintenance notices" ON public.maintenance_notices FOR ALL USING (public.is_admin());

-- Support Tickets
CREATE POLICY "Anyone can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users and Admins can view tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE USING (public.is_admin());

-- System Settings
CREATE POLICY "Public can read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 20. Auto-Profile Creation Trigger on auth.users Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client');
    v_custom_id VARCHAR(10) := new.raw_user_meta_data->>'custom_id';
    v_firstname VARCHAR(100) := COALESCE(new.raw_user_meta_data->>'firstname', 'User');
    v_middlename VARCHAR(100) := new.raw_user_meta_data->>'middlename';
    v_lastname VARCHAR(100) := COALESCE(new.raw_user_meta_data->>'lastname', '');
    v_username VARCHAR(60) := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    v_contact VARCHAR(30) := new.raw_user_meta_data->>'contact';
BEGIN
    INSERT INTO public.profiles (
        id,
        custom_id,
        role,
        firstname,
        middlename,
        lastname,
        username,
        email,
        contact,
        status,
        terms_accepted,
        email_verified,
        account_verified
    ) VALUES (
        new.id,
        v_custom_id,
        v_role,
        v_firstname,
        v_middlename,
        v_lastname,
        v_username,
        new.email,
        v_contact,
        'offline',
        TRUE,
        new.email_confirmed_at IS NOT NULL,
        v_role = 'admin' -- Auto-verify admin
    );

    IF v_role = 'coach' THEN
        INSERT INTO public.coach_profiles (id, talents)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'talents', 'Dance'));
    ELSIF v_role = 'client' THEN
        INSERT INTO public.client_profiles (id, talent)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'talent', 'N/A'));
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
