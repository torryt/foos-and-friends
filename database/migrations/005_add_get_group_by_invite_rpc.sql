-- Migration: Add RPC function to get group info by invite code
-- This allows users to preview group info before joining, bypassing RLS restrictions

CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code text)
RETURNS json AS $$
DECLARE
  group_record friend_groups%ROWTYPE;
BEGIN
  -- Find the group by invite code (bypasses RLS since this runs as SECURITY DEFINER)
  SELECT * INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Return group information for preview
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id', group_record.id,
      'name', group_record.name,
      'description', group_record.description,
      'invite_code', group_record.invite_code,
      'owner_id', group_record.owner_id,
      'created_by', group_record.created_by,
      'is_active', group_record.is_active,
      'max_members', group_record.max_members,
      'created_at', group_record.created_at,
      'updated_at', group_record.updated_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;