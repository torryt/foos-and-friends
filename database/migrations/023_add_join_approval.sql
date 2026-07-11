-- Migration: Join approval flow
-- Adds a per-group join policy: 'open' (invite link joins immediately, the
-- previous behavior) or 'approval' (joining creates a pending request that a
-- group owner/admin must approve).
--
-- Follows the migration 019 conventions: callers are always resolved from
-- auth.uid(), never accepted as a parameter (except the pre-existing
-- join_group_by_invite_code signature, which is kept for compatibility).

-- ===== 1. JOIN POLICY COLUMN =====

ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS join_policy text NOT NULL DEFAULT 'open'
  CONSTRAINT friend_groups_join_policy_check CHECK (join_policy IN ('open', 'approval'));

COMMENT ON COLUMN friend_groups.join_policy IS
  'open = invite link joins immediately; approval = owner/admin must approve join requests';

-- ===== 2. JOIN REQUESTS TABLE =====

CREATE TABLE group_join_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL CONSTRAINT valid_request_status
    CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- At most one pending request per user per group (resolved requests are kept as history)
CREATE UNIQUE INDEX uq_group_join_requests_pending
  ON group_join_requests (group_id, user_id) WHERE status = 'pending';

CREATE INDEX idx_group_join_requests_group_pending
  ON group_join_requests (group_id) WHERE status = 'pending';

ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can see their own requests (e.g. the invite page shows "pending").
-- All writes and admin reads go through SECURITY DEFINER RPCs, keeping the
-- policies trivial and free of friend_groups/group_memberships recursion.
CREATE POLICY "users_see_own_join_requests" ON group_join_requests
  FOR SELECT USING (user_id = auth.uid());

-- ===== 3. JOIN VIA INVITE CODE BRANCHES ON POLICY =====

CREATE OR REPLACE FUNCTION join_group_by_invite_code(
  p_invite_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  group_record record;
  member_count integer;
BEGIN
  SELECT id, name, max_members, is_active, join_policy INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = group_record.id AND user_id = p_user_id AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  IF group_record.join_policy = 'approval' THEN
    -- Idempotent: a second attempt while pending just reports pending again
    INSERT INTO group_join_requests (group_id, user_id)
    VALUES (group_record.id, p_user_id)
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
  VALUES (group_record.id, p_user_id, 'member', true)
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

-- ===== 4. ADMIN RPCS FOR PENDING REQUESTS =====

CREATE OR REPLACE FUNCTION get_pending_join_requests(p_group_id uuid)
RETURNS json AS $$
DECLARE
    v_caller_role text;
    v_requests json;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can list join requests'
        );
    END IF;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', r.id,
            'group_id', r.group_id,
            'user_id', r.user_id,
            'status', r.status,
            'requested_at', r.requested_at,
            'email', u.email
        )
        ORDER BY r.requested_at
    ), '[]'::json)
    INTO v_requests
    FROM group_join_requests r
    LEFT JOIN auth.users u ON u.id = r.user_id
    WHERE r.group_id = p_group_id AND r.status = 'pending';

    RETURN json_build_object('success', true, 'requests', v_requests);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION approve_join_request(p_request_id uuid)
RETURNS json AS $$
DECLARE
    v_request record;
    v_caller_role text;
    v_group record;
    v_member_count integer;
BEGIN
    SELECT * INTO v_request FROM group_join_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.status <> 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Join request not found or already resolved');
    END IF;

    v_caller_role := get_caller_group_role(v_request.group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can approve join requests'
        );
    END IF;

    -- Lock the group row so concurrent approvals cannot both pass the
    -- max_members check
    SELECT id, max_members INTO v_group FROM friend_groups
    WHERE id = v_request.group_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Group no longer exists');
    END IF;

    SELECT COUNT(*) INTO v_member_count
    FROM group_memberships
    WHERE group_id = v_group.id AND is_active = true;

    IF v_member_count >= v_group.max_members THEN
        RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
    END IF;

    -- Reactivate an inactive membership if the user was previously a member
    INSERT INTO group_memberships (group_id, user_id, role, is_active, invited_by)
    VALUES (v_request.group_id, v_request.user_id, 'member', true, auth.uid())
    ON CONFLICT (group_id, user_id)
    DO UPDATE SET is_active = true, role = 'member', joined_at = timezone('utc'::text, now());

    UPDATE group_join_requests
    SET status = 'approved',
        resolved_at = timezone('utc'::text, now()),
        resolved_by = auth.uid()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'group_id', v_request.group_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION deny_join_request(p_request_id uuid)
RETURNS json AS $$
DECLARE
    v_request record;
    v_caller_role text;
BEGIN
    SELECT * INTO v_request FROM group_join_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.status <> 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Join request not found or already resolved');
    END IF;

    v_caller_role := get_caller_group_role(v_request.group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can deny join requests'
        );
    END IF;

    UPDATE group_join_requests
    SET status = 'denied',
        resolved_at = timezone('utc'::text, now()),
        resolved_by = auth.uid()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'group_id', v_request.group_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Pending-request counts across every group the caller owns or administers,
-- for the in-app notification bell.
CREATE OR REPLACE FUNCTION get_pending_join_request_counts()
RETURNS json AS $$
DECLARE
    v_counts json;
BEGIN
    SELECT COALESCE(json_agg(
        json_build_object(
            'group_id', g.id,
            'group_name', g.name,
            'count', pending.cnt
        )
        ORDER BY g.name
    ), '[]'::json)
    INTO v_counts
    FROM friend_groups g
    JOIN group_memberships gm
      ON gm.group_id = g.id
     AND gm.user_id = auth.uid()
     AND gm.is_active = true
     AND gm.role IN ('owner', 'admin')
    JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM group_join_requests r
        WHERE r.group_id = g.id AND r.status = 'pending'
    ) pending ON pending.cnt > 0
    WHERE g.is_active = true;

    RETURN json_build_object('success', true, 'counts', v_counts);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Change the group's join policy. Not part of updateGroup because that path's
-- RLS (owners_manage_groups) is owner-only, while sharing settings are meant
-- to be manageable by admins too.
CREATE OR REPLACE FUNCTION set_group_join_policy(p_group_id uuid, p_join_policy text)
RETURNS json AS $$
DECLARE
    v_caller_role text;
BEGIN
    IF p_join_policy NOT IN ('open', 'approval') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid join policy');
    END IF;

    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can change the join policy'
        );
    END IF;

    UPDATE friend_groups
    SET join_policy = p_join_policy,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_group_id;

    RETURN json_build_object('success', true);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 5. INVITE PREVIEW INCLUDES JOIN POLICY =====

CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code text)
RETURNS json AS $$
DECLARE
  group_record friend_groups%ROWTYPE;
BEGIN
  SELECT * INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

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
      'updated_at', group_record.updated_at,
      'sport_type', group_record.sport_type,
      'supported_match_types', group_record.supported_match_types,
      'target_score', group_record.target_score,
      'join_policy', group_record.join_policy
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ===== 6. GRANTS =====

GRANT EXECUTE ON FUNCTION get_pending_join_requests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION deny_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_join_request_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION set_group_join_policy(uuid, text) TO authenticated;
