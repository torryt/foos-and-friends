-- Migration 012: Remove player_season_stats Table
--
-- This migration eliminates the player_season_stats table entirely.
-- Season stats are now computed directly from the matches table.
--
-- Benefits:
-- - Simpler data model (one less table)
-- - No need to "initialize" players for seasons
-- - Stats are always consistent with match history
-- - Players automatically appear on leaderboard when they play their first match

-- ===== 1. DROP OLD VIEW =====
DROP VIEW IF EXISTS player_season_stats_computed;

-- ===== 2. CREATE NEW VIEW (derives players from matches) =====
CREATE VIEW player_season_stats_computed
WITH (security_invoker = true)
AS
WITH player_seasons AS (
  -- Get all unique player-season combinations from matches
  SELECT DISTINCT player_id, season_id
  FROM (
    SELECT team1_player1_id as player_id, season_id FROM matches
    UNION
    SELECT team1_player2_id as player_id, season_id FROM matches
    UNION
    SELECT team2_player1_id as player_id, season_id FROM matches
    UNION
    SELECT team2_player2_id as player_id, season_id FROM matches
  ) all_players
),
player_season_stats AS (
  SELECT
    ps.player_id,
    ps.season_id,
    -- Ranking from most recent match
    compute_player_season_ranking(ps.player_id, ps.season_id) as ranking,
    -- Aggregate stats from matches
    COUNT(m.id)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = ps.player_id OR m.team1_player2_id = ps.player_id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = ps.player_id OR m.team2_player2_id = ps.player_id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = ps.player_id OR m.team1_player2_id = ps.player_id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = ps.player_id OR m.team2_player2_id = ps.player_id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id OR m.team1_player2_id = ps.player_id THEN m.team1_score
      WHEN m.team2_player1_id = ps.player_id OR m.team2_player2_id = ps.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id OR m.team1_player2_id = ps.player_id THEN m.team2_score
      WHEN m.team2_player1_id = ps.player_id OR m.team2_player2_id = ps.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against,
    MIN(m.created_at) as created_at,
    MAX(m.created_at) as updated_at
  FROM player_seasons ps
  JOIN matches m ON m.season_id = ps.season_id
    AND (m.team1_player1_id = ps.player_id
      OR m.team1_player2_id = ps.player_id
      OR m.team2_player1_id = ps.player_id
      OR m.team2_player2_id = ps.player_id)
  GROUP BY ps.player_id, ps.season_id
)
SELECT
  -- Generate stable UUID from player_id + season_id
  uuid_generate_v5(uuid_ns_url(), player_id::text || '/' || season_id::text) as id,
  player_id,
  season_id,
  ranking,
  matches_played,
  wins,
  losses,
  goals_for,
  goals_against,
  created_at,
  updated_at
FROM player_season_stats;

COMMENT ON VIEW player_season_stats_computed IS 'Player season statistics computed directly from matches (no separate table needed)';

-- ===== 3. GRANT PERMISSIONS =====
GRANT SELECT ON player_season_stats_computed TO authenticated;

-- ===== 4. DROP THE OLD TABLE =====
-- First drop any foreign key constraints that reference it
-- (There shouldn't be any, but just in case)

-- Drop the table
DROP TABLE IF EXISTS player_season_stats;

-- ===== 5. VERIFICATION =====
DO $$
BEGIN
  -- Verify the view works
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'player_season_stats_computed'
  ) THEN
    RAISE EXCEPTION 'View player_season_stats_computed was not created';
  END IF;

  -- Verify the old table is gone
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'player_season_stats'
  ) THEN
    RAISE EXCEPTION 'Table player_season_stats was not dropped';
  END IF;

  RAISE NOTICE 'Migration 012 complete: player_season_stats table removed';
  RAISE NOTICE 'Season stats are now computed directly from matches';
END $$;

-- ===== ROLLBACK INSTRUCTIONS =====
-- To rollback, you would need to:
-- 1. Recreate the player_season_stats table
-- 2. Populate it from the computed view
-- 3. Recreate the old view that joined on the table
--
-- This is complex, so ensure you have a backup before running this migration.
