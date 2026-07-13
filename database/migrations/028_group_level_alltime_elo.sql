-- Migration 028: All-time ELO replay once per group, not once per player
--
-- Problem: player_stats_computed (010) calls compute_player_global_ranking(p.id)
-- per player row, and that function (020) replays the group's ENTIRE match
-- history per call. A roster read for a group with P players and M matches
-- costs O(P × M): for the largest group (17 players × 333 matches after the
-- 2026-07-08 three-group merge) that measured 216ms under RLS, up to 891ms in
-- production — on every group page load, every tab switch, and every 30s poll
-- of the public share page.
--
-- Fix: a set-returning function that replays the history ONCE and returns all
-- players' all-time ratings — O(M) per request. The per-player function from
-- 020 becomes a thin delegate so there is still exactly ONE SQL implementation
-- of the replay math, and the 010 view keeps its exact behavior. A new
-- get_group_player_stats RPC replaces roster reads of player_stats_computed,
-- and the 026 public RPCs are recreated on top of it.
--
-- The ELO math is copied UNCHANGED from 020 (K=32 symmetric, start 1200, no
-- clamp, floor(x+0.5) rounding, replay in created_at,id order) and must stay
-- in sync with replayContinuousElo in packages/shared/src/utils/elo.ts.

-- ===== 1. INDEX MATCHING THE REPLAY'S FILTER + ORDER =====
-- The replay scans WHERE group_id = ? ORDER BY created_at, id; the closest
-- existing index (group_id, match_date DESC) can't satisfy that ordering.

CREATE INDEX IF NOT EXISTS idx_matches_group_created
  ON matches (group_id, created_at, id);

-- ===== 2. GROUP-LEVEL REPLAY (single source of truth for the SQL math) =====

CREATE OR REPLACE FUNCTION compute_group_global_rankings(p_group_id uuid)
RETURNS TABLE(player_id uuid, ranking integer)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  m record;
  ratings jsonb := '{}'::jsonb;
  k constant float8 := 32;  -- symmetric standard K; season ELO's 35/29 split is not used all-time
  r11 float8; r12 float8; r21 float8; r22 float8;
  t1_opp float8; t2_opp float8;
  s1 float8; s2 float8;
BEGIN
  FOR m IN
    SELECT match_type, team1_score, team2_score,
           team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id
    FROM matches
    WHERE group_id = p_group_id
    ORDER BY created_at, id
  LOOP
    r11 := COALESCE((ratings ->> m.team1_player1_id::text)::float8, 1200);
    r21 := COALESCE((ratings ->> m.team2_player1_id::text)::float8, 1200);

    -- actual score per team (draw = 0.5)
    IF m.team1_score > m.team2_score THEN
      s1 := 1; s2 := 0;
    ELSIF m.team1_score < m.team2_score THEN
      s1 := 0; s2 := 1;
    ELSE
      s1 := 0.5; s2 := 0.5;
    END IF;

    IF m.match_type = '1v1' THEN
      t1_opp := r21;
      t2_opp := r11;
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, floor(r11 + k * (s1 - 1 / (1 + power(10, (t1_opp - r11) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player1_id::text, floor(r21 + k * (s2 - 1 / (1 + power(10, (t2_opp - r21) / 400))) + 0.5));
    ELSE
      r12 := COALESCE((ratings ->> m.team1_player2_id::text)::float8, 1200);
      r22 := COALESCE((ratings ->> m.team2_player2_id::text)::float8, 1200);
      t1_opp := (r21 + r22) / 2;  -- team 1 players are rated against team 2's average
      t2_opp := (r11 + r12) / 2;
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, floor(r11 + k * (s1 - 1 / (1 + power(10, (t1_opp - r11) / 400))) + 0.5))
        || jsonb_build_object(m.team1_player2_id::text, floor(r12 + k * (s1 - 1 / (1 + power(10, (t1_opp - r12) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player1_id::text, floor(r21 + k * (s2 - 1 / (1 + power(10, (t2_opp - r21) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player2_id::text, floor(r22 + k * (s2 - 1 / (1 + power(10, (t2_opp - r22) / 400))) + 0.5));
    END IF;
  END LOOP;

  -- Every roster player gets a row; players with no matches sit at the start rating.
  RETURN QUERY
    SELECT p.id, COALESCE((ratings ->> p.id::text)::integer, 1200)
    FROM players p
    WHERE p.group_id = p_group_id;
END;
$$;

COMMENT ON FUNCTION compute_group_global_rankings IS
  'All-time rankings for every player in a group from ONE continuous ELO replay of the group''s match history (season resets ignored). O(group matches) per call. Math must stay in sync with replayContinuousElo in packages/shared/src/utils/elo.ts.';

-- ===== 3. PER-PLAYER FUNCTION DELEGATES (keeps 010's view behavior identical) =====

CREATE OR REPLACE FUNCTION compute_player_global_ranking(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_ranking integer;
BEGIN
  SELECT group_id INTO v_group_id FROM players WHERE id = p_player_id;
  IF v_group_id IS NULL THEN
    RETURN 1200;
  END IF;

  SELECT r.ranking INTO v_ranking
  FROM compute_group_global_rankings(v_group_id) r
  WHERE r.player_id = p_player_id;

  RETURN COALESCE(v_ranking, 1200);
END;
$$;

COMMENT ON FUNCTION compute_player_global_ranking IS
  'Single player''s all-time ranking; delegates to compute_group_global_rankings (the one SQL implementation of the continuous replay). Still O(group matches) per call — for whole-roster reads use get_group_player_stats instead.';

-- ===== 4. ROSTER RPC: player_stats_computed's shape with ONE replay =====
-- Same columns as player_stats_computed (010) so client mappers are unchanged.
-- SECURITY INVOKER (default): matches/players RLS applies, same visibility as
-- the view it replaces. The group-visibility RLS check runs per scanned row,
-- but only over this group's rows — not P full-history replays.

CREATE OR REPLACE FUNCTION get_group_player_stats(p_group_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  ranking integer,
  matches_played integer,
  wins integer,
  losses integer,
  avatar text,
  department text,
  group_id uuid,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT
    p.id,
    p.name,
    COALESCE(r.ranking, 1200) AS ranking,
    COALESCE(s.matches_played, 0) AS matches_played,
    COALESCE(s.wins, 0) AS wins,
    COALESCE(s.losses, 0) AS losses,
    p.avatar,
    p.department,
    p.group_id,
    p.created_by,
    p.created_at,
    p.updated_at
  FROM players p
  LEFT JOIN compute_group_global_rankings(p_group_id) r ON r.player_id = p.id
  LEFT JOIN (
    SELECT x.player_id,
           COUNT(*)::integer AS matches_played,
           SUM(CASE WHEN x.won THEN 1 ELSE 0 END)::integer AS wins,
           SUM(CASE WHEN x.lost THEN 1 ELSE 0 END)::integer AS losses
    FROM matches m
    CROSS JOIN LATERAL (
      VALUES
        (m.team1_player1_id, m.team1_score > m.team2_score, m.team1_score < m.team2_score),
        (m.team1_player2_id, m.team1_score > m.team2_score, m.team1_score < m.team2_score),
        (m.team2_player1_id, m.team2_score > m.team1_score, m.team2_score < m.team1_score),
        (m.team2_player2_id, m.team2_score > m.team1_score, m.team2_score < m.team1_score)
    ) AS x(player_id, won, lost)
    WHERE m.group_id = p_group_id
      AND x.player_id IS NOT NULL
    GROUP BY x.player_id
  ) s ON s.player_id = p.id
  WHERE p.group_id = p_group_id;
$$;

COMMENT ON FUNCTION get_group_player_stats IS
  'Roster read replacing SELECTs on player_stats_computed: same columns, one ELO replay for the whole group instead of one per player.';

-- ===== 5. RECREATE 026 PUBLIC RPCS ON THE O(M) PATH =====
-- Bodies identical to 026 except player_stats_computed is replaced by
-- get_group_player_stats(v_group_id). These are SECURITY DEFINER behind the
-- resolve_public_group gate, unchanged.

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

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
    FROM get_group_player_stats(v_group_id) p;

    RETURN json_build_object('success', true, 'matches', v_matches, 'players', v_players);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 6. GRANTS =====
-- Supabase auto-grants EXECUTE to public/anon on new functions; these are
-- authed-app reads (the public path goes through the SECURITY DEFINER RPCs,
-- whose privilege checks run as the function owner).

REVOKE ALL ON FUNCTION compute_group_global_rankings(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION get_group_player_stats(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION compute_group_global_rankings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_player_stats(uuid) TO authenticated;

-- ===== VERIFICATION (run manually before relying on the new path) =====
-- Parity between the old per-player replay and the group-level replay must be
-- exact — 0 rows expected:
--   SELECT p.id, p.name
--   FROM players p
--   WHERE compute_player_global_ranking(p.id) <>
--         (SELECT r.ranking FROM compute_group_global_rankings(p.group_id) r
--          WHERE r.player_id = p.id);
-- And the RPC must match the view row-for-row — 0 rows expected:
--   SELECT * FROM player_stats_computed v WHERE v.group_id = :gid
--   EXCEPT SELECT * FROM get_group_player_stats(:gid);

-- ===== ROLLBACK INSTRUCTIONS =====
-- Re-run compute_player_global_ranking from 020_continuous_alltime_elo.sql,
-- get_public_group_data/get_public_matches from 026_unified_group_access.sql,
-- then DROP FUNCTION get_group_player_stats(uuid),
-- compute_group_global_rankings(uuid) and DROP INDEX idx_matches_group_created.
