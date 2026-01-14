-- Fix create_friend_group to automatically create Season 1 for new groups
-- This fixes issue #68 where new groups don't have an initial season

-- Drop and recreate the create_friend_group function
DROP FUNCTION IF EXISTS create_friend_group(text, text);

CREATE OR REPLACE FUNCTION create_friend_group(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_group_id uuid;
  new_invite_code text;
  new_season_id uuid;
BEGIN
  -- Create the group
  INSERT INTO friend_groups (name, description, owner_id, created_by)
  VALUES (p_name, p_description, auth.uid(), auth.uid())
  RETURNING id, invite_code INTO new_group_id, new_invite_code;

  -- Add creator as owner member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (new_group_id, auth.uid(), 'owner', true);

  -- Create initial season (Season 1) for the new group
  INSERT INTO seasons (group_id, name, description, season_number, start_date, is_active, created_by)
  VALUES (
    new_group_id,
    'Season 1',
    'Initial season',
    1,
    CURRENT_DATE,
    true,
    auth.uid()
  )
  RETURNING id INTO new_season_id;

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', new_invite_code,
    'name', p_name,
    'season_id', new_season_id
  );
END;
$$;

COMMENT ON FUNCTION create_friend_group IS 'Creates a new friend group with an initial Season 1';
