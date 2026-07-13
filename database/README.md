# Database Setup for Foos & Friends

This folder contains SQL scripts for setting up and managing the Supabase database used by both apps (foosball, chess).

## Quick Setup (Development)

For a fresh development environment:

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Execute `00_drop_and_create.sql` — drops and recreates an empty `public` schema
4. Execute `migrations/001_initial_schema.sql` — creates all tables, views, functions, indexes, RLS policies, and grants

## Database Schema

`migrations/001_initial_schema.sql` is the authoritative, complete schema definition — generated from a schema-only dump of production (2026-07-13) and verified identical against it. The former incremental migration chain (002–030) was squashed into it; the individual files remain available in git history.

### Core Tables

| Table | Description |
|-------|-------------|
| **friend_groups** | Private groups with invite codes, ownership, `sport_type` (`foosball`/`padel`/`chess`; padel app is sunset but the value remains valid), `supported_match_types` (`1v1`/`2v2`), `target_score`, `join_policy`, and `is_public` sharing flag |
| **group_memberships** | User membership in groups with roles (`owner`/`admin`/`member`) |
| **group_join_requests** | Pending join requests for approval-gated groups |
| **players** | Group-scoped player profiles |
| **matches** | Match records with team compositions, scores, season association, ELO snapshots, and `match_type` (`1v1` or `2v2`) |
| **seasons** | Competitive seasons with start/end dates (one active per group) |
| **season_trophies** | Podium placements awarded when a season ends |

### Computed Views

| View | Description |
|------|-------------|
| **player_season_stats_1v1_computed** | Per-season 1v1 rankings computed from match history |
| **player_season_stats_2v2_computed** | Per-season 2v2 rankings computed from match history |
| **player_season_stats_computed** / **player_stats_computed** | Legacy aggregate views |

### Functions (RPCs)

Group lifecycle (`create_group_with_membership`, `delete_group_with_cascade`, `leave_group`), invites and joining (`join_group_by_invite_code`, `get_group_by_invite_code`, join-request approval RPCs), member management (`get_group_members`, `promote_group_member`, `demote_group_member`, `remove_group_member`), seasons and trophies (`end_season_and_create_new`, `award_season_trophies`), public sharing (`get_public_group_data`, `get_public_matches`, `get_public_season_stats`, `get_group_preview`), and ELO ranking computation (`compute_group_global_rankings`, `compute_player_season_ranking`). See the baseline migration for full definitions.

## Migrations

- `migrations/001_initial_schema.sql` is the squashed baseline — already applied to production; never run it there.
- All new schema changes go in new numbered files in `/database/migrations/` (next: 002). See `migrations/README.md` for conventions.
- Function grants: Supabase's default privileges auto-grant EXECUTE to `anon`/`authenticated` on every new function. Revoke in the migration unless intended (the baseline's "Function ACL pinning" section shows the intended state — `anon` may only call the public-sharing RPCs).

## Production vs Development

- **Development**: `00_drop_and_create.sql` followed by `migrations/001_initial_schema.sql` for complete recreation
- **Production**: Always use incremental migrations to preserve data. Never run the drop-and-create script or the baseline against production.

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access groups they are members of
- Complete data isolation between groups
- Public JS client works without circular policy dependencies
- Sport-type filtering is handled at the application layer (not RLS)

## Verification

After setup, verify:

- [ ] All tables appear in **Database > Tables** (friend_groups, group_memberships, group_join_requests, players, matches, seasons, season_trophies)
- [ ] All tables show "RLS enabled" status
- [ ] Functions appear in **Database > Functions**
- [ ] Computed views appear and return data correctly
- [ ] Indexes appear in **Database > Indexes**
