-- Migration 020: True all-time ELO
--
-- Problem: compute_player_global_ranking returned the post_ranking of the
-- player's most recent match. Stored per-match rankings reset to 1200 at every
-- season boundary, so for multi-season groups "all-time ELO" silently meant
-- "current season rating" (e.g. a player at 1480 after 208 games showed 1284
-- after 9 games in a fresh season).
--
-- Fix: recompute the all-time rating on read by replaying the group's entire
-- match history as one continuous chain, as if seasons never reset. Stored
-- per-match and per-season rankings are untouched; season resets keep working
-- exactly as before.
--
-- The replay mirrors packages/shared/src/services/matchesService.ts, EXCEPT that
-- the all-time chain uses the symmetric standard K=32 for every result (the
-- per-season 35/29 inflationary split would compound forever on a never-resetting
-- rating) and is NOT clamped to 800-2400 (a career rating should be free to
-- drift; the clamp exists to keep season ratings presentable):
--   expected = 1 / (1 + 10^((opponent - player) / 400))
--   K = 32, new = round(player + K*(actual-expected))
--   1v1: opponent = the other player's rating
--   2v2: opponent = average of the opposing team's two ratings
--   round() must match JS Math.round → floor(x + 0.5), NOT Postgres round()
--   (which rounds float8 ties to even). Matches replay in created_at order
--   (insertion order, same order the service assigned rankings in).

CREATE OR REPLACE FUNCTION compute_player_global_ranking(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_group_id uuid;
  m record;
  ratings jsonb := '{}'::jsonb;
  k constant float8 := 32;  -- symmetric standard K; season ELO's 35/29 split is not used all-time
  r11 float8; r12 float8; r21 float8; r22 float8;
  t1_opp float8; t2_opp float8;
  s1 float8; s2 float8;
BEGIN
  SELECT group_id INTO v_group_id FROM players WHERE id = p_player_id;
  IF v_group_id IS NULL THEN
    RETURN 1200;
  END IF;

  FOR m IN
    SELECT match_type, team1_score, team2_score,
           team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id
    FROM matches
    WHERE group_id = v_group_id
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

  RETURN COALESCE((ratings ->> p_player_id::text)::integer, 1200);
END;
$$;

COMMENT ON FUNCTION compute_player_global_ranking IS
  'Computes player all-time ranking by replaying the group''s full match history as one continuous ELO chain (season resets ignored). O(group matches) per call.';

-- ===== ROLLBACK INSTRUCTIONS =====
-- To restore the previous latest-match behavior, re-run the
-- compute_player_global_ranking definition from
-- 010_add_computed_stats.sql + the search_path fix from 013.
