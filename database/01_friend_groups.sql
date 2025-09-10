-- Step 1: Create Friend Groups Table
-- Execute this first in Supabase SQL Editor

CREATE TABLE friend_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'base64'),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  max_members integer DEFAULT 50 NOT NULL,
  CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

-- Enable Row Level Security
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies for friend_groups (will be updated after group_memberships table is created)
CREATE POLICY "Owners can manage their groups" ON friend_groups
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create groups" ON friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());