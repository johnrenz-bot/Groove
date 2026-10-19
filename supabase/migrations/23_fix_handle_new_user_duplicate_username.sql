-- Fix handle_new_user(): avoid unique(username) conflicts, enforce length limit,
-- and never grant admin from untrusted signup metadata.
-- Safe to re-run. Does not delete users or weaken constraints/RLS.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_custom_id VARCHAR(10) := new.raw_user_meta_data->>'custom_id';
    v_firstname VARCHAR(100) := COALESCE(new.raw_user_meta_data->>'firstname', 'User');
    v_middlename VARCHAR(100) := new.raw_user_meta_data->>'middlename';
    v_lastname VARCHAR(100) := COALESCE(new.raw_user_meta_data->>'lastname', '');
    v_username VARCHAR(60);
    v_contact VARCHAR(30) := new.raw_user_meta_data->>'contact';
    v_base_username VARCHAR(60);
BEGIN
    -- Public signup metadata is untrusted. It may request 'coach'; it must never
    -- grant 'admin'. Administrator accounts are provisioned through a trusted
    -- server-side process (seed/migration or service-role route), not signup.
    v_role := CASE
        WHEN new.raw_user_meta_data->>'role' = 'coach' THEN 'coach'::public.user_role
        ELSE 'client'::public.user_role
    END;

    -- Preserve an explicitly requested username when available; otherwise use the
    -- email prefix. Truncate to 51 characters so the collision suffix (up to 9
    -- characters: "_" + 8 hex) can never exceed the 60-character limit of
    -- public.profiles.username.
    v_base_username := substr(
        COALESCE(
            NULLIF(btrim(new.raw_user_meta_data->>'username'), ''),
            split_part(new.email, '@', 1),
            'user'
        ),
        1, 51
    );
    v_username := v_base_username;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
        v_username := v_base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
    END IF;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
        v_username := substr(v_base_username, 1, 51) || '_' || substr(md5(random()::text), 1, 8);
    END LOOP;

    INSERT INTO public.profiles (
        id, custom_id, role, firstname, middlename, lastname, username, email,
        contact, status, terms_accepted, email_verified, account_verified
    ) VALUES (
        new.id, v_custom_id, v_role, v_firstname, v_middlename, v_lastname,
        v_username, new.email, v_contact, 'offline', TRUE,
        new.email_confirmed_at IS NOT NULL, FALSE
    );

    IF v_role = 'coach' THEN
        INSERT INTO public.coach_profiles (id, talents)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'talents', 'Dance'))
        ON CONFLICT (id) DO NOTHING;
    ELSIF v_role = 'client' THEN
        INSERT INTO public.client_profiles (id, talent)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'talent', 'N/A'))
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```<|end|><|start|>write to=assistant<|channel|>analysis<|message|>Tool write completed.<|end|><|start|>assist<|channel|>analysis<|message|>Need account_verified for admin? Since admin no longer created via signup, profile account_verified false. Admin accounts provisioned via seed set account_verified true manually. But what if trusted server-side process creates admin via service role with metadata role admin? Trigger now ignores admin and creates client, so admin account wouldn't be admin. The task says admin must be provisioned through trusted server-side process. The admin route `/api/admin/users` only creates client/coach, not admin. Seed creates admin profile manually. But if a trusted process inserts auth.users with role admin, trigger would create client profile, then process must update role to admin. That's okay. But maybe we should allow admin role only if email pinned, as before? The review explicitly says "Prevent public signup metadata from granting the admin role, even when the email is admin@gmail.com. Admin accounts must be provisioned through a trusted server-side process." So no admin from signup at all. Good.

But account_verified false for all signup. Fine.

Now also need update previous migration 23? We overwrote. Good. Should we also update schema.sql account_verified line? We changed to FALSE in migration but in schema.sql we left `v_role = 'admin'` in account_verified expression. Since v_role never admin now, it's false anyway. But for consistency, update schema.sql account_verified to FALSE. Let's edit.<|end|><|start|>assist to=edit<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="path">
C:\website\GrooveSystem\supabase\schema.sql