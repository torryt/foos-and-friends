-- Migration: Tighten grants on sharing/join RPCs
-- Supabase's default privileges grant EXECUTE to anon on every new function.
-- All of these are guarded internally by auth.uid()/role checks, but only the
-- three public read RPCs are meant to be anon-callable — everything else is
-- authenticated-only. Most importantly, join_group_by_invite_code accepts a
-- p_user_id parameter (legacy signature), so anon must not reach it.
--
-- Note: several pre-existing RPCs (migrations 005-022) have the same default
-- anon grant; cleaning those up is left for a dedicated pass.

REVOKE EXECUTE ON FUNCTION join_group_by_invite_code(text, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_group_by_invite_code(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_pending_join_requests(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION approve_join_request(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION deny_join_request(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_pending_join_request_counts() FROM public, anon;
REVOKE EXECUTE ON FUNCTION set_group_join_policy(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION set_group_sharing(uuid, boolean) FROM public, anon;
REVOKE EXECUTE ON FUNCTION regenerate_public_token(uuid) FROM public, anon;
-- Internal helper; only called from within the public read RPCs (which run as
-- the function owner), never directly by clients
REVOKE EXECUTE ON FUNCTION resolve_public_token(text) FROM public, anon, authenticated;

-- Intentionally anon-callable (token-gated public read-only pages):
--   get_public_group_data(text), get_public_matches(text, uuid),
--   get_public_season_stats(text, uuid)
