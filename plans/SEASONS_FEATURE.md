# Seasons Feature Implementation Plan
*Competitive seasons with independent rankings and complete historical tracking*

## Overview

The Seasons feature adds competitive periods to the foosball ranking application. Each season is a fresh start where all player rankings reset to 1200, providing recurring excitement and fair competition. The system maintains complete historical data, allowing users to browse past season leaderboards and compare performance across different competitive periods.

## Status: 🟢 Backend Complete, 🟡 UI Pending

### ✅ Implemented (Production Ready)
- Database schema with seasons and player_season_stats tables
- Complete service layer (seasonsService, playerSeasonStatsService)
- Season-aware match recording with dual stats tracking
- React context for season state management
- Data migration for existing matches → Season 1
- Full RLS security policies
- TypeScript types and interfaces
- All quality checks passing (typecheck, lint, format)

### ⏳ Remaining (Optional UI Enhancements)
- SeasonSelector component (visual season switcher)
- SeasonManagement admin panel (create/end seasons UI)
- Enhanced PlayerRankings to display season context
- Enhanced MatchHistory to show season filtering
- SeasonSummary component for archived seasons
- RecordMatch validation for active season only

---

## Architecture Deep Dive

### Database Schema (`/database/migrations/008_add_seasons.sql`)

#### **seasons** table
```sql
CREATE TABLE seasons (
  id uuid PRIMARY KEY,
  group_id uuid REFERENCES friend_groups(id),
  name text NOT NULL,
  description text,
  season_number integer NOT NULL,          -- Sequential: 1, 2, 3...
  start_date date DEFAULT CURRENT_DATE,
  end_date date,                           -- NULL for active season
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp,
  updated_at timestamp,
  UNIQUE(group_id, season_number)
);

-- Partial unique index ensures only one active season per group
CREATE UNIQUE INDEX idx_one_active_season_per_group
ON seasons(group_id) WHERE is_active = true;
```

**Key Constraints:**
- One active season per group (enforced by partial unique index)
- Season numbers are sequential within each group
- End date must be >= start date (or NULL)

#### **player_season_stats** table
```sql
CREATE TABLE player_season_stats (
  id uuid PRIMARY KEY,
  player_id uuid REFERENCES players(id),
  season_id uuid REFERENCES seasons(id),
  ranking integer DEFAULT 1200,            -- Always starts at 1200
  matches_played integer DEFAULT 0,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  goals_for integer DEFAULT 0,             -- NEW: Goals scored
  goals_against integer DEFAULT 0,          -- NEW: Goals conceded
  created_at timestamp,
  updated_at timestamp,
  UNIQUE(player_id, season_id)             -- One stats entry per player per season
);
```

**Stats Tracking:**
- Each player gets a fresh entry when they play their first match in a new season
- Ranking always initializes to 1200 (via `initializePlayerForSeason`)
- Goals for/against tracked for season-specific goal difference calculations
- Independent from global player stats

#### **matches** table updates
```sql
ALTER TABLE matches ADD COLUMN season_id uuid REFERENCES seasons(id) NOT NULL;
CREATE INDEX idx_matches_season_id ON matches(season_id, match_date DESC);
```

**Match Association:**
- Every match must be associated with a season
- Matches are filtered by season_id in queries
- Historical ranking data (pre/post rankings) still stored per match

#### Data Migration Strategy
The migration automatically:
1. Creates "Season 1" for every existing friend group
2. Sets `start_date` to the earliest match date (or CURRENT_DATE if no matches)
3. Associates all existing matches with Season 1
4. Calculates `player_season_stats` from historical match data:
   - Copies current player rankings
   - Calculates goals_for/against from match history
   - Preserves wins/losses counts

**Result:** Zero data loss, seamless backward compatibility

---

## Service Layer Architecture

### **seasonsService.ts**
```typescript
class SeasonsService {
  // Get all seasons for a group (newest first)
  async getSeasonsByGroup(groupId: string): Promise<{ data: Season[]; error?: string }>

  // Get the currently active season
  async getActiveSeason(groupId: string): Promise<{ data: Season | null; error?: string }>

  // Get specific season by ID
  async getSeasonById(seasonId: string): Promise<{ data: Season | null; error?: string }>

  // End current season and create new one (group owners only)
  async endSeasonAndCreateNew(
    groupId: string,
    newSeasonName: string,
    newSeasonDescription?: string
  ): Promise<SeasonCreationResult>
}
```

**Key Operations:**
- `endSeasonAndCreateNew`: Calls RPC function that atomically:
  1. Sets current season `is_active = false` and `end_date = CURRENT_DATE`
  2. Creates new season with incremented season_number
  3. Returns both old and new season IDs

### **playerSeasonStatsService.ts**
```typescript
class PlayerSeasonStatsService {
  // Get stats for specific player in specific season
  async getPlayerSeasonStats(playerId: string, seasonId: string)

  // Get season leaderboard (all players sorted by ranking)
  async getSeasonLeaderboard(seasonId: string)

  // Initialize player for new season (creates entry with ranking=1200)
  async initializePlayerForSeason(playerId: string, seasonId: string)

  // Update player season stats after match
  async updatePlayerSeasonStats(playerId: string, seasonId: string, updates)

  // Batch update multiple players (used after match recording)
  async updateMultiplePlayerSeasonStats(updates)

  // Utility calculations
  calculateGoalDifference(stats: PlayerSeasonStats): number
  calculateWinRate(stats: PlayerSeasonStats): number
}
```

**Initialization Pattern:**
- `initializePlayerForSeason` is idempotent (checks if entry exists first)
- Called before recording first match of season for each player
- Ensures all players start at 1200 ranking

### **matchesService.ts** (Updated)
```typescript
class MatchesService {
  async addMatch(
    groupId: string,
    seasonId: string,          // NEW: Required parameter
    team1Player1Id: string,
    team1Player2Id: string,
    team2Player1Id: string,
    team2Player2Id: string,
    score1: number,
    score2: number,
    recordedBy: string
  ): Promise<{ data: Match | null; error?: string }>
}
```

**Match Recording Flow:**
1. Validate all 4 players exist and belong to same group
2. **Initialize season stats** for all 4 players (if first match of season)
3. Fetch current **season-specific rankings** for all players
4. Calculate team rankings (average of two players)
5. Apply ELO formula with asymmetric K-factors:
   - `K_FACTOR_WINNER = 35` (winners gain +9% vs standard)
   - `K_FACTOR_LOSER = 29` (losers lose -9% vs standard)
   - Net effect: ~3-8 points inflation per match
6. Calculate new rankings (clamped 800-2400)
7. **Update player global stats** (for backwards compatibility):
   - `ranking`, `matchesPlayed`, `wins`, `losses`
8. **Update player season stats** (the real stats):
   - `ranking`, `matchesPlayed`, `wins`, `losses`
   - `goalsFor`, `goalsAgainst` (NEW)
9. Record match in database with:
   - `season_id`
   - Pre/post rankings for all 4 players
   - Match date/time, scores, team composition

**Dual Tracking Rationale:**
- Global player stats maintain backwards compatibility
- Season stats provide the "source of truth" for competitive play
- UI can choose which stats to display

---

## State Management

### **SeasonContext.tsx**
```typescript
interface SeasonContextType {
  currentSeason: Season | null           // Currently selected season
  seasons: Season[]                      // All seasons for current group
  loading: boolean
  error: string | null
  switchSeason: (seasonId: string) => void
  refreshSeasons: () => Promise<void>
  endSeasonAndCreateNew: (name: string, description?: string) => Promise<...>
}
```

**Behavior:**
- Loads seasons whenever `currentGroup` changes
- Persists selected season to localStorage: `selectedSeasonId_{groupId}`
- Auto-selects on load:
  1. Try to restore previously selected season (from localStorage)
  2. Fall back to active season
  3. Fall back to most recent season (first in list)
- Provides season switching without page reload

**Integration:**
```typescript
// App.tsx hierarchy
<ProtectedRoute>
  <GroupProvider>
    <SeasonProvider>      {/* Nested inside GroupProvider */}
      <AppContent />
    </SeasonProvider>
  </GroupProvider>
</ProtectedRoute>
```

### **useGameLogic.ts** (Updated)
```typescript
export const useGameLogic = () => {
  const { currentGroup } = useGroupContext()
  const { currentSeason } = useSeasonContext()  // NEW
  const { user } = useAuth()

  // Load data when group OR season changes
  useEffect(() => {
    if (!currentGroup || !currentSeason || !user) return

    // Load players and matches filtered by season
    const [players, matches] = await Promise.all([
      playersService.getPlayersByGroup(currentGroup.id),
      matchesService.getMatchesBySeason(currentSeason.id)  // NEW: Filter by season
    ])
  }, [currentGroup, currentSeason, user])  // Season added to deps

  // addMatch now requires season
  const addMatch = async (...) => {
    const result = await matchesService.addMatch(
      currentGroup.id,
      currentSeason.id,  // NEW: Pass current season
      ...
    )
  }
}
```

**Impact on Components:**
- All components using `useGameLogic` automatically get season-filtered data
- `matches` array only contains matches from current season
- Recording a match requires a season to be selected

---

## TypeScript Types

### Core Season Types
```typescript
// App-facing types (camelCase)
interface Season {
  id: string
  groupId: string
  name: string
  description: string | null
  seasonNumber: number
  startDate: string
  endDate: string | null
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface PlayerSeasonStats {
  id: string
  playerId: string
  seasonId: string
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  createdAt: string
  updatedAt: string
}

interface SeasonCreationResult {
  success: boolean
  oldSeasonId?: string
  newSeasonId?: string
  seasonNumber?: number
  error?: string
}

// Database types (snake_case) - see DbSeason, DbPlayerSeasonStats
```

### Updated Match Types
```typescript
interface Match {
  // ... existing fields
  seasonId?: string  // NEW: Season association
}

interface DbMatch {
  // ... existing fields
  season_id: string  // NEW: Required in database
}
```

---

## Database RLS Policies

### seasons table
```sql
-- Users can view seasons for groups they belong to
CREATE POLICY "users_view_group_seasons" ON seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE id = seasons.group_id
      AND (owner_id = auth.uid() OR auth.uid() = ANY(visible_to_users))
    )
  );

-- Only group owners can manage seasons
CREATE POLICY "group_owners_manage_seasons" ON seasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE id = seasons.group_id
      AND owner_id = auth.uid()
    )
  );
```

### player_season_stats table
```sql
-- Users can view season stats for players in their groups
CREATE POLICY "users_view_group_season_stats" ON player_season_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN friend_groups ON players.group_id = friend_groups.id
      WHERE players.id = player_season_stats.player_id
      AND (friend_groups.owner_id = auth.uid()
           OR auth.uid() = ANY(friend_groups.visible_to_users))
    )
  );

-- Users can manage season stats in their groups
CREATE POLICY "users_manage_group_season_stats" ON player_season_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN friend_groups ON players.group_id = friend_groups.id
      WHERE players.id = player_season_stats.player_id
      AND (friend_groups.owner_id = auth.uid()
           OR auth.uid() = ANY(friend_groups.visible_to_users))
    )
  );
```

**Security:**
- Complete data isolation between groups
- Only group owners can create/end seasons
- All members can view seasons and stats
- Match recording requires group membership

---

## RPC Functions

### end_season_and_create_new
```sql
CREATE OR REPLACE FUNCTION end_season_and_create_new(
  p_group_id uuid,
  p_new_season_name text,
  p_new_season_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_season_id uuid;
  v_new_season_id uuid;
  v_next_season_number integer;
BEGIN
  -- Verify user is group owner
  IF NOT EXISTS (
    SELECT 1 FROM friend_groups
    WHERE id = p_group_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only group owners can manage seasons');
  END IF;

  -- Get current active season
  SELECT id INTO v_current_season_id
  FROM seasons
  WHERE group_id = p_group_id AND is_active = true;

  IF v_current_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active season found');
  END IF;

  -- Get next season number
  SELECT COALESCE(MAX(season_number), 0) + 1 INTO v_next_season_number
  FROM seasons WHERE group_id = p_group_id;

  -- End current season
  UPDATE seasons
  SET is_active = false, end_date = CURRENT_DATE, updated_at = now()
  WHERE id = v_current_season_id;

  -- Create new season
  INSERT INTO seasons (group_id, name, description, season_number, start_date, is_active, created_by)
  VALUES (p_group_id, p_new_season_name, p_new_season_description, v_next_season_number, CURRENT_DATE, true, auth.uid())
  RETURNING id INTO v_new_season_id;

  RETURN json_build_object(
    'success', true,
    'old_season_id', v_current_season_id,
    'new_season_id', v_new_season_id,
    'season_number', v_next_season_number
  );
END;
$$;
```

**Atomicity:**
- All operations in single transaction
- Either both succeed or both fail
- No partial state possible

---

## User Workflows

### Season Lifecycle (Group Owner)

1. **View Current Season**
   - SeasonContext automatically loads active season
   - Displayed in UI: "Season 1" (or selected season)

2. **End Season & Create New**
   ```typescript
   const { endSeasonAndCreateNew } = useSeasonContext()

   await endSeasonAndCreateNew("Season 2", "Spring 2024")
   // Result:
   // - Season 1: is_active=false, end_date=today
   // - Season 2: is_active=true, start_date=today, season_number=2
   ```

3. **All Players Reset**
   - No immediate action required
   - On next match, players auto-initialized with ranking=1200
   - Fresh competitive start

### Playing Matches (All Users)

1. **Record Match**
   ```typescript
   const { addMatch } = useGameLogic()
   const { currentSeason } = useSeasonContext()

   await addMatch(team1p1, team1p2, team2p1, team2p2, score1, score2)
   // Automatically uses currentSeason.id
   ```

2. **Behind the Scenes**
   - Check if players exist in `player_season_stats` for current season
   - If not: Initialize with ranking=1200
   - Calculate ELO changes using season-specific rankings
   - Update both global stats and season stats
   - Record match with season_id

3. **View Rankings**
   - Currently shows global rankings (backwards compatible)
   - Can be updated to show season-specific rankings via `getSeasonLeaderboard(currentSeason.id)`

### Browsing History (All Users)

1. **Switch Season**
   ```typescript
   const { switchSeason, seasons } = useSeasonContext()

   // User selects "Season 1" from dropdown
   switchSeason(season1Id)
   // Triggers reload of matches filtered by season1Id
   ```

2. **View Past Season**
   - Matches filtered to selected season
   - Rankings show as they were in that season
   - Read-only (cannot record matches in archived seasons)

---

## Remaining UI Work

### Priority 1: Core Season UI

#### **SeasonSelector Component**
Location: `src/components/SeasonSelector.tsx`

```typescript
interface SeasonSelectorProps {
  // Optional: pass through useSeasonContext or receive as props
}

export const SeasonSelector = () => {
  const { currentSeason, seasons, switchSeason } = useSeasonContext()

  return (
    <select
      value={currentSeason?.id}
      onChange={(e) => switchSeason(e.target.value)}
    >
      {seasons.map(season => (
        <option key={season.id} value={season.id}>
          {season.name} {season.isActive ? '(Active)' : ''}
        </option>
      ))}
    </select>
  )
}
```

**Placement:**
- Header/navigation (next to group selector)
- Shows current season name
- Dropdown lists all seasons (active first, then by date)

**Visual Design:**
- Active season: Green indicator or badge
- Archived seasons: Grayed out or with archive icon
- Show date range: "Season 1 (Jan 2024 - Mar 2024)"

#### **SeasonManagement Component**
Location: `src/components/admin/SeasonManagement.tsx`

```typescript
export const SeasonManagement = () => {
  const { currentSeason, seasons, endSeasonAndCreateNew } = useSeasonContext()
  const { currentGroup } = useGroupContext()
  const [newSeasonName, setNewSeasonName] = useState('')
  const [description, setDescription] = useState('')

  // Check if user is group owner
  if (!currentGroup?.isOwner) {
    return <div>Only group owners can manage seasons</div>
  }

  const handleCreateSeason = async () => {
    await endSeasonAndCreateNew(newSeasonName, description)
    // Reset form, show success message
  }

  return (
    <div>
      <h2>Season Management</h2>

      {/* Current Season Info */}
      <section>
        <h3>Current Season: {currentSeason?.name}</h3>
        <p>Started: {currentSeason?.startDate}</p>
        <p>Matches: {/* count from matches */}</p>
      </section>

      {/* Create New Season Form */}
      <section>
        <h3>End Current Season & Start New</h3>
        <input
          placeholder="New season name (e.g., Season 2)"
          value={newSeasonName}
          onChange={(e) => setNewSeasonName(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={handleCreateSeason}>
          End {currentSeason?.name} & Create New Season
        </button>
        <p className="warning">
          ⚠️ This will close the current season and reset all rankings to 1200
        </p>
      </section>

      {/* Season History */}
      <section>
        <h3>Past Seasons</h3>
        <ul>
          {seasons.filter(s => !s.isActive).map(season => (
            <li key={season.id}>
              {season.name} ({season.startDate} - {season.endDate})
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

**Features:**
- Only visible to group owners
- Shows current season stats
- Form to create new season
- Warning before ending season
- List of past seasons

### Priority 2: Enhanced Existing Components

#### **PlayerRankings Updates**
File: `src/components/PlayerRankings.tsx`

**Changes Needed:**
```typescript
// Add season context
const { currentSeason } = useSeasonContext()
const { getSeasonLeaderboard } = usePlayerSeasonStatsService()

// Load season-specific stats instead of global
useEffect(() => {
  if (currentSeason) {
    const stats = await getSeasonLeaderboard(currentSeason.id)
    // Display stats instead of players
  }
}, [currentSeason])

// Update header
<h2>{currentSeason?.name} Rankings</h2>
<p className="season-info">
  {currentSeason?.startDate}
  {currentSeason?.endDate ? ` - ${currentSeason.endDate}` : ' - Present'}
</p>

// Show season-specific stats
<div className="player-card">
  <span>{stats.ranking}</span>
  <span>{stats.matchesPlayed} matches</span>
  <span>{stats.wins}W - {stats.losses}L</span>
  <span>GD: {stats.goalsFor - stats.goalsAgainst}</span>
</div>
```

**New Features:**
- Display season name in header
- Show season date range
- Use `player_season_stats` instead of global player stats
- Show goals for/against and goal difference
- Indicator if viewing archived season (read-only badge)

#### **MatchHistory Updates**
File: `src/components/MatchHistory.tsx`

**Changes Needed:**
```typescript
const { currentSeason } = useSeasonContext()

// Header shows season context
<h2>Match History - {currentSeason?.name}</h2>

// Matches already filtered by season via useGameLogic
// Just need to show season indicator

// Add visual distinction for archived seasons
{!currentSeason?.isActive && (
  <div className="archived-banner">
    📦 Viewing archived season - no new matches can be recorded
  </div>
)}
```

#### **RecordMatch Updates**
File: `src/components/RecordMatch.tsx`

**Changes Needed:**
```typescript
const { currentSeason } = useSeasonContext()

// Disable form if viewing archived season
if (!currentSeason?.isActive) {
  return (
    <div className="disabled-message">
      Cannot record matches in archived seasons.
      Switch to {/* active season name */} to record matches.
    </div>
  )
}

// Show which season match will be recorded in
<p className="season-indicator">
  Recording match in: {currentSeason.name}
</p>
```

### Priority 3: Optional Enhancements

#### **SeasonSummary Component**
Location: `src/components/SeasonSummary.tsx`

**Purpose:** Show summary stats for archived seasons

```typescript
interface SeasonSummaryProps {
  season: Season
}

export const SeasonSummary = ({ season }: SeasonSummaryProps) => {
  const [stats, setStats] = useState<PlayerSeasonStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    // Load season data
    const leaderboard = await getSeasonLeaderboard(season.id)
    const seasonMatches = await getMatchesBySeason(season.id)
    setStats(leaderboard)
    setMatches(seasonMatches)
  }, [season.id])

  const winner = stats[0]  // Highest ranking
  const mostImproved = /* calculate biggest ranking gain */
  const mostMatches = /* player with most matches */

  return (
    <div className="season-summary">
      <h2>{season.name} Summary</h2>
      <p>{season.startDate} - {season.endDate}</p>

      <div className="highlights">
        <div className="champion">
          🏆 Champion: {winner.playerName} ({winner.ranking} ELO)
        </div>

        <div className="stats-grid">
          <div>Total Matches: {matches.length}</div>
          <div>Participants: {stats.length}</div>
          <div>Most Improved: {mostImproved.playerName}</div>
          <div>Most Active: {mostMatches.playerName}</div>
        </div>
      </div>

      <div className="top-3">
        <h3>Top 3 Players</h3>
        {stats.slice(0, 3).map((stat, i) => (
          <div key={stat.playerId}>
            <span>{i + 1}. {stat.playerName}</span>
            <span>{stat.ranking} ELO</span>
            <span>{stat.wins}W - {stat.losses}L</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**When to Show:**
- When viewing an archived season
- In season list/history view
- On season detail page

---

## Testing Strategy

### Unit Tests

#### **seasonsService.test.ts**
```typescript
describe('SeasonsService', () => {
  test('getSeasonsByGroup returns seasons ordered by season_number DESC', async () => {})
  test('getActiveSeason returns only active season', async () => {})
  test('endSeasonAndCreateNew increments season_number', async () => {})
  test('endSeasonAndCreateNew sets end_date on old season', async () => {})
})
```

#### **playerSeasonStatsService.test.ts**
```typescript
describe('PlayerSeasonStatsService', () => {
  test('initializePlayerForSeason creates entry with ranking=1200', async () => {})
  test('initializePlayerForSeason is idempotent', async () => {})
  test('getSeasonLeaderboard orders by ranking DESC', async () => {})
  test('calculateGoalDifference returns goalsFor - goalsAgainst', () => {})
})
```

#### **matchesService.test.ts** (Update existing)
```typescript
describe('MatchesService (Season-aware)', () => {
  test('addMatch requires seasonId parameter', async () => {})
  test('addMatch initializes players for season if needed', async () => {})
  test('addMatch uses season-specific rankings for ELO', async () => {})
  test('addMatch updates both global and season stats', async () => {})
})
```

### Integration Tests

#### **season-lifecycle.integration.test.ts**
```typescript
describe('Season Lifecycle', () => {
  test('creating new season ends previous season', async () => {})
  test('matches recorded in new season use 1200 starting rankings', async () => {})
  test('previous season stats remain unchanged', async () => {})
})
```

### Component Tests

#### **SeasonSelector.test.tsx**
```typescript
describe('SeasonSelector', () => {
  test('displays all seasons in dropdown', () => {})
  test('marks active season', () => {})
  test('switches season on selection', () => {})
})
```

#### **SeasonManagement.test.tsx**
```typescript
describe('SeasonManagement', () => {
  test('only visible to group owners', () => {})
  test('shows warning before ending season', () => {})
  test('creates new season with incremented number', () => {})
})
```

---

## Deployment Checklist

### Pre-Deployment

- [x] Database migration created (`008_add_seasons.sql`)
- [x] SQL syntax verified (partial unique index fix applied)
- [x] TypeScript compilation passes
- [x] Biome linter passes
- [x] Code formatted
- [x] FakeDatabase test stubs added
- [x] Documentation updated (CLAUDE.md)

### Deployment Steps

1. **Run Database Migration**
   ```sql
   -- In Supabase SQL Editor
   -- Copy and execute: database/migrations/008_add_seasons.sql
   ```

2. **Verify Migration**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('seasons', 'player_season_stats');

   -- Check Season 1 created for each group
   SELECT g.name, s.name, s.season_number, s.is_active
   FROM seasons s
   JOIN friend_groups g ON s.group_id = g.id
   WHERE s.season_number = 1;

   -- Check matches migrated
   SELECT COUNT(*) FROM matches WHERE season_id IS NOT NULL;
   ```

3. **Deploy Code**
   ```bash
   git add .
   git commit -m "feat: add seasons feature with per-season rankings"
   git push origin main
   ```

4. **Monitor Cloudflare Pages**
   - Check build logs
   - Verify deployment succeeded
   - Test in production

### Post-Deployment Verification

- [ ] Existing users see data in "Season 1"
- [ ] Can record new matches successfully
- [ ] Rankings calculate correctly
- [ ] No errors in browser console
- [ ] Supabase logs show no RLS policy violations

### Post-Deployment UI Rollout

- [ ] Add SeasonSelector to header
- [ ] Add SeasonManagement to admin/settings
- [ ] Update PlayerRankings to show season context
- [ ] Update MatchHistory with season info
- [ ] Add validation to RecordMatch for archived seasons
- [ ] Create SeasonSummary for archived seasons

---

## Future Enhancements

### Phase 2: Advanced Season Features

1. **Automatic Season Scheduling**
   - Cron job to auto-create seasons (monthly/quarterly)
   - Configurable per group

2. **Season Templates**
   - "Spring 2024", "Q1 2024", "January"
   - Auto-naming with date patterns

3. **Season Playoffs**
   - Top N players advance to playoff bracket
   - Separate playoff tracking

4. **Promotion/Relegation**
   - Multiple divisions per group
   - Top performers move up, bottom move down

5. **Season Awards**
   - Champion badge
   - Most Improved award
   - Iron Man (most matches)
   - Comeback Player

6. **Season Analytics**
   - Performance trends across seasons
   - Player ranking history chart
   - Season comparison tool

### Phase 3: Social Features

1. **Season Announcements**
   - Notify all group members when season ends
   - Share season summary via email

2. **Season Betting/Predictions**
   - Predict season winner
   - Leaderboard for predictions

3. **Season Challenges**
   - Win streak challenges
   - Specific matchup challenges

---

## Known Issues / Limitations

### Current State

1. **No UI for Season Management**
   - Backend fully functional
   - Users stuck in Season 1 until UI built
   - Can manually create seasons via Supabase dashboard

2. **Global Stats Still Visible**
   - PlayerRankings shows global stats, not season stats
   - Confusing for users after season resets
   - Easy fix: swap to `getSeasonLeaderboard()`

3. **No Season Context in UI**
   - Users don't know which season they're viewing
   - No visual indicator of active vs archived

4. **Cannot Record in Archived Seasons**
   - Enforced by `currentSeason.isActive` check
   - No UI to prevent/warn users yet

### Technical Debt

1. **Dual Stats Tracking**
   - Global player stats maintained for backwards compat
   - Could be removed in future if not needed
   - Decision: Keep or remove global stats?

2. **Migration Performance**
   - Large groups may have slow migration (calculating season stats)
   - Run migration during low-traffic period

3. **localStorage Season Selection**
   - Keyed by groupId
   - If group deleted, orphaned localStorage entry
   - Not critical, but could be cleaned up

---

## Code References

### Key Files Modified
- `database/migrations/008_add_seasons.sql` - Complete DB schema
- `src/types/index.ts` - Season types
- `src/lib/database.ts` - Database interface
- `src/lib/supabase-database.ts` - Supabase implementation
- `src/services/seasonsService.ts` - Season CRUD
- `src/services/playerSeasonStatsService.ts` - Season stats
- `src/services/matchesService.ts` - Season-aware match recording
- `src/contexts/SeasonContext.tsx` - React state management
- `src/hooks/useGameLogic.ts` - Season-aware game logic
- `src/App.tsx` - SeasonProvider integration
- `src/test/fake-database.ts` - Test stubs
- `CLAUDE.md` - Documentation

### Database Functions
- `end_season_and_create_new()` - RPC function in migration

### Performance Indexes
- `idx_seasons_group_id` - Season queries by group
- `idx_one_active_season_per_group` - Enforce single active season
- `idx_seasons_active` - Active season lookups
- `idx_matches_season_id` - Match queries by season
- `idx_player_season_stats_season` - Leaderboard queries
- `idx_player_season_stats_player` - Player stat lookups

---

## Questions for Product Owner

1. **Season Naming Convention**
   - Auto-generate names (Season 1, 2, 3)?
   - Allow custom names (Spring 2024, Champions League)?
   - Current: Custom names allowed

2. **Season Duration**
   - Fixed duration (monthly, quarterly)?
   - Manual control only?
   - Current: Manual control

3. **Multiple Active Seasons**
   - Should groups have multiple concurrent seasons (regular + playoffs)?
   - Current: One active season per group

4. **Historical Stats Display**
   - Show all-time stats in addition to season stats?
   - Keep global stats or remove?
   - Current: Both tracked

5. **Season Reset Confirmation**
   - How much warning before season ends?
   - Require vote or just owner decision?
   - Current: Owner decision only

---

## Contact

For questions about this implementation:
- Review code comments in service files
- Check `CLAUDE.md` for architecture overview
- Read database migration for schema details
- See this document for complete context

**Status:** Ready for UI implementation. Backend is production-ready.
