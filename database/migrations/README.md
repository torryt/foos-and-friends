# Database Migrations

This folder contains database migration files for schema changes.

`001_initial_schema.sql` is the squashed baseline: a schema-only dump of production (2026-07-13), verified identical against it. It replaces the former chain of migrations 002–030 (still in git history). It is **already applied** to production — it exists to bootstrap fresh databases and to document the current schema.

## Migration Naming Convention

New migrations continue the sequence with a short description:

```
002_add_player_avatar_column.sql
003_update_invite_code_format.sql
```

## Migration Guidelines

1. **Always use migrations for production changes** — never hand-edit production or the baseline
2. **Keep migrations atomic** — one logical change per migration
3. **Test migrations thoroughly** before applying to production
4. **Document breaking changes** in migration comments
5. **Watch function grants** — Supabase default privileges auto-grant EXECUTE to `anon`/`authenticated` on every new function; explicitly `REVOKE` unless intended
6. **Keep ELO implementations in sync** — `compute_group_global_rankings`/`compute_player_global_ranking` in the DB mirror `replayContinuousElo` in `packages/shared/src/utils/elo.ts`

## Development vs Production

- **Development**: run `/database/00_drop_and_create.sql`, then `001_initial_schema.sql`, then any migrations newer than the baseline
- **Production**: apply only new incremental migrations to preserve data
