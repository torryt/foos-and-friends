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

This is a React + TypeScript foosball ranking application built with Vite. The app tracks players, matches, and calculates ELO-based rankings for office foosball games.

### Core Architecture

- **React 19** with TypeScript and Vite for fast development
- **Tailwind CSS** with custom styling for UI components
- **Component-based architecture** with clear separation of concerns
- **Custom hooks** for game logic and state management

### Key Components Structure

- `src/App.tsx` - Main app component with tab navigation and modal state
- `src/hooks/useGameLogic.ts` - Core game logic including ELO ranking calculations
- `src/types/index.ts` - TypeScript interfaces for Player and Match entities
- `src/components/` - Reusable UI components (modals, forms, tables)

### State Management

The app uses local React state managed through the `useGameLogic` hook which handles:
- Player management (add players, track stats)
- Match recording and history
- ELO ranking calculations (K-factor 32, clamped 800-2400 range)
- Sample data initialization

### Styling

- **Biome** for code formatting and linting (configured for 2-space indents, single quotes)
- **Tailwind CSS v4** with PostCSS for styling
- Custom gradient backgrounds and responsive design

### TypeScript Configuration

- Strict TypeScript setup with separate configs for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
- Path aliases configured with `@/` pointing to `src/`

### Testing

- **Vitest** with React Testing Library for unit and component tests
- Test setup in `src/test/setup.ts` with jest-dom matchers
- Component tests in `src/components/__tests__/`
- Hook tests in `src/hooks/__tests__/`
- Run `npm run test:run` before committing changes