# Database Setup for Foos & Friends

This folder contains SQL scripts that must be executed manually in the Supabase SQL Editor.

## Execution Order

**IMPORTANT:** Execute these files in the exact order listed below:

1. `01_friend_groups.sql` - Creates friend groups table with basic policies
2. `02_group_memberships.sql` - Creates group memberships table and policies  
3. `03_update_friend_groups_policies.sql` - Updates friend groups policies (fixes dependencies)
4. `04_players.sql` - Creates players table and policies
5. `05_matches.sql` - Creates matches table and policies
6. `06_functions.sql` - Creates database functions for group operations
7. `07_indexes.sql` - Creates performance indexes
8. `08_verification.sql` - Verifies all tables were created correctly

## How to Execute

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each file's contents in order
4. Click **Run** for each script
5. Verify no errors occurred

## Verification Steps

After executing all scripts:

- [ ] All 4 tables appear in **Database > Tables** (friend_groups, group_memberships, players, matches)
- [ ] All tables show "RLS enabled" status
- [ ] Functions appear in **Database > Functions** (create_friend_group, join_group_by_invite_code)
- [ ] Indexes appear in **Database > Indexes**
- [ ] Verification query returns 4 rows with 0 counts

## Troubleshooting

If you encounter errors:

1. Check that you're executing files in the correct order
2. Ensure each script completed without errors before proceeding
3. Verify your Supabase project has authentication enabled
4. Check that RLS (Row Level Security) is supported in your Supabase plan

## Database Requirements

The application requires a properly configured Supabase database with:
- All database scripts executed in order
- Environment variables properly configured
- Active Supabase connection