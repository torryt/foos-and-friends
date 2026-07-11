-- Migration 021: Season Trophies
--
-- When a season ends, the top 3 of the final season leaderboard are awarded
-- gold (rank 1), silver (rank 2) and bronze (rank 3) trophies. Standings are
-- otherwise only computed from match history, so the podium is snapshotted
-- into a table at the moment the season ends — matching exactly what the
-- rankings page showed (ranking DESC, no minimum-games filter).

-- ===== 1. CREATE SEASON_TROPHIES TABLE =====

CREATE TABLE season_trophies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  season_id uuid REFERENCES seasons(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  rank integer NOT NULL,
  CONSTRAINT trophy_rank_podium CHECK (rank >= 1 AND rank <= 3),
  UNIQUE (season_id, rank),
  UNIQUE (season_id, player_id)
);

COMMENT ON TABLE season_trophies IS 'Podium snapshot (top 3 by final season ranking) taken when a season ends';
COMMENT ON COLUMN season_trophies.rank IS '1 = gold, 2 = silver, 3 = bronze';

CREATE INDEX idx_season_trophies_player ON season_trophies(player_id);
CREATE INDEX idx_season_trophies_group ON season_trophies(group_id);

-- ===== 2. RLS =====
-- Read-only for group members; rows are only ever written by the
-- SECURITY DEFINER season-end function (no INSERT/UPDATE/DELETE policies).

ALTER TABLE season_trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_group_trophies" ON season_trophies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE id = season_trophies.group_id
      AND (owner_id = auth.uid() OR auth.uid() = ANY(visible_to_users))
    )
  );

-- ===== 3. PODIUM SNAPSHOT HELPER =====
-- Awards trophies for one season from the combined season leaderboard.
-- Idempotent: skips seasons that already have trophies or have no matches.

CREATE OR REPLACE FUNCTION award_season_trophies(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_awarded integer;
BEGIN
  SELECT group_id INTO v_group_id FROM seasons WHERE id = p_season_id;

  IF v_group_id IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (SELECT 1 FROM season_trophies WHERE season_id = p_season_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO season_trophies (group_id, season_id, player_id, rank)
  SELECT
    v_group_id,
    p_season_id,
    s.player_id,
    row_number() OVER (
      ORDER BY s.ranking DESC, s.wins DESC, s.matches_played DESC, s.player_id
    )::integer AS rank
  FROM player_season_stats_computed s
  WHERE s.season_id = p_season_id
  ORDER BY s.ranking DESC, s.wins DESC, s.matches_played DESC, s.player_id
  LIMIT 3;

  GET DIAGNOSTICS v_awarded = ROW_COUNT;
  RETURN v_awarded;
END;
$$;

COMMENT ON FUNCTION award_season_trophies IS 'Snapshots the top 3 of the season leaderboard into season_trophies (idempotent)';

-- ===== 4. AWARD TROPHIES WHEN A SEASON ENDS =====
-- Same function as migration 008/013, plus the podium snapshot before the
-- season is closed, and trophy info in the result payload.

CREATE OR REPLACE FUNCTION end_season_and_create_new(
  p_group_id uuid,
  p_new_season_name text,
  p_new_season_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_season_id uuid;
  v_new_season_id uuid;
  v_next_season_number integer;
  v_user_id uuid;
  v_trophies_awarded integer;
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

  -- Award podium trophies from the final standings
  v_trophies_awarded := award_season_trophies(v_current_season_id);

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
    'season_number', v_next_season_number,
    'trophies_awarded', v_trophies_awarded
  );
END;
$$;

COMMENT ON FUNCTION end_season_and_create_new IS 'Closes current season (awarding podium trophies) and creates a new one (group owners only)';

-- ===== 5. BACKFILL ALREADY-ENDED SEASONS =====
-- Every inactive season with matches gets its podium snapshotted
-- retroactively; award_season_trophies skips seasons that already have rows.

DO $$
DECLARE
  v_season record;
  v_total integer := 0;
BEGIN
  FOR v_season IN
    SELECT id FROM seasons WHERE is_active = false
  LOOP
    v_total := v_total + award_season_trophies(v_season.id);
  END LOOP;

  RAISE NOTICE 'Migration 021 complete: % trophies backfilled for ended seasons', v_total;
END $$;

-- ===== ROLLBACK INSTRUCTIONS =====
-- To rollback this migration:
--
-- Recreate end_season_and_create_new from migration 013 (definition without
-- the award_season_trophies call), then:
-- DROP FUNCTION IF EXISTS award_season_trophies(uuid);
-- DROP TABLE IF EXISTS season_trophies;
