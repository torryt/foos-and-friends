-- Migration: Unified group access by group id
-- The public read-only pages move from unguessable-token URLs (/public/<token>)
-- to plain group-id URLs (/groups/<id>) shared with the authed app. Public
-- reads are now keyed by group id and gated on is_public; the token becomes
-- dead (column dropped in migration 027, applied after the app deploy).
--
-- Also fixes two long-standing RLS holes on group_memberships that become
-- practically exploitable once group ids appear in shareable URLs:
--   1. users_insert_own_memberships let any authenticated user insert a
--      membership into ANY group (only user_id was checked). The SECURITY
--      DEFINER visibility trigger then granted full read/write access —
--      bypassing invite codes and join_policy entirely.
--   2. users_update_own_memberships let members update their own row,
--      including role (self-promotion to admin/owner) and is_active
--      (re-activating after removal).
-- All legitimate membership writes already go through SECURITY DEFINER RPCs
-- (create_friend_group, join_group_by_invite_code, approve_join_request,
-- leave_group, member-management RPCs), and the JS client only ever reads
-- memberships, so both policies can simply go.

-- ===== 1. RLS FIXES =====

DROP POLICY IF EXISTS "users_insert_own_memberships" ON group_memberships;
DROP POLICY IF EXISTS "users_update_own_memberships" ON group_memberships;

-- ===== 2. JOIN POLICY DEFAULTS TO APPROVAL =====

-- New groups require owner/admin approval to join unless explicitly opened.
ALTER TABLE friend_groups ALTER COLUMN join_policy SET DEFAULT 'approval';

-- ===== 3. DROP TOKEN-BASED PUBLIC READS =====

DROP FUNCTION IF EXISTS get_public_group_data(text);
DROP FUNCTION IF EXISTS get_public_matches(text, uuid);
DROP FUNCTION IF EXISTS get_public_season_stats(text, uuid);
DROP FUNCTION IF EXISTS resolve_public_token(text);
DROP FUNCTION IF EXISTS regenerate_public_token(uuid);

-- set_group_sharing keeps its signature but no longer manages a token.
CREATE OR REPLACE FUNCTION set_group_sharing(p_group_id uuid, p_is_public boolean)
RETURNS json AS $$
DECLARE
    v_caller_role text;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can change sharing settings'
        );
    END IF;

    UPDATE friend_groups
    SET is_public = p_is_public,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'is_public', p_is_public);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 4. GROUP-ID-GATED PUBLIC READS (anon-callable) =====

-- Internal helper: the group id if (and only if) the group is publicly
-- readable. First check in every public read RPC.
CREATE OR REPLACE FUNCTION resolve_public_group(p_group_id uuid)
RETURNS uuid AS $$
    SELECT id FROM friend_groups
    WHERE id = p_group_id
      AND is_public = true
      AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';

-- Everything needed to boot the public page in one round trip:
-- group info, seasons, players (with computed stats), and season trophies.
-- Unlike the old token variant, the payload does NOT include invite_code:
-- joining from the public page goes through request_to_join_group, keeping
-- invite links a separate, revocable channel.
CREATE OR REPLACE FUNCTION get_public_group_data(p_group_id uuid)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_group json;
    v_seasons json;
    v_players json;
    v_trophies json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'sport_type', g.sport_type,
        'supported_match_types', g.supported_match_types,
        'target_score', g.target_score,
        'join_policy', g.join_policy
    )
    INTO v_group
    FROM friend_groups g
    WHERE g.id = v_group_id;

    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.season_number DESC), '[]'::json)
    INTO v_seasons
    FROM seasons s
    WHERE s.group_id = v_group_id;

    SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.ranking DESC), '[]'::json)
    INTO v_players
    FROM player_stats_computed p
    WHERE p.group_id = v_group_id;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', t.id,
            'group_id', t.group_id,
            'season_id', t.season_id,
            'player_id', t.player_id,
            'rank', t.rank,
            'created_at', t.created_at,
            'seasons', json_build_object('name', s.name, 'season_number', s.season_number)
        )
        ORDER BY t.created_at DESC, t.rank
    ), '[]'::json)
    INTO v_trophies
    FROM season_trophies t
    JOIN seasons s ON s.id = t.season_id
    WHERE t.group_id = v_group_id;

    RETURN json_build_object(
        'success', true,
        'group', v_group,
        'seasons', v_seasons,
        'players', v_players,
        'trophies', v_trophies
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- All of the group's matches (optionally season-filtered). The full history is
-- needed client-side for the continuous all-time ELO replay.
CREATE OR REPLACE FUNCTION get_public_matches(p_group_id uuid, p_season_id uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_matches json;
    v_players json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.created_at DESC), '[]'::json)
    INTO v_matches
    FROM matches m
    WHERE m.group_id = v_group_id
      AND (p_season_id IS NULL OR m.season_id = p_season_id);

    -- Players are included so the response is self-contained: the client
    -- resolves match participants without a second request.
    SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
    INTO v_players
    FROM player_stats_computed p
    WHERE p.group_id = v_group_id;

    RETURN json_build_object('success', true, 'matches', v_matches, 'players', v_players);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Season leaderboards in the same shapes as the computed views the authed app
-- reads, so the client can reuse its existing mappers.
CREATE OR REPLACE FUNCTION get_public_season_stats(p_group_id uuid, p_season_id uuid)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_overall json;
    v_1v1 json;
    v_2v2 json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    -- The season must belong to the public group; otherwise a valid public
    -- group id would leak other groups' stats.
    IF NOT EXISTS (SELECT 1 FROM seasons WHERE id = p_season_id AND group_id = v_group_id) THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_overall
    FROM player_season_stats_computed v
    WHERE v.season_id = p_season_id;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_1v1
    FROM player_season_stats_1v1_computed v
    WHERE v.season_id = p_season_id;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_2v2
    FROM player_season_stats_2v2_computed v
    WHERE v.season_id = p_season_id;

    RETURN json_build_object(
        'success', true,
        'overall', v_overall,
        'one_v_one', v_1v1,
        'two_v_two', v_2v2
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 5. GROUP PREVIEW (anon-callable, works for private groups) =====

-- The minimal landing payload for a non-member visiting a group URL: enough
-- to render "<name> — request to join", never stats, members, or invite_code.
-- Group ids are unguessable v4 UUIDs, so existence disclosure is acceptable.
CREATE OR REPLACE FUNCTION get_group_preview(p_group_id uuid)
RETURNS json AS $$
DECLARE
    v_group record;
BEGIN
    SELECT id, name, description, sport_type, join_policy, is_public
    INTO v_group
    FROM friend_groups
    WHERE id = p_group_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    RETURN json_build_object(
        'success', true,
        'group', json_build_object(
            'id', v_group.id,
            'name', v_group.name,
            'description', v_group.description,
            'sport_type', v_group.sport_type,
            'join_policy', v_group.join_policy,
            'is_public', v_group.is_public
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 6. REQUEST TO JOIN BY GROUP ID (authenticated) =====

-- The group-page counterpart of join_group_by_invite_code: no invite code
-- needed, works for private groups too (a "knock"). Respects join_policy:
-- open → joins immediately, approval → files a pending request.
CREATE OR REPLACE FUNCTION request_to_join_group(p_group_id uuid)
RETURNS json AS $$
DECLARE
  v_group record;
  v_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, name, max_members, join_policy INTO v_group
  FROM friend_groups
  WHERE id = p_group_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Group not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = v_group.id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  IF v_group.join_policy = 'approval' THEN
    -- Idempotent: a second attempt while pending just reports pending again
    INSERT INTO group_join_requests (group_id, user_id)
    VALUES (v_group.id, auth.uid())
    ON CONFLICT (group_id, user_id) WHERE status = 'pending' DO NOTHING;

    RETURN json_build_object(
      'success', true,
      'status', 'pending',
      'group_id', v_group.id,
      'group_name', v_group.name
    );
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM group_memberships
  WHERE group_id = v_group.id AND is_active = true;

  IF v_member_count >= v_group.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
  END IF;

  -- Reactivate an inactive membership if the user was previously a member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (v_group.id, auth.uid(), 'member', true)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET is_active = true, role = 'member', joined_at = timezone('utc'::text, now());

  RETURN json_build_object(
    'success', true,
    'status', 'joined',
    'group_id', v_group.id,
    'group_name', v_group.name
  );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 7. GRANTS =====
-- Supabase default privileges grant EXECUTE to anon on every new function;
-- revoke everything first, then grant exactly what each caller needs.

REVOKE ALL ON FUNCTION set_group_sharing(uuid, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION resolve_public_group(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION get_public_group_data(uuid) FROM public;
REVOKE ALL ON FUNCTION get_public_matches(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION get_public_season_stats(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION get_group_preview(uuid) FROM public;
REVOKE ALL ON FUNCTION request_to_join_group(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION set_group_sharing(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_group_data(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_matches(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_season_stats(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_group_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION request_to_join_group(uuid) TO authenticated;
