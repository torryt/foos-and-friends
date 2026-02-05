# Implementation Plan: 1v1 Sports Support

**Issue:** #72
**Created:** 2026-02-05
**Status:** Planning Phase

## Executive Summary

This document outlines the complete implementation plan for adding 1v1 sports support to the foos-and-friends application. The system currently supports only 2v2 matches (foosball, padel). This enhancement will enable:

1. **1v1 match types** for sports like table tennis, squash, and badminton (issue #71)
2. **Dual support** for sports that can be played both 1v1 and 2v2 (e.g., foosball)
3. **Separate ELO rankings** - 1v1 and 2v2 rankings are completely independent
4. **Per-season tracking** - Each season tracks 1v1 and 2v2 rankings separately

## Current Architecture Analysis

### Database Schema (Current State)

The current system is built exclusively around 2v2 matches:

**Tables:**
- `friend_groups` - Groups with `sport_type` (foosball/padel)
- `seasons` - Competitive periods with independent rankings
- `players` - Player profiles scoped to groups
- `matches` - **Hardcoded for 2v2**: 4 required player IDs (team1_player1, team1_player2, team2_player1, team2_player2)
- Computed views: `player_season_stats_computed`, `player_stats_computed`

**Key Constraint:** The matches table enforces 2v2 with:
- 4 mandatory player columns
- CHECK constraint ensuring all 4 players are different
- 8 ranking columns (pre/post for each of 4 players)

### Service Layer (Current State)

- **matchesService.ts** - Hardcoded for 4 players, calculates team average ELO
- **playerSeasonStatsService.ts** - Computes stats from match history
- **playersService.ts** - Player CRUD operations (match-type agnostic)

### UI Layer (Current State)

- **MatchEntryModal.tsx** - Three workflows (Pick Teams, Manual, Use Matchup)
- **ManualTeamsWorkflow.tsx** - Team1 vs Team2 selection (4 players required)
- **PickTeamsWorkflow.tsx** - Balanced/rare matchmaking for 2v2
- **UseMatchupWorkflow.tsx** - Saved 2v2 matchups
- **PlayerRankings.tsx** - Single ranking column per season
- **MatchHistory.tsx** - Displays team1 vs team2 format

## Proposed Solution: Match Type System

### Core Design Principles

1. **Match Type as First-Class Concept** - Add `match_type` enum ('1v1' or '2v2')
2. **Flexible Schema** - Make team2 player columns nullable for 1v1 matches
3. **Separate Rankings** - Track 1v1 and 2v2 rankings independently per season
4. **Sport Configuration** - Sports can support 1v1, 2v2, or both
5. **Backwards Compatibility** - Existing 2v2 data remains valid, defaults applied

---

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Add Match Type Support to Groups

**File:** `database/migrations/016_add_match_type_support.sql`

```sql
-- Add match_types column to friend_groups
-- Stores which match types the sport supports (can be both)
ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS supported_match_types text[]
  NOT NULL
  DEFAULT ARRAY['2v2']
  CONSTRAINT friend_groups_match_types_check
  CHECK (
    supported_match_types <@ ARRAY['1v1', '2v2'] AND
    array_length(supported_match_types, 1) > 0
  );

-- Migrate existing groups to support only 2v2
UPDATE friend_groups
SET supported_match_types = ARRAY['2v2']
WHERE supported_match_types = ARRAY['2v2'];

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_friend_groups_match_types
  ON friend_groups USING GIN (supported_match_types);

COMMENT ON COLUMN friend_groups.supported_match_types IS
  'Array of supported match types for this sport (1v1, 2v2, or both)';
```

**Sport Configuration Examples:**
- Table Tennis: `['1v1']`
- Foosball (traditional): `['2v2']`
- Foosball (with 1v1 support): `['1v1', '2v2']`
- Badminton: `['1v1', '2v2']`

#### 1.2 Modify Matches Table for Flexible Player Count

**File:** `database/migrations/016_add_match_type_support.sql` (continued)

```sql
-- Add match_type column to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT '2v2'
  CONSTRAINT matches_match_type_check CHECK (match_type IN ('1v1', '2v2'));

-- Make team2 player columns nullable for 1v1 matches
ALTER TABLE matches
  ALTER COLUMN team1_player2_id DROP NOT NULL,
  ALTER COLUMN team2_player1_id DROP NOT NULL,
  ALTER COLUMN team2_player2_id DROP NOT NULL;

-- Update the different_players constraint to handle 1v1 matches
ALTER TABLE matches DROP CONSTRAINT IF EXISTS different_players;

ALTER TABLE matches ADD CONSTRAINT different_players_by_match_type CHECK (
  CASE
    -- For 1v1 matches: only team1_player1 and team2_player1 must be different
    WHEN match_type = '1v1' THEN
      team1_player1_id != team2_player1_id AND
      team1_player2_id IS NULL AND
      team2_player2_id IS NULL
    -- For 2v2 matches: all 4 players must be different (existing logic)
    WHEN match_type = '2v2' THEN
      team1_player1_id != team1_player2_id AND
      team1_player1_id != team2_player1_id AND
      team1_player1_id != team2_player2_id AND
      team1_player2_id != team2_player1_id AND
      team1_player2_id != team2_player2_id AND
      team2_player1_id != team2_player2_id AND
      team1_player2_id IS NOT NULL AND
      team2_player2_id IS NOT NULL
    ELSE false
  END
);

-- Make ranking columns for team1_player2, team2_player1, team2_player2 nullable
-- (only team1_player1 rankings are guaranteed for 1v1)
ALTER TABLE matches
  ALTER COLUMN team1_player2_pre_ranking DROP NOT NULL,
  ALTER COLUMN team1_player2_post_ranking DROP NOT NULL,
  ALTER COLUMN team2_player1_pre_ranking DROP NOT NULL,
  ALTER COLUMN team2_player1_post_ranking DROP NOT NULL,
  ALTER COLUMN team2_player2_pre_ranking DROP NOT NULL,
  ALTER COLUMN team2_player2_post_ranking DROP NOT NULL;

-- Create indexes for filtering by match type
CREATE INDEX IF NOT EXISTS idx_matches_match_type
  ON matches(match_type, season_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season_type
  ON matches(season_id, match_type);

COMMENT ON COLUMN matches.match_type IS
  '1v1 or 2v2 match type - determines which player columns are used';
```

**Match Type Data Rules:**
- **1v1 matches:** Only `team1_player1_id` and `team2_player1_id` are populated
- **2v2 matches:** All 4 player columns must be populated
- Rankings stored per player per match (pre/post) for ELO calculations

#### 1.3 Split Ranking Tracking by Match Type

The current computed stats system needs to track separate rankings for 1v1 and 2v2.

**File:** `database/migrations/016_add_match_type_support.sql` (continued)

```sql
-- Update compute_player_season_ranking to accept match_type parameter
CREATE OR REPLACE FUNCTION compute_player_season_ranking(
  p_player_id uuid,
  p_season_id uuid,
  p_match_type text DEFAULT '2v2'
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN m.team1_player1_id = p_player_id THEN m.team1_player1_post_ranking
          WHEN m.team1_player2_id = p_player_id THEN m.team1_player2_post_ranking
          WHEN m.team2_player1_id = p_player_id THEN m.team2_player1_post_ranking
          WHEN m.team2_player2_id = p_player_id THEN m.team2_player2_post_ranking
        END
      FROM matches m
      WHERE m.season_id = p_season_id
        AND m.match_type = p_match_type
        AND (m.team1_player1_id = p_player_id
          OR m.team1_player2_id = p_player_id
          OR m.team2_player1_id = p_player_id
          OR m.team2_player2_id = p_player_id)
      ORDER BY m.created_at DESC
      LIMIT 1
    ),
    1200  -- Default ranking for players with no matches in this season/type
  );
$$;

-- Create separate views for 1v1 and 2v2 season stats
CREATE OR REPLACE VIEW player_season_stats_1v1_computed
WITH (security_invoker = true)
AS
SELECT
  gen_random_uuid() as id,  -- Synthetic ID for view
  pss.player_id,
  pss.season_id,
  '1v1' as match_type,
  compute_player_season_ranking(pss.player_id, pss.season_id, '1v1') as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  COALESCE(stats.goals_for, 0) as goals_for,
  COALESCE(stats.goals_against, 0) as goals_against,
  pss.created_at,
  pss.updated_at
FROM player_season_stats pss
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id AND m.team1_score > m.team2_score THEN 1
      WHEN m.team2_player1_id = pss.player_id AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id AND m.team1_score < m.team2_score THEN 1
      WHEN m.team2_player1_id = pss.player_id AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id THEN m.team1_score
      WHEN m.team2_player1_id = pss.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id THEN m.team2_score
      WHEN m.team2_player1_id = pss.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against
  FROM matches m
  WHERE m.season_id = pss.season_id
    AND m.match_type = '1v1'
    AND (m.team1_player1_id = pss.player_id OR m.team2_player1_id = pss.player_id)
) stats ON true;

CREATE OR REPLACE VIEW player_season_stats_2v2_computed
WITH (security_invoker = true)
AS
SELECT
  gen_random_uuid() as id,  -- Synthetic ID for view
  pss.player_id,
  pss.season_id,
  '2v2' as match_type,
  compute_player_season_ranking(pss.player_id, pss.season_id, '2v2') as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  COALESCE(stats.goals_for, 0) as goals_for,
  COALESCE(stats.goals_against, 0) as goals_against,
  pss.created_at,
  pss.updated_at
FROM player_season_stats pss
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team1_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team2_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against
  FROM matches m
  WHERE m.season_id = pss.season_id
    AND m.match_type = '2v2'
    AND (m.team1_player1_id = pss.player_id
      OR m.team1_player2_id = pss.player_id
      OR m.team2_player1_id = pss.player_id
      OR m.team2_player2_id = pss.player_id)
) stats ON true;

-- Grant permissions
GRANT SELECT ON player_season_stats_1v1_computed TO authenticated;
GRANT SELECT ON player_season_stats_2v2_computed TO authenticated;

-- Create unified view that combines both match types
CREATE OR REPLACE VIEW player_season_stats_by_match_type
WITH (security_invoker = true)
AS
SELECT * FROM player_season_stats_1v1_computed
UNION ALL
SELECT * FROM player_season_stats_2v2_computed;

GRANT SELECT ON player_season_stats_by_match_type TO authenticated;

COMMENT ON VIEW player_season_stats_1v1_computed IS
  'Computed 1v1 statistics for players per season';
COMMENT ON VIEW player_season_stats_2v2_computed IS
  'Computed 2v2 statistics for players per season';
COMMENT ON VIEW player_season_stats_by_match_type IS
  'Union of 1v1 and 2v2 stats, queryable by match_type';
```

#### 1.4 Update create_group Function

**File:** `database/migrations/016_add_match_type_support.sql` (continued)

```sql
-- Update create_group_with_membership to accept supported_match_types
CREATE OR REPLACE FUNCTION create_group_with_membership(
  group_name text,
  group_description text DEFAULT NULL,
  group_sport_type text DEFAULT 'foosball',
  group_supported_match_types text[] DEFAULT ARRAY['2v2']
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_group_id uuid;
  new_invite_code text;
  current_user_id uuid;
  new_season_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate sport_type
  IF group_sport_type NOT IN ('foosball', 'padel') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sport type');
  END IF;

  -- Validate match types
  IF NOT (group_supported_match_types <@ ARRAY['1v1', '2v2']
          AND array_length(group_supported_match_types, 1) > 0) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid match types');
  END IF;

  new_invite_code := generate_unique_invite_code();

  -- Create the group with sport_type and supported_match_types
  INSERT INTO friend_groups (
    name, description, invite_code, owner_id, created_by,
    sport_type, supported_match_types
  )
  VALUES (
    group_name, group_description, new_invite_code, current_user_id,
    current_user_id, group_sport_type, group_supported_match_types
  )
  RETURNING id INTO new_group_id;

  -- Create membership for the creator as owner
  INSERT INTO group_memberships (group_id, user_id, role, invited_by)
  VALUES (new_group_id, current_user_id, 'owner', current_user_id);

  -- Create the initial season
  INSERT INTO seasons (group_id, name, description, season_number, is_active, created_by)
  VALUES (new_group_id, 'Season 1', 'First season', 1, true, current_user_id)
  RETURNING id INTO new_season_id;

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', new_invite_code,
    'name', group_name,
    'season_id', new_season_id
  );
END;
$$;
```

---

### Phase 2: TypeScript Types Updates

#### 2.1 Add Match Type to Type Definitions

**File:** `packages/shared/src/types/index.ts`

```typescript
// Add match type enum
export type MatchType = '1v1' | '2v2'

// Update FriendGroup interface
export interface FriendGroup {
  id: string
  name: string
  description: string | null
  inviteCode: string
  ownerId: string
  createdBy: string
  isActive: boolean
  maxMembers: number
  createdAt: string
  updatedAt: string
  playerCount?: number
  isOwner?: boolean
  sportType?: SportType
  supportedMatchTypes: MatchType[] // NEW: Which match types this sport supports
}

// Update Match interface to include match type
export interface Match {
  id: string
  matchType: MatchType // NEW: 1v1 or 2v2
  // For 2v2: all fields populated. For 1v1: only team1[0] and team2[0] used
  team1: [Player, Player | null] // Second player null for 1v1
  team2: [Player, Player | null] // Second player null for 1v1
  score1: number
  score2: number
  date: string
  time: string
  groupId?: string
  seasonId?: string
  recordedBy?: string
  createdAt?: string
  playerStats?: PlayerMatchStats[]
}

// Update DbMatch to reflect nullable columns
export interface DbMatch {
  id: string
  group_id: string
  season_id: string
  match_type: MatchType // NEW
  team1_player1_id: string
  team1_player2_id: string | null // Nullable for 1v1
  team2_player1_id: string
  team2_player2_id: string | null // Nullable for 1v1
  team1_score: number
  team2_score: number
  match_date: string
  match_time: string
  recorded_by: string
  created_at: string
  // Ranking fields - nullable for players 2, 3, 4 in 1v1 matches
  team1_player1_pre_ranking?: number
  team1_player1_post_ranking?: number
  team1_player2_pre_ranking?: number | null
  team1_player2_post_ranking?: number | null
  team2_player1_pre_ranking?: number
  team2_player1_post_ranking?: number
  team2_player2_pre_ranking?: number | null
  team2_player2_post_ranking?: number | null
}

// Update PlayerSeasonStats to include match type
export interface PlayerSeasonStats {
  id: string
  playerId: string
  seasonId: string
  matchType: MatchType // NEW: Separate stats for 1v1 and 2v2
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  createdAt: string
  updatedAt: string
}

export interface DbPlayerSeasonStats {
  id: string
  player_id: string
  season_id: string
  match_type: MatchType // NEW
  ranking: number
  matches_played: number
  wins: number
  losses: number
  goals_for: number
  goals_against: number
  created_at: string
  updated_at: string
}
```

---

### Phase 3: Database Layer Updates

#### 3.1 Update Database Interface

**File:** `packages/shared/src/lib/database.ts`

Add match type parameters to database interface methods:

```typescript
export interface Database {
  // ... existing methods ...

  // Updated to support match type filtering
  getMatchesBySeason(seasonId: string, matchType?: MatchType): Promise<DatabaseListResult<Match>>

  // Updated to support match type in ranking lookup
  getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
    matchType: MatchType
  ): Promise<DatabaseResult<PlayerSeasonStats>>

  // New method to get leaderboard by match type
  getSeasonLeaderboard(
    seasonId: string,
    matchType: MatchType
  ): Promise<DatabaseListResult<PlayerSeasonStats>>

  // Updated match recording for 1v1 or 2v2
  recordMatch(
    groupId: string,
    seasonId: string,
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null, // null for 1v1
    team2Player1Id: string,
    team2Player2Id: string | null, // null for 1v1
    score1: number,
    score2: number,
    recordedBy: string,
    rankings: {
      team1Player1PreRanking: number
      team1Player1PostRanking: number
      team1Player2PreRanking?: number | null
      team1Player2PostRanking?: number | null
      team2Player1PreRanking: number
      team2Player1PostRanking: number
      team2Player2PreRanking?: number | null
      team2Player2PostRanking?: number | null
    },
  ): Promise<DatabaseResult<Match>>
}
```

#### 3.2 Update Supabase Database Implementation

**File:** `packages/shared/src/lib/supabase-database.ts`

Key changes:
1. Handle nullable player columns in match transformation
2. Query correct view based on match type for stats
3. Update INSERT statement to include match_type

```typescript
// Update dbMatchToMatch to handle 1v1 matches
const dbMatchToMatch = async (
  dbMatch: DbMatch,
  playersById: Map<string, Player>,
): Promise<Match> => {
  const team1Player1 = playersById.get(dbMatch.team1_player1_id)
  const team2Player1 = playersById.get(dbMatch.team2_player1_id)

  if (!team1Player1 || !team2Player1) {
    throw new Error('Could not find required players for match')
  }

  // For 1v1 matches, player2 columns are null
  const team1Player2 = dbMatch.team1_player2_id
    ? playersById.get(dbMatch.team1_player2_id)
    : null
  const team2Player2 = dbMatch.team2_player2_id
    ? playersById.get(dbMatch.team2_player2_id)
    : null

  // Validate 2v2 matches have all players
  if (dbMatch.match_type === '2v2' && (!team1Player2 || !team2Player2)) {
    throw new Error('2v2 match missing required players')
  }

  // Build player stats array
  const playerStats: PlayerMatchStats[] = []

  // Always include team1_player1 and team2_player1
  if (dbMatch.team1_player1_pre_ranking !== undefined &&
      dbMatch.team1_player1_post_ranking !== undefined) {
    playerStats.push({
      playerId: dbMatch.team1_player1_id,
      preGameRanking: dbMatch.team1_player1_pre_ranking,
      postGameRanking: dbMatch.team1_player1_post_ranking,
    })
  }

  if (dbMatch.team2_player1_pre_ranking !== undefined &&
      dbMatch.team2_player1_post_ranking !== undefined) {
    playerStats.push({
      playerId: dbMatch.team2_player1_id,
      preGameRanking: dbMatch.team2_player1_pre_ranking,
      postGameRanking: dbMatch.team2_player1_post_ranking,
    })
  }

  // Include team1_player2 and team2_player2 only for 2v2 matches
  if (dbMatch.match_type === '2v2') {
    if (dbMatch.team1_player2_pre_ranking !== undefined &&
        dbMatch.team1_player2_post_ranking !== undefined &&
        dbMatch.team1_player2_id) {
      playerStats.push({
        playerId: dbMatch.team1_player2_id,
        preGameRanking: dbMatch.team1_player2_pre_ranking,
        postGameRanking: dbMatch.team1_player2_post_ranking,
      })
    }

    if (dbMatch.team2_player2_pre_ranking !== undefined &&
        dbMatch.team2_player2_post_ranking !== undefined &&
        dbMatch.team2_player2_id) {
      playerStats.push({
        playerId: dbMatch.team2_player2_id,
        preGameRanking: dbMatch.team2_player2_pre_ranking,
        postGameRanking: dbMatch.team2_player2_post_ranking,
      })
    }
  }

  return {
    id: dbMatch.id,
    matchType: dbMatch.match_type,
    team1: [team1Player1, team1Player2],
    team2: [team2Player1, team2Player2],
    score1: dbMatch.team1_score,
    score2: dbMatch.team2_score,
    date: dbMatch.match_date,
    time: dbMatch.match_time,
    groupId: dbMatch.group_id,
    seasonId: dbMatch.season_id,
    recordedBy: dbMatch.recorded_by,
    createdAt: dbMatch.created_at,
    playerStats,
  }
}

// Update getPlayerSeasonStats to accept match type
async getPlayerSeasonStats(
  playerId: string,
  seasonId: string,
  matchType: MatchType
): Promise<DatabaseResult<PlayerSeasonStats>> {
  const viewName = matchType === '1v1'
    ? 'player_season_stats_1v1_computed'
    : 'player_season_stats_2v2_computed'

  const { data, error } = await this.supabase
    .from(viewName)
    .select('*')
    .eq('player_id', playerId)
    .eq('season_id', seasonId)
    .single()

  // ... transform and return
}

// Update getSeasonLeaderboard to accept match type
async getSeasonLeaderboard(
  seasonId: string,
  matchType: MatchType
): Promise<DatabaseListResult<PlayerSeasonStats>> {
  const viewName = matchType === '1v1'
    ? 'player_season_stats_1v1_computed'
    : 'player_season_stats_2v2_computed'

  const { data, error } = await this.supabase
    .from(viewName)
    .select('*')
    .eq('season_id', seasonId)
    .order('ranking', { ascending: false })

  // ... transform and return
}

// Update recordMatch to handle match type
async recordMatch(
  groupId: string,
  seasonId: string,
  matchType: MatchType,
  team1Player1Id: string,
  team1Player2Id: string | null,
  team2Player1Id: string,
  team2Player2Id: string | null,
  score1: number,
  score2: number,
  recordedBy: string,
  rankings: { ... }
): Promise<DatabaseResult<Match>> {
  const { data, error } = await this.supabase
    .from('matches')
    .insert({
      group_id: groupId,
      season_id: seasonId,
      match_type: matchType,
      team1_player1_id: team1Player1Id,
      team1_player2_id: team1Player2Id,
      team2_player1_id: team2Player1Id,
      team2_player2_id: team2Player2Id,
      team1_score: score1,
      team2_score: score2,
      recorded_by: recordedBy,
      team1_player1_pre_ranking: rankings.team1Player1PreRanking,
      team1_player1_post_ranking: rankings.team1Player1PostRanking,
      team1_player2_pre_ranking: rankings.team1Player2PreRanking,
      team1_player2_post_ranking: rankings.team1Player2PostRanking,
      team2_player1_pre_ranking: rankings.team2Player1PreRanking,
      team2_player1_post_ranking: rankings.team2Player1PostRanking,
      team2_player2_pre_ranking: rankings.team2Player2PreRanking,
      team2_player2_post_ranking: rankings.team2Player2PostRanking,
    })
    .select()
    .single()

  // ... transform and return
}
```

---

### Phase 4: Service Layer Updates

#### 4.1 Update MatchesService

**File:** `packages/shared/src/services/matchesService.ts`

Key changes:
1. Add match type parameter to all methods
2. Implement separate ELO calculation logic for 1v1 (no team averaging)
3. Handle nullable player IDs

```typescript
export class MatchesService {
  // Update to filter by match type
  async getMatchesBySeason(
    seasonId: string,
    matchType?: MatchType
  ): Promise<{ data: Match[]; error?: string }> {
    const result = await this.db.getMatchesBySeason(seasonId, matchType)
    return { data: result.data, error: result.error ?? undefined }
  }

  // NEW: Get player's ranking for specific match type in season
  private async getPlayerSeasonRanking(
    playerId: string,
    seasonId: string,
    matchType: MatchType
  ): Promise<number> {
    const result = await this.playerSeasonStatsService.getPlayerSeasonStats(
      playerId,
      seasonId,
      matchType
    )
    return result.data?.ranking ?? 1200
  }

  // Updated addMatch with match type and ELO logic branching
  async addMatch(
    groupId: string,
    seasonId: string,
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: number,
    score2: number,
    recordedBy: string,
  ): Promise<{ data: Match | null; error?: string }> {
    // Validate match type constraints
    if (matchType === '1v1' && (team1Player2Id !== null || team2Player2Id !== null)) {
      return { data: null, error: '1v1 matches must have exactly 2 players' }
    }

    if (matchType === '2v2' && (!team1Player2Id || !team2Player2Id)) {
      return { data: null, error: '2v2 matches must have exactly 4 players' }
    }

    // Get all players and validate
    const playerIds = [team1Player1Id, team2Player1Id]
    if (matchType === '2v2') {
      playerIds.push(team1Player2Id!, team2Player2Id!)
    }

    if (new Set(playerIds).size !== playerIds.length) {
      return { data: null, error: 'All players must be different' }
    }

    // Fetch player objects
    const playersResults = await Promise.all(
      playerIds.map(id => this.playersService.getPlayerById(id))
    )

    const players = playersResults.map(r => r.data).filter(Boolean) as Player[]
    if (players.length !== playerIds.length) {
      return { data: null, error: 'One or more players not found' }
    }

    // Get current season rankings for the specific match type
    const rankings = await Promise.all(
      playerIds.map(id => this.getPlayerSeasonRanking(id, seasonId, matchType))
    )

    const [team1Player1Ranking, team2Player1Ranking] = rankings
    const team1Player2Ranking = matchType === '2v2' ? rankings[2] : null
    const team2Player2Ranking = matchType === '2v2' ? rankings[3] : null

    // Calculate new rankings based on match type
    let newRankings: Record<string, number>

    if (matchType === '1v1') {
      // 1v1 ELO: Direct player vs player
      const team1Won = score1 > score2
      newRankings = {
        [team1Player1Id]: this.calculate1v1Ranking(
          team1Player1Ranking,
          team2Player1Ranking,
          team1Won
        ),
        [team2Player1Id]: this.calculate1v1Ranking(
          team2Player1Ranking,
          team1Player1Ranking,
          !team1Won
        ),
      }
    } else {
      // 2v2 ELO: Team average based
      const team1Won = score1 > score2
      const team1AvgRanking = (team1Player1Ranking + team1Player2Ranking!) / 2
      const team2AvgRanking = (team2Player1Ranking + team2Player2Ranking!) / 2

      newRankings = {
        [team1Player1Id]: this.calculate2v2Ranking(
          team1Player1Ranking,
          team2AvgRanking,
          team1Won
        ),
        [team1Player2Id!]: this.calculate2v2Ranking(
          team1Player2Ranking!,
          team2AvgRanking,
          team1Won
        ),
        [team2Player1Id]: this.calculate2v2Ranking(
          team2Player1Ranking,
          team1AvgRanking,
          !team1Won
        ),
        [team2Player2Id!]: this.calculate2v2Ranking(
          team2Player2Ranking!,
          team1AvgRanking,
          !team1Won
        ),
      }
    }

    // Record the match with pre/post rankings
    const result = await this.db.recordMatch(
      groupId,
      seasonId,
      matchType,
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      score1,
      score2,
      recordedBy,
      {
        team1Player1PreRanking: team1Player1Ranking,
        team1Player1PostRanking: newRankings[team1Player1Id],
        team1Player2PreRanking: team1Player2Ranking,
        team1Player2PostRanking: team1Player2Id ? newRankings[team1Player2Id] : null,
        team2Player1PreRanking: team2Player1Ranking,
        team2Player1PostRanking: newRankings[team2Player1Id],
        team2Player2PreRanking: team2Player2Ranking,
        team2Player2PostRanking: team2Player2Id ? newRankings[team2Player2Id] : null,
      },
    )

    return { data: result.data, error: result.error ?? undefined }
  }

  // NEW: 1v1 ELO calculation (direct player vs player)
  private calculate1v1Ranking(
    playerRanking: number,
    opponentRanking: number,
    isWinner: boolean
  ): number {
    const K = isWinner ? 35 : 29 // Asymmetric K-factors
    const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
    const actualScore = isWinner ? 1 : 0
    const newRanking = playerRanking + K * (actualScore - expectedScore)
    return Math.max(800, Math.min(2400, Math.round(newRanking)))
  }

  // EXISTING: 2v2 ELO calculation (team average based)
  private calculate2v2Ranking(
    playerRanking: number,
    opponentTeamAvgRanking: number,
    isWinner: boolean
  ): number {
    const K = isWinner ? 35 : 29
    const expectedScore = 1 / (1 + 10 ** ((opponentTeamAvgRanking - playerRanking) / 400))
    const actualScore = isWinner ? 1 : 0
    const newRanking = playerRanking + K * (actualScore - expectedScore)
    return Math.max(800, Math.min(2400, Math.round(newRanking)))
  }
}
```

#### 4.2 Update PlayerSeasonStatsService

**File:** `packages/shared/src/services/playerSeasonStatsService.ts`

```typescript
export class PlayerSeasonStatsService {
  // Update to require match type
  async getPlayerSeasonStats(
    playerId: string,
    seasonId: string,
    matchType: MatchType
  ): Promise<{ data: PlayerSeasonStats | null; error?: string }> {
    const result = await this.db.getPlayerSeasonStats(playerId, seasonId, matchType)
    return { data: result.data, error: result.error ?? undefined }
  }

  // Update to require match type
  async getSeasonLeaderboard(
    seasonId: string,
    matchType: MatchType
  ): Promise<{ data: PlayerSeasonStats[]; error?: string }> {
    const result = await this.db.getSeasonLeaderboard(seasonId, matchType)
    return { data: result.data, error: result.error ?? undefined }
  }
}
```

---

### Phase 5: UI Component Updates

This phase involves significant UI changes to support match type selection and separate leaderboards.

#### 5.1 Update useGameLogic Hook

**File:** `apps/foosball/src/hooks/useGameLogic.ts`

```typescript
export const useGameLogic = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [seasonStats1v1, setSeasonStats1v1] = useState<PlayerSeasonStats[]>([])
  const [seasonStats2v2, setSeasonStats2v2] = useState<PlayerSeasonStats[]>([])
  const [matches1v1, setMatches1v1] = useState<Match[]>([])
  const [matches2v2, setMatches2v2] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()
  const { user } = useAuth()

  // Determine which match types the current group supports
  const supportedMatchTypes = currentGroup?.supportedMatchTypes || ['2v2']
  const supports1v1 = supportedMatchTypes.includes('1v1')
  const supports2v2 = supportedMatchTypes.includes('2v2')

  useEffect(() => {
    if (!currentGroup || !currentSeason || !user) {
      setPlayers([])
      setMatches1v1([])
      setMatches2v2([])
      return
    }

    const loadGroupData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Load players (match type agnostic)
        const playersResult = await playersService.getPlayersByGroup(currentGroup.id)

        // Load stats and matches for each supported match type
        const promises: Promise<any>[] = [playersResult]

        if (supports1v1) {
          promises.push(
            playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id, '1v1'),
            matchesService.getMatchesBySeason(currentSeason.id, '1v1')
          )
        }

        if (supports2v2) {
          promises.push(
            playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id, '2v2'),
            matchesService.getMatchesBySeason(currentSeason.id, '2v2')
          )
        }

        const results = await Promise.all(promises)

        let idx = 0
        const playersRes = results[idx++]

        if (playersRes.error) {
          setError(`Failed to load players: ${playersRes.error}`)
        } else {
          setPlayers(playersRes.data)
        }

        if (supports1v1) {
          const stats1v1Res = results[idx++]
          const matches1v1Res = results[idx++]

          setSeasonStats1v1(stats1v1Res.error ? [] : stats1v1Res.data)
          setMatches1v1(matches1v1Res.error ? [] : matches1v1Res.data)
        }

        if (supports2v2) {
          const stats2v2Res = results[idx++]
          const matches2v2Res = results[idx++]

          setSeasonStats2v2(stats2v2Res.error ? [] : stats2v2Res.data)
          setMatches2v2(matches2v2Res.error ? [] : matches2v2Res.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group data')
      } finally {
        setLoading(false)
      }
    }

    loadGroupData()
  }, [currentGroup, currentSeason, user, supports1v1, supports2v2])

  // Update addMatch to accept match type
  const addMatch = async (
    matchType: MatchType,
    team1Player1Id: string,
    team1Player2Id: string | null,
    team2Player1Id: string,
    team2Player2Id: string | null,
    score1: string,
    score2: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || !currentSeason || !user) {
      return { success: false, error: 'No group or season selected' }
    }

    // Validate match type is supported
    if (!currentGroup.supportedMatchTypes.includes(matchType)) {
      return {
        success: false,
        error: `${matchType} matches are not supported in this group`
      }
    }

    try {
      const result = await matchesService.addMatch(
        currentGroup.id,
        currentSeason.id,
        matchType,
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        parseInt(score1, 10),
        parseInt(score2, 10),
        user.id,
      )

      if (result.error) {
        return { success: false, error: result.error }
      }

      if (result.data) {
        // Update local state based on match type
        const newMatch = result.data

        if (matchType === '1v1') {
          setMatches1v1(prev => [newMatch, ...prev])
        } else {
          setMatches2v2(prev => [newMatch, ...prev])
        }

        // Refresh stats for the specific match type
        const [playersResult, seasonStatsResult] = await Promise.all([
          playersService.getPlayersByGroup(currentGroup.id),
          playerSeasonStatsService.getSeasonLeaderboard(currentSeason.id, matchType),
        ])

        if (playersResult.data) {
          setPlayers(playersResult.data)
        }

        if (seasonStatsResult.data) {
          if (matchType === '1v1') {
            setSeasonStats1v1(seasonStatsResult.data)
          } else {
            setSeasonStats2v2(seasonStatsResult.data)
          }
        }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add match',
      }
    }
  }

  return {
    players,
    seasonStats1v1,
    seasonStats2v2,
    matches1v1,
    matches2v2,
    supportedMatchTypes,
    supports1v1,
    supports2v2,
    loading,
    error,
    addPlayer,
    addMatch,
    updatePlayer,
    deletePlayer,
  }
}
```

#### 5.2 Create Match Type Selector Component

**File:** `apps/foosball/src/components/MatchTypeSelector.tsx` (NEW)

```typescript
import type { MatchType } from '@foos/shared'

interface MatchTypeSelectorProps {
  selectedMatchType: MatchType
  supportedMatchTypes: MatchType[]
  onChange: (matchType: MatchType) => void
}

export const MatchTypeSelector = ({
  selectedMatchType,
  supportedMatchTypes,
  onChange,
}: MatchTypeSelectorProps) => {
  if (supportedMatchTypes.length === 1) {
    // If only one match type supported, don't show selector
    return null
  }

  return (
    <div className="flex gap-2 justify-center mb-4">
      {supportedMatchTypes.map((matchType) => (
        <button
          key={matchType}
          type="button"
          onClick={() => onChange(matchType)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMatchType === matchType
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {matchType === '1v1' ? '1v1 Singles' : '2v2 Teams'}
        </button>
      ))}
    </div>
  )
}
```

#### 5.3 Update PlayerRankings Component

**File:** `apps/foosball/src/components/PlayerRankings.tsx`

Add match type selector and display separate leaderboards:

```typescript
export const PlayerRankings = () => {
  const {
    seasonStats1v1,
    seasonStats2v2,
    supports1v1,
    supports2v2,
    supportedMatchTypes
  } = useGameLogic()

  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>(
    supports1v1 ? '1v1' : '2v2'
  )

  // Use the appropriate stats based on selected match type
  const seasonStats = selectedMatchType === '1v1' ? seasonStats1v1 : seasonStats2v2

  return (
    <div>
      <MatchTypeSelector
        selectedMatchType={selectedMatchType}
        supportedMatchTypes={supportedMatchTypes}
        onChange={setSelectedMatchType}
      />

      {/* Existing leaderboard display using seasonStats */}
      <div className="space-y-2">
        {seasonStats.map((stats, index) => (
          <PlayerRankingCard
            key={stats.id}
            stats={stats}
            rank={index + 1}
            matchType={selectedMatchType}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 5.4 Update MatchEntryModal Component

**File:** `apps/foosball/src/components/MatchEntryModal.tsx`

Add match type selection to entry modal:

```typescript
export const MatchEntryModal = ({ players, matches, addMatch, onClose }: MatchEntryModalProps) => {
  const [mode, setMode] = useState<WorkflowMode>('entry')
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>('2v2')
  const { currentGroup, currentSeason } = useGroupContext()

  const supportedMatchTypes = currentGroup?.supportedMatchTypes || ['2v2']
  const isArchived = !!currentSeason && !currentSeason.isActive

  // Entry mode - show match type selector first
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add Match</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Match Type Selector */}
        <MatchTypeSelector
          selectedMatchType={selectedMatchType}
          supportedMatchTypes={supportedMatchTypes}
          onChange={setSelectedMatchType}
        />

        {/* Archived season warning */}
        {isArchived && <ArchivedSeasonWarning />}

        <p className="text-gray-600 text-center mb-6">
          {selectedMatchType === '1v1'
            ? 'Record a 1v1 singles match'
            : 'How do you want to create teams?'}
        </p>

        {/* Show different options based on match type */}
        {selectedMatchType === '1v1' ? (
          <button
            onClick={() => setMode('manual-1v1')}
            disabled={isArchived}
            className="w-full p-4 border rounded-xl bg-gradient-to-r from-purple-50 to-pink-50"
          >
            <div className="flex items-center gap-3">
              <Users className="text-purple-600" size={20} />
              <div>
                <h3 className="font-semibold">Select Players</h3>
                <p className="text-sm text-gray-600">Choose 2 players for 1v1 match</p>
              </div>
            </div>
          </button>
        ) : (
          <>
            {/* Existing 2v2 options: Pick Teams, Manual Teams, Use Matchup */}
            <button onClick={() => setMode('pick-teams')}>
              Pick Teams Smartly
            </button>
            <button onClick={() => setMode('manual-teams')}>
              Select Teams Manually
            </button>
            <button onClick={() => setMode('use-matchup')}>
              Use Saved Matchup
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

#### 5.5 Create 1v1 Match Recording Workflow

**File:** `apps/foosball/src/components/Manual1v1Workflow.tsx` (NEW)

```typescript
import type { Player } from '@foos/shared'
import { useState } from 'react'
import { PlayerCombobox } from './ui/PlayerCombobox'
import { ScoreEntryStep } from './ScoreEntryStep'

interface Manual1v1WorkflowProps {
  players: Player[]
  addMatch: (
    matchType: '1v1',
    team1Player1Id: string,
    team1Player2Id: null,
    team2Player1Id: string,
    team2Player2Id: null,
    score1: string,
    score2: string,
  ) => Promise<{ success: boolean; error?: string }>
  onBack: () => void
  onClose: () => void
  onSuccess: () => void
}

type Step = 'select-players' | 'enter-score'

export const Manual1v1Workflow = ({
  players,
  addMatch,
  onBack,
  onClose,
  onSuccess,
}: Manual1v1WorkflowProps) => {
  const [step, setStep] = useState<Step>('select-players')
  const [player1Id, setPlayer1Id] = useState<string>('')
  const [player2Id, setPlayer2Id] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canProceedToScore = player1Id && player2Id && player1Id !== player2Id

  const handleScoreSubmit = async (score1: string, score2: string) => {
    setSubmitting(true)
    setError(null)

    const result = await addMatch(
      '1v1',
      player1Id,
      null,
      player2Id,
      null,
      score1,
      score2,
    )

    setSubmitting(false)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Failed to record match')
    }
  }

  if (step === 'enter-score') {
    return (
      <ScoreEntryStep
        team1={[players.find(p => p.id === player1Id)!, null]}
        team2={[players.find(p => p.id === player2Id)!, null]}
        matchType="1v1"
        onSubmit={handleScoreSubmit}
        onBack={() => setStep('select-players')}
        onClose={onClose}
        submitting={submitting}
        error={error}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-6">Select Players (1v1)</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Player 1</label>
            <PlayerCombobox
              players={players}
              selectedPlayerId={player1Id}
              onSelectPlayer={setPlayer1Id}
              placeholder="Select first player"
              excludePlayerIds={player2Id ? [player2Id] : []}
            />
          </div>

          <div className="text-center text-gray-400 font-bold">VS</div>

          <div>
            <label className="block text-sm font-medium mb-2">Player 2</label>
            <PlayerCombobox
              players={players}
              selectedPlayerId={player2Id}
              onSelectPlayer={setPlayer2Id}
              placeholder="Select second player"
              excludePlayerIds={player1Id ? [player1Id] : []}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onBack} className="flex-1 px-4 py-2 border rounded-lg">
            Back
          </button>
          <button
            onClick={() => setStep('enter-score')}
            disabled={!canProceedToScore}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Next: Enter Score
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 5.6 Update ScoreEntryStep Component

**File:** `apps/foosball/src/components/ScoreEntryStep.tsx`

Update to handle 1v1 display (show single players instead of teams):

```typescript
interface ScoreEntryStepProps {
  team1: [Player, Player | null]
  team2: [Player, Player | null]
  matchType: MatchType
  onSubmit: (score1: string, score2: string) => Promise<void>
  onBack: () => void
  onClose: () => void
  submitting: boolean
  error: string | null
}

export const ScoreEntryStep = ({
  team1,
  team2,
  matchType,
  onSubmit,
  onBack,
  onClose,
  submitting,
  error,
}: ScoreEntryStepProps) => {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')

  const is1v1 = matchType === '1v1'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-6">
          {is1v1 ? 'Enter Match Score (1v1)' : 'Enter Match Score (2v2)'}
        </h2>

        {/* Team 1 Display */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">
            {is1v1 ? 'Player 1' : 'Team 1'}
          </h3>
          <div className="flex gap-2">
            <PlayerCard player={team1[0]} />
            {!is1v1 && team1[1] && <PlayerCard player={team1[1]} />}
          </div>
        </div>

        {/* Score Input */}
        <div className="flex items-center gap-4 my-6">
          <input
            type="number"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            className="w-20 px-4 py-3 text-2xl text-center border rounded-lg"
            placeholder="0"
            min="0"
          />
          <span className="text-2xl font-bold text-gray-400">-</span>
          <input
            type="number"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            className="w-20 px-4 py-3 text-2xl text-center border rounded-lg"
            placeholder="0"
            min="0"
          />
        </div>

        {/* Team 2 Display */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">
            {is1v1 ? 'Player 2' : 'Team 2'}
          </h3>
          <div className="flex gap-2">
            <PlayerCard player={team2[0]} />
            {!is1v1 && team2[1] && <PlayerCard player={team2[1]} />}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onBack} className="flex-1 px-4 py-2 border rounded-lg">
            Back
          </button>
          <button
            onClick={() => onSubmit(score1, score2)}
            disabled={!score1 || !score2 || submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Recording...' : 'Record Match'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 5.7 Update MatchHistory Component

**File:** `apps/foosball/src/components/MatchHistory.tsx`

Add match type filter and display matches correctly for 1v1:

```typescript
export const MatchHistory = () => {
  const {
    matches1v1,
    matches2v2,
    supports1v1,
    supports2v2,
    supportedMatchTypes
  } = useGameLogic()

  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>(
    supports1v1 ? '1v1' : '2v2'
  )

  const matches = selectedMatchType === '1v1' ? matches1v1 : matches2v2

  return (
    <div>
      <MatchTypeSelector
        selectedMatchType={selectedMatchType}
        supportedMatchTypes={supportedMatchTypes}
        onChange={setSelectedMatchType}
      />

      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            matchType={selectedMatchType}
          />
        ))}
      </div>
    </div>
  )
}

// Update MatchCard to handle 1v1 display
const MatchCard = ({ match, matchType }: { match: Match; matchType: MatchType }) => {
  const is1v1 = matchType === '1v1'

  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex justify-between items-center">
        {/* Team 1 */}
        <div className="flex-1">
          {is1v1 ? (
            <PlayerDisplay player={match.team1[0]} />
          ) : (
            <TeamDisplay players={match.team1} />
          )}
        </div>

        {/* Score */}
        <div className="px-6">
          <div className="text-2xl font-bold">
            {match.score1} - {match.score2}
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex-1">
          {is1v1 ? (
            <PlayerDisplay player={match.team2[0]} />
          ) : (
            <TeamDisplay players={match.team2} />
          )}
        </div>
      </div>
    </div>
  )
}
```

#### 5.8 Update CreateGroupModal

**File:** `apps/foosball/src/components/CreateGroupModal.tsx`

Add match type configuration when creating a group:

```typescript
export const CreateGroupModal = ({ onClose }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [matchTypes, setMatchTypes] = useState<MatchType[]>(['2v2'])

  const toggleMatchType = (matchType: MatchType) => {
    setMatchTypes(prev =>
      prev.includes(matchType)
        ? prev.filter(t => t !== matchType)
        : [...prev, matchType]
    )
  }

  const handleSubmit = async () => {
    // Call groupsService.createGroup with matchTypes parameter
    const result = await groupsService.createGroup(
      groupName,
      description,
      'foosball', // or selected sport type
      matchTypes
    )
    // ... handle result
  }

  return (
    <div className="modal">
      <h2>Create New Group</h2>

      <input
        type="text"
        placeholder="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Match Type Selection */}
      <div className="mt-4">
        <label className="block font-semibold mb-2">Supported Match Types</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={matchTypes.includes('1v1')}
              onChange={() => toggleMatchType('1v1')}
            />
            <span>1v1 Singles</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={matchTypes.includes('2v2')}
              onChange={() => toggleMatchType('2v2')}
            />
            <span>2v2 Teams</span>
          </label>
        </div>
        {matchTypes.length === 0 && (
          <p className="text-red-600 text-sm mt-1">
            Select at least one match type
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!groupName || matchTypes.length === 0}
      >
        Create Group
      </button>
    </div>
  )
}
```

---

### Phase 6: Testing Strategy

#### 6.1 Unit Tests

**Test Files to Create/Update:**

1. `packages/shared/src/services/__tests__/matchesService.test.ts`
   - Test 1v1 ELO calculations (no team averaging)
   - Test 2v2 ELO calculations (team averaging)
   - Test match type validation
   - Test nullable player ID handling

2. `packages/shared/src/services/__tests__/playerSeasonStatsService.test.ts`
   - Test separate stats retrieval for 1v1 vs 2v2
   - Test leaderboard filtering by match type

3. `apps/foosball/src/hooks/__tests__/useGameLogic.test.ts`
   - Test dual stats loading (1v1 and 2v2)
   - Test match type filtering
   - Test addMatch with different match types

4. `apps/foosball/src/components/__tests__/MatchTypeSelector.test.tsx`
   - Test match type switching
   - Test single match type hiding

5. `apps/foosball/src/components/__tests__/Manual1v1Workflow.test.tsx`
   - Test player selection
   - Test duplicate player validation
   - Test score submission

#### 6.2 Integration Tests

**Test Scenarios:**

1. **Create 1v1-only group, record matches, verify rankings**
   - Create group with supportedMatchTypes: ['1v1']
   - Add 4 players
   - Record 10 1v1 matches
   - Verify separate 1v1 rankings

2. **Create dual-mode group (1v1 + 2v2), record both types**
   - Create group with supportedMatchTypes: ['1v1', '2v2']
   - Add 4 players
   - Record 5 1v1 matches
   - Record 5 2v2 matches
   - Verify 1v1 rankings are independent from 2v2 rankings

3. **Season transition preserves separate rankings**
   - Record matches in Season 1 (both 1v1 and 2v2)
   - End season, create Season 2
   - Verify both ranking types reset to 1200
   - Verify historical Season 1 rankings preserved

4. **Migration: Existing 2v2 data remains valid**
   - Run migration on existing 2v2 data
   - Verify all matches have match_type = '2v2'
   - Verify rankings still compute correctly

#### 6.3 Database Migration Tests

**Test SQL Scripts:**

```sql
-- Test 1v1 match insertion
INSERT INTO matches (
  group_id, season_id, match_type,
  team1_player1_id, team2_player1_id,
  team1_score, team2_score, recorded_by,
  team1_player1_pre_ranking, team1_player1_post_ranking,
  team2_player1_pre_ranking, team2_player1_post_ranking
) VALUES (
  '<group_id>', '<season_id>', '1v1',
  '<player1_id>', '<player2_id>',
  10, 8, '<user_id>',
  1200, 1215, 1200, 1185
);

-- Test computed stats views
SELECT * FROM player_season_stats_1v1_computed
WHERE season_id = '<season_id>';

SELECT * FROM player_season_stats_2v2_computed
WHERE season_id = '<season_id>';

-- Test unique constraint on different_players_by_match_type
-- Should succeed:
INSERT INTO matches (..., match_type) VALUES (..., '1v1'); -- 2 players
-- Should fail:
INSERT INTO matches (..., match_type, team1_player2_id) VALUES (..., '1v1', '<id>'); -- 3 players for 1v1
```

---

### Phase 7: Documentation Updates

#### 7.1 Update CLAUDE.md

Add section describing match type architecture:

```markdown
### Match Type System

The application supports both 1v1 and 2v2 match types:

- **Match Type Column**: `matches.match_type` enum ('1v1' or '2v2')
- **Group Configuration**: `friend_groups.supported_match_types` array determines which types a sport supports
- **Separate Rankings**: 1v1 and 2v2 rankings are completely independent per season
- **Flexible Schema**: Team2 player columns nullable for 1v1 matches
- **ELO Calculation**:
  - **1v1**: Direct player vs player (no team averaging)
  - **2v2**: Team average based (existing logic)

**Sport Examples**:
- Table Tennis: ['1v1']
- Foosball: ['2v2'] or ['1v1', '2v2']
- Badminton: ['1v1', '2v2']
```

#### 7.2 Create Migration Guide

**File:** `docs/migrations/016-match-type-support.md`

Document the migration process, including:
- Backup procedures
- Migration steps
- Rollback instructions
- Data validation queries

---

### Phase 8: Deployment Checklist

#### Pre-Deployment

- [ ] Run all unit tests: `pnpm test:run`
- [ ] Run type checking: `pnpm typecheck`
- [ ] Run linter: `pnpm lint`
- [ ] Test migration on staging database
- [ ] Verify computed views return correct data
- [ ] Test both 1v1 and 2v2 workflows in staging
- [ ] Verify backwards compatibility (existing 2v2 groups)

#### Deployment Steps

1. **Database Migration** (Production)
   - Backup production database
   - Run migration: `016_add_match_type_support.sql`
   - Verify migration success (check verification queries)
   - Test queries against new views

2. **Application Deployment**
   - Deploy shared package with updated types and services
   - Deploy foosball app with new UI components
   - Deploy padel app with new UI components

3. **Post-Deployment Verification**
   - Test existing 2v2 groups still work
   - Test creating new 1v1-only group
   - Test creating dual-mode group (1v1 + 2v2)
   - Record test matches in both modes
   - Verify separate leaderboards display correctly

#### Rollback Plan

If issues arise:

1. **Application Rollback**: Deploy previous version
2. **Database Rollback**: Run rollback script from migration
3. **Data Integrity Check**: Verify no data loss occurred

---

## Migration Impact Analysis

### Breaking Changes

**None** - This is a backwards-compatible migration:
- Existing 2v2 matches remain valid (default match_type = '2v2')
- Existing groups default to supportedMatchTypes = ['2v2']
- No changes to existing ELO calculations for 2v2
- No changes to existing UI for 2v2-only groups

### Performance Considerations

1. **Database Queries**
   - New indexes on `match_type` columns ensure fast filtering
   - Computed views use existing indexes on player/season lookups
   - No significant performance degradation expected

2. **UI Rendering**
   - Dual-mode groups load 2x stats (1v1 + 2v2)
   - Can be optimized with lazy loading if needed

3. **Storage**
   - Minimal increase: 1 text column per match, 1 array column per group
   - Nullable columns for team2 players do not increase storage for 2v2 matches

---

## Future Enhancements (Out of Scope)

1. **3v3 or 4v4 Support** - Would require additional player columns
2. **Mixed Match Types in Same Season** - Already supported by design
3. **Custom ELO K-factors per Match Type** - Can be configured in service layer
4. **Match Type Specific Badges** - UI enhancement for achievements
5. **Historical Match Type Stats** - Player profile showing 1v1 vs 2v2 performance over time

---

## Agent Task Breakdown

Once this plan is approved, the following agents can work in parallel:

### Agent Team 1: Database (Priority 1)
- **Task**: Implement migration 016
- **Files**: `database/migrations/016_add_match_type_support.sql`
- **Validation**: Run verification queries, test with sample data

### Agent Team 2: Type Definitions (Priority 1)
- **Task**: Update TypeScript types
- **Files**: `packages/shared/src/types/index.ts`
- **Validation**: Ensure type checking passes

### Agent Team 3: Database Layer (Priority 2)
- **Task**: Update database interface and Supabase implementation
- **Files**: `packages/shared/src/lib/database.ts`, `packages/shared/src/lib/supabase-database.ts`
- **Dependencies**: Agent Team 2
- **Validation**: Unit tests for database layer

### Agent Team 4: Service Layer (Priority 2)
- **Task**: Update matchesService and playerSeasonStatsService
- **Files**: `packages/shared/src/services/matchesService.ts`, `packages/shared/src/services/playerSeasonStatsService.ts`
- **Dependencies**: Agent Team 2, Agent Team 3
- **Validation**: Unit tests for ELO calculations

### Agent Team 5: UI Components - Core (Priority 3)
- **Task**: Create match type selector, update useGameLogic
- **Files**: `apps/foosball/src/components/MatchTypeSelector.tsx`, `apps/foosball/src/hooks/useGameLogic.ts`
- **Dependencies**: Agent Team 4
- **Validation**: Component tests

### Agent Team 6: UI Components - Match Recording (Priority 3)
- **Task**: Update match entry modal, create 1v1 workflow
- **Files**: `apps/foosball/src/components/MatchEntryModal.tsx`, `apps/foosball/src/components/Manual1v1Workflow.tsx`
- **Dependencies**: Agent Team 5
- **Validation**: Integration tests

### Agent Team 7: UI Components - Display (Priority 3)
- **Task**: Update rankings, match history, score entry
- **Files**: `apps/foosball/src/components/PlayerRankings.tsx`, `apps/foosball/src/components/MatchHistory.tsx`, `apps/foosball/src/components/ScoreEntryStep.tsx`
- **Dependencies**: Agent Team 5
- **Validation**: Component tests

### Agent Team 8: UI Components - Group Management (Priority 4)
- **Task**: Update CreateGroupModal for match type selection
- **Files**: `apps/foosball/src/components/CreateGroupModal.tsx`
- **Dependencies**: Agent Team 5
- **Validation**: Integration tests

### Agent Team 9: Padel App (Priority 4)
- **Task**: Apply same UI changes to padel app
- **Files**: All corresponding files in `apps/padel/`
- **Dependencies**: Agent Teams 5-8
- **Validation**: Full app testing

### Agent Team 10: Testing (Priority 5)
- **Task**: Create comprehensive test suite
- **Files**: All `__tests__` files
- **Dependencies**: All previous teams
- **Validation**: 80%+ code coverage

### Agent Team 11: Documentation (Priority 5)
- **Task**: Update CLAUDE.md and create migration guide
- **Files**: `CLAUDE.md`, `docs/migrations/016-match-type-support.md`
- **Dependencies**: All previous teams
- **Validation**: Documentation review

---

## Estimated Effort

- **Database Migration**: 4 hours
- **Type Definitions**: 2 hours
- **Database Layer**: 6 hours
- **Service Layer**: 8 hours
- **UI Components**: 16 hours
- **Testing**: 12 hours
- **Documentation**: 4 hours
- **QA & Debugging**: 8 hours

**Total Estimated Effort**: ~60 hours (1.5 weeks with 4-person team)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration fails on large datasets | High | Test migration on staging with production data snapshot |
| ELO calculations incorrect for 1v1 | High | Extensive unit tests, manual verification with known scenarios |
| UI confusion with dual leaderboards | Medium | Clear match type selector, good UX design |
| Performance degradation with separate stats | Medium | Proper indexing, lazy loading if needed |
| Backwards compatibility issues | High | Thorough regression testing on existing 2v2 groups |

---

## Success Criteria

- [ ] Migration runs successfully on production database
- [ ] All existing 2v2 groups and matches work without changes
- [ ] New 1v1-only groups can be created and matches recorded
- [ ] Dual-mode groups show separate leaderboards for 1v1 and 2v2
- [ ] ELO calculations are mathematically correct for both match types
- [ ] All unit and integration tests pass
- [ ] Performance metrics within acceptable range (< 5% degradation)
- [ ] Documentation is complete and accurate
- [ ] Issue #71 (table tennis) can be implemented as a 1v1 sport

---

## Conclusion

This implementation plan provides a comprehensive, backwards-compatible approach to adding 1v1 sports support to the foos-and-friends application. The design maintains separate rankings for 1v1 and 2v2 match types while reusing most of the existing infrastructure. The phased approach and parallel agent task breakdown enable efficient implementation by a team of developers.

**Next Steps:**
1. Review and approve this plan
2. Create GitHub issues for each agent team task
3. Assign teams and begin implementation
4. Regular sync meetings to ensure coordination
5. QA testing before production deployment
