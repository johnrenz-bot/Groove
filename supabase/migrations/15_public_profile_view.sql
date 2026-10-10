-- ═══════════════════════════════════════════════════════════════════════════
-- 15 — Public profile view (privacy hardening)
--
-- WHY
-- The RLS policy "Public can view profiles" on public.profiles is ROW-level:
-- `FOR SELECT USING (true)` lets any client select EVERY column, including
-- email, contact (mobile), birthdate, street and address_summary. Code now
-- whitelists the public columns everywhere a stranger can look (follow lists,
-- /users, the public profile page), but a whitelist is only as strong as every
-- future query. This view makes the boundary structural: public surfaces read
-- a view that cannot return the private columns, no matter what they ask for.
--
-- WHY A VIEW, NOT COLUMN-LEVEL GRANTS
-- Dropping SELECT on sensitive columns from `authenticated` would also hide a
-- member's OWN email/contact from their own profile editor, which reads those
-- columns with the same role. A security-invoker view keeps full access to
-- public.profiles for owners and admins while giving public surfaces a narrow,
-- safe read path.
--
-- APPLY: run once in the Supabase SQL Editor (same as the other migrations).
-- Then point public reads at public.v_public_profiles instead of the current
-- column whitelist; account-owner reads keep using public.profiles as-is.
-- Idempotent: CREATE OR REPLACE VIEW can be re-run safely.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_public_profiles
WITH (security_invoker = true) -- view applies the caller's RLS, not the definer's
AS
SELECT
  id,
  firstname,
  lastname,
  username,
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
'Public member identity — column-whitelisted. Never includes email, contact, birthdate, street, address_summary or verification-document paths. Public surfaces should read this view; account owners and admins keep full access through public.profiles.';

-- Explicit grants so anon/authenticated can read the view and nothing else.
REVOKE ALL ON public.v_public_profiles FROM anon, authenticated;
GRANT SELECT ON public.v_public_profiles TO anon, authenticated;