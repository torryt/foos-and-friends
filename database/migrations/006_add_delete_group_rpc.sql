-- Migration: Add RPC function to securely delete a group with all associated data
-- This function verifies ownership and performs cascading deletion

CREATE OR REPLACE FUNCTION delete_group_with_cascade(p_group_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
  group_record friend_groups%ROWTYPE;
  player_count integer;
  match_count integer;
  member_count integer;
BEGIN
  -- Verify the group exists and the user is the owner
  SELECT * INTO group_record
  FROM friend_groups
  WHERE id = p_group_id AND owner_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Group not found or you do not have permission to delete it'
    );
  END IF;

  -- Get counts for confirmation (optional - for UI display)
  SELECT COUNT(*) INTO player_count
  FROM players
  WHERE group_id = p_group_id;

  SELECT COUNT(*) INTO match_count
  FROM matches
  WHERE group_id = p_group_id;

  SELECT COUNT(*) INTO member_count
  FROM group_memberships
  WHERE group_id = p_group_id AND is_active = true;

  -- Perform cascading deletion
  -- Note: Foreign key constraints with CASCADE will handle the deletion automatically
  -- But we'll be explicit for clarity and logging
  
  -- Delete matches first (they reference players)
  DELETE FROM matches WHERE group_id = p_group_id;
  
  -- Delete players (they reference the group)
  DELETE FROM players WHERE group_id = p_group_id;
  
  -- Delete group memberships
  DELETE FROM group_memberships WHERE group_id = p_group_id;
  
  -- Finally delete the group itself
  DELETE FROM friend_groups WHERE id = p_group_id;

  -- Return success with deletion summary
  RETURN json_build_object(
    'success', true,
    'deleted_counts', json_build_object(
      'players', player_count,
      'matches', match_count,
      'members', member_count
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error if anything goes wrong
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete group: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;