-- Step 5: Create Database Functions
-- Execute these functions fifth in Supabase SQL Editor

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
  invite_code text;
BEGIN
  -- Create the group
  INSERT INTO friend_groups (name, description, owner_id, created_by)
  VALUES (p_name, p_description, auth.uid(), auth.uid())
  RETURNING id, invite_code INTO new_group_id, invite_code;

  -- Add creator as owner member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (new_group_id, auth.uid(), 'owner', true);

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', invite_code,
    'name', p_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION join_group_by_invite_code(
  p_invite_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record record;
  member_count integer;
  result json;
BEGIN
  -- Find the group by invite code
  SELECT id, name, max_members, is_active INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_record.id AND user_id = p_user_id AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  -- Check member limit
  SELECT COUNT(*) INTO member_count
  FROM group_memberships
  WHERE group_id = group_record.id AND is_active = true;

  IF member_count >= group_record.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
  END IF;

  -- Add user to group
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (group_record.id, p_user_id, 'member', true);

  RETURN json_build_object(
    'success', true, 
    'group_id', group_record.id,
    'group_name', group_record.name
  );
END;
$$;