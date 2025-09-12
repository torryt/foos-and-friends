-- Make ranking fields mandatory after data migration
-- This should be run AFTER the migration script has backfilled existing data

-- WARNING: This migration will fail if there are any NULL values in the ranking fields
-- Make sure to run the migration script (scripts/migrate-match-rankings.ts) first!

-- Set NOT NULL constraints on all ranking fields
ALTER TABLE matches 
ALTER COLUMN team1_player1_pre_ranking SET NOT NULL,
ALTER COLUMN team1_player1_post_ranking SET NOT NULL,
ALTER COLUMN team1_player1_ranking_change SET NOT NULL,
ALTER COLUMN team1_player2_pre_ranking SET NOT NULL,
ALTER COLUMN team1_player2_post_ranking SET NOT NULL,
ALTER COLUMN team1_player2_ranking_change SET NOT NULL,
ALTER COLUMN team2_player1_pre_ranking SET NOT NULL,
ALTER COLUMN team2_player1_post_ranking SET NOT NULL,
ALTER COLUMN team2_player1_ranking_change SET NOT NULL,
ALTER COLUMN team2_player2_pre_ranking SET NOT NULL,
ALTER COLUMN team2_player2_post_ranking SET NOT NULL,
ALTER COLUMN team2_player2_ranking_change SET NOT NULL;

-- Add check constraints to ensure data integrity
ALTER TABLE matches 
ADD CONSTRAINT chk_valid_rankings CHECK (
  team1_player1_pre_ranking >= 800 AND team1_player1_pre_ranking <= 2400 AND
  team1_player1_post_ranking >= 800 AND team1_player1_post_ranking <= 2400 AND
  team1_player2_pre_ranking >= 800 AND team1_player2_pre_ranking <= 2400 AND
  team1_player2_post_ranking >= 800 AND team1_player2_post_ranking <= 2400 AND
  team2_player1_pre_ranking >= 800 AND team2_player1_pre_ranking <= 2400 AND
  team2_player1_post_ranking >= 800 AND team2_player1_post_ranking <= 2400 AND
  team2_player2_pre_ranking >= 800 AND team2_player2_pre_ranking <= 2400 AND
  team2_player2_post_ranking >= 800 AND team2_player2_post_ranking <= 2400
);

-- Add check constraint for ranking changes (reasonable bounds)
ALTER TABLE matches 
ADD CONSTRAINT chk_valid_ranking_changes CHECK (
  team1_player1_ranking_change >= -200 AND team1_player1_ranking_change <= 200 AND
  team1_player2_ranking_change >= -200 AND team1_player2_ranking_change <= 200 AND
  team2_player1_ranking_change >= -200 AND team2_player1_ranking_change <= 200 AND
  team2_player2_ranking_change >= -200 AND team2_player2_ranking_change <= 200
);

-- Add constraint to ensure ranking changes are consistent
ALTER TABLE matches 
ADD CONSTRAINT chk_consistent_ranking_changes CHECK (
  (team1_player1_post_ranking - team1_player1_pre_ranking) = team1_player1_ranking_change AND
  (team1_player2_post_ranking - team1_player2_pre_ranking) = team1_player2_ranking_change AND
  (team2_player1_post_ranking - team2_player1_pre_ranking) = team2_player1_ranking_change AND
  (team2_player2_post_ranking - team2_player2_pre_ranking) = team2_player2_ranking_change
);

-- Update the complete reset script reference
COMMENT ON TABLE matches IS 'Updated to include historical ranking data. See migration 002 and 003.';