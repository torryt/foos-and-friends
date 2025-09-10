-- Step 2: Create Group Memberships Table
-- Execute this second in Supabase SQL Editor

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

-- Enable Row Level Security
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_memberships
CREATE POLICY "Users can see group memberships" ON group_memberships
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage memberships" ON group_memberships
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

CREATE POLICY "Users can join via invite" ON group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON group_memberships
  FOR UPDATE USING (user_id = auth.uid());