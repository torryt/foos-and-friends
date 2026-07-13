-- Migration: Drop the dead public_token column
--
-- APPLY ONLY AFTER the unified-group-routes app code is deployed: migration
-- 026 already removed every function reading the column, but the previous app
-- build still selects public_token from friend_groups and would break if the
-- column disappears under it.

ALTER TABLE friend_groups DROP COLUMN IF EXISTS public_token;
