-- Adds a per-group "placement matches" threshold: players are hidden from
-- ranking tables (season and all-time) until they've played at least this
-- many matches in that scope. Filtering happens client-side against the
-- existing matches_played figures already returned by
-- get_group_player_stats() and the player_season_stats_*_computed views, so
-- no changes to ranking/ELO computation are needed here.
--
-- The one server-side change: get_public_group_data() builds its group JSON
-- with an explicit json_build_object, so it must be taught to return the new
-- column — otherwise public group pages and the public TV leaderboard would
-- always see placement_matches = 0 and silently ignore the setting.
--
-- To apply against a Supabase project: run this file's SQL via the Supabase
-- SQL editor (or `supabase db push` / your usual migration runner) against
-- the target database. Safe to run on production — additive, backward
-- compatible (defaults every existing group to 0, i.e. feature off).

ALTER TABLE public.friend_groups
  ADD COLUMN placement_matches integer DEFAULT 0 NOT NULL;

ALTER TABLE public.friend_groups
  ADD CONSTRAINT friend_groups_placement_matches_check
    CHECK (placement_matches >= 0 AND placement_matches <= 50);

-- Surface placement_matches on the public read-only endpoint so non-members
-- (public group pages, public TV leaderboard) honour the threshold too.
CREATE OR REPLACE FUNCTION public.get_public_group_data(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
        'join_policy', g.join_policy,
        'placement_matches', g.placement_matches
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
    FROM get_group_player_stats(v_group_id) p;

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
$$;
