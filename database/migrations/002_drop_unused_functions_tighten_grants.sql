-- Migration 002: Drop unused functions, tighten function grants
-- Date: 2026-07-13
--
-- create_friend_group (superseded by create_group_with_membership) and
-- user_is_group_member (RPCs use get_caller_group_role instead) have no
-- callers in client code, function bodies, views, triggers, or RLS policies.
-- Plain DROP (no CASCADE) so this fails loudly if a dependency appears.

DROP FUNCTION public.create_friend_group(p_name text, p_description text);
DROP FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid);

-- These three internal functions still had EXECUTE for PUBLIC (the default
-- grant, never revoked), exposing them to anon. They are only invoked by the
-- security_invoker computed views and as the invite_code column default, so
-- the explicit authenticated/service_role grants they keep are sufficient.

REVOKE ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon;
