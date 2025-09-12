-- Migration: Add leave group RPC function
-- This allows non-owner users to leave a group
-- Removes their membership and any players they created

CREATE OR REPLACE FUNCTION leave_group(p_group_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
    v_group_record RECORD;
    v_membership_record RECORD;
    v_result json;
BEGIN
    -- Check if group exists
    SELECT * INTO v_group_record FROM friend_groups 
    WHERE id = p_group_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Group not found'
        );
    END IF;
    
    -- Check if user is group owner
    IF v_group_record.owner_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Group owner cannot leave the group. Delete the group instead.'
        );
    END IF;
    
    -- Check if user is a member
    SELECT * INTO v_membership_record FROM group_memberships 
    WHERE group_id = p_group_id AND user_id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You are not a member of this group'
        );
    END IF;
    
    -- Remove user's membership
    DELETE FROM group_memberships 
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    -- Remove user's players from this group (optional - could be kept for historical reasons)
    -- DELETE FROM players 
    -- WHERE group_id = p_group_id AND created_by = p_user_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION leave_group(uuid, uuid) TO authenticated;