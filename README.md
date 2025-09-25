# Foos & Friends 🏓

A React + TypeScript foosball ranking application for tracking office games with ELO-based rankings. Built with Vite and designed for private friend groups with complete data isolation.

## Features

- **Private Friend Groups** - Invite-only groups with shareable codes and data isolation
- **ELO Rankings** - Sophisticated 2v2 team ranking system (K-factor 32, 800-2400 range)
- **Match Tracking** - Record games with team compositions and automatic rating updates
- **Skill Tiers** - 5 ranking tiers with color-coded badges (Beginner to Master)
- **Invite Links** - Shareable links for seamless user onboarding
- **Real-time Updates** - Supabase integration with Row Level Security
- **Magic Link Auth** - Passwordless authentication via Supabase
- **Responsive Design** - Tailwind CSS with custom gradients

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Development Setup

1. **Clone and install**
   ```bash
   git clone <repository>
   cd foos-and-friends
   npm install
   ```

2. **Start development**
   ```bash
   # Create .env.local
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Run database setup (see Database Setup below)
   # Then start development
   npm run dev
   ```

3. **Open http://localhost:5173**

### Database Setup (Supabase Mode)

1. Create a new Supabase project
2. Run the database script:
   ```sql
   -- Execute database/00_drop_and_create.sql in Supabase SQL Editor
   ```
3. Configure authentication in Supabase dashboard
4. Add environment variables to `.env.local`

## Development Commands

```bash
# Development
npm run dev              # Start development server

# Building & Testing  
npm run build           # TypeScript compilation + Vite build
npm run typecheck       # Run TypeScript compiler check
npm run test            # Run tests in watch mode
npm run test:run        # Run all tests once
npm run test:coverage   # Run tests with coverage
npm run test:ui         # Run tests with UI interface

# Code Quality
npm run lint            # Check code with Biome
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format code with Biome
```

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components  
│   │   ├── __tests__/      # Component tests
│   │   ├── AddPlayerModal.tsx
│   │   ├── AuthForm.tsx
│   │   ├── GroupSelectionScreen.tsx
│   │   ├── Header.tsx
│   │   ├── MatchHistory.tsx
│   │   ├── PlayerRankings.tsx
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   └── GroupContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── __tests__/      # Hook tests
│   │   ├── useAuth.ts      # Authentication logic
│   │   └── useGameLogic.ts # Game logic with ELO calculations
│   ├── services/           # Data service layer
│   │   ├── groupService.ts
│   │   ├── playersService.ts
│   │   └── matchesService.ts
│   ├── test/               # Test utilities
│   │   ├── setup.ts
│   │   └── test-utils.tsx
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── lib/                # Utility libraries
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── App.tsx             # Main application component
│   └── main.tsx            # React entry point
├── database/               # Database schema and setup
│   └── 00_drop_and_create.sql
├── docs/                   # Documentation
│   └── DEPLOYMENT.md       # Deployment guide
├── plans/                  # Project planning documents
└── public/                 # Static assets
```

## Architecture

### Core Technologies
- **React 19** + TypeScript for the frontend
- **Vite** for fast development and building
- **Supabase** for authentication, database, and real-time features
- **Tailwind CSS v4** for styling
- **Biome** for linting and formatting
- **Vitest** + React Testing Library for testing

### Authentication & Groups
- **Magic Link Authentication** - Passwordless login via email
- **Private Friend Groups** - Data isolation using Row Level Security (RLS)
- **Invite System** - Shareable group codes for joining

### Data Flow
1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups → GroupContext → Current group
3. **Game Logic**: Service layer → useGameLogic → UI components
4. **Rankings**: ELO calculations with automatic updates

### Key Components

**App.tsx** - Main component orchestrating authentication and group contexts

**GroupContext** - Manages current group state and user permissions

**useGameLogic** - Handles all game-related operations (players, matches, rankings)

**useAuth** - Authentication state management with Supabase

**Service Layer** - Abstracts data operations for Supabase integration

## ELO Ranking System

Foos & Friends uses a sophisticated **ELO rating system** to calculate player rankings based on match outcomes. The system provides fair and competitive rankings that reflect true skill levels.

### How ELO Works

#### Basic Formula
```
New Rating = Old Rating + K × (Actual Score - Expected Score)
```

Where:
- **K-factor**: 32 (determines rating volatility)
- **Actual Score**: 1 for win, 0 for loss
- **Expected Score**: Probability of winning based on rating difference

#### Expected Score Calculation
```
Expected Score = 1 / (1 + 10^((Opponent Rating - Player Rating) / 400))
```

### Team ELO Implementation

Since foosball is played in **2v2 teams**, the system calculates team ratings:

1. **Team Rating** = Average of both players' ratings
2. Each player's rating is updated based on the opposing **team's average rating**
3. All four players receive equal rating changes based on their team's performance

#### Example Calculation

**Before Match:**
- Team 1: Alice (1400) + Bob (1200) = **Team Rating: 1300**
- Team 2: Carol (1500) + Dave (1100) = **Team Rating: 1300**

**Expected Scores** (even match):
- Each Team 1 player: 0.5 (50% chance to win)
- Each Team 2 player: 0.5 (50% chance to win)

**If Team 1 Wins:**
- Alice: `1400 + 32 × (1 - 0.5) = 1416` (+16)
- Bob: `1200 + 32 × (1 - 0.5) = 1216` (+16)
- Carol: `1500 + 32 × (0 - 0.5) = 1484` (-16)
- Dave: `1100 + 32 × (0 - 0.5) = 1084` (-16)

### Rating Ranges & Tiers

| Rating Range | Tier | Color | Skill Level |
|--------------|------|-------|-------------|
| 1800+ | **Master** | 💜 Purple | Elite players |
| 1600-1799 | **Expert** | 💚 Green | Very skilled |
| 1400-1599 | **Advanced** | 💙 Blue | Above average |
| 1200-1399 | **Intermediate** | 💛 Yellow | Average players |
| 800-1199 | **Beginner** | ❤️ Rose | Learning |

### Key Features

#### Starting Rating
- **New players**: Start at 1200 (intermediate level)
- **Balanced starting point** for fair initial matchups

#### Rating Bounds
- **Minimum**: 800 (prevents extremely low ratings)
- **Maximum**: 2400 (theoretical skill ceiling)
- **Practical range**: Most players fall between 1000-1800

#### K-Factor: 32
- **Medium volatility**: Balances quick adaptation with stability
- **Faster rating changes** for new or improving players
- **Standard tournament value** used in competitive games

### Matchmaking Implications

#### Balanced Matches
When team ratings are equal (±50 points):
- Each player expects ~16 point swings
- Close games provide moderate rating changes

#### Upset Victories
When lower-rated team wins:
- **Bigger rating gains** for winners (20-30 points)
- **Smaller rating losses** for higher-rated losers (10-20 points)
- **Rewards** beating stronger opponents

#### Expected Victories
When higher-rated team wins:
- **Smaller rating gains** for winners (5-15 points)
- **Bigger rating losses** for lower-rated losers (15-25 points)
- **Punishes** losing to weaker opponents

### Strategic Considerations

#### Team Formation
- **Mixed skill teams** create interesting dynamics
- **Skill gaps** within teams affect expected outcomes
- **Partnership synergy** matters beyond individual ratings

#### Rating Protection
- Play against **similar-rated opponents** for stable ratings
- **Avoid mismatched games** to prevent large rating swings
- **Consistent play** leads to accurate rating representation

#### Climbing Rankings
- **Beat higher-rated teams** for maximum point gains
- **Minimize losses** to lower-rated opponents
- **Regular play** helps establish true skill level

### Implementation Details

#### Database Storage
```sql
-- Players table stores current ratings
players (
  ranking INTEGER DEFAULT 1200,  -- Current ELO rating
  wins INTEGER DEFAULT 0,        -- Total wins
  losses INTEGER DEFAULT 0,      -- Total losses
  matches_played INTEGER DEFAULT 0
);

-- Matches table stores historical rating data
matches (
  team1_player1_pre_ranking INTEGER,   -- Before match
  team1_player1_post_ranking INTEGER,  -- After match
  -- Ranking change calculated as: post_ranking - pre_ranking
  -- ... for all 4 players
);
```

#### Rating Calculation Code
Located in `src/services/matchesService.ts`:
```typescript
const calculateNewRanking = (
  playerRanking: number,
  opponentRanking: number,
  isWinner: boolean,
) => {
  const K = 32 // K-factor
  const expectedScore = 1 / (1 + 10 ** ((opponentRanking - playerRanking) / 400))
  const actualScore = isWinner ? 1 : 0
  const newRanking = playerRanking + K * (actualScore - expectedScore)
  return Math.max(800, Math.min(2400, Math.round(newRanking)))
}
```

### Why ELO for Foosball?

#### Advantages
✅ **Proven system** - Used in chess, esports, and competitive games  
✅ **Self-correcting** - Ratings converge to true skill over time  
✅ **Upset-sensitive** - Rewards beating stronger opponents  
✅ **Stable rankings** - Resistant to lucky wins/unlucky losses  
✅ **Team-adapted** - Modified intelligently for 2v2 gameplay  

#### Fair Competition
- **Skill-based matchmaking** becomes possible
- **Progress tracking** shows improvement over time
- **Competitive balance** keeps games interesting
- **Motivation system** encourages improvement

The ELO system ensures that rankings accurately reflect player skill while maintaining competitive balance and providing clear progression paths for players at all levels.

## Current State

### ✅ Completed Features
- [x] Private friend group system with invite codes
- [x] Magic link authentication (Supabase)
- [x] Player management (add/edit players)
- [x] Match recording with 4-player teams
- [x] ELO ranking system with automatic calculations
- [x] Match history with win/loss tracking
- [x] Responsive UI with Tailwind CSS
- [x] Complete test coverage for core functionality
- [x] Database schema with Row Level Security policies

### 🚧 Known Issues
- Database policies fixed for infinite recursion
- SMTP configuration needed for production emails

### 🎯 Ready for Production
- Frontend build process configured
- Database schema finalized
- Authentication system complete
- Hosting plan documented (see `docs/DEPLOYMENT.md`)

## Development Tips


### Testing
- Run `npm run test:run` before committing
- Tests cover components, hooks, and integration scenarios
- Test utilities available in `src/test/test-utils.tsx`

### Code Style
- Biome handles formatting and linting
- 2-space indents, single quotes configured
- TypeScript strict mode enabled
- Path aliases: `@/` points to `src/`

### Database Changes
- Use `database/00_drop_and_create.sql` for schema updates
- Script drops and recreates everything (no migrations yet)
- Designed to work with public JavaScript client

## Deployment

See `docs/DEPLOYMENT.md` for complete deployment guide.

**Quick Deploy:**
1. Deploy frontend to Cloudflare Pages (free)
2. Configure Brevo SMTP for emails (free)
3. Total cost: €0/month

## Contributing

1. Set up development environment with Supabase
2. Make changes and test: `npm run test:run`  
3. Check code quality: `npm run lint`
4. Commit changes

## License

Private project - All rights reserved