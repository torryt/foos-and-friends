# Plan: GitHub Issue #65 - Remove Duplicate Stats Storage

## Summary
Make statistics stateless by computing them from match history instead of storing redundantly in `players` and `player_season_stats` tables.

## Approach
Combine the best of both existing PR branches:
- **Branch 2's two-phase migrations** for safe, rollback-friendly database changes
- **Branch 1's application code changes** for reading from computed views

**Key Optimization**: Use O(1) ranking lookup from match `post_ranking` fields instead of O(n) replay.

---

## Implementation Steps

### Step 1: Create Verification Tests
Create tests that verify computed stats match stored stats before making changes.

**File**: `src/services/__tests__/computedStats.test.ts`
- Test ranking computation from match history
- Test win/loss/goals aggregation
- Test edge cases (players with no matches = 1200 ELO)

### Step 2: Apply Non-Destructive Migration (009)
**File**: `database/migrations/009_add_computed_stats.sql`

1. Make aggregated columns nullable (transition phase)
2. Add performance indexes on matches table
3. Create optimized `compute_player_season_ranking()` function (O(1) lookup)
4. Create optimized `compute_player_global_ranking()` function
5. Create `player_season_stats_computed` view
6. Create `player_stats_computed` view

### Step 3: Verify Migration via SQL
Run verification query against test group (`4ed01f6b-415e-4e25-b588-62e59ff69814`):
```sql
-- Compare stored vs computed stats for all players
```

### Step 4: Update Application Code

**4.1 Types** (`src/types/index.ts`)
- Remove stats columns from `DbPlayer` interface
- Remove stats columns from `DbPlayerSeasonStats` interface

**4.2 Database Layer** (`src/lib/supabase-database.ts`)
- `getPlayersByGroup()`: Query `player_stats_computed` view
- `getPlayerById()`: Query view + ranking function
- `getSeasonLeaderboard()`: Query `player_season_stats_computed` view
- `createPlayer()`: Remove stats fields from insert
- `initializePlayerForSeason()`: Only insert relationship record

**4.3 Matches Service** (`src/services/matchesService.ts`)
- Remove `updateMultiplePlayers` dependency
- Remove player global stats updates (lines 140-169)
- Remove season stats updates (lines 172-227)
- Keep only match recording with ranking data

**4.4 Players Service** (`src/services/playersService.ts`)
- Remove `updatePlayerStats()` method
- Remove `updateMultiplePlayers()` method
- Update `addPlayer()` to not pass stats

**4.5 Player Season Stats Service** (`src/services/playerSeasonStatsService.ts`)
- Remove `updatePlayerSeasonStats()` method
- Remove `updateMultiplePlayerSeasonStats()` method

### Step 5: Run Tests & Verify
1. `npm run test:run` - All tests pass
2. `npm run typecheck` - No type errors
3. `npm run lint` - No lint issues
4. Manual UI verification with test group

### Step 6 (Deferred): Apply Destructive Migration (010)
**File**: `database/migrations/010_remove_aggregated_columns.sql`

Only after production verification:
- Drop columns from `players` table
- Drop columns from `player_season_stats` table

---

## Files to Modify

| File | Changes |
|------|---------|
| `database/migrations/009_add_computed_stats.sql` | Create (adapt from Branch 2 + optimizations) |
| `database/migrations/010_remove_aggregated_columns.sql` | Create (from Branch 2) |
| `src/types/index.ts` | Remove DB stats columns |
| `src/lib/supabase-database.ts` | Read from views, remove stats writes |
| `src/services/matchesService.ts` | Remove dual update pattern |
| `src/services/playersService.ts` | Remove stats update methods |
| `src/services/playerSeasonStatsService.ts` | Remove stats update methods |
| `src/services/__tests__/computedStats.test.ts` | Create verification tests |

---

## Verification Plan

### Before Migration
```sql
-- Verify stored stats match for test group
SELECT p.name, p.ranking, p.wins, p.losses, p.matches_played
FROM players p
WHERE group_id = '4ed01f6b-415e-4e25-b588-62e59ff69814';
```

### After Migration 009
```sql
-- Verify computed stats match stored stats
SELECT
  p.name,
  p.ranking as stored_ranking,
  compute_player_global_ranking(p.id) as computed_ranking,
  p.ranking = compute_player_global_ranking(p.id) as match
FROM players p
WHERE group_id = '4ed01f6b-415e-4e25-b588-62e59ff69814';
```

### After App Code Changes
1. Load leaderboard in UI - verify rankings display correctly
2. Record a new match - verify stats update in computed views
3. Check player profile - verify stats are accurate

---

## Rollback Procedures

**Migration 009** (Non-destructive): Drop views/functions, revert nullable columns
**App Code**: Redeploy previous version, views are read-only
**Migration 010** (Destructive): Must restore from backup - test thoroughly first

---

## Risk Mitigation

1. **Test group first**: All changes verified against `4ed01f6b-415e-4e25-b588-62e59ff69814`
2. **Two-phase migrations**: Column drops deferred until verified
3. **Stored stats match computed**: Verified before any destructive changes
4. **Performance optimized**: O(1) ranking lookup, not O(n) replay
