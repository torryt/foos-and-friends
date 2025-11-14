# Database Migration Deployment Guide

## Overview

This guide covers the deployment of migrations 009 and 010, which refactor statistics storage to eliminate duplicate aggregated data.

### What Changes

**Before**: Statistics (ranking, wins, losses, etc.) were stored in both:
- `players` table (global stats)
- `player_season_stats` table (per-season stats)
- `matches` table (source of truth with pre/post rankings)

**After**: Statistics are computed on-demand from matches table only:
- Database views provide aggregated statistics
- PostgreSQL functions compute rankings by replaying match history
- Single source of truth eliminates synchronization issues

## Three-Phase Deployment

### Phase 1: Pre-Deploy Database Migration (Migration 009)

**When**: Deploy to database BEFORE deploying updated application code

**What it does**:
1. Makes aggregated stat columns nullable (for transition)
2. Adds database views (`player_stats_computed`, `player_season_stats_computed`)
3. Adds ranking computation functions
4. Adds performance indexes on matches table

**How to deploy**:
```sql
-- In Supabase SQL Editor or your PostgreSQL client:
\i database/migrations/009_add_computed_stats.sql
```

**Safety**: This migration is NON-DESTRUCTIVE. Existing data remains intact. The application continues to work unchanged.

**Verification**:
```sql
-- Check that views were created
SELECT viewname FROM pg_views WHERE schemaname = 'public'
  AND viewname LIKE '%computed%';

-- Check that functions were created
SELECT routine_name FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE 'compute_player%';
```

### Phase 2: Application Deployment

**When**: Deploy AFTER migration 009 is complete

**What changed**:
- Application now reads statistics from computed views
- Statistics are no longer written to aggregated columns
- Rankings computed from match history on-demand
- Player/season creation no longer requires initial stats values

**How to deploy**:
```bash
# Build and deploy the updated application
npm run build
# Deploy via your hosting provider (e.g., Cloudflare Pages)
```

**Verification**:
- Create a new player - should work without errors
- Record a match - should update correctly
- View leaderboards - should display correctly
- Check player profiles - stats should be accurate

**Rollback**: If issues occur, you can rollback the application deployment. The database views are read-only and won't cause data corruption. The old columns still exist and can be used by the previous application version.

### Phase 3: Post-Deploy Database Migration (Migration 010)

**When**: Deploy AFTER application is verified working correctly in production

**WARNING**: This migration is DESTRUCTIVE and will DROP COLUMNS.

**What it does**:
1. Drops redundant aggregated columns from `players` table
2. Drops redundant aggregated columns from `player_season_stats` table
3. Removes associated constraints
4. Updates views to be cleaner (no placeholder ranking field)

**How to deploy**:
```sql
-- IMPORTANT: Ensure application is working correctly first!
-- In Supabase SQL Editor or your PostgreSQL client:
\i database/migrations/010_remove_aggregated_columns.sql
```

**Verification**:
```sql
-- Verify columns were removed
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'players' AND table_schema = 'public';

SELECT column_name FROM information_schema.columns
  WHERE table_name = 'player_season_stats' AND table_schema = 'public';
```

**Rollback**: ⚠️ This migration CANNOT be easily rolled back. The columns and their data will be permanently deleted. Only run this after thorough testing in production.

## Timeline Example

```
Day 1: Deploy migration 009 to production database
       ✓ Views and functions created
       ✓ Columns still exist
       ✓ Old app still works

Day 1-2: Deploy updated application
         ✓ New app uses computed stats
         ✓ Monitor for issues
         ✓ Verify all features work

Day 3-7: Monitor production
         ✓ Confirm no errors
         ✓ Verify performance is acceptable
         ✓ Check that stats are accurate

Day 7+: Deploy migration 010 when confident
        ✓ Drop redundant columns
        ✓ Database is now fully migrated
```

## Rollback Scenarios

### Scenario 1: Issues Found After Phase 1 (Migration 009)

**Situation**: Views or functions have issues

**Solution**:
```sql
-- Drop the views and functions
DROP VIEW IF EXISTS player_stats_computed;
DROP VIEW IF EXISTS player_season_stats_computed;
DROP FUNCTION IF EXISTS compute_player_season_ranking;
DROP FUNCTION IF EXISTS compute_player_global_ranking;

-- Revert nullable changes
ALTER TABLE players
  ALTER COLUMN ranking SET NOT NULL,
  ALTER COLUMN matches_played SET NOT NULL,
  ALTER COLUMN wins SET NOT NULL,
  ALTER COLUMN losses SET NOT NULL;

ALTER TABLE player_season_stats
  ALTER COLUMN ranking SET NOT NULL,
  ALTER COLUMN matches_played SET NOT NULL,
  ALTER COLUMN wins SET NOT NULL,
  ALTER COLUMN losses SET NOT NULL,
  ALTER COLUMN goals_for SET NOT NULL,
  ALTER COLUMN goals_against SET NOT NULL;
```

### Scenario 2: Issues Found After Phase 2 (App Deployment)

**Situation**: New application has bugs

**Solution**:
- Rollback application deployment to previous version
- Database migration 009 is safe to leave in place
- Previous app version will continue using old columns

### Scenario 3: Issues Found After Phase 3 (Migration 010)

**Situation**: Critical issue discovered after columns dropped

**Solution**:
- ⚠️ **Data is permanently lost**
- Need to recompute stats from matches table
- May need to restore from backup if available
- **Prevention**: Thoroughly test before running migration 010

## Performance Considerations

### View Performance
- Views use indexes on matches table for efficiency
- Aggregations are computed at query time
- Suitable for small to medium datasets (< 100k matches)
- Consider materialized views for very large datasets

### Ranking Computation
- `compute_player_season_ranking()` replays all matches for a player
- Called on-demand (not automatically by views)
- Cache results in application layer if needed for performance
- Typically called only for leaderboard displays

### Query Patterns
```sql
-- Fast: Get player stats (uses aggregated view)
SELECT * FROM player_season_stats_computed
WHERE season_id = 'xxx';

-- Moderate: Get player ranking (replays matches)
SELECT compute_player_season_ranking('player_id', 'season_id');

-- Fast: Get multiple players' stats
SELECT * FROM player_season_stats_computed
WHERE season_id = 'xxx'
ORDER BY ranking DESC;
```

## Testing Checklist

Before deploying to production, verify in staging/development:

### After Migration 009
- [ ] Views return correct statistics
- [ ] Functions compute correct rankings
- [ ] Old application still works
- [ ] New players can be created
- [ ] Matches can be recorded

### After App Deployment
- [ ] All pages load without errors
- [ ] Leaderboards display correctly
- [ ] Player profiles show accurate stats
- [ ] Match recording works
- [ ] Season transitions work
- [ ] Historical data is accurate

### Before Migration 010
- [ ] Application has been running successfully for adequate time
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] Stakeholders approve the change
- [ ] Backup has been taken

## Support

If issues occur during deployment:
1. Check application logs for errors
2. Query the views directly to verify data
3. Compare computed stats with old columns (before migration 010)
4. Verify indexes exist and are being used

For questions or issues, contact the development team.
