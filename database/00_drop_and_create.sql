-- Complete Database Reset Script
-- This script drops everything and recreates the entire database schema
-- Execute this in Supabase SQL Editor

-- ===== DROP EVERYTHING =====

-- Drop all triggers first (they depend on functions)
DROP TRIGGER IF EXISTS update_group_visibility_trigger ON group_memberships;

-- Drop all functions
DROP FUNCTION IF EXISTS create_friend_group(text, text);
DROP FUNCTION IF EXISTS join_group_by_invite_code(text, uuid);
DROP FUNCTION IF EXISTS update_group_visibility();
DROP FUNCTION IF EXISTS generate_invite_code();

-- Drop all policies by disabling RLS and dropping tables
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS friend_groups CASCADE;

-- ===== RECREATE EVERYTHING =====

-- Create function to generate 8-character lowercase alphanumeric invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- 1. Create Friend Groups Table
CREATE TABLE friend_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  max_members integer DEFAULT 50 NOT NULL,
  visible_to_users uuid[] DEFAULT '{}',
  CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

-- Enable RLS and create policies for friend_groups
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_visible_groups" ON friend_groups
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR auth.uid() = ANY(visible_to_users)
  );

CREATE POLICY "owners_manage_groups" ON friend_groups
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "anyone_creates_groups" ON friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid() AND owner_id = auth.uid());

-- 2. Create Group Memberships Table
CREATE TABLE group_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- Enable RLS and create policies for group_memberships
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_memberships" ON group_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_memberships" ON group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_memberships" ON group_memberships
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners_manage_all_memberships" ON group_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friend_groups 
      WHERE id = group_memberships.group_id 
      AND owner_id = auth.uid()
    )
  );

-- 3. Create trigger function to maintain group visibility
CREATE OR REPLACE FUNCTION update_group_visibility()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to maintain visibility
CREATE TRIGGER update_group_visibility_trigger
  AFTER INSERT OR UPDATE OR DELETE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION update_group_visibility();

-- 4. Create Players Table
CREATE TABLE players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  ranking integer DEFAULT 1200 NOT NULL,
  matches_played integer DEFAULT 0 NOT NULL,
  wins integer DEFAULT 0 NOT NULL,
  losses integer DEFAULT 0 NOT NULL,
  avatar text DEFAULT '👤'::text NOT NULL,
  department text DEFAULT 'Office'::text NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT ranking_bounds CHECK (ranking >= 800 AND ranking <= 2400),
  CONSTRAINT non_negative_stats CHECK (matches_played >= 0 AND wins >= 0 AND losses >= 0),
  UNIQUE(group_id, name)
);

-- Enable RLS and create policies for players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_group_players" ON players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friend_groups 
      WHERE id = players.group_id 
      AND (owner_id = auth.uid() OR auth.uid() = ANY(visible_to_users))
    )
  );

-- 5. Create Matches Table
CREATE TABLE matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  team1_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_score integer NOT NULL,
  team2_score integer NOT NULL,
  match_date date DEFAULT CURRENT_DATE NOT NULL,
  match_time time DEFAULT CURRENT_TIME NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT valid_scores CHECK (team1_score >= 0 AND team2_score >= 0),
  CONSTRAINT different_players CHECK (
    team1_player1_id != team1_player2_id AND
    team1_player1_id != team2_player1_id AND
    team1_player1_id != team2_player2_id AND
    team1_player2_id != team2_player1_id AND
    team1_player2_id != team2_player2_id AND
    team2_player1_id != team2_player2_id
  )
);

-- Enable RLS and create policies for matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_group_matches" ON matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friend_groups 
      WHERE id = matches.group_id 
      AND (owner_id = auth.uid() OR auth.uid() = ANY(visible_to_users))
    )
  );

-- 6. Create Database Functions
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
BEGIN
  -- Create the group
  INSERT INTO friend_groups (name, description, owner_id, created_by)
  VALUES (p_name, p_description, auth.uid(), auth.uid())
  RETURNING id, invite_code INTO new_group_id, new_invite_code;

  -- Add creator as owner member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (new_group_id, auth.uid(), 'owner', true);

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', new_invite_code,
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

-- 7. Create Performance Indexes
CREATE INDEX idx_players_group_ranking ON players(group_id, ranking DESC);
CREATE INDEX idx_matches_group_date ON matches(group_id, match_date DESC);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id, is_active);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id, is_active);
CREATE INDEX idx_invitations_code ON friend_groups(invite_code);
CREATE INDEX idx_friend_groups_visible_users ON friend_groups USING GIN (visible_to_users);

-- 8. Verification
SELECT 
  'Database reset complete. Tables created:' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('friend_groups', 'group_memberships', 'players', 'matches');

SELECT 
  'Functions created:' as status,
  COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_friend_group', 'join_group_by_invite_code', 'update_group_visibility');

SELECT 
  'RLS policies created:' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

-- Expected results:
-- Tables: 4 (friend_groups, group_memberships, players, matches)
-- Functions: 3 (create_friend_group, join_group_by_invite_code, update_group_visibility)
-- Policies: 8+ (various RLS policies)