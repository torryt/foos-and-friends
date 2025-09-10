-- Verification Query
-- Run this to verify everything was created correctly in Supabase SQL Editor

SELECT 
  'friend_groups' as table_name, 
  COUNT(*) as row_count 
FROM friend_groups
UNION ALL
SELECT 
  'group_memberships' as table_name, 
  COUNT(*) as row_count 
FROM group_memberships
UNION ALL
SELECT 
  'players' as table_name, 
  COUNT(*) as row_count 
FROM players
UNION ALL
SELECT 
  'matches' as table_name, 
  COUNT(*) as row_count 
FROM matches;

-- Expected result: 4 rows with 0 counts for new database
-- After executing all SQL commands, human should verify:
-- ✓ All 4 tables appear in Database > Tables
-- ✓ All tables show "RLS enabled" 
-- ✓ Functions appear in Database > Functions
-- ✓ Indexes appear in Database > Indexes