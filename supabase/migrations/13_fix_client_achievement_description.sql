-- ==============================================================================
-- Fix Client Achievement Description
-- Clients don't have a bio field, so the description should not mention it.
-- ==============================================================================

-- Update the client profile complete achievement description
UPDATE public.achievements
SET description = 'Add your photo, talent, and location details'
WHERE slug = 'client_profile_complete';