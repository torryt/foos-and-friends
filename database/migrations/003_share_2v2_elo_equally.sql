-- Migration 003: Share 2v2 all-time ELO equally between teammates
-- Date: 2026-09-05
--
-- Issue #102: 2v2 ELO should be shared equally between teammates. The previous
-- all-time replay rated each player individually against the opposing team's
-- average, so a stronger and weaker player on the same team moved by different
-- amounts for the same match. This recomputes the delta once per team from
-- team-average vs opponent-team-average and applies it equally to both
-- teammates, mirroring the seasonal fix in matchesService.ts and the updated
-- replayContinuousElo in packages/shared/src/utils/elo.ts.
--
-- All-time rankings are computed live from full match history, so this changes
-- every group's current all-time 2v2 rankings immediately. 1v1 math is
-- unchanged (a 1-player team average is just that player's own rating).
--
-- CREATE OR REPLACE preserves the existing ACL (authenticated/service_role
-- only; PUBLIC/anon already revoked), so no re-grant is needed.

CREATE OR REPLACE FUNCTION public.compute_group_global_rankings(p_group_id uuid)
    RETURNS TABLE(player_id uuid, ranking integer)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  m record;
  ratings jsonb := '{}'::jsonb;
  k constant float8 := 32;  -- symmetric standard K; season ELO's 35/29 split is not used all-time
  r11 float8; r12 float8; r21 float8; r22 float8;
  t1_avg float8; t2_avg float8;
  s1 float8; s2 float8;
  d1 float8; d2 float8;
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
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, floor(r11 + k * (s1 - 1 / (1 + power(10, (r21 - r11) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player1_id::text, floor(r21 + k * (s2 - 1 / (1 + power(10, (r11 - r21) / 400))) + 0.5));
    ELSE
      r12 := COALESCE((ratings ->> m.team1_player2_id::text)::float8, 1200);
      r22 := COALESCE((ratings ->> m.team2_player2_id::text)::float8, 1200);
      t1_avg := (r11 + r12) / 2;
      t2_avg := (r21 + r22) / 2;
      -- one delta per team from team avg vs opponent avg, shared by both teammates
      d1 := floor(k * (s1 - 1 / (1 + power(10, (t2_avg - t1_avg) / 400))) + 0.5);
      d2 := floor(k * (s2 - 1 / (1 + power(10, (t1_avg - t2_avg) / 400))) + 0.5);
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, r11 + d1)
        || jsonb_build_object(m.team1_player2_id::text, r12 + d1)
        || jsonb_build_object(m.team2_player1_id::text, r21 + d2)
        || jsonb_build_object(m.team2_player2_id::text, r22 + d2);
    END IF;
  END LOOP;

  -- Every roster player gets a row; players with no matches sit at the start rating.
  RETURN QUERY
    SELECT p.id, COALESCE((ratings ->> p.id::text)::integer, 1200)
    FROM players p
    WHERE p.group_id = p_group_id;
END;
$$;
