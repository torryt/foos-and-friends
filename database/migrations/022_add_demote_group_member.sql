-- Migration: Add demote_group_member RPC
-- Group owners and admins can demote an admin back to a regular member,
-- without removing their membership. The owner can never be demoted, and
-- nobody can demote themselves.
--
-- Like the migration 019 RPCs, the caller is resolved from auth.uid().

CREATE OR REPLACE FUNCTION demote_group_member(p_group_id uuid, p_target_user_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_target record;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can demote admins'
        );
    END IF;

    IF p_target_user_id = auth.uid() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You cannot demote yourself'
        );
    END IF;

    SELECT * INTO v_target FROM group_memberships
    WHERE group_id = p_group_id AND user_id = p_target_user_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is not a member of this group'
        );
    END IF;

    IF v_target.role = 'owner' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'The group owner cannot be demoted'
        );
    END IF;

    IF v_target.role <> 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is not an admin'
        );
    END IF;

    UPDATE group_memberships
    SET role = 'member'
    WHERE id = v_target.id;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

GRANT EXECUTE ON FUNCTION demote_group_member(uuid, uuid) TO authenticated;
