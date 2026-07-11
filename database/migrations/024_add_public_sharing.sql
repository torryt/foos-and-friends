-- Migration: Public read-only sharing
-- Groups can opt in to a public, unauthenticated, read-only page (plus a
-- fullscreen TV leaderboard). Access is via an unguessable per-group token,
-- separate from the invite code so viewing and joining stay independently
-- revocable. The anon role gets no table access — everything flows through
-- token-gated SECURITY DEFINER RPCs, matching the codebase's escape-hatch
-- pattern (migrations 005/019/021).

-- ===== 1. COLUMNS =====

ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

COMMENT ON COLUMN friend_groups.is_public IS
  'When true, the group is readable without authentication via public_token';
COMMENT ON COLUMN friend_groups.public_token IS
  'Unguessable token for the public read-only page; regenerable independently of invite_code';

-- ===== 2. SHARING MANAGEMENT (owner/admin) =====

CREATE OR REPLACE FUNCTION set_group_sharing(p_group_id uuid, p_is_public boolean)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_token text;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can change sharing settings'
        );
    END IF;

    SELECT public_token INTO v_token FROM friend_groups WHERE id = p_group_id;

    IF p_is_public AND v_token IS NULL THEN
        v_token := replace(gen_random_uuid()::text, '-', '');
    END IF;

    UPDATE friend_groups
    SET is_public = p_is_public,
        public_token = v_token,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'is_public', p_is_public, 'public_token', v_token);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION regenerate_public_token(p_group_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_token text;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can change sharing settings'
        );
    END IF;

    v_token := replace(gen_random_uuid()::text, '-', '');

    UPDATE friend_groups
    SET public_token = v_token,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'public_token', v_token);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 3. TOKEN-GATED PUBLIC READS (anon-callable) =====

-- Internal helper: resolve a public token to a group id, or NULL.
CREATE OR REPLACE FUNCTION resolve_public_token(p_token text)
RETURNS uuid AS $$
    SELECT id FROM friend_groups
    WHERE public_token = p_token
      AND p_token IS NOT NULL
      AND is_public = true
      AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';

-- Everything needed to boot the public page in one round trip:
-- group info, seasons, players (with computed stats), and season trophies.
CREATE OR REPLACE FUNCTION get_public_group_data(p_token text)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_group json;
    v_seasons json;
    v_players json;
    v_trophies json;
BEGIN
    v_group_id := resolve_public_token(p_token);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'invite_code', g.invite_code,
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
CREATE OR REPLACE FUNCTION get_public_matches(p_token text, p_season_id uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_matches json;
    v_players json;
BEGIN
    v_group_id := resolve_public_token(p_token);

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
CREATE OR REPLACE FUNCTION get_public_season_stats(p_token text, p_season_id uuid)
RETURNS json AS $$
DECLARE
    v_group_id uuid;
    v_overall json;
    v_1v1 json;
    v_2v2 json;
BEGIN
    v_group_id := resolve_public_token(p_token);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    -- The season must belong to the shared group; otherwise a valid token
    -- would leak other groups' stats.
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

-- ===== 4. GRANTS =====

REVOKE ALL ON FUNCTION set_group_sharing(uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION regenerate_public_token(uuid) FROM public;
REVOKE ALL ON FUNCTION resolve_public_token(text) FROM public;
REVOKE ALL ON FUNCTION get_public_group_data(text) FROM public;
REVOKE ALL ON FUNCTION get_public_matches(text, uuid) FROM public;
REVOKE ALL ON FUNCTION get_public_season_stats(text, uuid) FROM public;

GRANT EXECUTE ON FUNCTION set_group_sharing(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_public_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_group_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_matches(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_season_stats(text, uuid) TO anon, authenticated;
