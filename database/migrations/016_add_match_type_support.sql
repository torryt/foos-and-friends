-- Migration 016: Add Match Type Support (1v1 and 2v2)
-- This migration adds support for 1v1 match types alongside existing 2v2 matches.
-- It is backwards-compatible: all existing data defaults to '2v2'.

-- ===== 1. ADD SUPPORTED MATCH TYPES TO GROUPS =====

ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS supported_match_types text[]
  NOT NULL
  DEFAULT ARRAY['2v2']
  CONSTRAINT friend_groups_match_types_check
  CHECK (
    supported_match_types <@ ARRAY['1v1', '2v2'] AND
    array_length(supported_match_types, 1) > 0
  );

CREATE INDEX IF NOT EXISTS idx_friend_groups_match_types
  ON friend_groups USING GIN (supported_match_types);

COMMENT ON COLUMN friend_groups.supported_match_types IS
  'Array of supported match types for this sport (1v1, 2v2, or both)';

-- ===== 2. ADD MATCH TYPE TO MATCHES =====

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT '2v2'
  CONSTRAINT matches_match_type_check CHECK (match_type IN ('1v1', '2v2'));

-- Make player2 columns nullable for 1v1 matches
ALTER TABLE matches
  ALTER COLUMN team1_player2_id DROP NOT NULL,
  ALTER COLUMN team2_player2_id DROP NOT NULL;

-- Make ranking columns for player2 positions nullable
ALTER TABLE matches
  ALTER COLUMN team1_player2_pre_ranking DROP NOT NULL,
  ALTER COLUMN team1_player2_post_ranking DROP NOT NULL,
  ALTER COLUMN team2_player2_pre_ranking DROP NOT NULL,
  ALTER COLUMN team2_player2_post_ranking DROP NOT NULL;

-- Update the different_players constraint to handle both match types
ALTER TABLE matches DROP CONSTRAINT IF EXISTS different_players;

ALTER TABLE matches ADD CONSTRAINT different_players_by_match_type CHECK (
  CASE
    -- For 1v1 matches: only team1_player1 and team2_player1 must be different
    WHEN match_type = '1v1' THEN
      team1_player1_id != team2_player1_id AND
      team1_player2_id IS NULL AND
      team2_player2_id IS NULL
    -- For 2v2 matches: all 4 players must be different
    WHEN match_type = '2v2' THEN
      team1_player1_id != team1_player2_id AND
      team1_player1_id != team2_player1_id AND
      team1_player1_id != team2_player2_id AND
      team1_player2_id != team2_player1_id AND
      team1_player2_id != team2_player2_id AND
      team2_player1_id != team2_player2_id AND
      team1_player2_id IS NOT NULL AND
      team2_player2_id IS NOT NULL
    ELSE false
  END
);

-- Create indexes for match type filtering
CREATE INDEX IF NOT EXISTS idx_matches_match_type
  ON matches(match_type, season_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season_type
  ON matches(season_id, match_type);

COMMENT ON COLUMN matches.match_type IS
  '1v1 or 2v2 match type - determines which player columns are used';

-- ===== 3. UPDATE RANKING FUNCTION AND COMPUTED VIEWS =====
-- Note: player_season_stats table was removed in migration 012.
-- Views derive player-season combinations directly from matches using CTEs.

-- Drop views first since they depend on the old function signature
DROP VIEW IF EXISTS player_season_stats_computed;

-- Drop the old 2-param version to avoid ambiguity with the new 3-param default
DROP FUNCTION IF EXISTS compute_player_season_ranking(uuid, uuid);

CREATE OR REPLACE FUNCTION compute_player_season_ranking(
  p_player_id uuid,
  p_season_id uuid,
  p_match_type text DEFAULT NULL
)
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
        AND (p_match_type IS NULL OR m.match_type = p_match_type)
        AND (m.team1_player1_id = p_player_id
          OR m.team1_player2_id = p_player_id
          OR m.team2_player1_id = p_player_id
          OR m.team2_player2_id = p_player_id)
      ORDER BY m.created_at DESC
      LIMIT 1
    ),
    1200
  );
$$;

-- Recreate the overall season stats view (all match types combined)
CREATE VIEW player_season_stats_computed
WITH (security_invoker = true)
AS
WITH player_seasons AS (
  SELECT DISTINCT player_id, season_id
  FROM (
    SELECT team1_player1_id as player_id, season_id FROM matches
    UNION
    SELECT team1_player2_id as player_id, season_id FROM matches WHERE team1_player2_id IS NOT NULL
    UNION
    SELECT team2_player1_id as player_id, season_id FROM matches
    UNION
    SELECT team2_player2_id as player_id, season_id FROM matches WHERE team2_player2_id IS NOT NULL
  ) all_players
),
player_season_stats AS (
  SELECT
    ps.player_id,
    ps.season_id,
    compute_player_season_ranking(ps.player_id, ps.season_id) as ranking,
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

GRANT SELECT ON player_season_stats_computed TO authenticated;

COMMENT ON VIEW player_season_stats_computed IS 'Player season statistics computed directly from matches (all match types combined)';

-- Create 1v1-specific computed view
CREATE VIEW player_season_stats_1v1_computed
WITH (security_invoker = true)
AS
WITH player_seasons_1v1 AS (
  SELECT DISTINCT player_id, season_id
  FROM (
    SELECT team1_player1_id as player_id, season_id FROM matches WHERE match_type = '1v1'
    UNION
    SELECT team2_player1_id as player_id, season_id FROM matches WHERE match_type = '1v1'
  ) all_players
),
player_season_stats AS (
  SELECT
    ps.player_id,
    ps.season_id,
    '1v1'::text as match_type,
    compute_player_season_ranking(ps.player_id, ps.season_id, '1v1') as ranking,
    COUNT(m.id)::integer as matches_played,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id AND m.team1_score > m.team2_score THEN 1
      WHEN m.team2_player1_id = ps.player_id AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id AND m.team1_score < m.team2_score THEN 1
      WHEN m.team2_player1_id = ps.player_id AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id THEN m.team1_score
      WHEN m.team2_player1_id = ps.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = ps.player_id THEN m.team2_score
      WHEN m.team2_player1_id = ps.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against,
    MIN(m.created_at) as created_at,
    MAX(m.created_at) as updated_at
  FROM player_seasons_1v1 ps
  JOIN matches m ON m.season_id = ps.season_id
    AND m.match_type = '1v1'
    AND (m.team1_player1_id = ps.player_id OR m.team2_player1_id = ps.player_id)
  GROUP BY ps.player_id, ps.season_id
)
SELECT
  uuid_generate_v5(uuid_ns_url(), player_id::text || '/1v1/' || season_id::text) as id,
  player_id,
  season_id,
  match_type,
  ranking,
  matches_played,
  wins,
  losses,
  goals_for,
  goals_against,
  created_at,
  updated_at
FROM player_season_stats;

GRANT SELECT ON player_season_stats_1v1_computed TO authenticated;

COMMENT ON VIEW player_season_stats_1v1_computed IS 'Computed 1v1 statistics for players per season';

-- Create 2v2-specific computed view
CREATE VIEW player_season_stats_2v2_computed
WITH (security_invoker = true)
AS
WITH player_seasons_2v2 AS (
  SELECT DISTINCT player_id, season_id
  FROM (
    SELECT team1_player1_id as player_id, season_id FROM matches WHERE match_type = '2v2'
    UNION
    SELECT team1_player2_id as player_id, season_id FROM matches WHERE match_type = '2v2'
    UNION
    SELECT team2_player1_id as player_id, season_id FROM matches WHERE match_type = '2v2'
    UNION
    SELECT team2_player2_id as player_id, season_id FROM matches WHERE match_type = '2v2'
  ) all_players
),
player_season_stats AS (
  SELECT
    ps.player_id,
    ps.season_id,
    '2v2'::text as match_type,
    compute_player_season_ranking(ps.player_id, ps.season_id, '2v2') as ranking,
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
  FROM player_seasons_2v2 ps
  JOIN matches m ON m.season_id = ps.season_id
    AND m.match_type = '2v2'
    AND (m.team1_player1_id = ps.player_id
      OR m.team1_player2_id = ps.player_id
      OR m.team2_player1_id = ps.player_id
      OR m.team2_player2_id = ps.player_id)
  GROUP BY ps.player_id, ps.season_id
)
SELECT
  uuid_generate_v5(uuid_ns_url(), player_id::text || '/2v2/' || season_id::text) as id,
  player_id,
  season_id,
  match_type,
  ranking,
  matches_played,
  wins,
  losses,
  goals_for,
  goals_against,
  created_at,
  updated_at
FROM player_season_stats;

GRANT SELECT ON player_season_stats_2v2_computed TO authenticated;

COMMENT ON VIEW player_season_stats_2v2_computed IS 'Computed 2v2 statistics for players per season';

-- ===== 5. UPDATE create_group_with_membership FUNCTION =====

CREATE OR REPLACE FUNCTION create_group_with_membership(
  group_name text,
  group_description text DEFAULT NULL,
  group_sport_type text DEFAULT 'foosball',
  group_supported_match_types text[] DEFAULT ARRAY['2v2']
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_group_id uuid;
  new_invite_code text;
  current_user_id uuid;
  new_season_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate sport_type
  IF group_sport_type NOT IN ('foosball', 'padel') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sport type. Must be foosball or padel');
  END IF;

  -- Validate match types
  IF NOT (group_supported_match_types <@ ARRAY['1v1', '2v2']
          AND array_length(group_supported_match_types, 1) > 0) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid match types');
  END IF;

  new_invite_code := generate_unique_invite_code();

  -- Create the group with sport_type and supported_match_types
  INSERT INTO friend_groups (
    name, description, invite_code, owner_id, created_by,
    sport_type, supported_match_types
  )
  VALUES (
    group_name, group_description, new_invite_code, current_user_id,
    current_user_id, group_sport_type, group_supported_match_types
  )
  RETURNING id INTO new_group_id;

  -- Create membership for the creator as owner
  INSERT INTO group_memberships (group_id, user_id, role, invited_by)
  VALUES (new_group_id, current_user_id, 'owner', current_user_id);

  -- Create the initial season
  INSERT INTO seasons (group_id, name, description, season_number, is_active, created_by)
  VALUES (new_group_id, 'Season 1', 'First season', 1, true, current_user_id)
  RETURNING id INTO new_season_id;

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', new_invite_code,
    'name', group_name,
    'season_id', new_season_id
  );
END;
$$;

-- ===== ROLLBACK INSTRUCTIONS =====
-- To rollback this migration:
--
-- DROP VIEW IF EXISTS player_season_stats_2v2_computed;
-- DROP VIEW IF EXISTS player_season_stats_1v1_computed;
-- ALTER TABLE matches DROP CONSTRAINT IF EXISTS different_players_by_match_type;
-- ALTER TABLE matches ADD CONSTRAINT different_players CHECK (
--   team1_player1_id != team1_player2_id AND
--   team1_player1_id != team2_player1_id AND
--   team1_player1_id != team2_player2_id AND
--   team1_player2_id != team2_player1_id AND
--   team1_player2_id != team2_player2_id AND
--   team2_player1_id != team2_player2_id
-- );
-- ALTER TABLE matches
--   ALTER COLUMN team1_player2_id SET NOT NULL,
--   ALTER COLUMN team2_player2_id SET NOT NULL;
-- ALTER TABLE matches DROP COLUMN IF EXISTS match_type;
-- ALTER TABLE friend_groups DROP COLUMN IF EXISTS supported_match_types;
-- DROP INDEX IF EXISTS idx_matches_match_type;
-- DROP INDEX IF EXISTS idx_matches_season_type;
-- DROP INDEX IF EXISTS idx_friend_groups_match_types;
-- Restore original compute_player_season_ranking with 2-param signature
