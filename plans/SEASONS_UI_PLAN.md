# Seasons UI (issue #86)

## Context

Seasons are fully supported in the backend (tables, one-active-season constraint,
`end_season_and_create_new` RPC with owner enforcement, per-season computed leaderboard
views) and matches are already season-scoped. A `SeasonSelector` + `SeasonManagement` UI
exists but is commented out of both apps' headers ("hidden while implementing underlying
support"). Issue #86 asks to surface seasons with a minimal, slick UI: current season in
focus, history readily available, a consequences-aware wizard for owners, and
current-season-by-default match filtering with all-time available.

UI direction (approved via sketches, see artifact "Seasons UI — Concept Sketches"):
**Concept A** — a compact season pill in the header next to the group selector, opening a
bottom-sheet season timeline; a 3-step new-season wizard; an archived "time travel"
banner; all-time filter on both Matches and Rankings; cross-season ranking history on the
player profile.

## What already exists (reuse, don't rebuild)

- `seasonsService.endSeasonAndCreateNew` → RPC (owner-enforced server-side)
- `SeasonContext` with per-group localStorage persistence + fallback (both apps)
- `matchesService.getMatchesByGroup(groupId)` — all-time matches, implemented through
  every layer already
- All-time rankings = players' global stats from `player_stats_computed`
  (`getPlayersByGroup`); `PlayerRankings` already falls back to them when `seasonStats`
  is absent
- `ModalOrBottomDrawer` (mobile bottom sheet / desktop dialog), chip-filter pattern in
  `MatchHistory`, step-state wizard pattern in `PickTeamsWorkflow`
- Owner gating: `currentGroup.isOwner` (pattern from `GroupSelector` / members page)

## Changes (foosball first, then mirrored to chess)

### Shared

None required. (`getMatchesByGroup` etc. all exist.)

### Contexts

- `SeasonContext.tsx` (both apps): fix stale-closure bug in `endSeasonAndCreateNew` —
  after a successful RPC it calls `switchSeason(newId)` against the *old* `seasons`
  state, so the app stays on the archived season. Fix: persist the new season id to
  localStorage first, then `refreshSeasons()` (which restores the stored id).

### Data hook

- `useGameLogic.ts`: fetch `allMatches` via `matchesService.getMatchesByGroup` in the
  existing `Promise.all`; expose it; refresh it after `addMatch`.

### New components (apps/foosball/src/components/)

- `SeasonPill.tsx` — header pill next to `GroupSelector`. Live season: accent border +
  green dot + "S{n}" (name on ≥sm). Archived: muted + 📦. Opens `SeasonSheet`.
- `SeasonSheet.tsx` — `ModalOrBottomDrawer` timeline: seasons newest-first, LIVE/ENDED
  badges, date ranges, per-season match counts (one `getMatchesByGroup` fetch on open,
  counted client-side). Tap → `switchSeason` + close. Owner-only "Start new season"
  button at bottom → `NewSeasonWizard`.
- `NewSeasonWizard.tsx` — 3 steps in a bottom sheet, `useState<Step>` pattern:
  1. *Consequences*: current season is archived (with match count), rankings reset to
     1200, current #1 (from `getSeasonLeaderboard`) is crowned.
  2. *Name*: prefilled "Season {n+1}", optional description, ≥16px inputs.
  3. *Confirm*: danger-styled button labeled "End {old} & start {new}". On success:
     toast + auto-switch to new season (via context fix above).

Delete `SeasonSelector.tsx` and `SeasonManagement.tsx` (replaced).

### Wiring

- `Header.tsx`: render `SeasonPill` (replaces the commented-out `SeasonSelector`).
- `routes/index.tsx` (Rankings):
  - Archived-season banner (📦 name + dates + "Back to live" → switch to active season);
    hide `QuickActions` while archived (no recording into archived seasons).
  - Scope toggle chips "This season / All time"; all-time renders `PlayerRankings`
    without `seasonStats` (global ELO) and with `allMatches`.
  - `PlayerRankings` gets an `archived` prop → header reads "Final Standings".
- `MatchHistory.tsx`: scope chips ({season name} / All time) next to the player filter;
  all-time mode uses `allMatches` and tags each row with its season name; hide the `+`
  button when archived.
- Player profile ranking history:
  - `useRankingHistory.ts`: carry `seasonId` per data point.
  - `players.$playerId.tsx`: feed `allMatches` to the ranking visualization (other stat
    cards stay scoped to the selected season).
  - `RankingChart.tsx`: dashed `ReferenceLine` at season boundaries with season labels.
  - `PlayerRankingVisualization.tsx`: final-ELO-per-season strip under the chart.

### Chess mirror

Same changes in `apps/chess` (1v1 wording, no team concepts). Chess already has the same
dormant season scaffolding.

### Tests

- New RTL tests: `SeasonSheet` (lists seasons, owner gating of the start button, switch
  on tap) and `NewSeasonWizard` (step flow, confirm calls `endSeasonAndCreateNew`).
- Update `useGameLogic.test.ts` (new `allMatches`), `MatchHistory.test.tsx` (scope
  chips), `PlayerRankings.test.tsx` (archived prop) as needed.

## Verification

1. `pnpm lint`, `pnpm test:run`, `pnpm format`, `pnpm typecheck` — all green.
2. `/verify` skill (mock mode, no Supabase creds): drive both apps in a mobile viewport —
   switch seasons, run the wizard, check archived banner, all-time filters, profile
   chart boundaries; screenshot each state. Touch targets ≥44px.
