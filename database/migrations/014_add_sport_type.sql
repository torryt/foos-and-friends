-- Migration: Add sport_type column to friend_groups
-- This allows the same database to support multiple sports (foosball, padel, etc.)

-- Add sport_type column to friend_groups with default 'foosball' for existing groups
ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS sport_type text NOT NULL DEFAULT 'foosball'
  CONSTRAINT friend_groups_sport_type_check CHECK (sport_type IN ('foosball', 'padel'));

-- Create index for efficient filtering by sport type
CREATE INDEX IF NOT EXISTS idx_friend_groups_sport_type ON friend_groups(sport_type);

-- Update the create_group_with_membership function to accept sport_type parameter
CREATE OR REPLACE FUNCTION create_group_with_membership(
  group_name text,
  group_description text DEFAULT NULL,
  group_sport_type text DEFAULT 'foosball'
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
  -- Get the current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate sport_type
  IF group_sport_type NOT IN ('foosball', 'padel') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sport type. Must be foosball or padel');
  END IF;

  -- Generate a unique invite code
  new_invite_code := generate_unique_invite_code();

  -- Create the group with sport_type
  INSERT INTO friend_groups (name, description, invite_code, owner_id, created_by, sport_type)
  VALUES (group_name, group_description, new_invite_code, current_user_id, current_user_id, group_sport_type)
  RETURNING id INTO new_group_id;

  -- Create membership for the creator as owner
  INSERT INTO group_memberships (group_id, user_id, role, invited_by)
  VALUES (new_group_id, current_user_id, 'owner', current_user_id);

  -- Create the initial season for the new group
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
