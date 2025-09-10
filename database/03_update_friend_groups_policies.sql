-- Step 3: Update Friend Groups Policies (after group_memberships table exists)
-- Execute this third in Supabase SQL Editor

-- Drop the basic policies
DROP POLICY IF EXISTS "Owners can manage their groups" ON friend_groups;
DROP POLICY IF EXISTS "Anyone can create groups" ON friend_groups;

-- Create comprehensive policies that reference group_memberships
CREATE POLICY "Users can access their groups" ON friend_groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Owners can update groups" ON friend_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create groups" ON friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can delete groups" ON friend_groups
  FOR DELETE USING (owner_id = auth.uid());