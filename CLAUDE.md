# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `npm run dev` - Start development server with Vite HMR
- **Build**: `npm run build` - TypeScript compilation + Vite production build
- **Type Check**: `npm run typecheck` - Run TypeScript compiler in check mode
- **Lint**: `npm run lint` - Check code with Biome linter
- **Lint Fix**: `npm run lint:fix` - Auto-fix linting issues with Biome
- **Format**: `npm run format` - Format code with Biome
- **Test**: `npm run test` - Run tests in watch mode with Vitest
- **Test Run**: `npm run test:run` - Run all tests once
- **Test UI**: `npm run test:ui` - Run tests with UI interface
- **Test Coverage**: `npm run test:coverage` - Run tests with coverage report

## Architecture Overview

This is a React + TypeScript foosball ranking application built with Vite. The app tracks players, matches, and calculates ELO-based rankings for office foosball games with Supabase backend integration.

### Core Architecture

- **React 19** with TypeScript and Vite for fast development
- **Supabase** for authentication, real-time database, and Row Level Security (RLS)
- **Tailwind CSS** with custom styling for UI components
- **Component-based architecture** with clear separation of concerns
- **Custom hooks** and React Context for state management

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

- `src/App.tsx` - Main app component with authentication, group, and season contexts
- `src/hooks/useAuth.ts` - Authentication logic with Supabase
- `src/contexts/GroupContext.tsx` - Group management and state
- `src/contexts/SeasonContext.tsx` - Season management and state
- `src/hooks/useGameLogic.ts` - Season-aware game logic with ELO calculations
- `src/services/` - Service layer for data operations (players, matches, groups, seasons)
  - `seasonsService.ts` - Season CRUD operations
  - `playerSeasonStatsService.ts` - Player season participation (statistics computed from matches)
  - `matchesService.ts` - Match recording (statistics automatically computed)
- `src/types/index.ts` - TypeScript interfaces for all entities
- `src/components/` - Reusable UI components including auth and group management

### Database Schema

- **friend_groups** - Private groups with invite codes and ownership
- **group_memberships** - User membership in groups with roles
- **seasons** - Competitive seasons with start/end dates (one active per group)
- **players** - Group-scoped player profiles (statistics computed from matches)
- **player_season_stats** - Player season participation tracking (statistics computed from matches)
- **matches** - **Single source of truth** - Match records with team compositions, scores, rankings, and season association
- **player_stats_computed** - Database view providing global player statistics computed from matches
- **player_season_stats_computed** - Database view providing per-season statistics computed from matches
- **Row Level Security** policies ensure complete data isolation between groups

**Important**: Player statistics (wins, losses, ranking, etc.) are NOT stored in the `players` or `player_season_stats` tables. Instead, they are computed on-demand from the `matches` table using database views and functions. This ensures a single source of truth and eliminates data synchronization issues.

### Styling

- **Biome** for code formatting and linting (configured for 2-space indents, single quotes)
- **Tailwind CSS v4** with PostCSS for styling
- Custom gradient backgrounds and responsive design

### TypeScript Configuration

- Strict TypeScript setup with separate configs for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
- Path aliases configured with `@/` pointing to `src/`

### Testing

- **Vitest** with React Testing Library for unit and component tests
- Custom test utilities in `src/test/test-utils.tsx` with context providers
- Component tests in `src/components/__tests__/`
- Hook tests in `src/hooks/__tests__/`

## Development Workflow

### Getting Started

1. **Environment Setup**: Create `.env.local` with Supabase credentials
2. **Database Setup**: Execute `/database/00_complete_reset.sql` in Supabase SQL Editor if using Supabase
3. **Development**: Run `npm run dev` to start the development server

### Quality Assurance Requirements

**IMPORTANT**: After implementing every feature or fix of a non-trivial size, run the following commands and fix any issues:

1. `npm run lint` - Check code with Biome linter
2. `npm run test:run` - Run all tests once
3. `npm run format` - Format code with Biome
4. `npm run typecheck` - Ensure TypeScript compliance

This ensures consistent code quality and prevents regressions from reaching production.

### Database Management

- **Migration-based Changes**: All SQL schema changes should be handled through migration files in the `/database/migrations/` folder
- **Single Reset Script**: Use `/database/00_drop_and_create.sql` for initial database setup only
- **Development**: For development, you can still use the reset script for complete recreation
- **Production**: Always use migrations for production database changes to preserve data
- **RLS Policies**: Designed to work with public JS client without circular dependencies
- **Seasons Migration**: `/database/migrations/008_add_seasons.sql` creates seasons infrastructure and migrates existing data to "Season 1"

### Seasons Feature Architecture

**Database Layer**:
- **seasons** table (`/database/migrations/008_add_seasons.sql`): Tracks competitive periods with start/end dates, one active per group
- **player_season_stats** table: Tracks which players participated in which seasons (statistics computed from matches)
- **matches.season_id**: Foreign key associating each match with a season
- **Computed statistics** (`/database/migrations/009_add_computed_stats.sql`): Database views and functions compute all statistics from matches
- **Partial unique index**: Ensures only one active season per group
- **Data migration**: Automatically creates "Season 1" for existing groups and associates all existing matches

**Service Layer**:
- **seasonsService**: Season CRUD operations, get active season, end/create seasons
- **playerSeasonStatsService**: Initialize players for seasons, get computed statistics, get leaderboards
- **matchesService**: Season-aware match recording (statistics automatically computed from views)

**State Management**:
- **SeasonContext**: Manages current season, loads seasons on group change
- **localStorage**: Persists selected season per group (key: `selectedSeasonId_{groupId}`)
- **Auto-selection**: Defaults to active season, falls back to most recent

**Key Design Decisions**:
- **Reset rankings**: Each season starts fresh at 1200 ELO
- **Manual season management**: Group owners explicitly create/end seasons
- **Full historical access**: All past seasons remain queryable
- **Computed statistics**: All stats derived from match history (single source of truth)
- **Season scoping**: Matches filtered by current season in UI

### Supabase Integration

- **Full backend integration** with authentication and real-time sync
- **Row Level Security** for data isolation
- **Magic link authentication** for passwordless login

### Data Flow

1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups → GroupContext → Current group
3. **Season Selection**: Group seasons → SeasonContext → Current season (persisted to localStorage per group)
4. **Game Data**: Service layer → useGameLogic → UI components (filtered by current season)
5. **Match Recording**:
   - Records match in active season with pre/post rankings for each player
   - Statistics automatically computed from match history via database views
   - Uses season-specific rankings for ELO calculations
6. **Statistics Retrieval**:
   - Queries database views (`player_stats_computed`, `player_season_stats_computed`)
   - Rankings computed on-demand from chronological match replay
7. **Real-time**: Supabase subscriptions (planned) → Context updates

### Key Implementation Details

- All data operations go through service layer for consistent data handling
- Group-based data scoping ensures privacy and security
- Season-based data isolation with independent rankings per season
- ELO ranking system with asymmetric K-factors (K_WINNER=35, K_LOSER=29) for slight inflation
- Rankings clamped between 800-2400, all seasons start at 1200
- **Statistics computed from matches**: Single source of truth eliminates synchronization issues
  - Database views aggregate wins/losses/goals from matches table
  - PostgreSQL functions replay match history chronologically to compute rankings
  - No aggregated stats stored in players or player_season_stats tables
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