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

This is a React + TypeScript foosball ranking application built with Vite. The app tracks players, matches, and calculates ELO-based rankings for office foosball games. It supports both Supabase backend integration and a fully functional mock mode for development.

### Core Architecture

- **React 19** with TypeScript and Vite for fast development
- **Supabase** for authentication, real-time database, and Row Level Security (RLS)
- **Mock Mode** for development without Supabase configuration
- **Tailwind CSS** with custom styling for UI components
- **Component-based architecture** with clear separation of concerns
- **Custom hooks** and React Context for state management

### Authentication & Groups

- **Magic Link Authentication** with Supabase Auth (passwordless)
- **Private Friend Groups** with invite-only access via shareable codes
- **Complete data isolation** between groups using RLS policies
- **Mock mode fallback** for development with demo user and sample data

### Key Components Structure

- `src/App.tsx` - Main app component with authentication and group context
- `src/hooks/useAuth.ts` - Authentication logic with mock mode support
- `src/contexts/GroupContext.tsx` - Group management and state
- `src/hooks/useGameLogic.ts` - Group-aware game logic with ELO calculations
- `src/services/` - Service layer for data operations (players, matches, groups)
- `src/types/index.ts` - TypeScript interfaces for all entities
- `src/components/` - Reusable UI components including auth and group management

### Database Schema

- **friend_groups** - Private groups with invite codes and ownership
- **group_memberships** - User membership in groups with roles
- **players** - Group-scoped player profiles with rankings
- **matches** - Match records with team compositions and scores
- **Row Level Security** policies ensure complete data isolation

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
- Run `npm run test:run` before committing changes

## Development Workflow

### Getting Started

1. **Environment Setup**: Create `.env.local` with Supabase credentials or run in mock mode
2. **Database Setup**: Execute `/database/00_complete_reset.sql` in Supabase SQL Editor if using Supabase
3. **Development**: Run `npm run dev` to start the development server
4. **Testing**: Run `npm run test:run` and `npm run lint` before committing

### Database Management

- **Single Reset Script**: Use `/database/00_complete_reset.sql` for all database setup
- **Complete Recreation**: This script drops and recreates the entire database schema
- **No Migrations**: Run the reset script whenever database changes are needed
- **RLS Policies**: Designed to work with public JS client without circular dependencies

### Mock vs Supabase Mode

- **Mock Mode**: Automatically activates when Supabase env vars are missing
- **Supabase Mode**: Full backend integration with authentication and real-time sync
- Both modes provide identical user experience with same features

### Data Flow

1. **Authentication**: Magic link → Supabase session → AuthContext
2. **Group Selection**: User groups → GroupContext → Current group
3. **Game Data**: Service layer → useGameLogic → UI components
4. **Real-time**: Supabase subscriptions (planned) → Context updates

### Key Implementation Details

- All data operations go through service layer for consistent mock/real mode switching
- Group-based data scoping ensures privacy and security
- ELO ranking system with K-factor 32, ratings clamped between 800-2400
- Complete offline functionality with mock data for development

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