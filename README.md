# Foos & Friends

A pnpm workspaces monorepo containing React + TypeScript sports ranking applications for tracking games with ELO-based rankings. Built with Vite and designed for private friend groups with complete data isolation.

## Apps

- **Foosball** (`apps/foosball`) - Office foosball ranking tracker
- **Padel** (`apps/padel`) - Padel tennis ranking tracker

Both apps share the same backend infrastructure and user accounts, but maintain separate groups and data per sport.

## Features

- **Private Friend Groups** - Invite-only groups with shareable codes and data isolation
- **ELO Rankings** - Sophisticated 2v2 team ranking system (K-factor 32, 800-2400 range)
- **Match Tracking** - Record games with team compositions and automatic rating updates
- **Competitive Seasons** - Independent rankings per season with historical data
- **Skill Tiers** - 5 ranking tiers with color-coded badges (Beginner to Master)
- **Invite Links** - Shareable links for seamless user onboarding
- **Real-time Updates** - Supabase integration with Row Level Security
- **Magic Link Auth** - Passwordless authentication via Supabase
- **Responsive Design** - Tailwind CSS with custom gradients
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

2. **Environment setup**
   Create `.env.local` in each app directory (`apps/foosball/` and `apps/padel/`):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start development**
   ```bash
   # Foosball app (port 5173)
   pnpm dev:foosball

   # Padel app (port 5174)
   pnpm dev:padel
   ```

4. **Open in browser**
   - Foosball: http://localhost:5173
   - Padel: http://localhost:5174

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
pnpm dev:foosball       # Start foosball dev server
pnpm dev:padel          # Start padel dev server

# Building & Testing
pnpm build              # Build all apps
pnpm build:foosball     # Build foosball app
pnpm build:padel        # Build padel app
pnpm typecheck          # Run TypeScript compiler check
pnpm test               # Run tests in watch mode
pnpm test:run           # Run all tests once
pnpm test:coverage      # Run tests with coverage

# Code Quality
pnpm lint               # Check code with Biome
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format code with Biome
```

## Project Structure

```
foos-and-friends/
├── packages/
│   └── shared/              # Shared backend layer (@foos/shared)
│       ├── src/
│       │   ├── lib/         # Database abstraction & Supabase client
│       │   ├── services/    # Business logic services
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
│   └── padel/               # Padel app (@foos/padel)
│       └── ...              # Same structure as foosball
│
├── database/                # SQL migrations
│   ├── 00_drop_and_create.sql
│   └── migrations/
│
├── docs/                    # Documentation
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
- **Vitest** + React Testing Library for testing
- **pnpm workspaces** for monorepo management

### Multi-Sport Architecture
- **Shared database** with `sport_type` column on `friend_groups` table
- Each app filters groups by its sport type (foosball or padel)
- **Shared user accounts** across both sports
- **Complete data isolation** per sport via GroupContext filtering

### Authentication & Groups
- **Magic Link Authentication** - Passwordless login via email
- **Private Friend Groups** - Data isolation using Row Level Security (RLS)
- **Invite System** - Shareable group codes for joining

### Data Flow
1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups (filtered by sport_type) → GroupContext → Current group
3. **Season Selection**: Group seasons → SeasonContext → Current season
4. **Game Logic**: Service layer → useGameLogic → UI components
5. **Rankings**: ELO calculations with automatic updates

### Key Components

**Shared Package (@foos/shared)**
- `lib/database.ts` - Database interface abstraction
- `lib/supabase-database.ts` - Supabase implementation
- `services/*` - Business logic (players, matches, groups, seasons)
- `types/index.ts` - TypeScript interfaces

**App-Specific**
- `App.tsx` - Main component with context providers
- `contexts/GroupContext.tsx` - Group management (sport-type filtered)
- `hooks/useGameLogic.ts` - Game operations with ELO calculations
- `lib/init.ts` - Service initialization with environment variables

## ELO Ranking System

### How It Works
- **K-factor**: 32 (medium volatility)
- **Starting Rating**: 1200 (intermediate level)
- **Rating Bounds**: 800 minimum, 2400 maximum

### Team ELO (2v2)
- Team Rating = Average of both players' ratings
- Each player's rating updated based on opposing team's average
- All four players receive equal rating changes

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
- **Build command**: `pnpm install && pnpm build:foosball`
- **Build output**: `apps/foosball/dist`
- **Root directory**: (empty - repo root)

### Cloudflare Pages (Padel)
- **Build command**: `pnpm install && pnpm build:padel`
- **Build output**: `apps/padel/dist`
- **Root directory**: (empty - repo root)

See `docs/DEPLOYMENT.md` for complete deployment guide.

## Development Tips

### Testing
- Run `pnpm test:run` before committing
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
