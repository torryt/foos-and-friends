-- Migration 010: Add Computed Stats Views and Functions
-- This migration creates views and functions to compute player statistics from match history
-- instead of storing them redundantly in players and player_season_stats tables.
--
-- This is a non-destructive migration that can be rolled back safely.
-- The actual column removal will be done in a separate migration (011) after verification.

-- ===== 1. MAKE AGGREGATED COLUMNS NULLABLE (Transition Phase) =====
-- This allows the application to stop writing to these columns without breaking existing data

ALTER TABLE players
  ALTER COLUMN ranking DROP NOT NULL,
  ALTER COLUMN matches_played DROP NOT NULL,
  ALTER COLUMN wins DROP NOT NULL,
  ALTER COLUMN losses DROP NOT NULL;

ALTER TABLE player_season_stats
  ALTER COLUMN ranking DROP NOT NULL,
  ALTER COLUMN matches_played DROP NOT NULL,
  ALTER COLUMN wins DROP NOT NULL,
  ALTER COLUMN losses DROP NOT NULL,
  ALTER COLUMN goals_for DROP NOT NULL,
  ALTER COLUMN goals_against DROP NOT NULL;

-- ===== 2. ADD PERFORMANCE INDEXES FOR COMPUTED STATS =====
-- These indexes optimize the ranking lookup queries

-- Index for finding a player's most recent match (for ranking lookup)
CREATE INDEX IF NOT EXISTS idx_matches_player1_created
  ON matches(team1_player1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player2_created
  ON matches(team1_player2_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player3_created
  ON matches(team2_player1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player4_created
  ON matches(team2_player2_id, created_at DESC);

-- Composite index for season-scoped ranking lookups
CREATE INDEX IF NOT EXISTS idx_matches_season_player1_created
  ON matches(season_id, team1_player1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season_player2_created
  ON matches(season_id, team1_player2_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season_player3_created
  ON matches(season_id, team2_player1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season_player4_created
  ON matches(season_id, team2_player2_id, created_at DESC);

-- ===== 3. CREATE OPTIMIZED RANKING FUNCTIONS =====

-- Function to compute a player's current ranking for a specific season (O(1) lookup)
CREATE OR REPLACE FUNCTION compute_player_season_ranking(p_player_id uuid, p_season_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
          WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
          WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
          WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
        END
      FROM matches m
      WHERE m.season_id = p_season_id
        AND (m.team1_player1_id = p_player_id
          OR m.team1_player2_id = p_player_id
          OR m.team2_player1_id = p_player_id
          OR m.team2_player2_id = p_player_id)
      ORDER BY m.created_at DESC
      LIMIT 1
    ),
    1200  -- Default ranking for players with no matches in this season
  );
$$;

COMMENT ON FUNCTION compute_player_season_ranking IS 'Computes player ranking from most recent match in a season (O(1) with index)';

-- Function to compute a player's global ranking (across all seasons/matches)
CREATE OR REPLACE FUNCTION compute_player_global_ranking(p_player_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
          WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
          WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
          WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
        END
      FROM matches m
      WHERE m.team1_player1_id = p_player_id
        OR m.team1_player2_id = p_player_id
        OR m.team2_player1_id = p_player_id
        OR m.team2_player2_id = p_player_id
      ORDER BY m.created_at DESC
      LIMIT 1
    ),
    1200  -- Default ranking for players with no matches
  );
$$;

COMMENT ON FUNCTION compute_player_global_ranking IS 'Computes player global ranking from most recent match (O(1) with index)';

-- ===== 4. CREATE COMPUTED STATS VIEWS =====

-- View for player_season_stats_computed (replaces player_season_stats for reads)
-- Using security_invoker to respect RLS policies of underlying tables
CREATE OR REPLACE VIEW player_season_stats_computed
WITH (security_invoker = true)
AS
SELECT
  pss.id,
  pss.player_id,
  pss.season_id,
  compute_player_season_ranking(pss.player_id, pss.season_id) as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  COALESCE(stats.goals_for, 0) as goals_for,
  COALESCE(stats.goals_against, 0) as goals_against,
  pss.created_at,
  pss.updated_at
FROM player_season_stats pss
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team1_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team2_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against
  FROM matches m
  WHERE m.season_id = pss.season_id
    AND (m.team1_player1_id = pss.player_id
      OR m.team1_player2_id = pss.player_id
      OR m.team2_player1_id = pss.player_id
      OR m.team2_player2_id = pss.player_id)
) stats ON true;

COMMENT ON VIEW player_season_stats_computed IS 'Computed player season statistics from match history';

-- View for player_stats_computed (replaces players table stats for reads)
-- Using security_invoker to respect RLS policies of underlying tables
CREATE OR REPLACE VIEW player_stats_computed
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  compute_player_global_ranking(p.id) as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  p.avatar,
  p.department,
  p.group_id,
  p.created_by,
  p.created_at,
  p.updated_at
FROM players p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses
  FROM matches m
  WHERE m.team1_player1_id = p.id
    OR m.team1_player2_id = p.id
    OR m.team2_player1_id = p.id
    OR m.team2_player2_id = p.id
) stats ON true;

COMMENT ON VIEW player_stats_computed IS 'Computed player global statistics from match history';

-- ===== 5. GRANT PERMISSIONS ON VIEWS =====
-- Views need to be accessible to authenticated users

GRANT SELECT ON player_season_stats_computed TO authenticated;
GRANT SELECT ON player_stats_computed TO authenticated;

-- ===== 6. VERIFICATION QUERY =====
-- This can be run manually to verify computed stats match stored stats

DO $$
DECLARE
  mismatched_count integer;
BEGIN
  -- Check for mismatches between stored and computed rankings
  SELECT COUNT(*) INTO mismatched_count
  FROM players p
  WHERE p.ranking IS NOT NULL
    AND p.ranking != compute_player_global_ranking(p.id)
    AND p.matches_played > 0;

  IF mismatched_count > 0 THEN
    RAISE NOTICE 'Warning: % players have mismatched rankings (stored vs computed)', mismatched_count;
    RAISE NOTICE 'This is expected if rankings were manually adjusted or if there is historical data inconsistency';
  ELSE
    RAISE NOTICE 'All player rankings match between stored and computed values';
  END IF;
END $$;

-- ===== ROLLBACK INSTRUCTIONS =====
-- To rollback this migration:
--
-- DROP VIEW IF EXISTS player_stats_computed;
-- DROP VIEW IF EXISTS player_season_stats_computed;
-- DROP FUNCTION IF EXISTS compute_player_global_ranking(uuid);
-- DROP FUNCTION IF EXISTS compute_player_season_ranking(uuid, uuid);
-- DROP INDEX IF EXISTS idx_matches_season_player4_created;
-- DROP INDEX IF EXISTS idx_matches_season_player3_created;
-- DROP INDEX IF EXISTS idx_matches_season_player2_created;
-- DROP INDEX IF EXISTS idx_matches_season_player1_created;
-- DROP INDEX IF EXISTS idx_matches_player4_created;
-- DROP INDEX IF EXISTS idx_matches_player3_created;
-- DROP INDEX IF EXISTS idx_matches_player2_created;
-- DROP INDEX IF EXISTS idx_matches_player1_created;
-- ALTER TABLE player_season_stats
--   ALTER COLUMN ranking SET NOT NULL,
--   ALTER COLUMN matches_played SET NOT NULL,
--   ALTER COLUMN wins SET NOT NULL,
--   ALTER COLUMN losses SET NOT NULL,
--   ALTER COLUMN goals_for SET NOT NULL,
--   ALTER COLUMN goals_against SET NOT NULL;
-- ALTER TABLE players
--   ALTER COLUMN ranking SET NOT NULL,
--   ALTER COLUMN matches_played SET NOT NULL,
--   ALTER COLUMN wins SET NOT NULL,
--   ALTER COLUMN losses SET NOT NULL;
