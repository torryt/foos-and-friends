# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `pnpm dev:foosball` / `pnpm dev:padel` - Start development server with Vite HMR
- **Build**: `pnpm build` - TypeScript compilation + Vite production build for all apps
- **Build Specific**: `pnpm build:foosball` / `pnpm build:padel` - Build individual apps
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
│   └── padel/                   # Padel ranking app (@foos/padel)
│       ├── src/                 # Same structure as foosball
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

- **sport_type column** on `friend_groups` table distinguishes foosball vs padel groups
- Each app filters groups by its sport type (configured in GroupContext)
- Shared user accounts across both sports
- Same database, complete data isolation per sport

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
- `src/types/index.ts` - TypeScript interfaces for all entities
- `src/utils/` - ELO calculations, matchmaking, streak calculations

App-specific (`apps/foosball/` or `apps/padel/`):
- `src/App.tsx` - Main app component with authentication, group, and season contexts
- `src/hooks/useAuth.ts` - Authentication logic with Supabase
- `src/contexts/GroupContext.tsx` - Group management and state (sport-type filtered)
- `src/contexts/SeasonContext.tsx` - Season management and state
- `src/hooks/useGameLogic.ts` - Season-aware game logic with ELO calculations
- `src/lib/init.ts` - Service initialization with environment variables
- `src/components/` - Reusable UI components including auth and group management

### Database Schema

- **friend_groups** - Private groups with invite codes, ownership, and sport_type
- **group_memberships** - User membership in groups with roles
- **seasons** - Competitive seasons with start/end dates (one active per group)
- **players** - Group-scoped player profiles with global rankings (for backwards compatibility)
- **player_season_stats** - Per-season statistics (ranking, wins, losses, goals)
- **matches** - Match records with team compositions, scores, and season association
- **Row Level Security** policies ensure complete data isolation between groups

### Styling

- **Biome** for code formatting and linting (configured for 2-space indents, single quotes)
- **Tailwind CSS v4** with PostCSS for styling
- Custom gradient backgrounds and responsive design
- Foosball: Blue theme (#3b82f6), Padel: Green theme (#10b981)

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
2. **Database Setup**: Execute `/database/00_complete_reset.sql` in Supabase SQL Editor if using Supabase
3. **Install Dependencies**: Run `pnpm install` at the root
4. **Development**:
   - Foosball: `pnpm dev:foosball` (runs on port 5173)
   - Padel: `pnpm dev:padel` (runs on port 5174)

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

### Seasons Feature Architecture

**Database Layer** (`/database/migrations/008_add_seasons.sql`):
- **seasons** table: Tracks competitive periods with start/end dates, one active per group
- **player_season_stats** table: Per-season statistics (ranking starts at 1200, wins, losses, goals)
- **matches.season_id**: Foreign key associating each match with a season
- **Partial unique index**: Ensures only one active season per group
- **Data migration**: Automatically creates "Season 1" for existing groups and associates all existing matches

**Service Layer**:
- **seasonsService**: Season CRUD operations, get active season, end/create seasons
- **playerSeasonStatsService**: Initialize players for seasons, update stats, get leaderboards
- **matchesService**: Season-aware match recording with dual updates (global + season stats)

**State Management**:
- **SeasonContext**: Manages current season, loads seasons on group change
- **localStorage**: Persists selected season per group (key: `selectedSeasonId_{groupId}`)
- **Auto-selection**: Defaults to active season, falls back to most recent

**Key Design Decisions**:
- **Reset rankings**: Each season starts fresh at 1200 ELO
- **Manual season management**: Group owners explicitly create/end seasons
- **Full historical access**: All past seasons remain queryable
- **Backwards compatibility**: Global player stats maintained alongside season stats
- **Season scoping**: Matches filtered by current season in UI

### Supabase Integration

- **Full backend integration** with authentication and real-time sync
- **Row Level Security** for data isolation
- **Magic link authentication** for passwordless login

### Data Flow

1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups (filtered by sport_type) → GroupContext → Current group
3. **Season Selection**: Group seasons → SeasonContext → Current season (persisted to localStorage per group)
4. **Game Data**: Service layer → useGameLogic → UI components (filtered by current season)
5. **Match Recording**:
   - Records match in active season
   - Updates both player global stats (backwards compat) and player_season_stats
   - Uses season-specific rankings for ELO calculations
6. **Real-time**: Supabase subscriptions (planned) → Context updates

### Key Implementation Details

- All data operations go through service layer for consistent data handling
- Group-based data scoping ensures privacy and security
- Season-based data isolation with independent rankings per season
- Sport-type filtering isolates foosball and padel groups per app
- ELO ranking system with asymmetric K-factors (K_WINNER=35, K_LOSER=29) for slight inflation
- Rankings clamped between 800-2400, all seasons start at 1200
- Dual stats tracking: global player stats (backwards compat) + per-season stats
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
