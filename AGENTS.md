# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

pnpm workspaces monorepo. React 19 + TypeScript + Vite. Supabase (auth, Postgres, RLS) backend. Tailwind CSS v4. Biome for lint/format. Vitest + React Testing Library for tests.

Two apps — foosball and chess — track players, matches, and ELO rankings, sharing one Supabase backend via `packages/shared` (`@foos/shared`). Data isolation between sports is via a `sport_type` column, not separate databases.

## Commands

- `pnpm dev:foos` / `pnpm dev:chess` — dev server (ports 5173/5175)
- `pnpm build` / `pnpm build:foos` / `pnpm build:chess` — build
- `pnpm typecheck` — TypeScript check, all packages
- `pnpm lint` / `pnpm lint:fix` — Biome lint
- `pnpm format` — Biome format
- `pnpm test` — Vitest watch mode
- `pnpm test:run` — Vitest single run
- `pnpm test:coverage` — Vitest with coverage
- `pnpm test:e2e` — Playwright e2e suite (4 projects: mobile 390px + desktop, per app; servers auto-start in mock mode)

**Always use `pnpm`, not `npm` or `yarn`.**

**After any non-trivial feature or fix, run in order and fix failures: `pnpm lint`, `pnpm test:run`, `pnpm format`, `pnpm typecheck`.**

**Before merging UI changes, also run `pnpm test:e2e` — CI gates on it, `pnpm test:run` does not cover it, and the mobile projects catch content hidden per-breakpoint. One-time setup: `pnpm exec playwright install chromium`.**

## Project Structure

```
packages/shared/src/     lib/ (db abstraction + Supabase client), services/, types/, utils/ (ELO, matchmaking)
apps/{foosball,chess}/src/   components/, routes/ (TanStack Router), hooks/, contexts/, lib/init.ts
database/                SQL migrations (shared across apps)
```

`apps/foosball` is the reference implementation; chess mirrors its structure. Path alias `@/` → app's `src/`; `@foos/shared` → shared package.

## Domain Model (non-obvious facts)

- **Sport isolation**: `friend_groups.sport_type` (`'foosball' | 'chess'`) scopes everything; each app's `GroupContext` filters by its own sport. (The DB still accepts and may contain `'padel'` rows from the sunset padel app.)
- **Match types**: `MatchType = '1v1' | '2v2'`. 1v1 leaves `team*_player2_id` null and computes ELO player-vs-player; 2v2 uses team-averaged ELO. Separate computed views per type: `player_season_stats_1v1_computed`, `player_season_stats_2v2_computed`. Chess only supports `1v1`; foosball defaults to `2v2` but can support both, per-group via `friend_groups.supported_match_types`.
- **Seasons**: one active season per group (partial unique index). Ending/creating a season is manual (group owner only). Each new season resets all rankings to 1200 — there is no carry-over. `SeasonContext` persists the selected season to `localStorage` per group and falls back to most recent if none active.
- **ELO**: asymmetric K-factors (K_WINNER=35, K_LOSER=29, intentional slight inflation), clamped to 800–2400.
- **Auth**: Supabase magic-link only (passwordless), no password flow exists.

## Database Migrations

- All schema changes go through `/database/migrations/`, never hand-edited against production.
- `/database/00_drop_and_create.sql` is for local dev reset only — never run against production (it drops everything).
- RLS policies are written to avoid circular dependencies with the public JS client — check existing policies before adding new ones referencing other tables.

## Boundaries

- **Never** run `00_drop_and_create.sql` or any destructive SQL against a non-local database.
- **Never** commit `.env.local` or Supabase credentials.
- **Ask first** before adding a new dependency, before changing RLS policies, and before altering ELO/ranking math (K-factors, clamps) since it affects historical rankings.
- Mobile-first is a hard requirement, not a suggestion (see below) — verify touch targets and viewport behavior before calling UI work done.

## Mobile-First Design

Every UI decision starts from a small screen and scales up, never the reverse.

- Touch targets: min 44×44px, prefer 48–56px for primary actions. No hover-dependent functionality.
- Primary actions in the lower third of the screen (thumb zone).
- Body text ≥16px (avoids iOS input auto-zoom); line-height ≥1.5.
- No horizontal scroll — layouts must fit viewport width.
- Respect safe-area insets (`env(safe-area-inset-*)`).
- Correct `type`/`inputmode`/`autocomplete` on all form fields.
- Test in a real mobile viewport or devtools emulation before calling UI work done.
