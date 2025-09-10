-- Step 3: Create Players Table (Names/Avatars, No User Accounts)
-- Execute this third in Supabase SQL Editor

-- Players are just names/avatars within groups, not tied to user accounts
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
  UNIQUE(group_id, name) -- Unique names within each group
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policy for players
CREATE POLICY "Users can manage group players" ON players
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );