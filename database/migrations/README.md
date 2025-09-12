# Database Migrations

This folder contains database migration files for schema changes.

## Migration Naming Convention

Use the following naming pattern for migration files:
```
YYYYMMDD_HHMMSS_description.sql
```

Example:
```
20241201_143000_add_player_avatar_column.sql
20241201_150000_update_invite_code_format.sql
```

## Migration Guidelines

1. **Always use migrations for production changes** - Never modify the main reset script for production schema changes
2. **Include both UP and DOWN migrations** when possible
3. **Test migrations thoroughly** before applying to production
4. **Document breaking changes** in migration comments
5. **Keep migrations atomic** - one logical change per migration

## Development vs Production

- **Development**: You can still use `/database/00_drop_and_create.sql` for complete database recreation
- **Production**: Always use migration files to preserve existing data

## Example Migration File

```sql
-- Migration: Add avatar column to players table
-- Date: 2024-12-01
-- Description: Add avatar field to store player emoji avatars

-- UP Migration
ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT '👤';

-- Add comment
COMMENT ON COLUMN players.avatar IS 'Player avatar emoji';

-- DOWN Migration (comment out for reference)
-- ALTER TABLE players DROP COLUMN avatar;
```