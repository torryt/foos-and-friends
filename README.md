# Foos & Friends

A pnpm workspaces monorepo containing React + TypeScript sports ranking applications for tracking games with ELO-based rankings. Built with Vite and designed for private friend groups with complete data isolation.

## Apps

- **Foosball** (`apps/foosball`) - Office foosball ranking tracker
- **Chess** (`apps/chess`) - Chess ranking tracker

All apps share the same backend infrastructure and user accounts, but maintain separate groups and data per sport.

## Features

- **Private Friend Groups** - Invite-only groups with shareable codes and data isolation
- **ELO Rankings** - Seasonal rankings supporting both 1v1 and 2v2 matches, plus a continuous all-time rating that spans seasons
- **1v1 & 2v2 Support** - Flexible match types per group (configurable per sport); chess also supports draws (remis)
- **Match Tracking** - Winner-first score entry with per-group target score and automatic rating updates
- **Competitive Seasons** - Independent rankings per season with a season picker and historical views
- **Skill Tiers** - 5 ranking tiers with color-coded badges (Beginner to Master)
- **Member Management** - Group owners and admins can promote and remove members
- **Invite Links** - Shareable links for seamless user onboarding
- **Real-time Updates** - Supabase integration with Row Level Security
- **Email/Password & Magic Link Auth** - Shared Supabase auth module with password reset
- **Light/Dark/System Appearance** - Appearance setting with a distinct dark theme
- **Mobile-First Responsive Design** - Tailwind CSS, built for small screens first
- **Mock Mode** - Full local development and e2e testing without a Supabase project
- **PWA Support** - Installable progressive web apps

## Quick Start

### Prerequisites
- Node.js 22+
- pnpm 9+

### Development Setup

1. **Clone and install**
   ```bash
   git clone <repository>
   cd foos-and-friends
   pnpm install
   ```

2. **Start in mock mode (no Supabase needed)**
   ```bash
   pnpm dev:foos:mock    # Foosball with in-memory mock data
   pnpm dev:chess:mock   # Chess with in-memory mock data
   ```
   Mock mode seeds three seasons of sample data — the fastest way to explore the apps or work on UI.

3. **Or connect to Supabase**
   Create `.env.local` in each app directory (`apps/foosball/` and `apps/chess/`):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   Then start normally:
   ```bash
   # Foosball app (port 5173)
   pnpm dev:foos

   # Chess app (port 5175)
   pnpm dev:chess
   ```

4. **Open in browser**
   - Foosball: http://localhost:5173
   - Chess: http://localhost:5175

### Database Setup (Supabase Mode)

1. Create a new Supabase project
2. Run the database script:
   ```sql
   -- Execute database/00_drop_and_create.sql in Supabase SQL Editor
   ```
3. Configure authentication in Supabase dashboard
4. Add environment variables to `.env.local` files

## Development Commands

```bash
# Development
pnpm dev:foos           # Start foosball dev server
pnpm dev:chess          # Start chess dev server
pnpm dev:foos:mock      # Foosball with in-memory mock data (no Supabase)
pnpm dev:chess:mock     # Chess with in-memory mock data (no Supabase)

# Building & Testing
pnpm build              # Build all apps
pnpm build:foos         # Build foosball app
pnpm build:chess        # Build chess app
pnpm typecheck          # Run TypeScript compiler check
pnpm test               # Run tests in watch mode
pnpm test:run           # Run all tests once
pnpm test:coverage      # Run tests with coverage
pnpm test:e2e           # Playwright e2e suite (mobile + desktop, per app; mock mode)
pnpm test:e2e:ui        # Playwright UI mode

# Code Quality
pnpm lint               # Check code with Biome
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format code with Biome
```

One-time e2e setup: `pnpm exec playwright install chromium`.

## Project Structure

```
foos-and-friends/
├── packages/
│   └── shared/              # Shared backend layer (@foos/shared)
│       ├── src/
│       │   ├── lib/         # Database abstraction & Supabase client
│       │   ├── services/    # Business logic services
│       │   ├── auth/        # Shared auth UI & API (email/password + magic link)
│       │   ├── theme/       # Appearance setting, design tokens, dark theme
│       │   ├── mock/        # In-memory mock database & seed data
│       │   ├── types/       # TypeScript interfaces
│       │   ├── utils/       # ELO calculations, matchmaking
│       │   ├── constants/   # Avatars, etc.
│       │   └── test/        # Test utilities
│       └── package.json
│
├── apps/
│   ├── foosball/            # Foosball app (@foos/foosball)
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── routes/      # TanStack Router routes
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── contexts/    # React Context providers
│   │   │   └── lib/init.ts  # Service initialization
│   │   ├── public/          # Static assets & PWA icons
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── chess/               # Chess app (@foos/chess)
│       └── ...              # Same structure as foosball (1v1 only)
│
├── database/                # SQL migrations
│   ├── 00_drop_and_create.sql
│   └── migrations/
│
├── e2e/                     # Playwright e2e specs (per app)
├── docs/                    # Documentation
├── playwright.config.ts     # E2E config (4 projects: mobile + desktop, per app)
├── package.json             # Workspace root
└── pnpm-workspace.yaml      # Workspace configuration
```

## Architecture

### Core Technologies
- **React 19** + TypeScript for the frontend
- **Vite** for fast development and building
- **Supabase** for authentication, database, and real-time features
- **Tailwind CSS v4** for styling
- **TanStack Router** for type-safe routing
- **Biome** for linting and formatting
- **Vitest** + React Testing Library for unit tests, **Playwright** for e2e
- **pnpm workspaces** for monorepo management

### Multi-Sport Architecture
- **Shared database** with `sport_type` column on `friend_groups` table (`foosball`, `chess`)
- Each app filters groups by its sport type
- **Shared user accounts** across all sports
- **Complete data isolation** per sport via GroupContext filtering

### Match Types (1v1 & 2v2)
- **Configurable per group** via `supported_match_types` column on `friend_groups`
- **1v1 matches**: Direct player vs player ELO calculations
- **2v2 matches**: Team-based ELO with averaged team ratings
- **Separate rankings**: 1v1 and 2v2 rankings tracked independently per season via computed views
- **Chess** is 1v1 only and supports draws (remis); foosball supports both match types
- **Target score**: points needed to win a game is configurable per group

### Authentication & Groups
- **Email/Password + Magic Link** - Shared auth module (`packages/shared/src/auth/`) with password reset flow
- **Private Friend Groups** - Data isolation using Row Level Security (RLS)
- **Roles** - `owner` / `admin` / `member`; owners and admins manage members from a dedicated page
- **Invite System** - Shareable group codes for joining

### Mock Mode
Setting `VITE_MOCK_DATA=true` (the `dev:*:mock` scripts) replaces the Supabase client with an in-memory database seeded with three seasons of sample data. No credentials or network required — the Playwright e2e suite runs entirely on it.

### Data Flow
1. **Authentication**: Email/password or magic link → Supabase session → AuthContext
2. **Group Selection**: User groups (filtered by sport_type) → GroupContext → Current group
3. **Season Selection**: Group seasons → SeasonContext → Current season
4. **Game Logic**: Service layer → useGameLogic → UI components
5. **Rankings**: ELO calculations with automatic updates (separate 1v1/2v2 rankings)

### Key Components

**Shared Package (@foos/shared)**
- `lib/database.ts` - Database interface abstraction
- `lib/supabase-database.ts` - Supabase implementation
- `services/*` - Business logic (players, matches, groups, seasons)
- `types/index.ts` - TypeScript interfaces (includes `MatchType`, `SportType`)

**App-Specific**
- `App.tsx` - Main component with context providers
- `contexts/GroupContext.tsx` - Group management (sport-type filtered)
- `hooks/useGameLogic.ts` - Game operations with ELO calculations
- `components/Manual1v1Workflow.tsx` - 1v1 match recording UI
- `components/MatchEntryModal.tsx` - Match type selection and recording
- `lib/init.ts` - Service initialization with environment variables

## ELO Ranking System

### How It Works (Seasonal)
- **K-factor**: Asymmetric (K_WINNER=35, K_LOSER=29) for slight ranking inflation; draws use K=32
- **Starting Rating**: 1200 (intermediate level), reset every new season
- **Rating Bounds**: 800 minimum, 2400 maximum

### 1v1 ELO
- Direct player vs player rating comparison
- Each player's rating updated based on opponent's rating

### Team ELO (2v2)
- Team Rating = Average of both players' ratings
- Each player's rating updated based on opposing team's average
- All four players receive equal rating changes

### All-Time ELO
- Separate from seasonal rankings: the group's entire match history is replayed as one continuous chain, as if seasons never reset
- Symmetric K=32, no rating clamp
- Implemented in both `packages/shared/src/utils/elo.ts` (`replayContinuousElo`) and the database (migration 020) — the two must stay in sync
- Player ranking graphs can toggle between season and all-time views

### Rating Tiers
| Rating | Tier | Skill Level |
|--------|------|-------------|
| 1800+ | Master | Elite |
| 1600-1799 | Expert | Very skilled |
| 1400-1599 | Advanced | Above average |
| 1200-1399 | Intermediate | Average |
| 800-1199 | Beginner | Learning |

## Deployment

### Cloudflare Pages (Foosball)
- **Build command**: `pnpm install && pnpm build:foos`
- **Build output**: `apps/foosball/dist`
- **Root directory**: (empty - repo root)

### Cloudflare Pages (Chess)
- **Build command**: `pnpm install && pnpm build:chess`
- **Build output**: `apps/chess/dist`
- **Root directory**: (empty - repo root)

### Cloudflare Pages (Landing page)
- **Build command**: `pnpm install && pnpm build:landing`
- **Build output**: `apps/landing/dist`
- **Root directory**: (empty - repo root)
- **Env**: `VITE_FOOS_APP_URL` — where the sign-in CTAs point

See `docs/DEPLOYMENT.md` for complete deployment guide.

## Development Tips

### Testing
- Run `pnpm test:run` before committing
- Run `pnpm test:e2e` before merging UI changes — CI gates on it, and the mobile projects catch layout issues unit tests miss
- Tests cover components, hooks, and integration scenarios
- Test utilities available in `packages/shared/src/test/test-utils.tsx`

### Code Style
- Biome handles formatting and linting
- 2-space indents, single quotes configured
- TypeScript strict mode enabled
- Path aliases: `@/` points to app's `src/`, `@foos/shared` for shared package

### Database Changes
- Use migration files in `database/migrations/` for schema changes
- Use `database/00_drop_and_create.sql` for initial setup only
- Designed to work with public JavaScript client

## Contributing

1. Set up development environment with Supabase
2. Make changes and test: `pnpm test:run`
3. Check code quality: `pnpm lint`
4. Commit changes

## License

Private project - All rights reserved
