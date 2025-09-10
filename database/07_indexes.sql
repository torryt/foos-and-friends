-- Step 6: Create Performance Indexes
-- Execute these indexes last in Supabase SQL Editor

CREATE INDEX idx_players_group_ranking ON players(group_id, ranking DESC);
CREATE INDEX idx_matches_group_date ON matches(group_id, match_date DESC);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id, is_active);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id, is_active);
CREATE INDEX idx_invitations_code ON friend_groups(invite_code);