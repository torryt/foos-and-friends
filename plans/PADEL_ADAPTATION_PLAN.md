# Padel Tennis Adaptation Plan

## Executive Summary

This document outlines a comprehensive plan to adapt the current foosball tracking application ("Foos & Friends") to support padel tennis. Based on research into padel scoring systems, tournament formats, and gameplay differences, this plan recommends extending the existing app to become a multi-sport platform rather than creating a separate application.

## Architecture Decision: Single App vs Separate Apps

### **Recommendation: Single Multi-Sport App** ✅

**Rationale:**
- **Shared Core Features**: Both sports require identical core functionality (player management, match tracking, ELO rankings, group management)
- **Code Reuse**: 80%+ of existing codebase can be leveraged
- **Maintenance Efficiency**: Single codebase, database, and deployment pipeline
- **User Experience**: Users can participate in both sports within one account
- **Business Logic**: Authentication, groups, and social features are sport-agnostic

**Architecture Approach:**
- Sport-specific configuration per group
- Flexible scoring system to handle both foosball (first-to-score) and padel (tennis scoring + Mexicano tournaments)
- Shared ELO ranking system with sport-specific isolation

## Padel Sport Analysis

### Scoring Systems
1. **Standard Padel Matches**: Tennis scoring (15-30-40-game, sets, matches) with optional "Golden Point" at deuce
2. **Mexicano Tournament Format**: Point-based system (typically to 24 points, ~10-12 minutes per match)
3. **Match Formats**: Primarily 2v2, occasionally 1v1

### Key Differences from Foosball
| Aspect | Foosball | Padel |
|--------|----------|-------|
| Scoring | First to X goals (5, 10, etc.) | Tennis scoring or point-based (Mexicano) |
| Match Duration | 5-15 minutes | 45-90 minutes (standard) / 10-12 minutes (Mexicano) |
| Tournament Format | Round-robin, elimination | Mexicano (dynamic pairing based on scores) |
| Team Composition | Always 2v2 | Primarily 2v2, some 1v1 |
| Session Structure | Individual matches | Tournament sessions with multiple matches |

## Implementation Plan

### Phase 1: Multi-Sport Foundation (4-6 weeks)

#### 1.1 Database Schema Updates
```sql
-- Add sport configuration to groups
ALTER TABLE friend_groups ADD COLUMN sport_type VARCHAR(20) DEFAULT 'foosball';
ALTER TABLE friend_groups ADD COLUMN sport_config JSONB DEFAULT '{}';

-- Add match format tracking
ALTER TABLE matches ADD COLUMN match_format VARCHAR(50) DEFAULT 'standard';
ALTER TABLE matches ADD COLUMN tournament_session_id UUID REFERENCES tournament_sessions(id);

-- New tables for tournaments
CREATE TABLE tournament_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES friend_groups(id),
  name VARCHAR(255),
  format VARCHAR(50), -- 'mexicano', 'americano', 'round_robin'
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 Type System Enhancements
```typescript
// Sport configuration
export type SportType = 'foosball' | 'padel'

export interface SportConfig {
  type: SportType
  scoring: ScoringConfig
  matchSettings: MatchSettings
}

export interface ScoringConfig {
  // Foosball: { type: 'first_to', target: 10 }
  // Padel Standard: { type: 'tennis', sets: 3, games: 6 }
  // Padel Mexicano: { type: 'points', target: 24 }
  type: 'first_to' | 'tennis' | 'points'
  target?: number
  sets?: number
  games?: number
  goldenPoint?: boolean
}

// Extended match interface
export interface Match {
  // ... existing fields
  format: 'standard' | 'mexicano' | 'americano'
  tournamentSessionId?: string
  detailedScore?: TennisScore | PointScore
}

export interface TennisScore {
  sets: Array<{ team1Games: number; team2Games: number }>
  currentGame?: { team1Points: string; team2Points: string } // "15", "30", "40", "AD"
}

export interface PointScore {
  team1Points: number
  team2Points: number
  totalTarget: number
}
```

#### 1.3 UI/UX Updates
- **Group Creation**: Add sport selection during group setup
- **Branding**: Dynamic app title and styling based on selected sport
- **Navigation**: Sport-specific terminology and icons

### Phase 2: Padel-Specific Features (3-4 weeks)

#### 2.1 Tennis Scoring System
- Live scoring interface with tennis scoring logic
- Set and game tracking
- Golden Point implementation
- Score history and statistics

#### 2.2 Mexicano Tournament System
```typescript
export interface MexicanoTournament {
  id: string
  groupId: string
  rounds: MexicanoRound[]
  players: Player[]
  currentRound: number
  status: 'setup' | 'active' | 'completed'
}

export interface MexicanoRound {
  roundNumber: number
  matches: MexicanoMatch[]
  pairings: 'random' | 'score_based'
}

export interface MexicanoMatch {
  matchId: string
  players: [Player, Player, Player, Player] // team1[0,1], team2[0,1]
  targetPoints: number
  status: 'pending' | 'active' | 'completed'
}
```

#### 2.3 Tournament Management
- Mexicano tournament creation and management
- Dynamic pairing algorithm based on accumulated scores
- Real-time tournament standings
- Session-based tournament tracking

### Phase 3: Enhanced Features (2-3 weeks)

#### 3.1 Advanced Statistics
- Sport-specific analytics dashboard
- Tournament performance tracking
- Head-to-head records with sport breakdown
- Season/tournament summaries

#### 3.2 Social Features
- Sport-specific achievements and badges
- Tournament sharing and invitations
- Cross-sport rankings and comparisons

## Branding Strategy

### App Name Options
1. **"Courts & Friends"** - Generic sports focus
2. **"Racquet & Ball"** - Covers both padel and foosball
3. **"Game Track Pro"** - Professional sports tracking
4. **"Sports & Friends"** - Simple and inclusive

### Visual Identity
- **Dynamic Theming**: Sport-specific color schemes and iconography
- **Foosball**: Orange/red gradient (current)
- **Padel**: Blue/green gradient (court colors)
- **Shared Elements**: Consistent typography and layout principles
- **Sport Icons**: Contextual icons in navigation and headers

### Terminology Adaptation
| Component | Foosball | Padel |
|-----------|----------|-------|
| App Header | "Foos & Friends" | "Padel & Friends" |
| Match Button | "Record Foosball Match" | "Record Padel Match" |
| Rankings | "Foosball Rankings" | "Padel Rankings" |
| Quick Stats | "Goals", "Wins/Losses" | "Sets", "Matches Won" |

## Technical Implementation

### 3.1 Configuration-Driven Architecture
```typescript
// Sport configuration factory
export const createSportConfig = (type: SportType): SportConfig => {
  switch (type) {
    case 'foosball':
      return {
        type: 'foosball',
        scoring: { type: 'first_to', target: 10 },
        matchSettings: { duration: '5-15 min', teamSize: 2 }
      }
    case 'padel':
      return {
        type: 'padel',
        scoring: { type: 'tennis', sets: 3, games: 6, goldenPoint: true },
        matchSettings: { duration: '45-90 min', teamSize: 2 }
      }
  }
}
```

### 3.2 Scoring Engine Abstraction
```typescript
// Abstract scoring system
export interface ScoringEngine {
  recordPoint(team: 1 | 2): ScoreUpdate
  isMatchComplete(): boolean
  getDisplayScore(): string
  getDetailedScore(): any
}

export class FoosballScoring implements ScoringEngine { /* ... */ }
export class TennisScoring implements ScoringEngine { /* ... */ }
export class MexicanoScoring implements ScoringEngine { /* ... */ }
```

### 3.3 ELO Rating System
- **Separate ELO pools** per sport within each group
- **Shared algorithm** with sport-specific K-factors if needed
- **Cross-sport insights** without affecting rankings

## Database Migration Strategy

### Migration Plan
1. **Add sport configuration columns** with foosball defaults
2. **Migrate existing data** to new schema with foosball sport type
3. **Create tournament tables** for padel-specific features
4. **Update RLS policies** to handle sport-specific data access

### Data Migration Script
```sql
-- Phase 1: Add columns with defaults
ALTER TABLE friend_groups ADD COLUMN sport_type VARCHAR(20) DEFAULT 'foosball';
UPDATE friend_groups SET sport_type = 'foosball' WHERE sport_type IS NULL;

-- Phase 2: Migrate match data
ALTER TABLE matches ADD COLUMN match_format VARCHAR(50) DEFAULT 'standard';
UPDATE matches SET match_format = 'standard' WHERE match_format IS NULL;
```

## Deployment Strategy

### Rollout Plan
1. **Beta Testing**: Deploy to staging with padel features for testing
2. **Feature Flags**: Gradual rollout of padel features to existing groups
3. **New Group Onboarding**: Sport selection for new groups
4. **Migration Tools**: Allow existing foosball groups to add padel support

### Backward Compatibility
- **Existing Groups**: Continue functioning as foosball-only groups
- **Data Integrity**: All existing matches and rankings preserved
- **UI Compatibility**: Foosball groups see unchanged interface
- **Migration Path**: Optional upgrade to multi-sport or padel-only

## Timeline and Resources

### Development Timeline: 9-13 weeks total
- **Phase 1**: Multi-Sport Foundation (4-6 weeks)
- **Phase 2**: Padel Features (3-4 weeks)
- **Phase 3**: Enhanced Features (2-3 weeks)

### Resource Requirements
- **1 Full-Stack Developer**: Core development
- **1 UI/UX Designer**: Sport-specific branding and user flows
- **1 Product Manager**: Requirements and testing coordination
- **Beta Testers**: 10-15 padel players for user testing

## Success Metrics

### Technical Metrics
- **Code Reuse**: >80% of existing codebase leveraged
- **Performance**: No degradation to existing foosball functionality
- **Test Coverage**: Maintain >90% coverage across both sports

### User Metrics
- **Adoption Rate**: 30% of existing groups enable padel features
- **New User Acquisition**: 50% increase in user registrations
- **Engagement**: Average session duration maintained or improved
- **Retention**: Monthly active users maintained across both sports

## Risk Assessment

### Technical Risks
- **Complexity**: Managing sport-specific logic without code duplication
- **Performance**: Ensuring tournament calculations don't impact app speed
- **Data Migration**: Seamless transition without data loss

### Mitigation Strategies
- **Modular Architecture**: Clear separation of sport-specific components
- **Comprehensive Testing**: Unit, integration, and performance tests
- **Gradual Rollout**: Feature flags and staged deployment
- **Backup Strategy**: Database snapshots before major migrations

## Conclusion

Adapting the foosball app to support padel represents a strategic opportunity to create a comprehensive racquet sports platform. The shared architecture, user base, and core functionality make this extension highly efficient compared to building a separate application.

The recommended approach preserves the existing user experience while opening new market opportunities in the growing padel community. With careful implementation of the multi-sport architecture, both foosball and padel users will benefit from enhanced features and a more robust platform.

**Next Steps:**
1. Validate technical approach with development team
2. Create detailed technical specifications for Phase 1
3. Design UI mockups for sport selection and padel-specific interfaces
4. Begin beta user recruitment from local padel communities
5. Set up development environment for multi-sport testing

---

*Document Version: 1.0*
*Created: 2025-01-13*
*Status: Draft for Review*