-- Migration 001: Initial schema (squashed baseline)
-- Date: 2026-07-13
--
-- Generated from a pg_dump --schema-only of the production database and
-- verified byte-identical against it (public schema). Replaces the former
-- migration chain 002-030, which lives on in git history.
--
-- Already applied to production (this file describes its current state —
-- do NOT run it there). Run it against a fresh database to bootstrap the
-- full schema: tables, views, functions, triggers, indexes, RLS policies,
-- and grants.
--
-- NOTE: compute_group_global_rankings / compute_player_global_ranking
-- (all-time ELO replay) must stay in sync with replayContinuousElo in
-- packages/shared/src/utils/elo.ts.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: approve_join_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_join_request(p_request_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: award_season_trophies(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_season_trophies(p_season_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_group_id uuid;
  v_awarded integer;
BEGIN
  SELECT group_id INTO v_group_id FROM seasons WHERE id = p_season_id;

  IF v_group_id IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (SELECT 1 FROM season_trophies WHERE season_id = p_season_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO season_trophies (group_id, season_id, player_id, rank)
  SELECT
    v_group_id,
    p_season_id,
    s.player_id,
    row_number() OVER (
      ORDER BY s.ranking DESC, s.wins DESC, s.matches_played DESC, s.player_id
    )::integer AS rank
  FROM player_season_stats_computed s
  WHERE s.season_id = p_season_id
  ORDER BY s.ranking DESC, s.wins DESC, s.matches_played DESC, s.player_id
  LIMIT 3;

  GET DIAGNOSTICS v_awarded = ROW_COUNT;
  RETURN v_awarded;
END;
$$;


--
-- Name: FUNCTION award_season_trophies(p_season_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.award_season_trophies(p_season_id uuid) IS 'Snapshots the top 3 of the season leaderboard into season_trophies (idempotent)';


--
-- Name: check_match_season_group(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_match_season_group() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM seasons
    WHERE id = NEW.season_id AND group_id = NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Match group_id does not match the season group_id';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: compute_group_global_rankings(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_group_global_rankings(p_group_id uuid) RETURNS TABLE(player_id uuid, ranking integer)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  m record;
  ratings jsonb := '{}'::jsonb;
  k constant float8 := 32;  -- symmetric standard K; season ELO's 35/29 split is not used all-time
  r11 float8; r12 float8; r21 float8; r22 float8;
  t1_opp float8; t2_opp float8;
  s1 float8; s2 float8;
BEGIN
  FOR m IN
    SELECT match_type, team1_score, team2_score,
           team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id
    FROM matches
    WHERE group_id = p_group_id
    ORDER BY created_at, id
  LOOP
    r11 := COALESCE((ratings ->> m.team1_player1_id::text)::float8, 1200);
    r21 := COALESCE((ratings ->> m.team2_player1_id::text)::float8, 1200);

    -- actual score per team (draw = 0.5)
    IF m.team1_score > m.team2_score THEN
      s1 := 1; s2 := 0;
    ELSIF m.team1_score < m.team2_score THEN
      s1 := 0; s2 := 1;
    ELSE
      s1 := 0.5; s2 := 0.5;
    END IF;

    IF m.match_type = '1v1' THEN
      t1_opp := r21;
      t2_opp := r11;
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, floor(r11 + k * (s1 - 1 / (1 + power(10, (t1_opp - r11) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player1_id::text, floor(r21 + k * (s2 - 1 / (1 + power(10, (t2_opp - r21) / 400))) + 0.5));
    ELSE
      r12 := COALESCE((ratings ->> m.team1_player2_id::text)::float8, 1200);
      r22 := COALESCE((ratings ->> m.team2_player2_id::text)::float8, 1200);
      t1_opp := (r21 + r22) / 2;  -- team 1 players are rated against team 2's average
      t2_opp := (r11 + r12) / 2;
      ratings := ratings
        || jsonb_build_object(m.team1_player1_id::text, floor(r11 + k * (s1 - 1 / (1 + power(10, (t1_opp - r11) / 400))) + 0.5))
        || jsonb_build_object(m.team1_player2_id::text, floor(r12 + k * (s1 - 1 / (1 + power(10, (t1_opp - r12) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player1_id::text, floor(r21 + k * (s2 - 1 / (1 + power(10, (t2_opp - r21) / 400))) + 0.5))
        || jsonb_build_object(m.team2_player2_id::text, floor(r22 + k * (s2 - 1 / (1 + power(10, (t2_opp - r22) / 400))) + 0.5));
    END IF;
  END LOOP;

  -- Every roster player gets a row; players with no matches sit at the start rating.
  RETURN QUERY
    SELECT p.id, COALESCE((ratings ->> p.id::text)::integer, 1200)
    FROM players p
    WHERE p.group_id = p_group_id;
END;
$$;


--
-- Name: FUNCTION compute_group_global_rankings(p_group_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compute_group_global_rankings(p_group_id uuid) IS 'All-time rankings for every player in a group from ONE continuous ELO replay of the group''s match history (season resets ignored). O(group matches) per call. Math must stay in sync with replayContinuousElo in packages/shared/src/utils/elo.ts.';


--
-- Name: compute_player_global_ranking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_player_global_ranking(p_player_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_group_id uuid;
  v_ranking integer;
BEGIN
  SELECT group_id INTO v_group_id FROM players WHERE id = p_player_id;
  IF v_group_id IS NULL THEN
    RETURN 1200;
  END IF;

  SELECT r.ranking INTO v_ranking
  FROM compute_group_global_rankings(v_group_id) r
  WHERE r.player_id = p_player_id;

  RETURN COALESCE(v_ranking, 1200);
END;
$$;


--
-- Name: FUNCTION compute_player_global_ranking(p_player_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) IS 'Single player''s all-time ranking; delegates to compute_group_global_rankings (the one SQL implementation of the continuous replay). Still O(group matches) per call — for whole-roster reads use get_group_player_stats instead.';


--
-- Name: compute_player_season_ranking(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text DEFAULT NULL::text) RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
          WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
          WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
          WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
        END
      FROM matches m
      WHERE m.season_id = p_season_id
        AND (p_match_type IS NULL OR m.match_type = p_match_type)
        AND (m.team1_player1_id = p_player_id
          OR m.team1_player2_id = p_player_id
          OR m.team2_player1_id = p_player_id
          OR m.team2_player2_id = p_player_id)
      ORDER BY m.created_at DESC
      LIMIT 1
    ),
    1200
  );
$$;


--
-- Name: create_friend_group(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_friend_group(p_name text, p_description text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION create_friend_group(p_name text, p_description text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_friend_group(p_name text, p_description text) IS 'Creates a new friend group with an initial Season 1';


--
-- Name: create_group_with_membership(text, text, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_group_with_membership(group_name text, group_description text DEFAULT NULL::text, group_sport_type text DEFAULT 'foosball'::text, group_supported_match_types text[] DEFAULT ARRAY['2v2'::text]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  new_group_id uuid;
  new_invite_code text;
  current_user_id uuid;
  new_season_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate sport_type
  IF group_sport_type NOT IN ('foosball', 'padel', 'chess') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sport type. Must be foosball, padel, or chess');
  END IF;

  -- Validate match types
  IF NOT (group_supported_match_types <@ ARRAY['1v1', '2v2']
          AND array_length(group_supported_match_types, 1) > 0) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid match types');
  END IF;

  new_invite_code := generate_unique_invite_code();

  -- Create the group with sport_type and supported_match_types
  INSERT INTO friend_groups (
    name, description, invite_code, owner_id, created_by,
    sport_type, supported_match_types
  )
  VALUES (
    group_name, group_description, new_invite_code, current_user_id,
    current_user_id, group_sport_type, group_supported_match_types
  )
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


--
-- Name: delete_group_with_cascade(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_group_with_cascade(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: demote_group_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.demote_group_member(p_group_id uuid, p_target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: deny_join_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deny_join_request(p_request_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: end_season_and_create_new(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_season_id uuid;
  v_new_season_id uuid;
  v_next_season_number integer;
  v_user_id uuid;
  v_trophies_awarded integer;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is group owner
  IF NOT EXISTS (
    SELECT 1 FROM friend_groups
    WHERE id = p_group_id AND owner_id = v_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only group owners can manage seasons');
  END IF;

  -- Get current active season
  SELECT id INTO v_current_season_id
  FROM seasons
  WHERE group_id = p_group_id AND is_active = true;

  IF v_current_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active season found');
  END IF;

  -- Get next season number
  SELECT COALESCE(MAX(season_number), 0) + 1 INTO v_next_season_number
  FROM seasons
  WHERE group_id = p_group_id;

  -- Award podium trophies from the final standings
  v_trophies_awarded := award_season_trophies(v_current_season_id);

  -- End current season
  UPDATE seasons
  SET is_active = false,
      end_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_current_season_id;

  -- Create new season
  INSERT INTO seasons (group_id, name, description, season_number, start_date, is_active, created_by)
  VALUES (p_group_id, p_new_season_name, p_new_season_description, v_next_season_number, CURRENT_DATE, true, v_user_id)
  RETURNING id INTO v_new_season_id;

  RETURN json_build_object(
    'success', true,
    'old_season_id', v_current_season_id,
    'new_season_id', v_new_season_id,
    'season_number', v_next_season_number,
    'trophies_awarded', v_trophies_awarded
  );
END;
$$;


--
-- Name: FUNCTION end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text) IS 'Closes current season (awarding podium trophies) and creates a new one (group owners only)';


--
-- Name: generate_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invite_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: generate_unique_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_unique_invite_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    -- Generate 8-character code
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM friend_groups WHERE invite_code = result) THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: get_caller_group_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_caller_group_role(p_group_id uuid) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT role FROM group_memberships
    WHERE group_id = p_group_id AND user_id = auth.uid() AND is_active = true;
$$;


--
-- Name: get_group_by_invite_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_by_invite_code(p_invite_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_group_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_members(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_group_player_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_player_stats(p_group_id uuid) RETURNS TABLE(id uuid, name text, ranking integer, matches_played integer, wins integer, losses integer, avatar text, department text, group_id uuid, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    p.id,
    p.name,
    COALESCE(r.ranking, 1200) AS ranking,
    COALESCE(s.matches_played, 0) AS matches_played,
    COALESCE(s.wins, 0) AS wins,
    COALESCE(s.losses, 0) AS losses,
    p.avatar,
    p.department,
    p.group_id,
    p.created_by,
    p.created_at,
    p.updated_at
  FROM players p
  LEFT JOIN compute_group_global_rankings(p_group_id) r ON r.player_id = p.id
  LEFT JOIN (
    SELECT x.player_id,
           COUNT(*)::integer AS matches_played,
           SUM(CASE WHEN x.won THEN 1 ELSE 0 END)::integer AS wins,
           SUM(CASE WHEN x.lost THEN 1 ELSE 0 END)::integer AS losses
    FROM matches m
    CROSS JOIN LATERAL (
      VALUES
        (m.team1_player1_id, m.team1_score > m.team2_score, m.team1_score < m.team2_score),
        (m.team1_player2_id, m.team1_score > m.team2_score, m.team1_score < m.team2_score),
        (m.team2_player1_id, m.team2_score > m.team1_score, m.team2_score < m.team1_score),
        (m.team2_player2_id, m.team2_score > m.team1_score, m.team2_score < m.team1_score)
    ) AS x(player_id, won, lost)
    WHERE m.group_id = p_group_id
      AND x.player_id IS NOT NULL
    GROUP BY x.player_id
  ) s ON s.player_id = p.id
  WHERE p.group_id = p_group_id;
$$;


--
-- Name: FUNCTION get_group_player_stats(p_group_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_group_player_stats(p_group_id uuid) IS 'Roster read replacing SELECTs on player_stats_computed: same columns, one ELO replay for the whole group instead of one per player.';


--
-- Name: get_group_preview(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_preview(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_group record;
BEGIN
    SELECT id, name, description, sport_type, join_policy, is_public
    INTO v_group
    FROM friend_groups
    WHERE id = p_group_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    RETURN json_build_object(
        'success', true,
        'group', json_build_object(
            'id', v_group.id,
            'name', v_group.name,
            'description', v_group.description,
            'sport_type', v_group.sport_type,
            'join_policy', v_group.join_policy,
            'is_public', v_group.is_public
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: get_pending_join_request_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_join_request_counts() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_pending_join_requests(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_join_requests(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_public_group_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_group_data(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_group_id uuid;
    v_group json;
    v_seasons json;
    v_players json;
    v_trophies json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'sport_type', g.sport_type,
        'supported_match_types', g.supported_match_types,
        'target_score', g.target_score,
        'join_policy', g.join_policy
    )
    INTO v_group
    FROM friend_groups g
    WHERE g.id = v_group_id;

    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.season_number DESC), '[]'::json)
    INTO v_seasons
    FROM seasons s
    WHERE s.group_id = v_group_id;

    SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.ranking DESC), '[]'::json)
    INTO v_players
    FROM get_group_player_stats(v_group_id) p;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', t.id,
            'group_id', t.group_id,
            'season_id', t.season_id,
            'player_id', t.player_id,
            'rank', t.rank,
            'created_at', t.created_at,
            'seasons', json_build_object('name', s.name, 'season_number', s.season_number)
        )
        ORDER BY t.created_at DESC, t.rank
    ), '[]'::json)
    INTO v_trophies
    FROM season_trophies t
    JOIN seasons s ON s.id = t.season_id
    WHERE t.group_id = v_group_id;

    RETURN json_build_object(
        'success', true,
        'group', v_group,
        'seasons', v_seasons,
        'players', v_players,
        'trophies', v_trophies
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: get_public_matches(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_group_id uuid;
    v_matches json;
    v_players json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.created_at DESC), '[]'::json)
    INTO v_matches
    FROM matches m
    WHERE m.group_id = v_group_id
      AND (p_season_id IS NULL OR m.season_id = p_season_id);

    -- Players are included so the response is self-contained: the client
    -- resolves match participants without a second request.
    SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
    INTO v_players
    FROM get_group_player_stats(v_group_id) p;

    RETURN json_build_object('success', true, 'matches', v_matches, 'players', v_players);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: get_public_season_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_group_id uuid;
    v_overall json;
    v_1v1 json;
    v_2v2 json;
BEGIN
    v_group_id := resolve_public_group(p_group_id);

    IF v_group_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    -- The season must belong to the public group; otherwise a valid public
    -- group id would leak other groups' stats.
    IF NOT EXISTS (SELECT 1 FROM seasons WHERE id = p_season_id AND group_id = v_group_id) THEN
        RETURN json_build_object('success', false, 'error', 'not_found');
    END IF;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_overall
    FROM player_season_stats_computed v
    WHERE v.season_id = p_season_id;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_1v1
    FROM player_season_stats_1v1_computed v
    WHERE v.season_id = p_season_id;

    SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.ranking DESC), '[]'::json)
    INTO v_2v2
    FROM player_season_stats_2v2_computed v
    WHERE v.season_id = p_season_id;

    RETURN json_build_object(
        'success', true,
        'overall', v_overall,
        'one_v_one', v_1v1,
        'two_v_two', v_2v2
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: join_group_by_invite_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_group_by_invite_code(p_invite_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: leave_group(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_group(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: promote_group_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promote_group_member(p_group_id uuid, p_target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: remove_group_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_group_member(p_group_id uuid, p_target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: request_to_join_group(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_to_join_group(p_group_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_group record;
  v_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, name, max_members, join_policy INTO v_group
  FROM friend_groups
  WHERE id = p_group_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Group not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = v_group.id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  IF v_group.join_policy = 'approval' THEN
    -- Idempotent: a second attempt while pending just reports pending again
    INSERT INTO group_join_requests (group_id, user_id)
    VALUES (v_group.id, auth.uid())
    ON CONFLICT (group_id, user_id) WHERE status = 'pending' DO NOTHING;

    RETURN json_build_object(
      'success', true,
      'status', 'pending',
      'group_id', v_group.id,
      'group_name', v_group.name
    );
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM group_memberships
  WHERE group_id = v_group.id AND is_active = true;

  IF v_member_count >= v_group.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
  END IF;

  -- Reactivate an inactive membership if the user was previously a member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (v_group.id, auth.uid(), 'member', true)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET is_active = true, role = 'member', joined_at = timezone('utc'::text, now());

  RETURN json_build_object(
    'success', true,
    'status', 'joined',
    'group_id', v_group.id,
    'group_name', v_group.name
  );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: resolve_public_group(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_public_group(p_group_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT id FROM friend_groups
    WHERE id = p_group_id
      AND is_public = true
      AND is_active = true;
$$;


--
-- Name: set_group_join_policy(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_group_join_policy(p_group_id uuid, p_join_policy text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: set_group_sharing(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_group_sharing(p_group_id uuid, p_is_public boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_caller_role text;
BEGIN
    v_caller_role := get_caller_group_role(p_group_id);

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only group owners and admins can change sharing settings'
        );
    END IF;

    UPDATE friend_groups
    SET is_public = p_is_public,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'is_public', p_is_public);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: update_group_visibility(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_visibility() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When membership is inserted/updated/deleted, update the friend_groups visibility
  IF TG_OP = 'DELETE' THEN
    UPDATE friend_groups 
    SET visible_to_users = (
      SELECT ARRAY_AGG(DISTINCT user_id) 
      FROM group_memberships 
      WHERE group_id = OLD.group_id AND is_active = true
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  ELSE
    UPDATE friend_groups 
    SET visible_to_users = (
      SELECT ARRAY_AGG(DISTINCT user_id) 
      FROM group_memberships 
      WHERE group_id = NEW.group_id AND is_active = true
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: user_is_group_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_uuid 
    AND user_id = user_uuid 
    AND is_active = true
  );
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: friend_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    description text,
    invite_code text DEFAULT public.generate_invite_code() NOT NULL,
    owner_id uuid NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    max_members integer DEFAULT 50 NOT NULL,
    visible_to_users uuid[] DEFAULT '{}'::uuid[],
    sport_type text DEFAULT 'foosball'::text NOT NULL,
    supported_match_types text[] DEFAULT ARRAY['2v2'::text] NOT NULL,
    target_score integer DEFAULT 8 NOT NULL,
    join_policy text DEFAULT 'approval'::text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    CONSTRAINT friend_groups_join_policy_check CHECK ((join_policy = ANY (ARRAY['open'::text, 'approval'::text]))),
    CONSTRAINT friend_groups_match_types_check CHECK (((supported_match_types <@ ARRAY['1v1'::text, '2v2'::text]) AND (array_length(supported_match_types, 1) > 0))),
    CONSTRAINT friend_groups_sport_type_check CHECK ((sport_type = ANY (ARRAY['foosball'::text, 'padel'::text, 'chess'::text]))),
    CONSTRAINT friend_groups_target_score_check CHECK (((target_score >= 1) AND (target_score <= 100))),
    CONSTRAINT name_length CHECK (((char_length(name) >= 3) AND (char_length(name) <= 50)))
);


--
-- Name: COLUMN friend_groups.supported_match_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.friend_groups.supported_match_types IS 'Array of supported match types for this sport (1v1, 2v2, or both)';


--
-- Name: COLUMN friend_groups.join_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.friend_groups.join_policy IS 'open = invite link joins immediately; approval = owner/admin must approve join requests';


--
-- Name: COLUMN friend_groups.is_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.friend_groups.is_public IS 'When true, the group is readable without authentication via public_token';


--
-- Name: group_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT valid_request_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])))
);


--
-- Name: group_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_role CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id uuid NOT NULL,
    team1_player1_id uuid NOT NULL,
    team1_player2_id uuid,
    team2_player1_id uuid NOT NULL,
    team2_player2_id uuid,
    team1_score integer NOT NULL,
    team2_score integer NOT NULL,
    match_date date DEFAULT CURRENT_DATE NOT NULL,
    match_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    recorded_by uuid NOT NULL,
    team1_player1_pre_ranking integer NOT NULL,
    team1_player1_post_ranking integer NOT NULL,
    team1_player2_pre_ranking integer,
    team1_player2_post_ranking integer,
    team2_player1_pre_ranking integer NOT NULL,
    team2_player1_post_ranking integer NOT NULL,
    team2_player2_pre_ranking integer,
    team2_player2_post_ranking integer,
    season_id uuid NOT NULL,
    match_type text DEFAULT '2v2'::text NOT NULL,
    CONSTRAINT chk_reasonable_ranking_changes CHECK (((abs((team1_player1_post_ranking - team1_player1_pre_ranking)) <= 200) AND (abs((team1_player2_post_ranking - team1_player2_pre_ranking)) <= 200) AND (abs((team2_player1_post_ranking - team2_player1_pre_ranking)) <= 200) AND (abs((team2_player2_post_ranking - team2_player2_pre_ranking)) <= 200))),
    CONSTRAINT chk_valid_rankings CHECK (((team1_player1_pre_ranking >= 800) AND (team1_player1_pre_ranking <= 2400) AND (team1_player1_post_ranking >= 800) AND (team1_player1_post_ranking <= 2400) AND (team1_player2_pre_ranking >= 800) AND (team1_player2_pre_ranking <= 2400) AND (team1_player2_post_ranking >= 800) AND (team1_player2_post_ranking <= 2400) AND (team2_player1_pre_ranking >= 800) AND (team2_player1_pre_ranking <= 2400) AND (team2_player1_post_ranking >= 800) AND (team2_player1_post_ranking <= 2400) AND (team2_player2_pre_ranking >= 800) AND (team2_player2_pre_ranking <= 2400) AND (team2_player2_post_ranking >= 800) AND (team2_player2_post_ranking <= 2400))),
    CONSTRAINT different_players_by_match_type CHECK (
CASE
    WHEN (match_type = '1v1'::text) THEN ((team1_player1_id <> team2_player1_id) AND (team1_player2_id IS NULL) AND (team2_player2_id IS NULL))
    WHEN (match_type = '2v2'::text) THEN ((team1_player1_id <> team1_player2_id) AND (team1_player1_id <> team2_player1_id) AND (team1_player1_id <> team2_player2_id) AND (team1_player2_id <> team2_player1_id) AND (team1_player2_id <> team2_player2_id) AND (team2_player1_id <> team2_player2_id) AND (team1_player2_id IS NOT NULL) AND (team2_player2_id IS NOT NULL))
    ELSE false
END),
    CONSTRAINT matches_match_type_check CHECK ((match_type = ANY (ARRAY['1v1'::text, '2v2'::text]))),
    CONSTRAINT valid_scores CHECK (((team1_score >= 0) AND (team2_score >= 0)))
);


--
-- Name: TABLE matches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.matches IS 'Updated to include historical ranking data. See migration 002 and 003.';


--
-- Name: COLUMN matches.team1_player1_pre_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team1_player1_pre_ranking IS 'Player ranking before the match';


--
-- Name: COLUMN matches.team1_player1_post_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team1_player1_post_ranking IS 'Player ranking after the match';


--
-- Name: COLUMN matches.team1_player2_pre_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team1_player2_pre_ranking IS 'Player ranking before the match';


--
-- Name: COLUMN matches.team1_player2_post_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team1_player2_post_ranking IS 'Player ranking after the match';


--
-- Name: COLUMN matches.team2_player1_pre_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team2_player1_pre_ranking IS 'Player ranking before the match';


--
-- Name: COLUMN matches.team2_player1_post_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team2_player1_post_ranking IS 'Player ranking after the match';


--
-- Name: COLUMN matches.team2_player2_pre_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team2_player2_pre_ranking IS 'Player ranking before the match';


--
-- Name: COLUMN matches.team2_player2_post_ranking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.team2_player2_post_ranking IS 'Player ranking after the match';


--
-- Name: COLUMN matches.season_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.season_id IS 'Season in which this match was played';


--
-- Name: COLUMN matches.match_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matches.match_type IS '1v1 or 2v2 match type - determines which player columns are used';


--
-- Name: player_season_stats_1v1_computed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_season_stats_1v1_computed WITH (security_invoker='true') AS
 WITH player_seasons_1v1 AS (
         SELECT DISTINCT all_players.player_id,
            all_players.season_id
           FROM ( SELECT matches.team1_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '1v1'::text)
                UNION
                 SELECT matches.team2_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '1v1'::text)) all_players
        ), player_season_stats AS (
         SELECT ps.player_id,
            ps.season_id,
            '1v1'::text AS match_type,
            public.compute_player_season_ranking(ps.player_id, ps.season_id, '1v1'::text) AS ranking,
            (count(m.id))::integer AS matches_played,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) AND (m.team1_score > m.team2_score)) THEN 1
                    WHEN ((m.team2_player1_id = ps.player_id) AND (m.team2_score > m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS wins,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) AND (m.team1_score < m.team2_score)) THEN 1
                    WHEN ((m.team2_player1_id = ps.player_id) AND (m.team2_score < m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS losses,
            (sum(
                CASE
                    WHEN (m.team1_player1_id = ps.player_id) THEN m.team1_score
                    WHEN (m.team2_player1_id = ps.player_id) THEN m.team2_score
                    ELSE 0
                END))::integer AS goals_for,
            (sum(
                CASE
                    WHEN (m.team1_player1_id = ps.player_id) THEN m.team2_score
                    WHEN (m.team2_player1_id = ps.player_id) THEN m.team1_score
                    ELSE 0
                END))::integer AS goals_against,
            min(m.created_at) AS created_at,
            max(m.created_at) AS updated_at
           FROM (player_seasons_1v1 ps
             JOIN public.matches m ON (((m.season_id = ps.season_id) AND (m.match_type = '1v1'::text) AND ((m.team1_player1_id = ps.player_id) OR (m.team2_player1_id = ps.player_id)))))
          GROUP BY ps.player_id, ps.season_id
        )
 SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), (((player_id)::text || '/1v1/'::text) || (season_id)::text)) AS id,
    player_id,
    season_id,
    match_type,
    ranking,
    matches_played,
    wins,
    losses,
    goals_for,
    goals_against,
    created_at,
    updated_at
   FROM player_season_stats;


--
-- Name: VIEW player_season_stats_1v1_computed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.player_season_stats_1v1_computed IS 'Computed 1v1 statistics for players per season';


--
-- Name: player_season_stats_2v2_computed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_season_stats_2v2_computed WITH (security_invoker='true') AS
 WITH player_seasons_2v2 AS (
         SELECT DISTINCT all_players.player_id,
            all_players.season_id
           FROM ( SELECT matches.team1_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '2v2'::text)
                UNION
                 SELECT matches.team1_player2_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '2v2'::text)
                UNION
                 SELECT matches.team2_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '2v2'::text)
                UNION
                 SELECT matches.team2_player2_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.match_type = '2v2'::text)) all_players
        ), player_season_stats AS (
         SELECT ps.player_id,
            ps.season_id,
            '2v2'::text AS match_type,
            public.compute_player_season_ranking(ps.player_id, ps.season_id, '2v2'::text) AS ranking,
            (count(m.id))::integer AS matches_played,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) AND (m.team1_score > m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) AND (m.team2_score > m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS wins,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) AND (m.team1_score < m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) AND (m.team2_score < m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS losses,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) THEN m.team1_score
                    WHEN ((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) THEN m.team2_score
                    ELSE 0
                END))::integer AS goals_for,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) THEN m.team2_score
                    WHEN ((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) THEN m.team1_score
                    ELSE 0
                END))::integer AS goals_against,
            min(m.created_at) AS created_at,
            max(m.created_at) AS updated_at
           FROM (player_seasons_2v2 ps
             JOIN public.matches m ON (((m.season_id = ps.season_id) AND (m.match_type = '2v2'::text) AND ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id) OR (m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)))))
          GROUP BY ps.player_id, ps.season_id
        )
 SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), (((player_id)::text || '/2v2/'::text) || (season_id)::text)) AS id,
    player_id,
    season_id,
    match_type,
    ranking,
    matches_played,
    wins,
    losses,
    goals_for,
    goals_against,
    created_at,
    updated_at
   FROM player_season_stats;


--
-- Name: VIEW player_season_stats_2v2_computed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.player_season_stats_2v2_computed IS 'Computed 2v2 statistics for players per season';


--
-- Name: player_season_stats_computed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_season_stats_computed WITH (security_invoker='true') AS
 WITH player_seasons AS (
         SELECT DISTINCT all_players.player_id,
            all_players.season_id
           FROM ( SELECT matches.team1_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                UNION
                 SELECT matches.team1_player2_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.team1_player2_id IS NOT NULL)
                UNION
                 SELECT matches.team2_player1_id AS player_id,
                    matches.season_id
                   FROM public.matches
                UNION
                 SELECT matches.team2_player2_id AS player_id,
                    matches.season_id
                   FROM public.matches
                  WHERE (matches.team2_player2_id IS NOT NULL)) all_players
        ), player_season_stats AS (
         SELECT ps.player_id,
            ps.season_id,
            public.compute_player_season_ranking(ps.player_id, ps.season_id) AS ranking,
            (count(m.id))::integer AS matches_played,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) AND (m.team1_score > m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) AND (m.team2_score > m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS wins,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) AND (m.team1_score < m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) AND (m.team2_score < m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS losses,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) THEN m.team1_score
                    WHEN ((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) THEN m.team2_score
                    ELSE 0
                END))::integer AS goals_for,
            (sum(
                CASE
                    WHEN ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id)) THEN m.team2_score
                    WHEN ((m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)) THEN m.team1_score
                    ELSE 0
                END))::integer AS goals_against,
            min(m.created_at) AS created_at,
            max(m.created_at) AS updated_at
           FROM (player_seasons ps
             JOIN public.matches m ON (((m.season_id = ps.season_id) AND ((m.team1_player1_id = ps.player_id) OR (m.team1_player2_id = ps.player_id) OR (m.team2_player1_id = ps.player_id) OR (m.team2_player2_id = ps.player_id)))))
          GROUP BY ps.player_id, ps.season_id
        )
 SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), (((player_id)::text || '/'::text) || (season_id)::text)) AS id,
    player_id,
    season_id,
    ranking,
    matches_played,
    wins,
    losses,
    goals_for,
    goals_against,
    created_at,
    updated_at
   FROM player_season_stats;


--
-- Name: VIEW player_season_stats_computed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.player_season_stats_computed IS 'Player season statistics computed directly from matches (all match types combined)';


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    avatar text DEFAULT '👤'::text NOT NULL,
    department text DEFAULT 'Office'::text NOT NULL,
    group_id uuid NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: TABLE players; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.players IS 'Player profiles (stats computed via player_stats_computed view)';


--
-- Name: player_stats_computed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_stats_computed WITH (security_invoker='true') AS
 SELECT p.id,
    p.name,
    public.compute_player_global_ranking(p.id) AS ranking,
    COALESCE(stats.matches_played, 0) AS matches_played,
    COALESCE(stats.wins, 0) AS wins,
    COALESCE(stats.losses, 0) AS losses,
    p.avatar,
    p.department,
    p.group_id,
    p.created_by,
    p.created_at,
    p.updated_at
   FROM (public.players p
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS matches_played,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = p.id) OR (m.team1_player2_id = p.id)) AND (m.team1_score > m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = p.id) OR (m.team2_player2_id = p.id)) AND (m.team2_score > m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS wins,
            (sum(
                CASE
                    WHEN (((m.team1_player1_id = p.id) OR (m.team1_player2_id = p.id)) AND (m.team1_score < m.team2_score)) THEN 1
                    WHEN (((m.team2_player1_id = p.id) OR (m.team2_player2_id = p.id)) AND (m.team2_score < m.team1_score)) THEN 1
                    ELSE 0
                END))::integer AS losses
           FROM public.matches m
          WHERE ((m.team1_player1_id = p.id) OR (m.team1_player2_id = p.id) OR (m.team2_player1_id = p.id) OR (m.team2_player2_id = p.id))) stats ON (true));


--
-- Name: VIEW player_stats_computed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.player_stats_computed IS 'Computed player global statistics from match history (security_invoker enabled)';


--
-- Name: season_trophies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_trophies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id uuid NOT NULL,
    season_id uuid NOT NULL,
    player_id uuid NOT NULL,
    rank integer NOT NULL,
    CONSTRAINT trophy_rank_podium CHECK (((rank >= 1) AND (rank <= 3)))
);


--
-- Name: TABLE season_trophies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.season_trophies IS 'Podium snapshot (top 3 by final season ranking) taken when a season ends';


--
-- Name: COLUMN season_trophies.rank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.season_trophies.rank IS '1 = gold, 2 = silver, 3 = bronze';


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    season_number integer NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT season_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT season_number_positive CHECK ((season_number > 0)),
    CONSTRAINT valid_date_range CHECK (((end_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: TABLE seasons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seasons IS 'Competitive seasons for friend groups with independent rankings';


--
-- Name: COLUMN seasons.season_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seasons.season_number IS 'Sequential season number within a group (1, 2, 3, etc.)';


--
-- Name: COLUMN seasons.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seasons.end_date IS 'NULL for active season, set when season is closed';


--
-- Name: COLUMN seasons.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seasons.is_active IS 'Only one season can be active per group at a time';


--
-- Name: friend_groups friend_groups_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_groups
    ADD CONSTRAINT friend_groups_invite_code_key UNIQUE (invite_code);


--
-- Name: friend_groups friend_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_groups
    ADD CONSTRAINT friend_groups_pkey PRIMARY KEY (id);


--
-- Name: group_join_requests group_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_pkey PRIMARY KEY (id);


--
-- Name: group_memberships group_memberships_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_memberships group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: players players_group_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_group_id_name_key UNIQUE (group_id, name);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: season_trophies season_trophies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_pkey PRIMARY KEY (id);


--
-- Name: season_trophies season_trophies_season_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_season_id_player_id_key UNIQUE (season_id, player_id);


--
-- Name: season_trophies season_trophies_season_id_rank_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_season_id_rank_key UNIQUE (season_id, rank);


--
-- Name: seasons seasons_group_id_season_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_group_id_season_number_key UNIQUE (group_id, season_number);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: idx_friend_groups_match_types; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_groups_match_types ON public.friend_groups USING gin (supported_match_types);


--
-- Name: idx_friend_groups_sport_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_groups_sport_type ON public.friend_groups USING btree (sport_type);


--
-- Name: idx_friend_groups_visible_users; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_groups_visible_users ON public.friend_groups USING gin (visible_to_users);


--
-- Name: idx_group_join_requests_group_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_join_requests_group_pending ON public.group_join_requests USING btree (group_id) WHERE (status = 'pending'::text);


--
-- Name: idx_group_memberships_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_group ON public.group_memberships USING btree (group_id, is_active);


--
-- Name: idx_group_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_user ON public.group_memberships USING btree (user_id, is_active);


--
-- Name: idx_invitations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_code ON public.friend_groups USING btree (invite_code);


--
-- Name: idx_matches_group_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_group_created ON public.matches USING btree (group_id, created_at, id);


--
-- Name: idx_matches_group_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_group_date ON public.matches USING btree (group_id, match_date DESC);


--
-- Name: idx_matches_match_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_match_type ON public.matches USING btree (match_type, season_id, match_date DESC);


--
-- Name: idx_matches_player1_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_player1_created ON public.matches USING btree (team1_player1_id, created_at DESC);


--
-- Name: idx_matches_player2_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_player2_created ON public.matches USING btree (team1_player2_id, created_at DESC);


--
-- Name: idx_matches_player3_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_player3_created ON public.matches USING btree (team2_player1_id, created_at DESC);


--
-- Name: idx_matches_player4_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_player4_created ON public.matches USING btree (team2_player2_id, created_at DESC);


--
-- Name: idx_matches_ranking_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_ranking_data ON public.matches USING btree (team1_player1_pre_ranking, team2_player1_pre_ranking);


--
-- Name: idx_matches_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_id ON public.matches USING btree (season_id, match_date DESC);


--
-- Name: idx_matches_season_player1_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_player1_created ON public.matches USING btree (season_id, team1_player1_id, created_at DESC);


--
-- Name: idx_matches_season_player2_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_player2_created ON public.matches USING btree (season_id, team1_player2_id, created_at DESC);


--
-- Name: idx_matches_season_player3_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_player3_created ON public.matches USING btree (season_id, team2_player1_id, created_at DESC);


--
-- Name: idx_matches_season_player4_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_player4_created ON public.matches USING btree (season_id, team2_player2_id, created_at DESC);


--
-- Name: idx_matches_season_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_season_type ON public.matches USING btree (season_id, match_type);


--
-- Name: idx_one_active_season_per_group; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_active_season_per_group ON public.seasons USING btree (group_id) WHERE (is_active = true);


--
-- Name: idx_season_trophies_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_trophies_group ON public.season_trophies USING btree (group_id);


--
-- Name: idx_season_trophies_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_trophies_player ON public.season_trophies USING btree (player_id);


--
-- Name: idx_seasons_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seasons_active ON public.seasons USING btree (group_id, is_active) WHERE (is_active = true);


--
-- Name: idx_seasons_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seasons_group_id ON public.seasons USING btree (group_id, season_number DESC);


--
-- Name: uq_group_join_requests_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_group_join_requests_pending ON public.group_join_requests USING btree (group_id, user_id) WHERE (status = 'pending'::text);


--
-- Name: matches enforce_match_season_group; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_match_season_group BEFORE INSERT OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.check_match_season_group();


--
-- Name: group_memberships update_group_visibility_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_visibility_trigger AFTER INSERT OR DELETE OR UPDATE ON public.group_memberships FOR EACH ROW EXECUTE FUNCTION public.update_group_visibility();


--
-- Name: friend_groups friend_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_groups
    ADD CONSTRAINT friend_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friend_groups friend_groups_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_groups
    ADD CONSTRAINT friend_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_join_requests group_join_requests_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: group_join_requests group_join_requests_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_join_requests group_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_memberships group_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: matches matches_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: matches matches_team1_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team1_player1_id_fkey FOREIGN KEY (team1_player1_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: matches matches_team1_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team1_player2_id_fkey FOREIGN KEY (team1_player2_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: matches matches_team2_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team2_player1_id_fkey FOREIGN KEY (team2_player1_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: matches matches_team2_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team2_player2_id_fkey FOREIGN KEY (team2_player2_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: players players_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: players players_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: season_trophies season_trophies_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: season_trophies season_trophies_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: season_trophies season_trophies_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_trophies
    ADD CONSTRAINT season_trophies_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: seasons seasons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: seasons seasons_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.friend_groups(id) ON DELETE CASCADE;


--
-- Name: friend_groups anyone_creates_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_creates_groups ON public.friend_groups FOR INSERT WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (owner_id = ( SELECT auth.uid() AS uid))));


--
-- Name: friend_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: group_join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: group_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons group_owners_manage_seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_owners_manage_seasons ON public.seasons USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = seasons.group_id) AND (friend_groups.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: group_memberships owners_manage_all_memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owners_manage_all_memberships ON public.group_memberships USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = group_memberships.group_id) AND (friend_groups.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: friend_groups owners_manage_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owners_manage_groups ON public.friend_groups USING ((owner_id = ( SELECT auth.uid() AS uid)));


--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: season_trophies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_trophies ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: matches users_manage_group_matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_manage_group_matches ON public.matches USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = matches.group_id) AND ((friend_groups.owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (friend_groups.visible_to_users)))))));


--
-- Name: players users_manage_group_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_manage_group_players ON public.players USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = players.group_id) AND ((friend_groups.owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (friend_groups.visible_to_users)))))));


--
-- Name: group_join_requests users_see_own_join_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_see_own_join_requests ON public.group_join_requests FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: group_memberships users_see_own_memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_see_own_memberships ON public.group_memberships FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: friend_groups users_see_visible_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_see_visible_groups ON public.friend_groups FOR SELECT USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (visible_to_users))));


--
-- Name: seasons users_view_group_seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_group_seasons ON public.seasons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = seasons.group_id) AND ((friend_groups.owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (friend_groups.visible_to_users)))))));


--
-- Name: season_trophies users_view_group_trophies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_group_trophies ON public.season_trophies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.friend_groups
  WHERE ((friend_groups.id = season_trophies.group_id) AND ((friend_groups.owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (friend_groups.visible_to_users)))))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION approve_join_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_join_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_join_request(p_request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.approve_join_request(p_request_id uuid) TO service_role;


--
-- Name: FUNCTION award_season_trophies(p_season_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.award_season_trophies(p_season_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.award_season_trophies(p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.award_season_trophies(p_season_id uuid) TO service_role;


--
-- Name: FUNCTION check_match_season_group(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_match_season_group() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_match_season_group() TO service_role;


--
-- Name: FUNCTION compute_group_global_rankings(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.compute_group_global_rankings(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.compute_group_global_rankings(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.compute_group_global_rankings(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION compute_player_global_ranking(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO anon;
GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO authenticated;
GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO service_role;


--
-- Name: FUNCTION create_friend_group(p_name text, p_description text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_friend_group(p_name text, p_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_friend_group(p_name text, p_description text) TO authenticated;
GRANT ALL ON FUNCTION public.create_friend_group(p_name text, p_description text) TO service_role;


--
-- Name: FUNCTION create_group_with_membership(group_name text, group_description text, group_sport_type text, group_supported_match_types text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_group_with_membership(group_name text, group_description text, group_sport_type text, group_supported_match_types text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_group_with_membership(group_name text, group_description text, group_sport_type text, group_supported_match_types text[]) TO authenticated;
GRANT ALL ON FUNCTION public.create_group_with_membership(group_name text, group_description text, group_sport_type text, group_supported_match_types text[]) TO service_role;


--
-- Name: FUNCTION delete_group_with_cascade(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_group_with_cascade(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_group_with_cascade(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_group_with_cascade(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION demote_group_member(p_group_id uuid, p_target_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.demote_group_member(p_group_id uuid, p_target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.demote_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.demote_group_member(p_group_id uuid, p_target_user_id uuid) TO service_role;


--
-- Name: FUNCTION deny_join_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deny_join_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deny_join_request(p_request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deny_join_request(p_request_id uuid) TO service_role;


--
-- Name: FUNCTION end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text) TO authenticated;
GRANT ALL ON FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text) TO service_role;


--
-- Name: FUNCTION generate_invite_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_invite_code() TO anon;
GRANT ALL ON FUNCTION public.generate_invite_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_invite_code() TO service_role;


--
-- Name: FUNCTION generate_unique_invite_code(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generate_unique_invite_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_unique_invite_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_unique_invite_code() TO service_role;


--
-- Name: FUNCTION get_caller_group_role(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_caller_group_role(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_caller_group_role(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_caller_group_role(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_group_by_invite_code(p_invite_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_group_by_invite_code(p_invite_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_group_by_invite_code(p_invite_code text) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_by_invite_code(p_invite_code text) TO service_role;


--
-- Name: FUNCTION get_group_members(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_group_members(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_group_members(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_members(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_group_player_stats(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_group_player_stats(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_group_player_stats(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_player_stats(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_group_preview(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_group_preview(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_group_preview(p_group_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_group_preview(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_preview(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_pending_join_request_counts(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_pending_join_request_counts() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_pending_join_request_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_pending_join_request_counts() TO service_role;


--
-- Name: FUNCTION get_pending_join_requests(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_pending_join_requests(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_pending_join_requests(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_pending_join_requests(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_public_group_data(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION get_public_matches(p_group_id uuid, p_season_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) TO service_role;


--
-- Name: FUNCTION get_public_season_stats(p_group_id uuid, p_season_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) TO service_role;


--
-- Name: FUNCTION join_group_by_invite_code(p_invite_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.join_group_by_invite_code(p_invite_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.join_group_by_invite_code(p_invite_code text) TO authenticated;
GRANT ALL ON FUNCTION public.join_group_by_invite_code(p_invite_code text) TO service_role;


--
-- Name: FUNCTION leave_group(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.leave_group(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_group(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.leave_group(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION promote_group_member(p_group_id uuid, p_target_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.promote_group_member(p_group_id uuid, p_target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.promote_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.promote_group_member(p_group_id uuid, p_target_user_id uuid) TO service_role;


--
-- Name: FUNCTION remove_group_member(p_group_id uuid, p_target_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.remove_group_member(p_group_id uuid, p_target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.remove_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_group_member(p_group_id uuid, p_target_user_id uuid) TO service_role;


--
-- Name: FUNCTION request_to_join_group(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_to_join_group(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_to_join_group(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.request_to_join_group(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION resolve_public_group(p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolve_public_group(p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_public_group(p_group_id uuid) TO service_role;


--
-- Name: FUNCTION set_group_join_policy(p_group_id uuid, p_join_policy text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_group_join_policy(p_group_id uuid, p_join_policy text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_group_join_policy(p_group_id uuid, p_join_policy text) TO authenticated;
GRANT ALL ON FUNCTION public.set_group_join_policy(p_group_id uuid, p_join_policy text) TO service_role;


--
-- Name: FUNCTION set_group_sharing(p_group_id uuid, p_is_public boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_group_sharing(p_group_id uuid, p_is_public boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_group_sharing(p_group_id uuid, p_is_public boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_group_sharing(p_group_id uuid, p_is_public boolean) TO service_role;


--
-- Name: FUNCTION update_group_visibility(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.update_group_visibility() FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_group_visibility() TO service_role;


--
-- Name: FUNCTION user_is_group_member(group_uuid uuid, user_uuid uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid) TO service_role;


--
-- Name: TABLE friend_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.friend_groups TO anon;
GRANT ALL ON TABLE public.friend_groups TO authenticated;
GRANT ALL ON TABLE public.friend_groups TO service_role;


--
-- Name: TABLE group_join_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_join_requests TO anon;
GRANT ALL ON TABLE public.group_join_requests TO authenticated;
GRANT ALL ON TABLE public.group_join_requests TO service_role;


--
-- Name: TABLE group_memberships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_memberships TO anon;
GRANT ALL ON TABLE public.group_memberships TO authenticated;
GRANT ALL ON TABLE public.group_memberships TO service_role;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matches TO anon;
GRANT ALL ON TABLE public.matches TO authenticated;
GRANT ALL ON TABLE public.matches TO service_role;


--
-- Name: TABLE player_season_stats_1v1_computed; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_season_stats_1v1_computed TO anon;
GRANT ALL ON TABLE public.player_season_stats_1v1_computed TO authenticated;
GRANT ALL ON TABLE public.player_season_stats_1v1_computed TO service_role;


--
-- Name: TABLE player_season_stats_2v2_computed; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_season_stats_2v2_computed TO anon;
GRANT ALL ON TABLE public.player_season_stats_2v2_computed TO authenticated;
GRANT ALL ON TABLE public.player_season_stats_2v2_computed TO service_role;


--
-- Name: TABLE player_season_stats_computed; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_season_stats_computed TO anon;
GRANT ALL ON TABLE public.player_season_stats_computed TO authenticated;
GRANT ALL ON TABLE public.player_season_stats_computed TO service_role;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.players TO anon;
GRANT ALL ON TABLE public.players TO authenticated;
GRANT ALL ON TABLE public.players TO service_role;


--
-- Name: TABLE player_stats_computed; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_stats_computed TO anon;
GRANT ALL ON TABLE public.player_stats_computed TO authenticated;
GRANT ALL ON TABLE public.player_stats_computed TO service_role;


--
-- Name: TABLE season_trophies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.season_trophies TO anon;
GRANT ALL ON TABLE public.season_trophies TO authenticated;
GRANT ALL ON TABLE public.season_trophies TO service_role;


--
-- Name: TABLE seasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seasons TO anon;
GRANT ALL ON TABLE public.seasons TO authenticated;
GRANT ALL ON TABLE public.seasons TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--



--
-- ===== Function ACL pinning =====
-- Supabase's default privileges grant EXECUTE to anon/authenticated on every
-- function at creation time, and the GRANT statements above cannot remove
-- grants that were already applied. Reset function ACLs for the API roles and
-- re-grant exactly what production has (anon keeps only the public-sharing
-- RPCs; see former migrations 025 and 030 in git history).
--

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL ON FUNCTION public.approve_join_request(p_request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.award_season_trophies(p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.compute_group_global_rankings(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO authenticated;
GRANT ALL ON FUNCTION public.create_friend_group(p_name text, p_description text) TO authenticated;
GRANT ALL ON FUNCTION public.create_group_with_membership(group_name text, group_description text, group_sport_type text, group_supported_match_types text[]) TO authenticated;
GRANT ALL ON FUNCTION public.delete_group_with_cascade(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.demote_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deny_join_request(p_request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.end_season_and_create_new(p_group_id uuid, p_new_season_name text, p_new_season_description text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_invite_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_unique_invite_code() TO authenticated;
GRANT ALL ON FUNCTION public.get_caller_group_role(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_by_invite_code(p_invite_code text) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_members(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_player_stats(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_preview(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_pending_join_request_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_pending_join_requests(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.join_group_by_invite_code(p_invite_code text) TO authenticated;
GRANT ALL ON FUNCTION public.leave_group(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.promote_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_group_member(p_group_id uuid, p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.request_to_join_group(p_group_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.set_group_join_policy(p_group_id uuid, p_join_policy text) TO authenticated;
GRANT ALL ON FUNCTION public.set_group_sharing(p_group_id uuid, p_is_public boolean) TO authenticated;
GRANT ALL ON FUNCTION public.user_is_group_member(group_uuid uuid, user_uuid uuid) TO authenticated;

-- anon: public group sharing RPCs only
GRANT ALL ON FUNCTION public.get_group_preview(p_group_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_group_data(p_group_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_matches(p_group_id uuid, p_season_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_season_stats(p_group_id uuid, p_season_id uuid) TO anon;

GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO anon;
GRANT ALL ON FUNCTION public.generate_invite_code() TO anon;

-- Holdovers with PUBLIC execute never revoked in production (kept for fidelity;
-- candidates for tightening in a future migration)
GRANT ALL ON FUNCTION public.compute_player_global_ranking(p_player_id uuid) TO PUBLIC;
GRANT ALL ON FUNCTION public.compute_player_season_ranking(p_player_id uuid, p_season_id uuid, p_match_type text) TO PUBLIC;
GRANT ALL ON FUNCTION public.generate_invite_code() TO PUBLIC;
