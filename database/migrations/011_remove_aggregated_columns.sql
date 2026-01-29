-- Migration 011: Remove Aggregated Columns (DEFERRED - DO NOT RUN YET)
--
-- !!! WARNING: This is a DESTRUCTIVE migration !!!
-- Only run this AFTER verifying that:
-- 1. Migration 010 has been applied successfully
-- 2. The application is reading from computed views
-- 3. Computed stats match stored stats for all players
-- 4. You have a recent backup of the database
--
-- This migration removes the redundant stats columns from players and
-- player_season_stats tables since these values are now computed from
-- match history via views.

-- ===== VERIFICATION BEFORE RUNNING =====
-- Run these queries to verify computed stats match stored stats:

-- Check players table:
-- SELECT p.id, p.name,
--        p.ranking as stored_ranking,
--        compute_player_global_ranking(p.id) as computed_ranking,
--        p.ranking = compute_player_global_ranking(p.id) as ranking_match
-- FROM players p
-- WHERE p.ranking IS NOT NULL
-- ORDER BY p.ranking DESC;

-- Check player_season_stats table:
-- SELECT pss.player_id, pss.season_id,
--        pss.ranking as stored_ranking,
--        compute_player_season_ranking(pss.player_id, pss.season_id) as computed_ranking,
--        pss.ranking = compute_player_season_ranking(pss.player_id, pss.season_id) as ranking_match
-- FROM player_season_stats pss
-- WHERE pss.ranking IS NOT NULL;

-- ===== 1. DROP CONSTRAINTS THAT REFERENCE COLUMNS =====

-- Drop check constraints from players table
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_ranking_check;
ALTER TABLE players DROP CONSTRAINT IF EXISTS ranking_bounds;
ALTER TABLE players DROP CONSTRAINT IF EXISTS non_negative_stats;
ALTER TABLE players DROP CONSTRAINT IF EXISTS win_loss_balance;

-- Drop check constraints from player_season_stats table
ALTER TABLE player_season_stats DROP CONSTRAINT IF EXISTS season_ranking_bounds;
ALTER TABLE player_season_stats DROP CONSTRAINT IF EXISTS season_non_negative_stats;
ALTER TABLE player_season_stats DROP CONSTRAINT IF EXISTS season_win_loss_balance;

-- ===== 2. DROP COLUMNS FROM PLAYERS TABLE =====

ALTER TABLE players
  DROP COLUMN IF EXISTS ranking,
  DROP COLUMN IF EXISTS matches_played,
  DROP COLUMN IF EXISTS wins,
  DROP COLUMN IF EXISTS losses;

-- ===== 3. DROP COLUMNS FROM PLAYER_SEASON_STATS TABLE =====

ALTER TABLE player_season_stats
  DROP COLUMN IF EXISTS ranking,
  DROP COLUMN IF EXISTS matches_played,
  DROP COLUMN IF EXISTS wins,
  DROP COLUMN IF EXISTS losses,
  DROP COLUMN IF EXISTS goals_for,
  DROP COLUMN IF EXISTS goals_against;

-- ===== 4. UPDATE COMMENTS =====

COMMENT ON TABLE players IS 'Player profiles (stats computed via player_stats_computed view)';
COMMENT ON TABLE player_season_stats IS 'Player-season relationships (stats computed via player_season_stats_computed view)';

-- ===== 5. VERIFICATION =====

DO $$
BEGIN
  -- Verify columns were dropped
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'ranking'
  ) THEN
    RAISE EXCEPTION 'Column players.ranking was not dropped';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_season_stats' AND column_name = 'ranking'
  ) THEN
    RAISE EXCEPTION 'Column player_season_stats.ranking was not dropped';
  END IF;

  RAISE NOTICE 'Migration 011 complete: Aggregated columns removed successfully';
  RAISE NOTICE 'Stats are now computed from match history via views';
END $$;

-- ===== ROLLBACK INSTRUCTIONS =====
-- This migration is DESTRUCTIVE and cannot be easily rolled back.
-- To rollback, you must:
-- 1. Restore from a backup taken before this migration
-- 2. Or manually recreate the columns and repopulate from computed views:
--
-- ALTER TABLE players
--   ADD COLUMN ranking integer,
--   ADD COLUMN matches_played integer,
--   ADD COLUMN wins integer,
--   ADD COLUMN losses integer;
--
-- UPDATE players p SET
--   ranking = (SELECT ranking FROM player_stats_computed WHERE id = p.id),
--   matches_played = (SELECT matches_played FROM player_stats_computed WHERE id = p.id),
--   wins = (SELECT wins FROM player_stats_computed WHERE id = p.id),
--   losses = (SELECT losses FROM player_stats_computed WHERE id = p.id);
--
-- ALTER TABLE players
--   ALTER COLUMN ranking SET NOT NULL,
--   ALTER COLUMN matches_played SET NOT NULL,
--   ALTER COLUMN wins SET NOT NULL,
--   ALTER COLUMN losses SET NOT NULL;
--
-- (Similar process for player_season_stats table)
