-- Migration: Add member management RPC functions
-- Group owners and admins can list all group members (with emails),
-- promote members to admin, and remove members.
--
-- Unlike older RPCs, these do not accept the caller's user id as a
-- parameter — the caller is always resolved from auth.uid() so a client
-- cannot act on behalf of another user.

-- Returns the caller's active role in a group, or NULL if not a member.
CREATE OR REPLACE FUNCTION get_caller_group_role(p_group_id uuid)
RETURNS text AS $$
    SELECT role FROM group_memberships
    WHERE group_id = p_group_id AND user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = 'public';

-- List all active members of a group with their email addresses.
-- Only owners and admins may call this (member emails are not exposed
-- to regular members through RLS today, and this keeps it that way).
CREATE OR REPLACE FUNCTION get_group_members(p_group_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_members json;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can list members'
        );
    END IF;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', gm.id,
            'group_id', gm.group_id,
            'user_id', gm.user_id,
            'role', gm.role,
            'is_active', gm.is_active,
            'invited_by', gm.invited_by,
            'joined_at', gm.joined_at,
            'created_at', gm.created_at,
            'email', u.email
        )
        ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, gm.joined_at
    ), '[]'::json)
    INTO v_members
    FROM group_memberships gm
    LEFT JOIN auth.users u ON u.id = gm.user_id
    WHERE gm.group_id = p_group_id AND gm.is_active = true;

    RETURN json_build_object(
        'success', true,
        'members', v_members
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Promote a regular member to admin.
CREATE OR REPLACE FUNCTION promote_group_member(p_group_id uuid, p_target_user_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_target record;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can promote members'
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

    IF v_target.role <> 'member' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is already an owner or admin'
        );
    END IF;

    UPDATE group_memberships
    SET role = 'admin'
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

-- Remove a member from the group.
-- Owners can remove admins and members; admins can only remove members.
-- Nobody can remove the owner or themselves (use leave_group for that).
CREATE OR REPLACE FUNCTION remove_group_member(p_group_id uuid, p_target_user_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_target record;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can remove members'
        );
    END IF;

    IF p_target_user_id = auth.uid() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You cannot remove yourself. Leave the group instead.'
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
            'error', 'The group owner cannot be removed'
        );
    END IF;

    IF v_target.role = 'admin' AND v_caller_role <> 'owner' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only the group owner can remove an admin'
        );
    END IF;

    DELETE FROM group_memberships
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

-- get_caller_group_role is an internal helper; only the RPCs need it,
-- but granting execute is harmless since it only reveals the caller's own role.
GRANT EXECUTE ON FUNCTION get_caller_group_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(uuid, uuid) TO authenticated;
