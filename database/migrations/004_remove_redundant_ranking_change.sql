-- Migration 004: Remove redundant ranking_change columns
-- Since we store both pre and post rankings, ranking change can be calculated as (post - pre)

-- Drop the check constraint that references ranking_change columns
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_consistent_ranking_changes;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_valid_ranking_changes;

-- Remove ranking_change columns
ALTER TABLE matches DROP COLUMN IF EXISTS team1_player1_ranking_change;
ALTER TABLE matches DROP COLUMN IF EXISTS team1_player2_ranking_change;
ALTER TABLE matches DROP COLUMN IF EXISTS team2_player1_ranking_change;
ALTER TABLE matches DROP COLUMN IF EXISTS team2_player2_ranking_change;

-- Add improved check constraints for ranking bounds
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

-- Add check constraint for reasonable ranking changes (calculated as post - pre)
ALTER TABLE matches 
ADD CONSTRAINT chk_reasonable_ranking_changes CHECK (
  ABS(team1_player1_post_ranking - team1_player1_pre_ranking) <= 200 AND
  ABS(team1_player2_post_ranking - team1_player2_pre_ranking) <= 200 AND
  ABS(team2_player1_post_ranking - team2_player1_pre_ranking) <= 200 AND
  ABS(team2_player2_post_ranking - team2_player2_pre_ranking) <= 200
);