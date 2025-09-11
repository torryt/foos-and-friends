# Foos & Friends 🏓

A React + TypeScript foosball ranking application for tracking office games with ELO-based rankings. Built with Vite and designed for private friend groups with complete data isolation.

## Features

- **Private Friend Groups** - Invite-only groups with shareable codes
- **ELO Rankings** - Sophisticated ranking system (K-factor 32, 800-2400 range)
- **Match Tracking** - Record games with 4-player team compositions
- **Real-time Updates** - Supabase integration with Row Level Security
- **Mock Mode** - Full functionality without backend for development
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

2. **Choose your mode**
   
   **Option A: Mock Mode (No setup required)**
   ```bash
   npm run dev:mock
   ```
   - Uses demo data and mock authentication
   - Perfect for development and testing
   - No external dependencies

   **Option B: Supabase Mode**
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
npm run dev              # Start with Supabase backend
npm run dev:mock         # Start in mock mode (no backend)

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
- **Mock Mode** - Complete offline development experience

### Data Flow
1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups → GroupContext → Current group
3. **Game Logic**: Service layer → useGameLogic → UI components
4. **Rankings**: ELO calculations with automatic updates

### Key Components

**App.tsx** - Main component orchestrating authentication and group contexts

**GroupContext** - Manages current group state and user permissions

**useGameLogic** - Handles all game-related operations (players, matches, rankings)

**useAuth** - Authentication state management with mock/real mode switching

**Service Layer** - Abstracts data operations for consistent mock/Supabase switching

## Current State

### ✅ Completed Features
- [x] Private friend group system with invite codes
- [x] Magic link authentication (Supabase + mock mode)
- [x] Player management (add/edit players)
- [x] Match recording with 4-player teams
- [x] ELO ranking system with automatic calculations
- [x] Match history with win/loss tracking
- [x] Responsive UI with Tailwind CSS
- [x] Complete test coverage for core functionality
- [x] Mock mode for development without backend
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

### Mock vs Real Mode
- **Mock Mode**: Use `npm run dev:mock` for quick development
- **Real Mode**: Use `npm run dev` with Supabase setup
- Both modes have identical user experience and feature parity

### Testing
- Run `npm run test:run` before committing
- Tests cover components, hooks, and integration scenarios
- Mock utilities available in `src/test/test-utils.tsx`

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

1. Choose mock mode for development: `npm run dev:mock`
2. Make changes and test: `npm run test:run`  
3. Check code quality: `npm run lint`
4. Commit changes

## License

Private project - All rights reserved