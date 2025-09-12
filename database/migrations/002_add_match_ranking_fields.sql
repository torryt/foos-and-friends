-- Add ranking tracking fields to matches table
-- This migration adds historical ranking data to track pre-game and post-game rankings

-- Add new columns to matches table (all nullable for backwards compatibility)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS team1_player1_pre_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team1_player1_post_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team1_player1_ranking_change INTEGER,
ADD COLUMN IF NOT EXISTS team1_player2_pre_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team1_player2_post_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team1_player2_ranking_change INTEGER,
ADD COLUMN IF NOT EXISTS team2_player1_pre_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team2_player1_post_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team2_player1_ranking_change INTEGER,
ADD COLUMN IF NOT EXISTS team2_player2_pre_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team2_player2_post_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team2_player2_ranking_change INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN matches.team1_player1_pre_ranking IS 'Player ranking before the match';
COMMENT ON COLUMN matches.team1_player1_post_ranking IS 'Player ranking after the match';
COMMENT ON COLUMN matches.team1_player1_ranking_change IS 'Ranking change (+/-) from this match';
COMMENT ON COLUMN matches.team1_player2_pre_ranking IS 'Player ranking before the match';
COMMENT ON COLUMN matches.team1_player2_post_ranking IS 'Player ranking after the match';
COMMENT ON COLUMN matches.team1_player2_ranking_change IS 'Ranking change (+/-) from this match';
COMMENT ON COLUMN matches.team2_player1_pre_ranking IS 'Player ranking before the match';
COMMENT ON COLUMN matches.team2_player1_post_ranking IS 'Player ranking after the match';
COMMENT ON COLUMN matches.team2_player1_ranking_change IS 'Ranking change (+/-) from this match';
COMMENT ON COLUMN matches.team2_player2_pre_ranking IS 'Player ranking before the match';
COMMENT ON COLUMN matches.team2_player2_post_ranking IS 'Player ranking after the match';
COMMENT ON COLUMN matches.team2_player2_ranking_change IS 'Ranking change (+/-) from this match';

-- Backfill existing matches with current player rankings (set change to 0)
-- This makes existing matches compatible with the new history features

UPDATE matches 
SET 
  team1_player1_pre_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team1_player1_id), 1200),
  team1_player1_post_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team1_player1_id), 1200),
  team1_player1_ranking_change = 0,
  team1_player2_pre_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team1_player2_id), 1200),
  team1_player2_post_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team1_player2_id), 1200),
  team1_player2_ranking_change = 0,
  team2_player1_pre_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team2_player1_id), 1200),
  team2_player1_post_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team2_player1_id), 1200),
  team2_player1_ranking_change = 0,
  team2_player2_pre_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team2_player2_id), 1200),
  team2_player2_post_ranking = COALESCE((SELECT ranking FROM players WHERE id = matches.team2_player2_id), 1200),
  team2_player2_ranking_change = 0
WHERE 
  team1_player1_pre_ranking IS NULL;

-- Create indexes for performance (optional, but recommended for queries)
CREATE INDEX IF NOT EXISTS idx_matches_ranking_data ON matches(team1_player1_pre_ranking, team2_player1_pre_ranking);

-- Note: This migration backfills existing matches with current player rankings and 0 change
-- New matches will have proper historical data captured by the application