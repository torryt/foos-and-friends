-- Migration 009: Add Computed Statistics (Pre-Deploy)
-- This migration adds database views and functions to compute statistics from match history
-- while keeping existing columns intact for backward compatibility during deployment.
--
-- Deploy this BEFORE deploying the updated application code.

-- ===== 1. MAKE AGGREGATED COLUMNS NULLABLE (TRANSITION PHASE) =====

-- Make columns in players table nullable so they can be ignored during transition
ALTER TABLE players
ALTER COLUMN ranking DROP NOT NULL,
ALTER COLUMN matches_played DROP NOT NULL,
ALTER COLUMN wins DROP NOT NULL,
ALTER COLUMN losses DROP NOT NULL;

-- Set default values so new players can be created without providing these values
ALTER TABLE players
ALTER COLUMN ranking SET DEFAULT 1200,
ALTER COLUMN matches_played SET DEFAULT 0,
ALTER COLUMN wins SET DEFAULT 0,
ALTER COLUMN losses SET DEFAULT 0;

-- Make columns in player_season_stats table nullable
ALTER TABLE player_season_stats
ALTER COLUMN ranking DROP NOT NULL,
ALTER COLUMN matches_played DROP NOT NULL,
ALTER COLUMN wins DROP NOT NULL,
ALTER COLUMN losses DROP NOT NULL,
ALTER COLUMN goals_for DROP NOT NULL,
ALTER COLUMN goals_against DROP NOT NULL;

-- Set default values
ALTER TABLE player_season_stats
ALTER COLUMN ranking SET DEFAULT 1200,
ALTER COLUMN matches_played SET DEFAULT 0,
ALTER COLUMN wins SET DEFAULT 0,
ALTER COLUMN losses SET DEFAULT 0,
ALTER COLUMN goals_for SET DEFAULT 0,
ALTER COLUMN goals_against SET DEFAULT 0;

COMMENT ON COLUMN players.ranking IS 'DEPRECATED: Use player_stats_computed view or compute_player_global_ranking() function';
COMMENT ON COLUMN players.matches_played IS 'DEPRECATED: Use player_stats_computed view';
COMMENT ON COLUMN players.wins IS 'DEPRECATED: Use player_stats_computed view';
COMMENT ON COLUMN players.losses IS 'DEPRECATED: Use player_stats_computed view';

COMMENT ON COLUMN player_season_stats.ranking IS 'DEPRECATED: Use player_season_stats_computed view or compute_player_season_ranking() function';
COMMENT ON COLUMN player_season_stats.matches_played IS 'DEPRECATED: Use player_season_stats_computed view';
COMMENT ON COLUMN player_season_stats.wins IS 'DEPRECATED: Use player_season_stats_computed view';
COMMENT ON COLUMN player_season_stats.losses IS 'DEPRECATED: Use player_season_stats_computed view';
COMMENT ON COLUMN player_season_stats.goals_for IS 'DEPRECATED: Use player_season_stats_computed view';
COMMENT ON COLUMN player_season_stats.goals_against IS 'DEPRECATED: Use player_season_stats_computed view';

-- ===== 2. CREATE PERFORMANCE INDEXES =====

-- Add indexes on matches table for efficient stat computation
CREATE INDEX IF NOT EXISTS idx_matches_team1_player1 ON matches(team1_player1_id, match_date, match_time);
CREATE INDEX IF NOT EXISTS idx_matches_team1_player2 ON matches(team1_player2_id, match_date, match_time);
CREATE INDEX IF NOT EXISTS idx_matches_team2_player1 ON matches(team2_player1_id, match_date, match_time);
CREATE INDEX IF NOT EXISTS idx_matches_team2_player2 ON matches(team2_player2_id, match_date, match_time);
CREATE INDEX IF NOT EXISTS idx_matches_season_date ON matches(season_id, match_date, match_time);

-- ===== 3. CREATE COMPUTED STATS VIEW FOR PLAYER_SEASON_STATS =====

-- Drop view if it exists (for idempotency)
DROP VIEW IF EXISTS player_season_stats_computed;

-- Create view that computes all statistics from matches table
CREATE VIEW player_season_stats_computed AS
SELECT
  pss.id,
  pss.player_id,
  pss.season_id,
  pss.created_at,
  pss.updated_at,
  -- Computed statistics from matches
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  COALESCE(stats.goals_for, 0) as goals_for,
  COALESCE(stats.goals_against, 0) as goals_against,
  -- Ranking will be computed separately by function (expensive operation)
  1200 as ranking  -- Placeholder, use compute_player_season_ranking() for actual value
FROM player_season_stats pss
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as matches_played,
    SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN is_winner THEN 0 ELSE 1 END) as losses,
    SUM(goals_scored) as goals_for,
    SUM(goals_conceded) as goals_against
  FROM (
    -- Team 1 Player 1
    SELECT
      m.id,
      (m.team1_score > m.team2_score) as is_winner,
      m.team1_score as goals_scored,
      m.team2_score as goals_conceded
    FROM matches m
    WHERE m.season_id = pss.season_id
      AND m.team1_player1_id = pss.player_id

    UNION ALL

    -- Team 1 Player 2
    SELECT
      m.id,
      (m.team1_score > m.team2_score) as is_winner,
      m.team1_score as goals_scored,
      m.team2_score as goals_conceded
    FROM matches m
    WHERE m.season_id = pss.season_id
      AND m.team1_player2_id = pss.player_id

    UNION ALL

    -- Team 2 Player 1
    SELECT
      m.id,
      (m.team2_score > m.team1_score) as is_winner,
      m.team2_score as goals_scored,
      m.team1_score as goals_conceded
    FROM matches m
    WHERE m.season_id = pss.season_id
      AND m.team2_player1_id = pss.player_id

    UNION ALL

    -- Team 2 Player 2
    SELECT
      m.id,
      (m.team2_score > m.team1_score) as is_winner,
      m.team2_score as goals_scored,
      m.team1_score as goals_conceded
    FROM matches m
    WHERE m.season_id = pss.season_id
      AND m.team2_player2_id = pss.player_id
  ) player_matches
) stats ON true;

COMMENT ON VIEW player_season_stats_computed IS 'Computed player season statistics from match history';

-- Grant RLS policies to the view (inherits from base table)
ALTER VIEW player_season_stats_computed SET (security_invoker = true);

-- ===== 4. CREATE COMPUTED STATS VIEW FOR PLAYERS (GLOBAL) =====

-- Drop view if it exists (for idempotency)
DROP VIEW IF EXISTS player_stats_computed;

-- Create view that computes global statistics across all seasons
CREATE VIEW player_stats_computed AS
SELECT
  p.id,
  p.name,
  p.avatar,
  p.department,
  p.group_id,
  p.created_by,
  p.created_at,
  p.updated_at,
  -- Computed statistics from matches
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  -- Ranking will be computed separately by function (expensive operation)
  1200 as ranking  -- Placeholder, use compute_player_global_ranking() for actual value
FROM players p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as matches_played,
    SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN is_winner THEN 0 ELSE 1 END) as losses
  FROM (
    -- Team 1 Player 1
    SELECT
      m.id,
      (m.team1_score > m.team2_score) as is_winner
    FROM matches m
    JOIN seasons s ON m.season_id = s.id
    WHERE s.group_id = p.group_id
      AND m.team1_player1_id = p.id

    UNION ALL

    -- Team 1 Player 2
    SELECT
      m.id,
      (m.team1_score > m.team2_score) as is_winner
    FROM matches m
    JOIN seasons s ON m.season_id = s.id
    WHERE s.group_id = p.group_id
      AND m.team1_player2_id = p.id

    UNION ALL

    -- Team 2 Player 1
    SELECT
      m.id,
      (m.team2_score > m.team1_score) as is_winner
    FROM matches m
    JOIN seasons s ON m.season_id = s.id
    WHERE s.group_id = p.group_id
      AND m.team2_player1_id = p.id

    UNION ALL

    -- Team 2 Player 2
    SELECT
      m.id,
      (m.team2_score > m.team1_score) as is_winner
    FROM matches m
    JOIN seasons s ON m.season_id = s.id
    WHERE s.group_id = p.group_id
      AND m.team2_player2_id = p.id
  ) player_matches
) stats ON true;

COMMENT ON VIEW player_stats_computed IS 'Computed global player statistics from all matches';

-- Grant RLS policies to the view (inherits from base table)
ALTER VIEW player_stats_computed SET (security_invoker = true);

-- ===== 5. CREATE RANKING COMPUTATION FUNCTIONS =====

-- Function to compute current ranking for a player in a specific season
-- This function replays all matches chronologically to calculate ELO
CREATE OR REPLACE FUNCTION compute_player_season_ranking(
  p_player_id uuid,
  p_season_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_ranking integer := 1200;  -- Starting ELO
  v_match record;
  v_team_won boolean;
  v_player_side text;  -- 'team1' or 'team2'
  v_team_ranking_avg integer;
  v_opponent_ranking_avg integer;
  v_ranking_change integer;
BEGIN
  -- Replay all matches for this player in chronological order
  FOR v_match IN
    SELECT
      m.*,
      -- Pre-match rankings for all players
      m.team1_player1_pre_ranking as t1p1_pre,
      m.team1_player2_pre_ranking as t1p2_pre,
      m.team2_player1_pre_ranking as t2p1_pre,
      m.team2_player2_pre_ranking as t2p2_pre
    FROM matches m
    WHERE m.season_id = p_season_id
      AND (
        m.team1_player1_id = p_player_id OR
        m.team1_player2_id = p_player_id OR
        m.team2_player1_id = p_player_id OR
        m.team2_player2_id = p_player_id
      )
    ORDER BY m.match_date, m.match_time, m.created_at
  LOOP
    -- Determine which side the player was on
    IF v_match.team1_player1_id = p_player_id THEN
      v_player_side := 'team1';
      v_current_ranking := v_match.t1p1_pre;
      v_ranking_change := v_match.team1_player1_post_ranking - v_match.t1p1_pre;
    ELSIF v_match.team1_player2_id = p_player_id THEN
      v_player_side := 'team1';
      v_current_ranking := v_match.t1p2_pre;
      v_ranking_change := v_match.team1_player2_post_ranking - v_match.t1p2_pre;
    ELSIF v_match.team2_player1_id = p_player_id THEN
      v_player_side := 'team2';
      v_current_ranking := v_match.t2p1_pre;
      v_ranking_change := v_match.team2_player1_post_ranking - v_match.t2p1_pre;
    ELSE  -- team2_player2_id
      v_player_side := 'team2';
      v_current_ranking := v_match.t2p2_pre;
      v_ranking_change := v_match.team2_player2_post_ranking - v_match.t2p2_pre;
    END IF;

    -- Apply the ranking change
    v_current_ranking := v_current_ranking + v_ranking_change;
  END LOOP;

  -- Return final ranking (clamped between 800 and 2400)
  RETURN GREATEST(800, LEAST(2400, v_current_ranking));
END;
$$;

COMMENT ON FUNCTION compute_player_season_ranking IS 'Computes current ELO ranking by replaying season matches chronologically';

-- Function to compute global ranking for a player across all seasons in their group
CREATE OR REPLACE FUNCTION compute_player_global_ranking(
  p_player_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_ranking integer := 1200;  -- Starting ELO
  v_match record;
  v_player_side text;
  v_ranking_change integer;
BEGIN
  -- Replay all matches for this player across all seasons chronologically
  FOR v_match IN
    SELECT
      m.*,
      m.team1_player1_pre_ranking as t1p1_pre,
      m.team1_player2_pre_ranking as t1p2_pre,
      m.team2_player1_pre_ranking as t2p1_pre,
      m.team2_player2_pre_ranking as t2p2_pre
    FROM matches m
    JOIN players p ON p.id = p_player_id
    JOIN seasons s ON m.season_id = s.id AND s.group_id = p.group_id
    WHERE
      m.team1_player1_id = p_player_id OR
      m.team1_player2_id = p_player_id OR
      m.team2_player1_id = p_player_id OR
      m.team2_player2_id = p_player_id
    ORDER BY m.match_date, m.match_time, m.created_at
  LOOP
    -- Determine which side the player was on and get ranking change
    IF v_match.team1_player1_id = p_player_id THEN
      v_current_ranking := v_match.t1p1_pre;
      v_ranking_change := v_match.team1_player1_post_ranking - v_match.t1p1_pre;
    ELSIF v_match.team1_player2_id = p_player_id THEN
      v_current_ranking := v_match.t1p2_pre;
      v_ranking_change := v_match.team1_player2_post_ranking - v_match.t1p2_pre;
    ELSIF v_match.team2_player1_id = p_player_id THEN
      v_current_ranking := v_match.t2p1_pre;
      v_ranking_change := v_match.team2_player1_post_ranking - v_match.t2p1_pre;
    ELSE  -- team2_player2_id
      v_current_ranking := v_match.t2p2_pre;
      v_ranking_change := v_match.team2_player2_post_ranking - v_match.t2p2_pre;
    END IF;

    -- Apply the ranking change
    v_current_ranking := v_current_ranking + v_ranking_change;
  END LOOP;

  -- Return final ranking (clamped between 800 and 2400)
  RETURN GREATEST(800, LEAST(2400, v_current_ranking));
END;
$$;

COMMENT ON FUNCTION compute_player_global_ranking IS 'Computes global ELO ranking by replaying all matches chronologically';

-- ===== 6. VERIFICATION =====

DO $$
DECLARE
  view_count integer;
  function_count integer;
  index_count integer;
BEGIN
  -- Count views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('player_season_stats_computed', 'player_stats_computed');

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('compute_player_season_ranking', 'compute_player_global_ranking');

  -- Count new indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_matches_team%';

  RAISE NOTICE 'Migration 009 complete:';
  RAISE NOTICE '  - Views created: % (expected: 2)', view_count;
  RAISE NOTICE '  - Functions created: % (expected: 2)', function_count;
  RAISE NOTICE '  - Indexes created: % (expected: 5)', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy updated application code';
  RAISE NOTICE '  2. Verify application works correctly with computed stats';
  RAISE NOTICE '  3. Run migration 010 to remove redundant columns';
END $$;
