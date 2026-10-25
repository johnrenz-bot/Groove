-- ═══════════════════════════════════════════════════════════════════════════
-- 26 — Personal Information Masking & RLS Privacy Hardening
--
-- GrooveSystem (GroovePH) Personal Information Masking:
-- Applies asterisk (*) masking by default:
-- - Username: J*****n
-- - Email: jo*****@gmail.com
-- - Phone: 09******80
-- - Address: protected placeholder
--
-- SECURITY CONTROLS:
-- 1. Database-level masking functions for consistent server-side presentation.
-- 2. Enhanced public profile view (v_public_profiles) with dynamic masking
--    so unmasked private data is never sent in unauthorized API responses.
-- 3. Row-Level Security (RLS) enforcement ensuring only authorized owners
--    (auth.uid() = id) and administrators (public.is_admin()) can read
--    unmasked personal data.
-- 4. Original database values are preserved; masking occurs at query/presentation.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Helper function: Mask username (J*****n)
CREATE OR REPLACE FUNCTION public.mask_username(uname text)
RETURNS text AS $$
DECLARE
    clean text;
    has_at boolean := false;
    len integer;
BEGIN
    IF uname IS NULL OR TRIM(uname) = '' THEN
        RETURN '';
    END IF;

    clean := TRIM(uname);
    IF clean LIKE '@%' THEN
        has_at := true;
        clean := SUBSTRING(clean FROM 2);
    END IF;

    len := LENGTH(clean);
    IF len = 0 THEN
        IF has_at THEN RETURN '@'; ELSE RETURN ''; END IF;
    ELSIF len = 1 THEN
        IF has_at THEN RETURN '@*'; ELSE RETURN '*'; END IF;
    ELSIF len = 2 THEN
        IF has_at THEN RETURN '@' || SUBSTRING(clean, 1, 1) || '*';
        ELSE RETURN SUBSTRING(clean, 1, 1) || '*'; END IF;
    ELSE
        IF has_at THEN
            RETURN '@' || SUBSTRING(clean, 1, 1) || '*****' || SUBSTRING(clean, len, 1);
        ELSE
            RETURN SUBSTRING(clean, 1, 1) || '*****' || SUBSTRING(clean, len, 1);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 2. Helper function: Mask email (jo*****@gmail.com)
CREATE OR REPLACE FUNCTION public.mask_email(em text)
RETURNS text AS $$
DECLARE
    local_part text;
    domain_part text;
    at_pos integer;
    local_len integer;
BEGIN
    IF em IS NULL OR TRIM(em) = '' THEN
        RETURN '';
    END IF;

    at_pos := POSITION('@' IN em);
    IF at_pos = 0 THEN
        RETURN SUBSTRING(em, 1, 1) || '****';
    END IF;

    local_part := SUBSTRING(em FROM 1 FOR at_pos - 1);
    domain_part := SUBSTRING(em FROM at_pos + 1);
    local_len := LENGTH(local_part);

    IF local_len <= 1 THEN
        RETURN '*@' || domain_part;
    ELSIF local_len = 2 THEN
        RETURN local_part || '*****@' || domain_part;
    ELSE
        RETURN SUBSTRING(local_part, 1, 2) || '*****@' || domain_part;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. Helper function: Mask phone number (09******80)
CREATE OR REPLACE FUNCTION public.mask_phone(ph text)
RETURNS text AS $$
DECLARE
    digits text;
    d_len integer;
BEGIN
    IF ph IS NULL OR TRIM(ph) = '' THEN
        RETURN '';
    END IF;

    -- Strip non-digit characters
    digits := REGEXP_REPLACE(ph, '\D', '', 'g');

    -- Normalize Philippine international numbers (+63 9xx -> 09xx)
    IF digits LIKE '63%' AND LENGTH(digits) = 12 THEN
        digits := '0' || SUBSTRING(digits FROM 3);
    END IF;

    d_len := LENGTH(digits);
    IF d_len <= 4 THEN
        RETURN REPEAT('*', d_len);
    ELSE
        RETURN SUBSTRING(digits, 1, 2) || '******' || SUBSTRING(digits, d_len - 1, 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 4. Helper function: Mask address (Protected placeholder)
CREATE OR REPLACE FUNCTION public.mask_address(addr text)
RETURNS text AS $$
BEGIN
    IF addr IS NULL OR TRIM(addr) = '' THEN
        RETURN '';
    END IF;
    RETURN '•••••••••••• (Protected)';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 5. Updated Public Profile View with automatic masking
CREATE OR REPLACE VIEW public.v_public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  firstname,
  lastname,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN username
    ELSE public.mask_username(username)
  END AS username,
  photo_url,
  role,
  status,
  bio,
  city_name,
  province_name,
  account_verified,
  created_at
FROM public.profiles;

COMMENT ON VIEW public.v_public_profiles IS
'Public member identity with server-enforced personal information masking. Never includes email, contact, birthdate, street, address_summary or verification documents. Unauthorized queries receive masked usernames.';

-- 6. Comprehensive Masked Profile View for authorized application queries
CREATE OR REPLACE VIEW public.v_profiles_masked
WITH (security_invoker = true)
AS
SELECT
  id,
  custom_id,
  role,
  firstname,
  middlename,
  lastname,
  suffix,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN username
    ELSE public.mask_username(username)
  END AS username,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN email
    ELSE public.mask_email(email)
  END AS email,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN contact
    ELSE public.mask_phone(contact)
  END AS contact,
  photo_url,
  bio,
  status,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN birthdate
    ELSE NULL
  END AS birthdate,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN street
    ELSE '•••••••••••• (Protected)'
  END AS street,
  CASE
    WHEN auth.uid() = id OR public.is_admin() THEN address_summary
    ELSE '•••••••••••• (Protected)'
  END AS address_summary,
  barangay_code,
  barangay_name,
  city_code,
  city_name,
  province_code,
  province_name,
  region_code,
  region_name,
  postal_code,
  account_verified,
  created_at,
  updated_at
FROM public.profiles;

COMMENT ON VIEW public.v_profiles_masked IS
'Secure profiles presentation view. Preserves underlying table values but dynamically masks private columns for unauthorized viewers.';

-- Explicit grants so anon and authenticated clients can read safe views
REVOKE ALL ON public.v_public_profiles FROM anon, authenticated;
GRANT SELECT ON public.v_public_profiles TO anon, authenticated;

REVOKE ALL ON public.v_profiles_masked FROM anon, authenticated;
GRANT SELECT ON public.v_profiles_masked TO anon, authenticated;
