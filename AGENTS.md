# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

pnpm workspaces monorepo. React 19 + TypeScript + Vite. Supabase (auth, Postgres, RLS) backend. Tailwind CSS v4. Biome for lint/format. Vitest + React Testing Library for unit tests, Playwright for e2e.

Two apps — foosball and chess — track players, matches, and ELO rankings, sharing one Supabase backend via `packages/shared` (`@foos/shared`). Data isolation between sports is via a `sport_type` column, not separate databases. A third workspace app, `apps/landing`, is the static public landing page (vanilla TS, no React/Supabase).

## Commands

- `pnpm dev:foos` / `pnpm dev:chess` — dev server (ports 5173/5175)
- `pnpm dev:foos:mock` / `pnpm dev:chess:mock` — dev server with in-memory mock data (`VITE_MOCK_DATA=true`), no Supabase credentials needed
- `pnpm dev:landing` — landing page dev server (port 5174 by default)
- `pnpm build` / `pnpm build:foos` / `pnpm build:chess` / `pnpm build:landing` — build
- `pnpm shots:landing` — regenerate landing-page screenshots + og:image from the foosball app in mock mode (committed to `apps/landing/public/`; rerun after app UI changes)
- `pnpm typecheck` — TypeScript check, all packages
- `pnpm lint` / `pnpm lint:fix` — Biome lint
- `pnpm format` — Biome format
- `pnpm test` — Vitest watch mode
- `pnpm test:run` — Vitest single run
- `pnpm test:coverage` — Vitest with coverage
- `pnpm test:e2e` — Playwright e2e suite (6 projects: mobile 390px + desktop, per app + landing; servers auto-start in mock mode)

**Always use `pnpm`, not `npm` or `yarn`.**

**After any non-trivial feature or fix, run in order and fix failures: `pnpm lint`, `pnpm test:run`, `pnpm format`, `pnpm typecheck`.**

Don't run `pnpm test:e2e` routinely — the Main Checks GitHub Action runs it on every push to main, and failures there get fixed after the fact. Run it locally only when explicitly asked, or when working directly on the e2e specs/config. (One-time setup if you do: `pnpm exec playwright install chromium`.)

## Project Structure

```
packages/shared/src/     lib/ (db abstraction + Supabase client), services/, types/, utils/ (ELO, matchmaking),
                         auth/ (shared auth UI + API), theme/ (appearance + design tokens), mock/ (in-memory mock DB)
apps/{foosball,chess}/src/   components/, routes/ (TanStack Router), hooks/, contexts/, lib/init.ts
apps/landing/            static public landing page (vanilla TS + Tailwind, CTAs point at VITE_FOOS_APP_URL)
database/                SQL migrations (shared across apps)
e2e/                     Playwright specs per app + playwright.config.ts at root
```

`apps/foosball` is the reference implementation; chess mirrors its structure. Path alias `@/` → app's `src/`; `@foos/shared` → shared package.

## Domain Model (non-obvious facts)

- **Sport isolation**: `friend_groups.sport_type` (`'foosball' | 'chess'`) scopes everything; each app's `GroupContext` filters by its own sport. (The DB still accepts and may contain `'padel'` rows from the sunset padel app.)
- **Match types**: `MatchType = '1v1' | '2v2'`. 1v1 leaves `team*_player2_id` null and computes ELO player-vs-player; 2v2 uses team-averaged ELO. Separate computed views per type: `player_season_stats_1v1_computed`, `player_season_stats_2v2_computed`. Chess only supports `1v1`; foosball defaults to `2v2` but can support both, per-group via `friend_groups.supported_match_types`.
- **Seasons**: one active season per group (partial unique index). Ending/creating a season is manual (group owner only). Each new season resets all rankings to 1200 — there is no carry-over. `SeasonContext` persists the selected season to `localStorage` per group and falls back to most recent if none active.
- **ELO (seasonal)**: asymmetric K-factors (K_WINNER=35, K_LOSER=29, intentional slight inflation; K_DRAW=32), clamped to 800–2400.
- **ELO (all-time)**: separate from seasonal — a continuous replay of the group's full match history as if seasons never reset, symmetric K=32, no clamp. Implemented twice: `replayContinuousElo` in `packages/shared/src/utils/elo.ts` and `compute_player_global_ranking` in migration 020 — they must stay in sync.
- **Draws**: chess supports draws/remis (equal scores, K=32, 0.5 score); foosball does not.
- **Target score**: `friend_groups.target_score` sets points-to-win per group; score entry is winner-first.
- **Roles**: `GroupRole = 'owner' | 'admin' | 'member'`. Owners and admins manage members (list/promote/remove) via RPCs from migration 019; season management stays owner-only.
- **Auth**: shared module in `packages/shared/src/auth/` — email/password (with reset flow) plus magic-link, both via Supabase.
- **Theming**: `ThemeContext` exposes a Light/Dark/System appearance setting (no user-facing theme picker anymore). Dark maps to the `neonarcade` theme, whose fonts are lazy-loaded so light-mode users never fetch them.
- **Mock mode**: `VITE_MOCK_DATA=true` swaps the Supabase client for the in-memory DB in `packages/shared/src/mock/` (seeded with three seasons). The e2e suite runs entirely on it.

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
