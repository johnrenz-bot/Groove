-- ==============================================================================
-- Fix barangay_code column length: VARCHAR(20) -> VARCHAR(50)
-- The AddressSelector generates codes like: 031420000-francisco-homes-mulawin (33 chars)
-- which exceeds the original VARCHAR(20) limit.
-- ==============================================================================

ALTER TABLE public.profiles
    ALTER COLUMN barangay_code TYPE VARCHAR(50);