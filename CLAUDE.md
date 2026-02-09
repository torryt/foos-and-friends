# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `pnpm dev:foosball` / `pnpm dev:padel` / `pnpm dev:chess` - Start development server with Vite HMR
- **Build**: `pnpm build` - TypeScript compilation + Vite production build for all apps
- **Build Specific**: `pnpm build:foosball` / `pnpm build:padel` / `pnpm build:chess` - Build individual apps
- **Type Check**: `pnpm typecheck` - Run TypeScript compiler in check mode for all packages
- **Lint**: `pnpm lint` - Check code with Biome linter
- **Lint Fix**: `pnpm lint:fix` - Auto-fix linting issues with Biome
- **Format**: `pnpm format` - Format code with Biome
- **Test**: `pnpm test` - Run tests in watch mode with Vitest
- **Test Run**: `pnpm test:run` - Run all tests once
- **Test Coverage**: `pnpm test:coverage` - Run tests with coverage report

## Architecture Overview

This is a pnpm workspaces monorepo containing multiple React + TypeScript sports ranking applications built with Vite. The apps track players, matches, and calculate ELO-based rankings with Supabase backend integration.

### Monorepo Structure

```
foos-and-friends/
├── packages/
│   └── shared/                  # Shared backend layer (@foos/shared)
│       ├── src/
│       │   ├── lib/             # database.ts, supabase-database.ts, supabase.ts
│       │   ├── services/        # All services (players, matches, groups, seasons)
│       │   ├── types/           # TypeScript interfaces
│       │   ├── utils/           # matchmaking.ts, streakCalculations.ts
│       │   ├── constants/       # avatars.ts
│       │   └── test/            # Test utilities
│       └── package.json
│
├── apps/
│   ├── foosball/                # Foosball ranking app (@foos/foosball)
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   ├── routes/          # TanStack Router routes
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── contexts/        # React Context providers
│   │   │   └── lib/init.ts      # App-specific service initialization
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── padel/                   # Padel ranking app (@foos/padel)
│   │   ├── src/                 # Same structure as foosball
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── chess/                   # Chess ranking app (@foos/chess)
│       ├── src/                 # Same structure as foosball (1v1 only)
│       ├── package.json
│       └── vite.config.ts
│
├── database/                    # SQL migrations (shared)
├── package.json                 # Workspace root
└── pnpm-workspace.yaml          # Workspace configuration
```

### Core Architecture

- **React 19** with TypeScript and Vite for fast development
- **Supabase** for authentication, real-time database, and Row Level Security (RLS)
- **Tailwind CSS** with custom styling for UI components
- **Component-based architecture** with clear separation of concerns
- **Custom hooks** and React Context for state management
- **pnpm workspaces** for monorepo management

### Multi-Sport Support

- **sport_type column** on `friend_groups` table distinguishes foosball, padel, and chess groups
- `SportType = 'foosball' | 'padel' | 'chess'` defined in shared types
- Each app filters groups by its sport type (configured in GroupContext)
- Shared user accounts across all sports
- Same database, complete data isolation per sport

### Match Types (1v1 & 2v2)

- **`MatchType = '1v1' | '2v2'`** defined in shared types
- **`supported_match_types`** column on `friend_groups` determines which match types a group supports
- **1v1 matches**: `team1_player2_id` and `team2_player2_id` are `null`; direct player-vs-player ELO
- **2v2 matches**: All four player columns populated; team-averaged ELO
- **Separate computed views**: `player_season_stats_1v1_computed` and `player_season_stats_2v2_computed` for independent rankings
- **Chess** defaults to `['1v1']` only; foosball and padel default to `['2v2']` but can support both

### Authentication & Groups

- **Magic Link Authentication** with Supabase Auth (passwordless)
- **Private Friend Groups** with invite-only access via shareable codes
- **Complete data isolation** between groups using RLS policies

### Seasons System

- **Competitive Seasons** with independent rankings per season
- **Fresh Start**: Each season resets all player rankings to 1200
- **Season Management**: Group owners can manually create and end seasons
- **Historical Data**: Full access to archived season leaderboards and match history
- **Automatic Migration**: Existing matches automatically migrated to "Season 1"

### Key Components Structure

Shared package (`packages/shared/`):
- `src/lib/database.ts` - Database interface abstraction
- `src/lib/supabase-database.ts` - Supabase implementation
- `src/lib/supabase.ts` - Supabase client initialization
- `src/services/` - Service layer for data operations
- `src/types/index.ts` - TypeScript interfaces for all entities (includes `MatchType`, `SportType`)
- `src/utils/` - ELO calculations, matchmaking, streak calculations

App-specific (`apps/foosball/`, `apps/padel/`, or `apps/chess/`):
- `src/App.tsx` - Main app component with authentication, group, and season contexts
- `src/hooks/useAuth.ts` - Authentication logic with Supabase
- `src/contexts/GroupContext.tsx` - Group management and state (sport-type filtered)
- `src/contexts/SeasonContext.tsx` - Season management and state
- `src/hooks/useGameLogic.ts` - Season-aware game logic with ELO calculations
- `src/components/Manual1v1Workflow.tsx` - 1v1 match recording workflow
- `src/components/MatchEntryModal.tsx` - Match type selection (1v1/2v2) and recording
- `src/lib/init.ts` - Service initialization with environment variables
- `src/components/` - Reusable UI components including auth and group management

### Database Schema

- **friend_groups** - Private groups with invite codes, ownership, sport_type, and supported_match_types
- **group_memberships** - User membership in groups with roles
- **seasons** - Competitive seasons with start/end dates (one active per group)
- **players** - Group-scoped player profiles
- **player_season_stats** - Per-season statistics (ranking, wins, losses, goals) - computed from match history
- **player_season_stats_1v1_computed** - Computed view for 1v1 rankings per season
- **player_season_stats_2v2_computed** - Computed view for 2v2 rankings per season (default)
- **matches** - Match records with team compositions, scores, season association, and match_type (`1v1` or `2v2`)
- **Row Level Security** policies ensure complete data isolation between groups

### Styling

- **Biome** for code formatting and linting (configured for 2-space indents, single quotes)
- **Tailwind CSS v4** with PostCSS for styling
- Custom gradient backgrounds and responsive design
- Foosball: Blue theme (#3b82f6), Padel: Green theme (#10b981), Chess: Purple theme (#832161)

### TypeScript Configuration

- Strict TypeScript setup with separate configs for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
- Path aliases configured with `@/` pointing to app's `src/` and `@foos/shared` for shared package

### Testing

- **Vitest** with React Testing Library for unit and component tests
- Custom test utilities in `packages/shared/src/test/test-utils.tsx` with context providers
- Component tests in `apps/*/src/components/__tests__/`
- Hook tests in `apps/*/src/hooks/__tests__/`

## Development Workflow

### Getting Started

1. **Environment Setup**: Create `.env.local` files in each app with Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. **Database Setup**: Execute `/database/00_drop_and_create.sql` in Supabase SQL Editor if using Supabase
3. **Install Dependencies**: Run `pnpm install` at the root
4. **Development**:
   - Foosball: `pnpm dev:foosball` (runs on port 5173)
   - Padel: `pnpm dev:padel` (runs on port 5174)
   - Chess: `pnpm dev:chess` (runs on port 5175)

### Quality Assurance Requirements

**IMPORTANT**: After implementing every feature or fix of a non-trivial size, run the following commands and fix any issues:

1. `pnpm lint` - Check code with Biome linter
2. `pnpm test:run` - Run all tests once
3. `pnpm format` - Format code with Biome
4. `pnpm typecheck` - Ensure TypeScript compliance

This ensures consistent code quality and prevents regressions from reaching production.

### Database Management

- **Migration-based Changes**: All SQL schema changes should be handled through migration files in the `/database/migrations/` folder
- **Single Reset Script**: Use `/database/00_drop_and_create.sql` for initial database setup only
- **Development**: For development, you can still use the reset script for complete recreation
- **Production**: Always use migrations for production database changes to preserve data
- **RLS Policies**: Designed to work with public JS client without circular dependencies
- **Seasons Migration**: `/database/migrations/008_add_seasons.sql` creates seasons infrastructure and migrates existing data to "Season 1"
- **Sport Type Migration**: `/database/migrations/014_add_sport_type.sql` adds sport_type column for multi-sport support
- **Match Type Migration**: `/database/migrations/016_add_match_type_support.sql` adds 1v1/2v2 match type support, computed stats views, and supported_match_types on groups
- **Chess Migration**: `/database/migrations/017_add_chess_sport_type.sql` adds chess as a valid sport_type

### Seasons Feature Architecture

**Database Layer** (`/database/migrations/008_add_seasons.sql`):
- **seasons** table: Tracks competitive periods with start/end dates, one active per group
- **player_season_stats** table: Per-season statistics (ranking starts at 1200, wins, losses, goals)
- **matches.season_id**: Foreign key associating each match with a season
- **Partial unique index**: Ensures only one active season per group
- **Data migration**: Automatically creates "Season 1" for existing groups and associates all existing matches

**Service Layer**:
- **seasonsService**: Season CRUD operations, get active season, end/create seasons
- **playerSeasonStatsService**: Initialize players for seasons, update stats, get leaderboards (supports matchType filtering)
- **matchesService**: Season-aware match recording with support for both 1v1 and 2v2 match types

**State Management**:
- **SeasonContext**: Manages current season, loads seasons on group change
- **localStorage**: Persists selected season per group (key: `selectedSeasonId_{groupId}`)
- **Auto-selection**: Defaults to active season, falls back to most recent

**Key Design Decisions**:
- **Reset rankings**: Each season starts fresh at 1200 ELO
- **Manual season management**: Group owners explicitly create/end seasons
- **Full historical access**: All past seasons remain queryable
- **Season scoping**: Matches filtered by current season in UI
- **Independent 1v1/2v2 rankings**: Separate computed views per match type per season

### Supabase Integration

- **Full backend integration** with authentication and real-time sync
- **Row Level Security** for data isolation
- **Magic link authentication** for passwordless login

### Data Flow

1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups (filtered by sport_type) → GroupContext → Current group
3. **Season Selection**: Group seasons → SeasonContext → Current season (persisted to localStorage per group)
4. **Game Data**: Service layer → useGameLogic → UI components (filtered by current season and match type)
5. **Match Recording**:
   - User selects match type (1v1 or 2v2) based on group's supported_match_types
   - Records match in active season with match_type
   - ELO calculated using match-type-specific rankings (1v1 or 2v2)
   - Rankings updated in computed views automatically
6. **Real-time**: Supabase subscriptions (planned) → Context updates

### Key Implementation Details

- All data operations go through service layer for consistent data handling
- Group-based data scoping ensures privacy and security
- Season-based data isolation with independent rankings per season
- Sport-type filtering isolates foosball, padel, and chess groups per app
- ELO ranking system with asymmetric K-factors (K_WINNER=35, K_LOSER=29) for slight inflation
- Rankings clamped between 800-2400, all seasons start at 1200
- Match type support: 1v1 (direct player vs player) and 2v2 (team-based)
- Separate computed views for 1v1 and 2v2 rankings per season
- Season lifecycle: Only one active season per group, group owners control season transitions

## Production Deployment

### Hosting Strategy

**Phase 1 (Current)**: Static deployment with free tier
- **Frontend**: Cloudflare Pages (free, excellent EU coverage)
- **Backend**: Supabase (existing setup)
- **Email**: Brevo SMTP (free tier, EU-focused, GDPR compliant)
- **Cost**: €0/month

**Phase 2 (Future Service Layer)**: Add backend services when needed
- **API Services**: Railway ($5/month) for best DX, or Render ($7/month) for EU regions
- **Deployment**: Seamless transition from static to full-stack
- **Cost**: €5-7/month

### SMTP Configuration

- **Provider**: Brevo (300 emails/day free, EU-based)
- **Use Case**: Supabase magic link authentication emails
- **Setup**: Configure SMTP credentials in Supabase Auth settings
- **Alternative**: Mailtrap (3,500 emails/month free) for higher volume
