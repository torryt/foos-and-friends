-- Migration: Derive acting user from auth.uid() in legacy RPCs + finish anon grant cleanup
--
-- A Supabase Advisor audit (2026-07-13) found that three SECURITY DEFINER RPCs
-- trusted a caller-supplied p_user_id instead of the JWT identity:
--   * delete_group_with_cascade — anyone who knew a group id and its owner's
--     user id could delete the group and all its data, even unauthenticated
--   * leave_group — anyone could remove another user from any group
--   * join_group_by_invite_code — a caller could override the auth.uid()
--     default and enroll a different user
-- All three now resolve the acting user via auth.uid(), and the p_user_id
-- parameter is dropped from the signatures entirely.
--
-- DEPLOY ORDER: deployed clients send p_user_id, which the new signatures
-- reject — deploy the updated client immediately after applying this.
--
-- Also included:
--   * the anon EXECUTE cleanup on pre-023 RPCs deferred by migration 025
--   * search_path pinning for the three functions migration 013 missed
--     (update_group_visibility was skipped there under a wrong signature)

-- ===== 1. delete_group_with_cascade: authorize via auth.uid() =====

DROP FUNCTION IF EXISTS delete_group_with_cascade(uuid, uuid);

CREATE FUNCTION delete_group_with_cascade(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  group_record friend_groups%ROWTYPE;
  player_count integer;
  match_count integer;
  member_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify the group exists and the caller is the owner
  SELECT * INTO group_record
  FROM friend_groups
  WHERE id = p_group_id AND owner_id = v_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Group not found or you do not have permission to delete it'
    );
  END IF;

  -- Get counts for confirmation (optional - for UI display)
  SELECT COUNT(*) INTO player_count FROM players WHERE group_id = p_group_id;
  SELECT COUNT(*) INTO match_count FROM matches WHERE group_id = p_group_id;
  SELECT COUNT(*) INTO member_count
  FROM group_memberships
  WHERE group_id = p_group_id AND is_active = true;

  -- Perform cascading deletion
  DELETE FROM matches WHERE group_id = p_group_id;
  DELETE FROM players WHERE group_id = p_group_id;
  DELETE FROM group_memberships WHERE group_id = p_group_id;
  DELETE FROM friend_groups WHERE id = p_group_id;

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
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete group: ' || SQLERRM
    );
END;
$$;

-- ===== 2. leave_group: authorize via auth.uid() =====

DROP FUNCTION IF EXISTS leave_group(uuid, uuid);

CREATE FUNCTION leave_group(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_group_record RECORD;
    v_membership_record RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT * INTO v_group_record FROM friend_groups
    WHERE id = p_group_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Group not found');
    END IF;

    IF v_group_record.owner_id = v_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Group owner cannot leave the group. Delete the group instead.'
        );
    END IF;

    SELECT * INTO v_membership_record FROM group_memberships
    WHERE group_id = p_group_id AND user_id = v_user_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'You are not a member of this group');
    END IF;

    DELETE FROM group_memberships
    WHERE group_id = p_group_id AND user_id = v_user_id;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ===== 3. join_group_by_invite_code: acting user always auth.uid() =====

DROP FUNCTION IF EXISTS join_group_by_invite_code(text, uuid);

CREATE FUNCTION join_group_by_invite_code(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  group_record record;
  member_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, name, max_members, is_active, join_policy INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = group_record.id AND user_id = v_user_id AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  IF group_record.join_policy = 'approval' THEN
    -- Idempotent: a second attempt while pending just reports pending again
    INSERT INTO group_join_requests (group_id, user_id)
    VALUES (group_record.id, v_user_id)
    ON CONFLICT (group_id, user_id) WHERE status = 'pending' DO NOTHING;

    RETURN json_build_object(
      'success', true,
      'status', 'pending',
      'group_id', group_record.id,
      'group_name', group_record.name
    );
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM group_memberships
  WHERE group_id = group_record.id AND is_active = true;

  IF member_count >= group_record.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
  END IF;

  -- Reactivate an inactive membership if the user was previously a member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (group_record.id, v_user_id, 'member', true)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET is_active = true, role = 'member', joined_at = timezone('utc'::text, now());

  RETURN json_build_object(
    'success', true,
    'status', 'joined',
    'group_id', group_record.id,
    'group_name', group_record.name
  );
END;
$$;

-- ===== 4. Pin search_path on the functions migration 013 missed =====

ALTER FUNCTION public.check_match_season_group() SET search_path = 'public';
ALTER FUNCTION public.update_group_visibility() SET search_path = 'public';
ALTER FUNCTION public.compute_player_season_ranking(uuid, uuid, text) SET search_path = 'public';

-- ===== 5. Grants =====
-- The three recreated functions pick up Supabase's default anon/public grant,
-- so set their privileges explicitly.

REVOKE EXECUTE ON FUNCTION delete_group_with_cascade(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION delete_group_with_cascade(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION leave_group(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION leave_group(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION join_group_by_invite_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION join_group_by_invite_code(text) TO authenticated, service_role;

-- Revoke anon EXECUTE on the remaining pre-023 RPCs (cleanup deferred by 025).
-- All of these require an authenticated caller; only get_group_preview and the
-- get_public_* family are intentionally anon-callable (public group pages).

REVOKE EXECUTE ON FUNCTION create_friend_group(text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION create_group_with_membership(text, text, text, text[]) FROM public, anon;
REVOKE EXECUTE ON FUNCTION generate_unique_invite_code() FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_caller_group_role(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_group_members(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION user_is_group_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION end_season_and_create_new(uuid, text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION award_season_trophies(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION promote_group_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION demote_group_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION remove_group_member(uuid, uuid) FROM public, anon;

-- Trigger functions: never called directly by clients (triggers run as the
-- table owner), so no client role needs EXECUTE
REVOKE EXECUTE ON FUNCTION check_match_season_group() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_group_visibility() FROM public, anon, authenticated;
