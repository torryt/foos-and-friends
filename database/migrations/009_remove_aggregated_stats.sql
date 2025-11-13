-- Remove Aggregated Statistics Migration
-- This migration removes redundant aggregated statistics from players and player_season_stats tables
-- All statistics will now be computed from the matches table (single source of truth)

-- ===== 1. REMOVE AGGREGATED COLUMNS FROM PLAYERS TABLE =====

-- Drop columns that will be computed from matches
ALTER TABLE players
DROP COLUMN IF EXISTS ranking,
DROP COLUMN IF EXISTS matches_played,
DROP COLUMN IF EXISTS wins,
DROP COLUMN IF EXISTS losses;

-- Add comment explaining the new approach
COMMENT ON TABLE players IS 'Player profiles - statistics computed from matches table';

-- ===== 2. REMOVE AGGREGATED COLUMNS FROM PLAYER_SEASON_STATS TABLE =====

-- Drop columns that will be computed from matches
ALTER TABLE player_season_stats
DROP COLUMN IF EXISTS ranking,
DROP COLUMN IF EXISTS matches_played,
DROP COLUMN IF EXISTS wins,
DROP COLUMN IF EXISTS losses,
DROP COLUMN IF EXISTS goals_for,
DROP COLUMN IF EXISTS goals_against;

-- Add comment explaining the new approach
COMMENT ON TABLE player_season_stats IS 'Tracks which players participated in which seasons - statistics computed from matches table';

-- ===== 3. CREATE DATABASE VIEWS FOR COMMON QUERIES =====

-- View: Current player statistics for a season (computed from matches)
CREATE OR REPLACE VIEW player_season_stats_computed AS
SELECT
  pss.id,
  pss.player_id,
  pss.season_id,
  pss.created_at,
  pss.updated_at,
  -- Compute matches played
  COALESCE(COUNT(DISTINCT m.id), 0)::integer AS matches_played,
  -- Compute wins
  COALESCE(SUM(
    CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id) AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id) AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END
  ), 0)::integer AS wins,
  -- Compute losses
  COALESCE(SUM(
    CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id) AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id) AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END
  ), 0)::integer AS losses,
  -- Compute goals for
  COALESCE(SUM(
    CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team1_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team2_score
      ELSE 0
    END
  ), 0)::integer AS goals_for,
  -- Compute goals against
  COALESCE(SUM(
    CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team2_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team1_score
      ELSE 0
    END
  ), 0)::integer AS goals_against
FROM player_season_stats pss
LEFT JOIN matches m ON m.season_id = pss.season_id
  AND (m.team1_player1_id = pss.player_id
    OR m.team1_player2_id = pss.player_id
    OR m.team2_player1_id = pss.player_id
    OR m.team2_player2_id = pss.player_id)
GROUP BY pss.id, pss.player_id, pss.season_id, pss.created_at, pss.updated_at;

COMMENT ON VIEW player_season_stats_computed IS 'Computed player season statistics from matches table';

-- View: Current player global statistics (computed from all matches in all seasons)
CREATE OR REPLACE VIEW player_stats_computed AS
SELECT
  p.id AS player_id,
  p.group_id,
  -- Compute matches played
  COALESCE(COUNT(DISTINCT m.id), 0)::integer AS matches_played,
  -- Compute wins
  COALESCE(SUM(
    CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id) AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id) AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END
  ), 0)::integer AS wins,
  -- Compute losses
  COALESCE(SUM(
    CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id) AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id) AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END
  ), 0)::integer AS losses
FROM players p
LEFT JOIN matches m ON m.group_id = p.group_id
  AND (m.team1_player1_id = p.id
    OR m.team1_player2_id = p.id
    OR m.team2_player1_id = p.id
    OR m.team2_player2_id = p.id)
GROUP BY p.id, p.group_id;

COMMENT ON VIEW player_stats_computed IS 'Computed player global statistics from all matches';

-- ===== 4. CREATE FUNCTION TO COMPUTE PLAYER RANKING FROM MATCH HISTORY =====

-- Function to compute current ELO ranking for a player in a season
-- This replays all matches in chronological order and applies ELO algorithm
CREATE OR REPLACE FUNCTION compute_player_season_ranking(
  p_player_id uuid,
  p_season_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_ranking integer := 1200; -- Starting ELO
  v_match record;
BEGIN
  -- Replay all matches for this player in this season, ordered by date/time
  FOR v_match IN (
    SELECT
      m.id,
      m.team1_player1_id,
      m.team1_player2_id,
      m.team2_player1_id,
      m.team2_player2_id,
      m.team1_score,
      m.team2_score,
      CASE
        WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
        WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
        WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
        WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
      END as post_ranking
    FROM matches m
    WHERE m.season_id = p_season_id
      AND (m.team1_player1_id = p_player_id
        OR m.team1_player2_id = p_player_id
        OR m.team2_player1_id = p_player_id
        OR m.team2_player2_id = p_player_id)
    ORDER BY m.match_date ASC, m.match_time ASC, m.created_at ASC
  ) LOOP
    -- Use the post_ranking from the match (which was calculated with ELO at the time)
    v_current_ranking := v_match.post_ranking;
  END LOOP;

  RETURN v_current_ranking;
END;
$$;

COMMENT ON FUNCTION compute_player_season_ranking IS 'Computes current ELO ranking by replaying match history';

-- Function to compute current ELO ranking for a player across all seasons
CREATE OR REPLACE FUNCTION compute_player_global_ranking(
  p_player_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_ranking integer := 1200; -- Starting ELO
  v_match record;
BEGIN
  -- Replay all matches for this player across all seasons, ordered by date/time
  FOR v_match IN (
    SELECT
      m.id,
      m.team1_player1_id,
      m.team1_player2_id,
      m.team2_player1_id,
      m.team2_player2_id,
      m.team1_score,
      m.team2_score,
      CASE
        WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
        WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
        WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
        WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
      END as post_ranking
    FROM matches m
    JOIN players p ON p.id = p_player_id
    WHERE m.group_id = p.group_id
      AND (m.team1_player1_id = p_player_id
        OR m.team1_player2_id = p_player_id
        OR m.team2_player1_id = p_player_id
        OR m.team2_player2_id = p_player_id)
    ORDER BY m.match_date ASC, m.match_time ASC, m.created_at ASC
  ) LOOP
    -- Use the post_ranking from the match (which was calculated with ELO at the time)
    v_current_ranking := v_match.post_ranking;
  END LOOP;

  RETURN v_current_ranking;
END;
$$;

COMMENT ON FUNCTION compute_player_global_ranking IS 'Computes current global ELO ranking by replaying all match history';

-- ===== 5. CREATE INDEXES FOR PERFORMANCE =====

-- Index for efficient match history queries
CREATE INDEX IF NOT EXISTS idx_matches_player_season_date ON matches(season_id, match_date, match_time, created_at)
  WHERE team1_player1_id IS NOT NULL; -- Partial index since all matches have players

-- Index for player match lookups
CREATE INDEX IF NOT EXISTS idx_matches_team1_player1 ON matches(team1_player1_id, season_id);
CREATE INDEX IF NOT EXISTS idx_matches_team1_player2 ON matches(team1_player2_id, season_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_player1 ON matches(team2_player1_id, season_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_player2 ON matches(team2_player2_id, season_id);

-- ===== 6. VERIFICATION =====

DO $$
DECLARE
  players_row_count integer;
  season_stats_row_count integer;
BEGIN
  SELECT COUNT(*) INTO players_row_count FROM players;
  SELECT COUNT(*) INTO season_stats_row_count FROM player_season_stats;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Players table: % rows (stats columns removed)', players_row_count;
  RAISE NOTICE '  - Player season stats table: % rows (stats columns removed)', season_stats_row_count;
  RAISE NOTICE '  - Created views: player_season_stats_computed, player_stats_computed';
  RAISE NOTICE '  - Created functions: compute_player_season_ranking, compute_player_global_ranking';
END $$;
