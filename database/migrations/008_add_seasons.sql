-- Add Seasons Feature
-- This migration adds a complete seasons system to track competitive periods
-- Each season is a fresh start with rankings reset to 1200

-- ===== 1. CREATE SEASONS TABLE =====

CREATE TABLE seasons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  season_number integer NOT NULL,
  start_date date DEFAULT CURRENT_DATE NOT NULL,
  end_date date,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT season_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT season_number_positive CHECK (season_number > 0),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  UNIQUE(group_id, season_number)
);

-- Add comments for documentation
COMMENT ON TABLE seasons IS 'Competitive seasons for friend groups with independent rankings';
COMMENT ON COLUMN seasons.season_number IS 'Sequential season number within a group (1, 2, 3, etc.)';
COMMENT ON COLUMN seasons.is_active IS 'Only one season can be active per group at a time';
COMMENT ON COLUMN seasons.end_date IS 'NULL for active season, set when season is closed';

-- Enable RLS and create policies for seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_group_seasons" ON seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE id = seasons.group_id
      AND (owner_id = auth.uid() OR auth.uid() = ANY(visible_to_users))
    )
  );

CREATE POLICY "group_owners_manage_seasons" ON seasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE id = seasons.group_id
      AND owner_id = auth.uid()
    )
  );

-- ===== 2. ADD SEASON_ID TO MATCHES TABLE =====

-- Add season_id column (nullable for backwards compatibility during migration)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;

COMMENT ON COLUMN matches.season_id IS 'Season in which this match was played';

-- ===== 3. CREATE PLAYER SEASON STATS TABLE =====

CREATE TABLE player_season_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  season_id uuid REFERENCES seasons(id) ON DELETE CASCADE NOT NULL,
  ranking integer DEFAULT 1200 NOT NULL,
  matches_played integer DEFAULT 0 NOT NULL,
  wins integer DEFAULT 0 NOT NULL,
  losses integer DEFAULT 0 NOT NULL,
  goals_for integer DEFAULT 0 NOT NULL,
  goals_against integer DEFAULT 0 NOT NULL,
  CONSTRAINT season_ranking_bounds CHECK (ranking >= 800 AND ranking <= 2400),
  CONSTRAINT season_non_negative_stats CHECK (
    matches_played >= 0 AND
    wins >= 0 AND
    losses >= 0 AND
    goals_for >= 0 AND
    goals_against >= 0
  ),
  CONSTRAINT season_win_loss_balance CHECK (wins + losses <= matches_played),
  UNIQUE(player_id, season_id)
);

-- Add comments for documentation
COMMENT ON TABLE player_season_stats IS 'Per-season statistics and rankings for each player';
COMMENT ON COLUMN player_season_stats.ranking IS 'ELO ranking for this player in this season (starts at 1200)';
COMMENT ON COLUMN player_season_stats.goals_for IS 'Total goals scored by this player in this season';
COMMENT ON COLUMN player_season_stats.goals_against IS 'Total goals conceded by this player in this season';

-- Enable RLS and create policies for player_season_stats
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_group_season_stats" ON player_season_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN friend_groups ON players.group_id = friend_groups.id
      WHERE players.id = player_season_stats.player_id
      AND (friend_groups.owner_id = auth.uid() OR auth.uid() = ANY(friend_groups.visible_to_users))
    )
  );

CREATE POLICY "users_manage_group_season_stats" ON player_season_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN friend_groups ON players.group_id = friend_groups.id
      WHERE players.id = player_season_stats.player_id
      AND (friend_groups.owner_id = auth.uid() OR auth.uid() = ANY(friend_groups.visible_to_users))
    )
  );

-- ===== 4. DATA MIGRATION - CREATE SEASON 1 FOR EXISTING GROUPS =====

-- Create "Season 1" for each existing group with matches
INSERT INTO seasons (group_id, name, description, season_number, start_date, is_active, created_by)
SELECT
  fg.id as group_id,
  'Season 1' as name,
  'Initial season with all historical matches' as description,
  1 as season_number,
  COALESCE(MIN(m.match_date), CURRENT_DATE) as start_date,
  true as is_active,
  fg.owner_id as created_by
FROM friend_groups fg
LEFT JOIN matches m ON m.group_id = fg.id
GROUP BY fg.id, fg.owner_id;

-- Associate all existing matches with their group's Season 1
UPDATE matches
SET season_id = (
  SELECT s.id
  FROM seasons s
  WHERE s.group_id = matches.group_id
  AND s.season_number = 1
)
WHERE season_id IS NULL;

-- Make season_id mandatory for future matches
ALTER TABLE matches
ALTER COLUMN season_id SET NOT NULL;

-- Calculate and populate player_season_stats for Season 1 based on match history
-- This creates season stats for all players who have played matches

-- First, create entries for all players who have participated in matches
INSERT INTO player_season_stats (player_id, season_id, ranking, matches_played, wins, losses, goals_for, goals_against)
SELECT
  p.id as player_id,
  s.id as season_id,
  p.ranking as ranking,
  p.matches_played as matches_played,
  p.wins as wins,
  p.losses as losses,
  COALESCE(
    (SELECT SUM(
      CASE
        WHEN m.team1_player1_id = p.id OR m.team1_player2_id = p.id THEN m.team1_score
        WHEN m.team2_player1_id = p.id OR m.team2_player2_id = p.id THEN m.team2_score
        ELSE 0
      END
    )
    FROM matches m
    WHERE m.season_id = s.id
    AND (m.team1_player1_id = p.id OR m.team1_player2_id = p.id OR
         m.team2_player1_id = p.id OR m.team2_player2_id = p.id)), 0
  ) as goals_for,
  COALESCE(
    (SELECT SUM(
      CASE
        WHEN m.team1_player1_id = p.id OR m.team1_player2_id = p.id THEN m.team2_score
        WHEN m.team2_player1_id = p.id OR m.team2_player2_id = p.id THEN m.team1_score
        ELSE 0
      END
    )
    FROM matches m
    WHERE m.season_id = s.id
    AND (m.team1_player1_id = p.id OR m.team1_player2_id = p.id OR
         m.team2_player1_id = p.id OR m.team2_player2_id = p.id)), 0
  ) as goals_against
FROM players p
JOIN seasons s ON s.group_id = p.group_id AND s.season_number = 1
WHERE p.matches_played > 0
ON CONFLICT (player_id, season_id) DO NOTHING;

-- ===== 5. CREATE PERFORMANCE INDEXES =====

CREATE INDEX idx_seasons_group_id ON seasons(group_id, season_number DESC);
-- Partial unique index to ensure only one active season per group
CREATE UNIQUE INDEX idx_one_active_season_per_group ON seasons(group_id) WHERE is_active = true;
CREATE INDEX idx_seasons_active ON seasons(group_id, is_active) WHERE is_active = true;
CREATE INDEX idx_matches_season_id ON matches(season_id, match_date DESC);
CREATE INDEX idx_player_season_stats_season ON player_season_stats(season_id, ranking DESC);
CREATE INDEX idx_player_season_stats_player ON player_season_stats(player_id, season_id);

-- ===== 6. HELPER FUNCTIONS FOR SEASON MANAGEMENT =====

-- Function to end the current active season and create a new one
CREATE OR REPLACE FUNCTION end_season_and_create_new(
  p_group_id uuid,
  p_new_season_name text,
  p_new_season_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season_id uuid;
  v_new_season_id uuid;
  v_next_season_number integer;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is group owner
  IF NOT EXISTS (
    SELECT 1 FROM friend_groups
    WHERE id = p_group_id AND owner_id = v_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only group owners can manage seasons');
  END IF;

  -- Get current active season
  SELECT id INTO v_current_season_id
  FROM seasons
  WHERE group_id = p_group_id AND is_active = true;

  IF v_current_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active season found');
  END IF;

  -- Get next season number
  SELECT COALESCE(MAX(season_number), 0) + 1 INTO v_next_season_number
  FROM seasons
  WHERE group_id = p_group_id;

  -- End current season
  UPDATE seasons
  SET is_active = false,
      end_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_current_season_id;

  -- Create new season
  INSERT INTO seasons (group_id, name, description, season_number, start_date, is_active, created_by)
  VALUES (p_group_id, p_new_season_name, p_new_season_description, v_next_season_number, CURRENT_DATE, true, v_user_id)
  RETURNING id INTO v_new_season_id;

  RETURN json_build_object(
    'success', true,
    'old_season_id', v_current_season_id,
    'new_season_id', v_new_season_id,
    'season_number', v_next_season_number
  );
END;
$$;

COMMENT ON FUNCTION end_season_and_create_new IS 'Closes current season and creates a new one (group owners only)';

-- ===== 7. VERIFICATION =====

-- Verify migration completed successfully
DO $$
DECLARE
  season_count integer;
  migrated_matches integer;
  player_stats_count integer;
BEGIN
  SELECT COUNT(*) INTO season_count FROM seasons WHERE season_number = 1;
  SELECT COUNT(*) INTO migrated_matches FROM matches WHERE season_id IS NOT NULL;
  SELECT COUNT(*) INTO player_stats_count FROM player_season_stats;

  RAISE NOTICE 'Season migration complete:';
  RAISE NOTICE '  - Seasons created: %', season_count;
  RAISE NOTICE '  - Matches with season_id: %', migrated_matches;
  RAISE NOTICE '  - Player season stats entries: %', player_stats_count;
END $$;
