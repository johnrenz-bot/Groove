-- ==============================================================================
-- GroovePH: Music Playlists for Community Showcase (Client & Coach)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.music_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    community TEXT NOT NULL, -- e.g. 'Dancer', 'Singer', 'Acting', 'Theater', 'General'
    title TEXT NOT NULL,
    description TEXT,
    tracks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, youtubeId, title, artist, thumbnail, duration }
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy lookups by user and community
CREATE INDEX IF NOT EXISTS idx_music_playlists_user_id ON public.music_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_music_playlists_community ON public.music_playlists(community);

-- Enable RLS
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can view public playlists or their own
CREATE POLICY "View music playlists"
    ON public.music_playlists
    FOR SELECT
    TO authenticated
    USING (is_public = true OR auth.uid() = user_id);

-- 2. Users can create their own playlists
CREATE POLICY "Insert own music playlists"
    ON public.music_playlists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own playlists
CREATE POLICY "Update own music playlists"
    ON public.music_playlists
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own playlists
CREATE POLICY "Delete own music playlists"
    ON public.music_playlists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
