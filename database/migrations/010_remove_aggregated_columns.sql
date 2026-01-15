-- Migration 010: Remove Aggregated Columns (Post-Deploy)
-- This migration removes redundant aggregated statistics columns after the application
-- has been updated to use computed statistics from migration 009.
--
-- Deploy this AFTER deploying the updated application code and verifying it works correctly.
--
-- WARNING: This migration is DESTRUCTIVE and will drop columns.
-- Ensure the application is working correctly with computed stats before running this.

-- ===== 1. REMOVE AGGREGATED COLUMNS FROM PLAYERS TABLE =====

-- Drop the redundant aggregated statistics columns
ALTER TABLE players
DROP COLUMN IF EXISTS ranking,
DROP COLUMN IF EXISTS matches_played,
DROP COLUMN IF EXISTS wins,
DROP COLUMN IF EXISTS losses;

-- Remove the constraint that depended on these columns
ALTER TABLE players
DROP CONSTRAINT IF EXISTS ranking_bounds,
DROP CONSTRAINT IF EXISTS non_negative_stats;

COMMENT ON TABLE players IS 'Player profiles (statistics computed from matches table)';

-- ===== 2. REMOVE AGGREGATED COLUMNS FROM PLAYER_SEASON_STATS TABLE =====

-- Drop the redundant aggregated statistics columns
ALTER TABLE player_season_stats
DROP COLUMN IF EXISTS ranking,
DROP COLUMN IF EXISTS matches_played,
DROP COLUMN IF EXISTS wins,
DROP COLUMN IF EXISTS losses,
DROP COLUMN IF EXISTS goals_for,
DROP COLUMN IF EXISTS goals_against;

-- Remove the constraints that depended on these columns
ALTER TABLE player_season_stats
DROP CONSTRAINT IF EXISTS season_ranking_bounds,
DROP CONSTRAINT IF EXISTS season_non_negative_stats,
DROP CONSTRAINT IF EXISTS season_win_loss_balance;

COMMENT ON TABLE player_season_stats IS 'Player season participation tracking (statistics computed from matches table)';

-- ===== 3. UPDATE VIEWS TO REMOVE PLACEHOLDER RANKING =====

-- Since we removed the actual columns, update the views to be cleaner
-- The views will return all statistics computed from matches

DROP VIEW IF EXISTS player_season_stats_computed;

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
  COALESCE(stats.goals_against, 0) as goals_against
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

COMMENT ON VIEW player_season_stats_computed IS 'Computed player season statistics from match history (use compute_player_season_ranking() for ranking)';
ALTER VIEW player_season_stats_computed SET (security_invoker = true);

-- Update global player stats view
DROP VIEW IF EXISTS player_stats_computed;

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
  COALESCE(stats.losses, 0) as losses
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

COMMENT ON VIEW player_stats_computed IS 'Computed global player statistics from all matches (use compute_player_global_ranking() for ranking)';
ALTER VIEW player_stats_computed SET (security_invoker = true);

-- ===== 4. VERIFICATION =====

DO $$
DECLARE
  players_columns_exist boolean;
  season_stats_columns_exist boolean;
  view_count integer;
BEGIN
  -- Check if columns were successfully removed from players table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name IN ('ranking', 'matches_played', 'wins', 'losses')
  ) INTO players_columns_exist;

  -- Check if columns were successfully removed from player_season_stats table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_season_stats'
      AND column_name IN ('ranking', 'matches_played', 'wins', 'losses', 'goals_for', 'goals_against')
  ) INTO season_stats_columns_exist;

  -- Count views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('player_season_stats_computed', 'player_stats_computed');

  RAISE NOTICE 'Migration 010 complete:';
  RAISE NOTICE '  - Player aggregated columns removed: %', NOT players_columns_exist;
  RAISE NOTICE '  - Season stats aggregated columns removed: %', NOT season_stats_columns_exist;
  RAISE NOTICE '  - Views updated: % (expected: 2)', view_count;
  RAISE NOTICE '';

  IF players_columns_exist OR season_stats_columns_exist THEN
    RAISE WARNING 'Some columns were not removed. This may indicate a problem with the migration.';
  ELSE
    RAISE NOTICE 'SUCCESS: All redundant aggregated statistics have been removed.';
    RAISE NOTICE 'All statistics are now computed from the matches table (single source of truth).';
  END IF;
END $$;
