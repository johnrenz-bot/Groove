-- ==============================================================================
-- Increase suffix column length from VARCHAR(20) to VARCHAR(50)
-- ==============================================================================

ALTER TABLE public.profiles
    ALTER COLUMN suffix TYPE VARCHAR(50);