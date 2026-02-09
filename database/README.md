# Database Setup for Foos & Friends

This folder contains SQL scripts for setting up and managing the Supabase database used by all three apps (foosball, padel, chess).

## Quick Setup (Development)

For a fresh development environment, run the complete reset script:

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Execute `00_drop_and_create.sql` — this drops and recreates all tables, functions, indexes, RLS policies, and computed views

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| **friend_groups** | Private groups with invite codes, ownership, `sport_type` (`foosball`/`padel`/`chess`), and `supported_match_types` (`1v1`/`2v2`) |
| **group_memberships** | User membership in groups with roles |
| **players** | Group-scoped player profiles |
| **matches** | Match records with team compositions, scores, season association, and `match_type` (`1v1` or `2v2`) |
| **seasons** | Competitive seasons with start/end dates (one active per group) |

### Computed Views

| View | Description |
|------|-------------|
| **player_season_stats_1v1_computed** | Per-season 1v1 rankings computed from match history |
| **player_season_stats_2v2_computed** | Per-season 2v2 rankings computed from match history |

### Functions (RPCs)

| Function | Description |
|----------|-------------|
| **create_friend_group** | Creates a group and adds the creator as owner (with initial season) |
| **join_group_by_invite_code** | Joins a group via invite code |
| **get_group_by_invite_code** | Looks up group info by invite code |
| **leave_group** | Removes a member from a group |
| **delete_group** | Deletes a group and all associated data |
| **generate_unique_invite_code** | Generates a unique 6-character invite code |

## Migrations

All schema changes after initial setup are handled through migration files in `/database/migrations/`. Key migrations:

| Migration | Description |
|-----------|-------------|
| 002 | Add match ranking fields (pre/post ELO) |
| 003 | Make ranking fields mandatory |
| 004 | Remove redundant ranking_change column |
| 005 | Add get_group_by_invite_code RPC |
| 006 | Add delete_group RPC |
| 007 | Add leave_group RPC |
| **008** | **Add seasons** — seasons table, player_season_stats, match.season_id, auto-migrate existing matches to "Season 1" |
| 009 | Fix create_group to auto-create initial season |
| **010** | **Add computed stats views** — player_season_stats computed from match history |
| 010b | Fix computed views security (SECURITY DEFINER) |
| 011 | Remove aggregated columns (use computed views instead) |
| 012 | Remove player_season_stats physical table (fully computed now) |
| 013 | Fix function search paths |
| **014** | **Add sport_type** — `sport_type` column on friend_groups (`foosball`/`padel`) |
| 015 | Add generate_unique_invite_code function |
| **016** | **Add match type support** — `match_type` on matches, `supported_match_types` on groups, separate 1v1/2v2 computed views |
| **017** | **Add chess sport type** — adds `chess` as valid sport_type |

See `migrations/README.md` for naming conventions and how to create new migrations.

## Production vs Development

- **Development**: Use `00_drop_and_create.sql` for complete recreation
- **Production**: Always use migrations in `/database/migrations/` to preserve data. Never run the drop-and-create script on production.

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access groups they are members of
- Complete data isolation between groups
- Public JS client works without circular policy dependencies
- Sport-type filtering is handled at the application layer (not RLS)

## Verification

After setup, verify:

- [ ] All tables appear in **Database > Tables** (friend_groups, group_memberships, players, matches, seasons)
- [ ] All tables show "RLS enabled" status
- [ ] Functions appear in **Database > Functions**
- [ ] Computed views appear and return data correctly
- [ ] Indexes appear in **Database > Indexes**
