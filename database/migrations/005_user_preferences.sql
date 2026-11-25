-- Per-user preferences that follow the user across sessions and devices
-- (issue #107: player picker sort/filter). One row per user; the shape of
-- `preferences` is owned by the client, e.g.
--   { "playerPicker": { "sort": "name", "activeOnly": false } }

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_is_object CHECK (jsonb_typeof(preferences) = 'object')
);

COMMENT ON TABLE public.user_preferences IS 'Per-user client preferences (jsonb), readable/writable only by the owning user';

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Own row only; no policy references other tables (avoids RLS recursion)
CREATE POLICY user_preferences_select_own ON public.user_preferences
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_insert_own ON public.user_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_update_own ON public.user_preferences
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Supabase default privileges grant anon/authenticated everything on new
-- tables: pin them down. No delete (row is removed with the auth user).
REVOKE ALL ON TABLE public.user_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_preferences TO authenticated;
